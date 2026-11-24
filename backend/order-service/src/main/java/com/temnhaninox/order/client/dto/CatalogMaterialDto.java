package com.temnhaninox.order.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CatalogMaterialDto {

    private UUID id;
    private String code;
    private String name;
    private List<CatalogProcessingMethodDto> compatibleProcessingMethods;
}
