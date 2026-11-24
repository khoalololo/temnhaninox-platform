package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.ItemType;
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
public class CartItemResponse {

    private UUID id;
    private UUID productId;
    private ItemType itemType;
    private UUID materialId;
    private UUID processingMethodId;
    private BigDecimal widthMm;
    private BigDecimal heightMm;
    private BigDecimal thicknessMm;
    private Integer quantity;
    private BigDecimal estimatedUnitPrice;
    private BigDecimal lineTotal;
    private String designFileUrl;
    private String customerNote;
    private Instant createdAt;
}
