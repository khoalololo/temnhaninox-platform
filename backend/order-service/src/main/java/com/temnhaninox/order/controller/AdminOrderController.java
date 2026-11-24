package com.temnhaninox.order.controller;

import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.dto.AdminDashboardSummaryResponse;
import com.temnhaninox.order.dto.AdminQuoteReviewRequest;
import com.temnhaninox.order.dto.AdminUpdateOrderStatusRequest;
import com.temnhaninox.order.dto.AdminVerifyPaymentRequest;
import com.temnhaninox.order.dto.AttachPrototypeRequest;
import com.temnhaninox.order.dto.OrderDetailResponse;
import com.temnhaninox.order.dto.OrderSummaryResponse;
import com.temnhaninox.order.dto.UpdateVatInvoiceRequest;
import com.temnhaninox.order.service.AdminOrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminOrderController {

    private final AdminOrderService adminOrderService;

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<PageResponse<OrderSummaryResponse>>> getAdminOrders(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(required = false) OrderType orderType,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok(
                adminOrderService.getAdminOrders(status, orderType, search, page, size)));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> getAdminOrderDetail(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @PathVariable UUID id) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok(adminOrderService.getAdminOrderDetail(id)));
    }

    @PatchMapping("/orders/{id}/quote")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> reviewQuote(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader("X-User-Id") UUID adminUserId,
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) AdminQuoteReviewRequest request) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok("Quote reviewed and approved",
                adminOrderService.reviewQuote(adminUserId, id, request)));
    }

    @PostMapping("/orders/{id}/items/{itemId}/prototype")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> attachPrototypeImage(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader("X-User-Id") UUID adminUserId,
            @PathVariable UUID id,
            @PathVariable UUID itemId,
            @Valid @RequestBody AttachPrototypeRequest request) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok("Prototype image attached",
                adminOrderService.attachPrototypeImage(adminUserId, id, itemId, request)));
    }

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> updateOrderStatus(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader("X-User-Id") UUID adminUserId,
            @PathVariable UUID id,
            @Valid @RequestBody AdminUpdateOrderStatusRequest request) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok("Order status updated",
                adminOrderService.updateOrderStatus(adminUserId, id, request)));
    }

    @PatchMapping("/orders/{id}/vat-invoice")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> updateVatInvoice(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateVatInvoiceRequest request) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok("VAT invoice number updated",
                adminOrderService.updateVatInvoice(id, request)));
    }

    @PatchMapping("/payments/{paymentId}/verify")
    public ResponseEntity<ApiResponse<OrderDetailResponse>> verifyPayment(
            @RequestHeader(value = "X-User-Role", required = false) String userRole,
            @RequestHeader("X-User-Id") UUID adminUserId,
            @PathVariable UUID paymentId,
            @Valid @RequestBody AdminVerifyPaymentRequest request) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok("Payment verification processed",
                adminOrderService.verifyPayment(adminUserId, paymentId, request)));
    }

    @GetMapping("/dashboard/summary")
    public ResponseEntity<ApiResponse<AdminDashboardSummaryResponse>> getDashboardSummary(
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        requireAdmin(userRole);
        return ResponseEntity.ok(ApiResponse.ok(adminOrderService.getDashboardSummary()));
    }

    private void requireAdmin(String userRole) {
        if (userRole == null || !"ADMIN".equalsIgnoreCase(userRole.trim())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Admin role is required");
        }
    }
}
