package com.temnhaninox.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialResponse {

    private UUID id;
    private String code;
    private String name;
    private Boolean isMetal;
    private BigDecimal densityKgM3;
    private BigDecimal pricePerKg;
    private BigDecimal thinSheetRatePerM2;
    private BigDecimal minThicknessMm;
    private BigDecimal maxThicknessMm;
    private Map<String, Object> pbrPreviewConfig;
    private Boolean isActive;

    @Builder.Default
    private List<ProcessingMethodResponse> allowedProcessingMethods = new ArrayList<>();
}
