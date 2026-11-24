package com.temnhaninox.catalog.dto;

import com.temnhaninox.common.enums.ProductType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {

    private UUID id;
    private UUID categoryId;
    private String categoryName;
    private String categorySlug;
    private UUID materialId;
    private String materialCode;
    private String materialName;
    private UUID processingMethodId;
    private String processingMethodCode;
    private String processingMethodName;
    private String sku;
    private String name;
    private String slug;
    private String description;
    private ProductType productType;
    private BigDecimal basePrice;
    private BigDecimal defaultWidthMm;
    private BigDecimal defaultHeightMm;
    private BigDecimal defaultThicknessMm;
    private Integer stockQuantity;

    @Builder.Default
    private List<String> images = new ArrayList<>();

    private Boolean isActive;
    private Instant createdAt;
}
