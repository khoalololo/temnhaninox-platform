package com.temnhaninox.catalog.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PricingRuleResponse {

    private String ruleKey;
    private BigDecimal ruleValue;
    private String description;
    private Instant updatedAt;
}
