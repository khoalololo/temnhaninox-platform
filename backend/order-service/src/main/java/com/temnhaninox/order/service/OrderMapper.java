package com.temnhaninox.order.service;

import com.temnhaninox.order.dto.OrderDetailResponse;
import com.temnhaninox.order.dto.OrderItemResponse;
import com.temnhaninox.order.dto.OrderStatusLogResponse;
import com.temnhaninox.order.dto.OrderSummaryResponse;
import com.temnhaninox.order.dto.PaymentTransactionResponse;
import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.entity.OrderItem;
import com.temnhaninox.order.entity.OrderStatusLog;
import com.temnhaninox.order.entity.PaymentTransaction;

import java.util.List;

public final class OrderMapper {

    private OrderMapper() {
    }

    public static OrderSummaryResponse toOrderSummaryResponse(Order order) {
        return OrderSummaryResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .orderType(order.getOrderType())
                .status(order.getStatus())
                .recipientName(order.getRecipientName())
                .totalAmount(order.getTotalAmount())
                .depositRequiredAmount(order.getDepositRequiredAmount())
                .paidAmount(order.getPaidAmount())
                .requiresVatInvoice(order.isRequiresVatInvoice())
                .itemCount(order.getItems() != null ? order.getItems().size() : 0)
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .build();
    }

    public static OrderDetailResponse toOrderDetailResponse(Order order) {
        List<OrderItemResponse> itemResponses = order.getItems().stream()
                .map(OrderMapper::toOrderItemResponse)
                .toList();

        List<PaymentTransactionResponse> paymentResponses = order.getPaymentTransactions().stream()
                .map(OrderMapper::toPaymentTransactionResponse)
                .toList();

        List<OrderStatusLogResponse> logResponses = order.getStatusLogs().stream()
                .map(OrderMapper::toOrderStatusLogResponse)
                .toList();

        return OrderDetailResponse.builder()
                .id(order.getId())
                .orderCode(order.getOrderCode())
                .customerId(order.getCustomerId())
                .orderType(order.getOrderType())
                .status(order.getStatus())
                .recipientName(order.getRecipientName())
                .recipientPhone(order.getRecipientPhone())
                .shippingAddress(order.getShippingAddress())
                .customerNote(order.getCustomerNote())
                .subtotalAmount(order.getSubtotalAmount())
                .discountAmount(order.getDiscountAmount())
                .vatRate(order.getVatRate())
                .vatAmount(order.getVatAmount())
                .totalAmount(order.getTotalAmount())
                .depositRequiredAmount(order.getDepositRequiredAmount())
                .paidAmount(order.getPaidAmount())
                .requiresVatInvoice(order.isRequiresVatInvoice())
                .vatCompanyName(order.getVatCompanyName())
                .vatTaxCode(order.getVatTaxCode())
                .vatCompanyAddress(order.getVatCompanyAddress())
                .vatInvoiceNumber(order.getVatInvoiceNumber())
                .productionWorkerNote(order.getProductionWorkerNote())
                .estimatedCompletionDate(order.getEstimatedCompletionDate())
                .createdAt(order.getCreatedAt())
                .updatedAt(order.getUpdatedAt())
                .items(itemResponses)
                .paymentTransactions(paymentResponses)
                .statusLogs(logResponses)
                .build();
    }

    public static OrderItemResponse toOrderItemResponse(OrderItem item) {
        return OrderItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .itemName(item.getItemName())
                .materialId(item.getMaterialId())
                .materialNameSnapshot(item.getMaterialNameSnapshot())
                .processingMethodId(item.getProcessingMethodId())
                .processingNameSnapshot(item.getProcessingNameSnapshot())
                .widthMm(item.getWidthMm())
                .heightMm(item.getHeightMm())
                .thicknessMm(item.getThicknessMm())
                .calculatedWeightKg(item.getCalculatedWeightKg())
                .systemUnitPrice(item.getSystemUnitPrice())
                .finalUnitPrice(item.getFinalUnitPrice())
                .quantity(item.getQuantity())
                .lineTotal(item.getLineTotal())
                .designFileUrl(item.getDesignFileUrl())
                .prototypeImageUrl(item.getPrototypeImageUrl())
                .build();
    }

    public static PaymentTransactionResponse toPaymentTransactionResponse(PaymentTransaction tx) {
        return PaymentTransactionResponse.builder()
                .id(tx.getId())
                .paymentPhase(tx.getPaymentPhase())
                .paymentMethod(tx.getPaymentMethod())
                .amount(tx.getAmount())
                .status(tx.getStatus())
                .transactionRef(tx.getTransactionRef())
                .proofImageUrl(tx.getProofImageUrl())
                .verifiedAt(tx.getVerifiedAt())
                .createdAt(tx.getCreatedAt())
                .build();
    }

    public static OrderStatusLogResponse toOrderStatusLogResponse(OrderStatusLog log) {
        return OrderStatusLogResponse.builder()
                .id(log.getId())
                .fromStatus(log.getFromStatus())
                .toStatus(log.getToStatus())
                .changedByUserId(log.getChangedByUserId())
                .note(log.getNote())
                .createdAt(log.getCreatedAt())
                .build();
    }
}
