package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.OrderStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateOrderStatusRequest {

    @NotNull(message = "targetStatus is required")
    private OrderStatus targetStatus;

    @Size(max = 255, message = "productionWorkerNote must not exceed 255 characters")
    private String productionWorkerNote;

    private String adminInternalNote;
    private String note;
}
