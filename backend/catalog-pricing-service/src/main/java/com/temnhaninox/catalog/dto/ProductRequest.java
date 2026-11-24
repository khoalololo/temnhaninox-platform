package com.temnhaninox.catalog.dto;

import com.temnhaninox.common.enums.ProductType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequest {

    @NotNull(message = "categoryId is required")
    private UUID categoryId;

    private UUID materialId;
    private UUID processingMethodId;

    @NotBlank(message = "sku is required")
    @Size(max = 80)
    private String sku;

    @NotBlank(message = "name is required")
    @Size(max = 255)
    private String name;

    @NotBlank(message = "slug is required")
    @Size(max = 260)
    private String slug;

    private String description;

    @NotNull(message = "productType is required")
    private ProductType productType;

    @NotNull(message = "basePrice is required")
    @DecimalMin(value = "0.00", message = "basePrice cannot be negative")
    private BigDecimal basePrice;

    private BigDecimal defaultWidthMm;
    private BigDecimal defaultHeightMm;
    private BigDecimal defaultThicknessMm;

    @Min(value = 0, message = "stockQuantity cannot be negative")
    private Integer stockQuantity;

    private List<String> images;
    private Boolean isActive;
}
