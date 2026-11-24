package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.PaymentMethod;
import com.temnhaninox.common.enums.PaymentPhase;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmitPaymentProofRequest {

    @NotNull(message = "paymentPhase is required")
    private PaymentPhase paymentPhase;

    private PaymentMethod paymentMethod;

    @NotNull(message = "amount is required")
    @DecimalMin(value = "1.00", message = "amount must be at least 1.00")
    private BigDecimal amount;

    @Size(max = 120, message = "transactionRef must not exceed 120 characters")
    private String transactionRef;

    private String proofImageUrl;
}
