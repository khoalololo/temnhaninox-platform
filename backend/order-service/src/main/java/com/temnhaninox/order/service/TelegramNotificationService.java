package com.temnhaninox.order.service;

import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.entity.PaymentTransaction;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class TelegramNotificationService {

    private static final String TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage";

    private final RestClient restClient;
    private final String botToken;
    private final String chatId;

    public TelegramNotificationService(
            @Value("${app.telegram.bot-token:}") String botToken,
            @Value("${app.telegram.chat-id:}") String chatId) {
        this.restClient = RestClient.create();
        this.botToken = botToken;
        this.chatId = chatId;
    }

    @Async
    public void notifyNewCustomQuote(Order order) {
        if (isNotConfigured() || order == null) {
            return;
        }
        String text = String.format(
                "🆕 YÊU CẦU BÁO GIÁ MỚI\nMã đơn: %s\nKhách hàng: %s (%s)\nTổng dự kiến: %s VNĐ\nSố dòng sản phẩm: %d",
                order.getOrderCode(),
                order.getRecipientName(),
                order.getRecipientPhone(),
                formatVnd(order.getTotalAmount()),
                order.getItems() != null ? order.getItems().size() : 0
        );
        sendMessage(text);
    }

    @Async
    public void notifyPaymentProofSubmitted(Order order, PaymentTransaction tx) {
        if (isNotConfigured() || order == null || tx == null) {
            return;
        }
        String text = String.format(
                "💳 KHÁCH HÀNG GỬI CHỨNG TỪ THANH TOÁN\nMã đơn: %s\nĐợt: %s\nPhương thức: %s\nSố tiền: %s VNĐ\nMã GD: %s",
                order.getOrderCode(),
                tx.getPaymentPhase(),
                tx.getPaymentMethod(),
                formatVnd(tx.getAmount()),
                tx.getTransactionRef() != null ? tx.getTransactionRef() : "(Không có)"
        );
        sendMessage(text);
    }

    private void sendMessage(String text) {
        try {
            restClient.post()
                    .uri(TELEGRAM_API_URL, botToken.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "chat_id", chatId.trim(),
                            "text", text
                    ))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to send Telegram notification: {}", ex.getMessage());
        }
    }

    private boolean isNotConfigured() {
        return botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank();
    }

    private String formatVnd(java.math.BigDecimal amount) {
        if (amount == null) {
            return "0";
        }
        return NumberFormat.getNumberInstance(Locale.US).format(amount);
    }
}
