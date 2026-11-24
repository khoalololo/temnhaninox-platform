package com.temnhaninox.catalog.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialProcessingRuleRequest {

    @NotNull(message = "materialId is required")
    private UUID materialId;

    @NotNull(message = "processingMethodId is required")
    private UUID processingMethodId;

    @NotNull(message = "baseLeadTimeDays is required")
    @Min(value = 1, message = "baseLeadTimeDays must be at least 1")
    private Integer baseLeadTimeDays;
}
