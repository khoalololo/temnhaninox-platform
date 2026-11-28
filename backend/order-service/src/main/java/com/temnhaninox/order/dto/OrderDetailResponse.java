package com.temnhaninox.order.dto;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderDetailResponse {

    private UUID id;
    private String orderCode;
    private UUID customerId;
    private OrderType orderType;
    private OrderStatus status;
    private String recipientName;
    private String recipientPhone;
    private String shippingAddress;
    private String customerNote;
    private BigDecimal subtotalAmount;
    private BigDecimal discountAmount;
    private BigDecimal vatRate;
    private BigDecimal vatAmount;
    private BigDecimal totalAmount;
    private BigDecimal depositRequiredAmount;
    private BigDecimal paidAmount;
    private boolean requiresVatInvoice;
    private String vatCompanyName;
    private String vatTaxCode;
    private String vatCompanyAddress;
    private String vatInvoiceNumber;
    private String productionWorkerNote;
    private String customerProgressNote;
    private LocalDate estimatedCompletionDate;
    private Instant createdAt;
    private Instant updatedAt;
    private List<OrderItemResponse> items;
    private List<PaymentTransactionResponse> paymentTransactions;
    private List<OrderStatusLogResponse> statusLogs;
}
