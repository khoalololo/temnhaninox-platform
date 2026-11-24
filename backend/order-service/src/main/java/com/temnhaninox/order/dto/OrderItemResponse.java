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
public class OrderItemResponse {

    private UUID id;
    private UUID productId;
    private String itemName;
    private UUID materialId;
    private String materialNameSnapshot;
    private UUID processingMethodId;
    private String processingNameSnapshot;
    private BigDecimal widthMm;
    private BigDecimal heightMm;
    private BigDecimal thicknessMm;
    private BigDecimal calculatedWeightKg;
    private BigDecimal systemUnitPrice;
    private BigDecimal finalUnitPrice;
    private Integer quantity;
    private BigDecimal lineTotal;
    private String designFileUrl;
    private String prototypeImageUrl;
}
