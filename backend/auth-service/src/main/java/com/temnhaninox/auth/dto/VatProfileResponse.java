package com.temnhaninox.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VatProfileResponse {

    private UUID id;
    private String companyName;
    private String taxCode;
    private String companyAddress;
    private Boolean isDefault;
    private Instant createdAt;
}
