package com.temnhaninox.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingRuleUpdateRequest {

    @NotEmpty(message = "At least one pricing rule update is required")
    @Valid
    private List<RuleItem> rules;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RuleItem {
        @NotBlank(message = "ruleKey is required")
        private String ruleKey;

        @NotNull(message = "ruleValue is required")
        @DecimalMin(value = "0.0", message = "ruleValue cannot be negative")
        private BigDecimal ruleValue;

        private String description;
    }
}
