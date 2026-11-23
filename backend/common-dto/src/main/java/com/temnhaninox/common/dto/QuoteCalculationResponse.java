package com.temnhaninox.common.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuoteCalculationResponse {

    private String pricingFormulaMode;
    private BigDecimal areaM2;
    private BigDecimal calculatedWeightKg;
    private BigDecimal unitPrice;
    private Integer quantity;
    private BigDecimal subtotalAmount;
    private BigDecimal discountRate;
    private BigDecimal discountAmount;
    private BigDecimal vatRate;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    private BigDecimal depositRequiredAmount;
    private Integer estimatedLeadTimeDays;
}
