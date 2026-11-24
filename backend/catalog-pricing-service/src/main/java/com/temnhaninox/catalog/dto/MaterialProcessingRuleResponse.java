package com.temnhaninox.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialProcessingRuleResponse {

    private UUID materialId;
    private String materialCode;
    private String materialName;
    private UUID processingMethodId;
    private String processingMethodCode;
    private String processingMethodName;
    private Integer baseLeadTimeDays;
}
