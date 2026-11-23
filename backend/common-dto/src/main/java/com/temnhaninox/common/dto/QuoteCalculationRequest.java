package com.temnhaninox.common.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
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
public class QuoteCalculationRequest {

    @NotNull(message = "materialId is required")
    private UUID materialId;

    @NotNull(message = "processingMethodId is required")
    private UUID processingMethodId;

    @NotNull(message = "widthMm is required")
    @DecimalMin(value = "1.0", message = "widthMm must be at least 1.0 mm")
    private BigDecimal widthMm;

    @NotNull(message = "heightMm is required")
    @DecimalMin(value = "1.0", message = "heightMm must be at least 1.0 mm")
    private BigDecimal heightMm;

    @NotNull(message = "thicknessMm is required")
    @DecimalMin(value = "0.1", message = "thicknessMm must be at least 0.1 mm")
    private BigDecimal thicknessMm;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least 1")
    private Integer quantity;

    private boolean requiresVatInvoice;
}
