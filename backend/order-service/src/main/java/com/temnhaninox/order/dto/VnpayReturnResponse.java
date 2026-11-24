package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VnpayReturnResponse {

    private boolean verified;
    private UUID orderId;
    private String orderCode;
    private String transactionRef;
    private String responseCode;
    private PaymentStatus paymentStatus;
    private OrderStatus orderStatus;
    private BigDecimal amount;
    private String message;
}
