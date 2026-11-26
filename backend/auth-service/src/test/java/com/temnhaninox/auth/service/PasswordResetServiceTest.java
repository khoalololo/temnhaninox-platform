package com.temnhaninox.auth.service;

import com.temnhaninox.auth.entity.PasswordResetToken;
import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.PasswordResetTokenRepository;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordResetTokenRepository tokenRepository;
    @Mock
    private MailService mailService;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private PasswordResetService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(userRepository, tokenRepository, passwordEncoder, mailService,
                "http://localhost:4200");
        user = User.builder().id(UUID.randomUUID()).email("buyer@example.com").fullName("A")
                .role(UserRole.CUSTOMER).isActive(true).passwordHash("old").build();
    }

    @Test
    void requestReset_unknownEmail_doesNothingAndSendsNoMail() {
        when(userRepository.findByEmailIgnoreCase("nobody@example.com")).thenReturn(Optional.empty());

        service.requestReset("Nobody@Example.com");

        verify(mailService, never()).sendPasswordResetEmail(anyString(), anyString());
        verify(tokenRepository, never()).save(any());
    }

    @Test
    void requestReset_knownEmail_storesOnlyHashAndEmailsLinkWithRawToken() {
        when(userRepository.findByEmailIgnoreCase("buyer@example.com")).thenReturn(Optional.of(user));

        service.requestReset("buyer@example.com");

        ArgumentCaptor<PasswordResetToken> saved = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(tokenRepository).save(saved.capture());
        ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendPasswordResetEmail(eq("buyer@example.com"), link.capture());

        String rawToken = link.getValue().substring(link.getValue().indexOf("token=") + 6);
        assertThat(link.getValue()).startsWith("http://localhost:4200/reset-password?token=");
        assertThat(saved.getValue().getTokenHash()).isEqualTo(PasswordResetService.hash(rawToken));
        assertThat(saved.getValue().getTokenHash()).isNotEqualTo(rawToken);
        assertThat(saved.getValue().getExpiresAt()).isAfter(Instant.now().plus(Duration.ofMinutes(59)));
    }

    @Test
    void resetPassword_validToken_updatesPasswordAndInvalidatesTokens() {
        PasswordResetToken token = PasswordResetToken.builder().userId(user.getId())
                .tokenHash(PasswordResetService.hash("abc")).expiresAt(Instant.now().plusSeconds(600)).build();
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("abc"))).thenReturn(Optional.of(token));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        service.resetPassword("abc", "NewSecret1");

        assertThat(passwordEncoder.matches("NewSecret1", user.getPasswordHash())).isTrue();
        verify(tokenRepository).invalidateAllForUser(eq(user.getId()), any(Instant.class));
    }

    @Test
    void resetPassword_expiredUsedOrUnknownToken_isRejected() {
        PasswordResetToken expired = PasswordResetToken.builder().userId(user.getId())
                .tokenHash(PasswordResetService.hash("old")).expiresAt(Instant.now().minusSeconds(1)).build();
        PasswordResetToken used = PasswordResetToken.builder().userId(user.getId())
                .tokenHash(PasswordResetService.hash("used")).expiresAt(Instant.now().plusSeconds(600))
                .usedAt(Instant.now()).build();
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("old"))).thenReturn(Optional.of(expired));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("used"))).thenReturn(Optional.of(used));
        when(tokenRepository.findByTokenHash(PasswordResetService.hash("nope"))).thenReturn(Optional.empty());

        for (String t : new String[]{"old", "used", "nope"}) {
            assertThatThrownBy(() -> service.resetPassword(t, "NewSecret1")).isInstanceOf(BusinessException.class);
        }
        verify(userRepository, never()).save(any());
    }
}
