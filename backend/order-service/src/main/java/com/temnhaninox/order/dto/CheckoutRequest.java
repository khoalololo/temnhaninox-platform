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
public class CheckoutRequest {

    @NotBlank(message = "recipientName is required")
    private String recipientName;

    @NotBlank(message = "recipientPhone is required")
    private String recipientPhone;

    @NotBlank(message = "shippingAddress is required")
    private String shippingAddress;

    private String customerNote;

    private boolean requiresVatInvoice;

    private String vatCompanyName;

    private String vatTaxCode;

    private String vatCompanyAddress;
}
