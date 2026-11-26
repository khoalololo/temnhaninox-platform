package com.temnhaninox.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/** Sends transactional email. Failures are logged and swallowed so callers never reveal whether an account exists. */
@Slf4j
@Service
public class MailService {

    private final JavaMailSender mailSender;
    private final String from;

    public MailService(JavaMailSender mailSender, @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public void sendPasswordResetEmail(String to, String resetLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Đặt lại mật khẩu - Tem Nhãn Inox");
        message.setText("Xin chào,\n\n"
                + "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n"
                + "Nhấn vào liên kết sau (có hiệu lực 1 giờ):\n" + resetLink + "\n\n"
                + "Nếu bạn không yêu cầu, hãy bỏ qua email này.");
        try {
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send password reset email: {}", ex.getMessage());
        }
    }
}
