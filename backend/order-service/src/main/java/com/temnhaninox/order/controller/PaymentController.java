package com.temnhaninox.order.controller;

import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.order.dto.VnpayCreateUrlRequest;
import com.temnhaninox.order.dto.VnpayCreateUrlResponse;
import com.temnhaninox.order.dto.VnpayReturnResponse;
import com.temnhaninox.order.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @PostMapping("/vnpay/create-url")
    public ResponseEntity<ApiResponse<VnpayCreateUrlResponse>> createVnpayUrl(
            @RequestHeader("X-User-Id") UUID customerId,
            @Valid @RequestBody VnpayCreateUrlRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        return ResponseEntity.ok(ApiResponse.ok(
                paymentService.createVnpayUrl(customerId, request, clientIp)));
    }

    @GetMapping("/vnpay-return")
    public ResponseEntity<ApiResponse<VnpayReturnResponse>> handleVnpayReturn(
            @RequestParam Map<String, String> params) {
        return ResponseEntity.ok(ApiResponse.ok(paymentService.handleVnpayReturn(params)));
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
