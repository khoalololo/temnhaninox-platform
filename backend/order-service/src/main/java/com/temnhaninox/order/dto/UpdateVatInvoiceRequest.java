package com.temnhaninox.order.dto;

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
public class UpdateVatInvoiceRequest {

    @NotBlank(message = "vatInvoiceNumber is required")
    @Size(max = 50, message = "vatInvoiceNumber must not exceed 50 characters")
    private String vatInvoiceNumber;
}
