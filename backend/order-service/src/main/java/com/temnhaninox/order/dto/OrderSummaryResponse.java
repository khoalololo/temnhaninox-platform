package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderSummaryResponse {

    private UUID id;
    private String orderCode;
    private OrderType orderType;
    private OrderStatus status;
    private String recipientName;
    private BigDecimal totalAmount;
    private BigDecimal depositRequiredAmount;
    private BigDecimal paidAmount;
    private boolean requiresVatInvoice;
    private int itemCount;
    private Instant createdAt;
    private Instant updatedAt;
}
