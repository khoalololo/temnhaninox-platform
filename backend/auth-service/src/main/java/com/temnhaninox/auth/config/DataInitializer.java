package com.temnhaninox.auth.config;

import com.temnhaninox.auth.entity.User;
import com.temnhaninox.auth.repository.UserRepository;
import com.temnhaninox.common.enums.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email}")
    private String adminEmail;

    @Value("${app.admin.password}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!userRepository.existsByRole(UserRole.ADMIN)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode(adminPassword))
                    .fullName("System Administrator")
                    .phone("0900000000")
                    .role(UserRole.ADMIN)
                    .isActive(Boolean.TRUE)
                    .build();
            userRepository.save(admin);
            log.info("Seeded initial ADMIN user: {}", adminEmail);
        }
    }
}
