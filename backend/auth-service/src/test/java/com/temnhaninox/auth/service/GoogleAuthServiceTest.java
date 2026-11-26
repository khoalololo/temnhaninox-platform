package com.temnhaninox.auth.service;

import com.temnhaninox.auth.dto.AuthResponse;
import com.temnhaninox.auth.entity.AuthProvider;
import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.auth.security.JwtTokenProvider;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceTest {

    private static final String CLIENT_ID = "client-123.apps.googleusercontent.com";

    @Mock
    private UserRepository userRepository;

    private GoogleAuthService service;

    @BeforeEach
    void setUp() {
        JwtTokenProvider jwt = new JwtTokenProvider(
                "dev-only-secret-TemNhanInox-change-me-0123456789-0123456789-0123456789", 86400000L);
        AuthService authService = new AuthService(userRepository, new BCryptPasswordEncoder(), jwt);
        service = new GoogleAuthService(userRepository, authService, CLIENT_ID);
    }

    private GoogleAuthService.TokenInfo info(String aud, String verified) {
        return new GoogleAuthService.TokenInfo(aud, "sub-1", "New.User@Gmail.com", verified, "New User",
                String.valueOf(Instant.now().getEpochSecond() + 3600));
    }

    @Test
    void newGoogleUser_isCreatedAsCustomerWithoutPassword() {
        when(userRepository.findByGoogleId("sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("new.user@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            u.setCreatedAt(Instant.now());
            return u;
        });

        AuthResponse response = service.loginWithVerifiedClaims(info(CLIENT_ID, "true"));

        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getUser().getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThat(response.getUser().getEmail()).isEqualTo("new.user@gmail.com");
    }

    @Test
    void wrongAudienceOrUnverifiedEmail_isRejected() {
        assertThatThrownBy(() -> service.loginWithVerifiedClaims(info("someone-elses-client", "true")))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.loginWithVerifiedClaims(info(CLIENT_ID, "false")))
                .isInstanceOf(BusinessException.class);
        verify(userRepository, never()).save(any());
    }

    @Test
    void existingAdminEmail_cannotBeTakenOverViaGoogle() {
        User admin = User.builder().id(UUID.randomUUID()).email("new.user@gmail.com").fullName("Admin")
                .role(UserRole.ADMIN).isActive(true).passwordHash("x").build();
        when(userRepository.findByGoogleId("sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("new.user@gmail.com")).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.loginWithVerifiedClaims(info(CLIENT_ID, "true")))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN);
        verify(userRepository, never()).save(any());
    }

    @Test
    void existingLocalCustomer_getsGoogleIdLinked() {
        User local = User.builder().id(UUID.randomUUID()).email("new.user@gmail.com").fullName("Local")
                .role(UserRole.CUSTOMER).isActive(true).passwordHash("hash").createdAt(Instant.now()).build();
        when(userRepository.findByGoogleId("sub-1")).thenReturn(Optional.empty());
        when(userRepository.findByEmailIgnoreCase("new.user@gmail.com")).thenReturn(Optional.of(local));
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.loginWithVerifiedClaims(info(CLIENT_ID, "true"));

        assertThat(local.getGoogleId()).isEqualTo("sub-1");
        assertThat(local.getAuthProvider()).isEqualTo(AuthProvider.LOCAL); // keeps its password login
    }
}
