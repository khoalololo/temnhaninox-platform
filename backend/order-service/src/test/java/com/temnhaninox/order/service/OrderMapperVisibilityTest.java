package com.temnhaninox.order.service;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import com.temnhaninox.order.dto.OrderDetailResponse;
import com.temnhaninox.order.entity.Order;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class OrderMapperVisibilityTest {

    private Order order() {
        return Order.builder()
                .id(UUID.randomUUID())
                .orderCode("TNI-20261128-0001")
                .customerId(UUID.randomUUID())
                .orderType(OrderType.CUSTOM_QUOTE_ORDER)
                .status(OrderStatus.IN_PRODUCTION)
                .recipientName("Nguyen Van A")
                .recipientPhone("0901234567")
                .shippingAddress("123 Le Loi")
                .subtotalAmount(new BigDecimal("1000000.00"))
                .discountAmount(BigDecimal.ZERO)
                .vatRate(BigDecimal.ZERO)
                .vatAmount(BigDecimal.ZERO)
                .totalAmount(new BigDecimal("1000000.00"))
                .depositRequiredAmount(new BigDecimal("500000.00"))
                .paidAmount(new BigDecimal("500000.00"))
                .productionWorkerNote("INTERNAL: operator skipped QC once")
                .customerProgressNote("Đang khắc laser lô 1, dự kiến xong thứ Sáu")
                .items(new ArrayList<>())
                .paymentTransactions(new ArrayList<>())
                .statusLogs(new ArrayList<>())
                .build();
    }

    @Test
    void customerView_hidesInternalWorkerNote_butKeepsCustomerProgressNote() {
        OrderDetailResponse response = OrderMapper.toCustomerOrderDetailResponse(order());

        assertThat(response.getProductionWorkerNote()).isNull();
        assertThat(response.getCustomerProgressNote()).isEqualTo("Đang khắc laser lô 1, dự kiến xong thứ Sáu");
    }

    @Test
    void adminView_keepsBothNotes() {
        OrderDetailResponse response = OrderMapper.toOrderDetailResponse(order());

        assertThat(response.getProductionWorkerNote()).isEqualTo("INTERNAL: operator skipped QC once");
        assertThat(response.getCustomerProgressNote()).isNotBlank();
    }
}
