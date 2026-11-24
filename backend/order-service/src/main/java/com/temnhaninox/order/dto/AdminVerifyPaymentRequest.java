package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.PaymentStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminVerifyPaymentRequest {

    @NotNull(message = "status is required")
    private PaymentStatus status;

    private String note;
}
