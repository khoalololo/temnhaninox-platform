package com.temnhaninox.order.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttachPrototypeRequest {

    @NotBlank(message = "prototypeImageUrl is required")
    private String prototypeImageUrl;

    private String note;
}
