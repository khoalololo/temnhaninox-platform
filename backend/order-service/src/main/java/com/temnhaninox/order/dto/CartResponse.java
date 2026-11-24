package com.temnhaninox.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartResponse {

    private UUID id;
    private UUID customerId;
    private List<CartItemResponse> items;
    private BigDecimal estimatedSubtotal;
    private int totalItems;
    private Instant updatedAt;
}
