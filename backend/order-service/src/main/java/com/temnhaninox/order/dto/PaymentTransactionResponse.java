package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.PaymentMethod;
import com.temnhaninox.common.enums.PaymentPhase;
import com.temnhaninox.common.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentTransactionResponse {

    private UUID id;
    private PaymentPhase paymentPhase;
    private PaymentMethod paymentMethod;
    private BigDecimal amount;
    private PaymentStatus status;
    private String transactionRef;
    private String proofImageUrl;
    private Instant verifiedAt;
    private Instant createdAt;
}
