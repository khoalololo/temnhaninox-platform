package com.temnhaninox.order.client.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
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
@JsonIgnoreProperties(ignoreUnknown = true)
public class CatalogProductDto {

    private UUID id;
    private String name;
    private String slug;
    private String sku;
    private BigDecimal basePrice;
    private Integer stockQuantity;
    private UUID materialId;
    private String materialName;
    private UUID processingMethodId;
    private String processingMethodName;
    private BigDecimal widthMm;
    private BigDecimal heightMm;
    private BigDecimal thicknessMm;
    @JsonProperty("isActive")
    @JsonAlias("active")
    private boolean active;
}
