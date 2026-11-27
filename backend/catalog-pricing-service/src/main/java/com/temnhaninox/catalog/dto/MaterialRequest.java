package com.temnhaninox.catalog.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialRequest {

    @NotBlank(message = "Material code is required")
    @Size(max = 50)
    private String code;

    @NotBlank(message = "Material name is required")
    @Size(max = 150)
    private String name;

    @NotNull(message = "isMetal is required")
    private Boolean isMetal;

    private BigDecimal densityKgM3;
    private BigDecimal pricePerKg;

    // Optional: metals fall back to the global rule; non-metals (mica/decal) need their own rate to be quotable.
    @DecimalMin(value = "0.01", message = "thinSheetRatePerM2 must be positive")
    private BigDecimal thinSheetRatePerM2;

    @NotNull(message = "minThicknessMm is required")
    @DecimalMin(value = "0.01", message = "minThicknessMm must be positive")
    private BigDecimal minThicknessMm;

    @NotNull(message = "maxThicknessMm is required")
    @DecimalMin(value = "0.01", message = "maxThicknessMm must be positive")
    private BigDecimal maxThicknessMm;

    private Map<String, Object> pbrPreviewConfig;
    private Boolean isActive;
}
