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
public class ProcessingMethodResponse {

    private UUID id;
    private String code;
    private String name;
    private String description;
    private Integer baseLeadTimeDays;
    private Boolean isActive;
}
