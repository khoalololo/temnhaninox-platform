package com.temnhaninox.auth.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.temnhaninox.auth.dto.AuthResponse;
import com.temnhaninox.auth.entity.AuthProvider;
import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.Instant;

/**
 * Verifies a Google ID token via Google's tokeninfo endpoint (signature, expiry and issuer are checked by Google),
 * then checks audience and email_verified ourselves.
 */
@Service
public class GoogleAuthService {

    private static final String TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";

    private final UserRepository userRepository;
    private final AuthService authService;
    private final RestClient restClient;
    private final String clientId;

    public GoogleAuthService(
            UserRepository userRepository,
            AuthService authService,
            @Value("${app.google.client-id:}") String clientId) {
        this.userRepository = userRepository;
        this.authService = authService;
        this.restClient = RestClient.create();
        this.clientId = clientId;
    }

    @Transactional
    public AuthResponse loginWithGoogle(String idToken) {
        if (clientId == null || clientId.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Google sign-in is not configured");
        }
        TokenInfo info = fetchTokenInfo(idToken);
        return loginWithVerifiedClaims(info);
    }

    AuthResponse loginWithVerifiedClaims(TokenInfo info) {
        if (!clientId.equals(info.aud()) || !"true".equalsIgnoreCase(info.emailVerified())
                || info.sub() == null || info.email() == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Invalid Google credential");
        }
        String email = info.email().trim().toLowerCase();

        User user = userRepository.findByGoogleId(info.sub()).orElse(null);
        if (user == null) {
            user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user != null) {
                if (user.getRole() == UserRole.ADMIN) {
                    // Never let an external identity take over a privileged account.
                    throw new BusinessException(ErrorCode.FORBIDDEN, "Admin accounts must sign in with email and password");
                }
                user.setGoogleId(info.sub());
                if (user.getPasswordHash() == null) {
                    user.setAuthProvider(AuthProvider.GOOGLE);
                }
            } else {
                user = User.builder()
                        .email(email)
                        .fullName(info.name() != null && !info.name().isBlank() ? info.name().trim() : email)
                        .role(UserRole.CUSTOMER)
                        .authProvider(AuthProvider.GOOGLE)
                        .googleId(info.sub())
                        .isActive(Boolean.TRUE)
                        .build();
            }
            user = userRepository.save(user);
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "User account is disabled");
        }
        return authService.buildAuthResponse(user);
    }

    private TokenInfo fetchTokenInfo(String idToken) {
        try {
            TokenInfo info = restClient.get()
                    .uri(TOKENINFO_URL + "?id_token={t}", idToken)
                    .retrieve()
                    .body(TokenInfo.class);
            if (info == null) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Invalid Google credential");
            }
            if (info.exp() != null && Instant.ofEpochSecond(Long.parseLong(info.exp())).isBefore(Instant.now())) {
                throw new BusinessException(ErrorCode.UNAUTHORIZED, "Google credential expired");
            }
            return info;
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Invalid Google credential");
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TokenInfo(
            String aud,
            String sub,
            String email,
            @JsonProperty("email_verified") String emailVerified,
            String name,
            String exp) {
    }
}
