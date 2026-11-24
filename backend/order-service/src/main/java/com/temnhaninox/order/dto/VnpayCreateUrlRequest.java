package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.PaymentPhase;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
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
public class VnpayCreateUrlRequest {

    @NotNull(message = "orderId is required")
    private UUID orderId;

    private PaymentPhase paymentPhase;

    @DecimalMin(value = "1000.00", message = "amount must be at least 1,000 VND")
    private BigDecimal amount;
}
