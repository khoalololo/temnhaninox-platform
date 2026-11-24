package com.temnhaninox.order.dto;

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
public class VnpayCreateUrlResponse {

    private String paymentUrl;
    private String transactionRef;
    private UUID orderId;
    private BigDecimal amount;
}
