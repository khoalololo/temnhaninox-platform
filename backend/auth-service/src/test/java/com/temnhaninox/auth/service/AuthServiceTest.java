package com.temnhaninox.auth.service;

import com.temnhaninox.auth.dto.AuthResponse;
import com.temnhaninox.auth.dto.LoginRequest;
import com.temnhaninox.auth.dto.RegisterRequest;
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
import org.springframework.security.crypto.password.PasswordEncoder;

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
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private JwtTokenProvider jwtTokenProvider;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder();
        jwtTokenProvider = new JwtTokenProvider(
                "TemNhanInox2026SuperSecretJwtSigningKeyMustBeAtLeast64BytesLong!",
                86400000L
        );
        authService = new AuthService(userRepository, passwordEncoder, jwtTokenProvider);
    }

    @Test
    void register_shouldCreateCustomerAndReturnJwt() {
        RegisterRequest request = RegisterRequest.builder()
                .email("Buyer@Example.com")
                .password("Secret123")
                .fullName("Nguyen Van A")
                .phone("0901234567")
                .defaultAddress("123 Le Loi, HCM")
                .build();

        when(userRepository.existsByEmailIgnoreCase("buyer@example.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            u.setCreatedAt(Instant.now());
            return u;
        });

        AuthResponse response = authService.register(request);

        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getTokenType()).isEqualTo("Bearer");
        assertThat(response.getUser().getEmail()).isEqualTo("buyer@example.com");
        assertThat(response.getUser().getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThat(jwtTokenProvider.validateToken(response.getAccessToken())).isTrue();
    }

    @Test
    void register_shouldThrowDuplicateResourceWhenEmailExists() {
        RegisterRequest request = RegisterRequest.builder()
                .email("existing@example.com")
                .password("Secret123")
                .fullName("Existing User")
                .phone("0901234567")
                .build();

        when(userRepository.existsByEmailIgnoreCase("existing@example.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.DUPLICATE_RESOURCE));

        verify(userRepository, never()).save(any());
    }

    @Test
    void login_shouldReturnJwtForValidCredentials() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("user@example.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .fullName("Valid User")
                .phone("0909999999")
                .role(UserRole.CUSTOMER)
                .isActive(true)
                .createdAt(Instant.now())
                .build();

        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        AuthResponse response = authService.login(new LoginRequest("user@example.com", "Password@123"));

        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getUser().getId()).isEqualTo(userId);
        assertThat(jwtTokenProvider.getUserId(response.getAccessToken())).isEqualTo(userId);
    }

    @Test
    void login_shouldThrowUnauthorizedForWrongPassword() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("user@example.com")
                .passwordHash(passwordEncoder.encode("CorrectPass"))
                .role(UserRole.CUSTOMER)
                .isActive(true)
                .build();

        when(userRepository.findByEmailIgnoreCase("user@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("user@example.com", "WrongPass")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.UNAUTHORIZED));
    }

    @Test
    void login_shouldThrowForbiddenWhenUserInactive() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("disabled@example.com")
                .passwordHash(passwordEncoder.encode("Password@123"))
                .role(UserRole.CUSTOMER)
                .isActive(false)
                .build();

        when(userRepository.findByEmailIgnoreCase("disabled@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("disabled@example.com", "Password@123")))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN));
    }
}
