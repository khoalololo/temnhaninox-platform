package com.temnhaninox.auth.security;

import com.temnhaninox.auth.entity.User;
import com.temnhaninox.common.enums.UserRole;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "TemNhanInox2026SuperSecretJwtSigningKeyMustBeAtLeast64BytesLong!";
    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(SECRET, 86400000L);
    }

    @Test
    void generateAndValidateToken_shouldContainSubjectEmailAndRole() {
        UUID userId = UUID.randomUUID();
        User user = User.builder()
                .id(userId)
                .email("customer@example.com")
                .role(UserRole.CUSTOMER)
                .build();

        String token = jwtTokenProvider.generateToken(user);

        assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        assertThat(jwtTokenProvider.getUserId(token)).isEqualTo(userId);
        assertThat(jwtTokenProvider.getRole(token)).isEqualTo(UserRole.CUSTOMER);

        Claims claims = jwtTokenProvider.parseClaims(token);
        assertThat(claims.get("email", String.class)).isEqualTo("customer@example.com");
    }

    @Test
    void validateToken_shouldReturnFalseForTamperedOrMalformedToken() {
        assertThat(jwtTokenProvider.validateToken("not.a.jwt")).isFalse();
        assertThat(jwtTokenProvider.validateToken("")).isFalse();
    }

    @Test
    void validateToken_shouldReturnFalseForExpiredToken() {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SECRET, -1000L);
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("expired@example.com")
                .role(UserRole.ADMIN)
                .build();

        String expiredToken = expiredProvider.generateToken(user);

        assertThat(jwtTokenProvider.validateToken(expiredToken)).isFalse();
    }
}
