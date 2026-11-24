package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.ItemType;
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
public class AddCartItemRequest {

    @NotNull(message = "itemType is required")
    private ItemType itemType;

    private UUID productId;

    private UUID materialId;

    private UUID processingMethodId;

    private BigDecimal widthMm;

    private BigDecimal heightMm;

    private BigDecimal thicknessMm;

    @NotNull(message = "quantity is required")
    @Min(value = 1, message = "quantity must be at least 1")
    private Integer quantity;

    private String designFileUrl;

    private String customerNote;
}
