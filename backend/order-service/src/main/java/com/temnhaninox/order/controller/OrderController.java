package com.temnhaninox.order.controller;

import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.order.dto.CheckoutRequest;
import com.temnhaninox.order.dto.OrderActionRequest;
import com.temnhaninox.order.dto.OrderDetailResponse;
import com.temnhaninox.order.dto.OrderSummaryResponse;
import com.temnhaninox.order.dto.PaymentTransactionResponse;
import com.temnhaninox.order.dto.SubmitPaymentProofRequest;
import com.temnhaninox.order.service.OrderService;
import com.temnhaninox.order.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final PaymentService paymentService;

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> checkout(
            @RequestHeader("X-User-Id") UUID customerId,
            @Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Order created successfully",
                        orderService.checkout(customerId, request)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<OrderSummaryResponse>>> getCustomerOrders(
            @RequestHeader("X-User-Id") UUID customerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getCustomerOrders(customerId, page, size)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getCustomerOrderDetail(
            @RequestHeader("X-User-Id") UUID customerId,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(orderService.getCustomerOrderDetail(customerId, id)));
    }

    @PostMapping("/{id}/approve-prototype")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> approvePrototype(
            @RequestHeader("X-User-Id") UUID customerId,
            @PathVariable UUID id,
            @RequestBody(required = false) OrderActionRequest request) {
        String note = request != null ? request.getNote() : null;
        return ResponseEntity.ok(ApiResponse.ok("Prototype approved successfully",
                orderService.approvePrototype(customerId, id, note)));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> cancelOrder(
            @RequestHeader("X-User-Id") UUID customerId,
            @PathVariable UUID id,
            @RequestBody(required = false) OrderActionRequest request) {
        String note = request != null ? request.getNote() : null;
        return ResponseEntity.ok(ApiResponse.ok("Order cancelled successfully",
                orderService.cancelOrder(customerId, id, note)));
    }

    @PostMapping("/{id}/payments/proof")
    public ResponseEntity<ApiResponse<PaymentTransactionResponse>> submitPaymentProof(
            @RequestHeader("X-User-Id") UUID customerId,
            @PathVariable UUID id,
            @Valid @RequestBody SubmitPaymentProofRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Payment proof submitted successfully",
                        paymentService.submitPaymentProof(customerId, id, request)));
    }
}
