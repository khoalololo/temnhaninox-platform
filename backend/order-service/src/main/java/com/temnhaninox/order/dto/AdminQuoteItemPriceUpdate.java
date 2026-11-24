package com.temnhaninox.order.dto;

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
public class AdminQuoteItemPriceUpdate {

    @NotNull(message = "orderItemId is required")
    private UUID orderItemId;

    @NotNull(message = "finalUnitPrice is required")
    @DecimalMin(value = "0.01", message = "finalUnitPrice must be positive")
    private BigDecimal finalUnitPrice;
}
