package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.OrderStatus;
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
public class OrderStatusLogResponse {

    private UUID id;
    private OrderStatus fromStatus;
    private OrderStatus toStatus;
    private UUID changedByUserId;
    private String note;
    private Instant createdAt;
}
