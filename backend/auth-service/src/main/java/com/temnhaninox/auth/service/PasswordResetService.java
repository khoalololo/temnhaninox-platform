package com.temnhaninox.auth.service;

import com.temnhaninox.auth.entity.PasswordResetToken;
import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.PasswordResetTokenRepository;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class PasswordResetService {

    static final Duration TOKEN_TTL = Duration.ofHours(1);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final String frontendUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            MailService mailService,
            @Value("${app.frontend-url}") String frontendUrl) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.frontendUrl = frontendUrl;
    }

    /** Always returns normally: the caller must respond identically whether or not the email exists. */
    @Transactional
    public void requestReset(String email) {
        String normalized = email.trim().toLowerCase();
        User user = userRepository.findByEmailIgnoreCase(normalized).orElse(null);
        if (user == null || !Boolean.TRUE.equals(user.getIsActive())) {
            return;
        }

        tokenRepository.invalidateAllForUser(user.getId(), Instant.now());

        byte[] raw = new byte[32];
        secureRandom.nextBytes(raw);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        tokenRepository.save(PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(hash(token))
                .expiresAt(Instant.now().plus(TOKEN_TTL))
                .build());

        mailService.sendPasswordResetEmail(user.getEmail(), frontendUrl + "/reset-password?token=" + token);
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        Instant now = Instant.now();
        PasswordResetToken stored = tokenRepository.findByTokenHash(hash(token.trim()))
                .filter(t -> t.isUsable(now))
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        User user = userRepository.findById(stored.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn"));

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.invalidateAllForUser(user.getId(), now);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
