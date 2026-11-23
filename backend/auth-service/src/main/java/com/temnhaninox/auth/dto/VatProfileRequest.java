package com.temnhaninox.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VatProfileRequest {

    @NotBlank(message = "Company name is required")
    @Size(max = 255)
    private String companyName;

    @NotBlank(message = "Tax code is required")
    @Size(max = 50)
    private String taxCode;

    @NotBlank(message = "Company address is required")
    private String companyAddress;

    @Builder.Default
    private Boolean isDefault = Boolean.TRUE;
}
