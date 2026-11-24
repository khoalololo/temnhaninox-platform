package com.temnhaninox.order.service;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.PaymentMethod;
import com.temnhaninox.common.enums.PaymentPhase;
import com.temnhaninox.common.enums.PaymentStatus;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.dto.PaymentTransactionResponse;
import com.temnhaninox.order.dto.SubmitPaymentProofRequest;
import com.temnhaninox.order.dto.VnpayCreateUrlRequest;
import com.temnhaninox.order.dto.VnpayCreateUrlResponse;
import com.temnhaninox.order.dto.VnpayReturnResponse;
import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.entity.OrderStatusLog;
import com.temnhaninox.order.entity.PaymentTransaction;
import com.temnhaninox.order.repository.OrderRepository;
import com.temnhaninox.order.repository.PaymentTransactionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

@Service
public class PaymentService {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final TelegramNotificationService telegramNotificationService;
    private final String vnpTmnCode;
    private final String vnpHashSecret;
    private final String vnpReturnUrl;
    private final String vnpPayUrl;

    public PaymentService(
            OrderRepository orderRepository,
            PaymentTransactionRepository paymentTransactionRepository,
            TelegramNotificationService telegramNotificationService,
            @Value("${app.vnpay.tmn-code:DEMO_TMN_CODE}") String vnpTmnCode,
            @Value("${app.vnpay.hash-secret:DEMO_HASH_SECRET_KEY_1234567890}") String vnpHashSecret,
            @Value("${app.vnpay.return-url:http://localhost:4200/payment/vnpay-return}") String vnpReturnUrl,
            @Value("${app.vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") String vnpPayUrl) {
        this.orderRepository = orderRepository;
        this.paymentTransactionRepository = paymentTransactionRepository;
        this.telegramNotificationService = telegramNotificationService;
        this.vnpTmnCode = vnpTmnCode;
        this.vnpHashSecret = vnpHashSecret;
        this.vnpReturnUrl = vnpReturnUrl;
        this.vnpPayUrl = vnpPayUrl;
    }

    @Transactional
    public PaymentTransactionResponse submitPaymentProof(
            UUID customerId,
            UUID orderId,
            SubmitPaymentProofRequest request) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (!customerId.equals(order.getCustomerId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You do not have permission to submit payment for this order");
        }
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Cannot submit payment proof for order in status " + order.getStatus());
        }

        PaymentMethod method = request.getPaymentMethod() != null
                ? request.getPaymentMethod()
                : PaymentMethod.BANK_TRANSFER;
        if (method != PaymentMethod.BANK_TRANSFER && method != PaymentMethod.CASH) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Manual payment proof only supports BANK_TRANSFER or CASH");
        }
        if (method == PaymentMethod.BANK_TRANSFER
                && (request.getProofImageUrl() == null || request.getProofImageUrl().isBlank())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "proofImageUrl is required for BANK_TRANSFER payment proof");
        }

        PaymentTransaction tx = PaymentTransaction.builder()
                .paymentPhase(request.getPaymentPhase())
                .paymentMethod(method)
                .amount(request.getAmount().setScale(2, RoundingMode.HALF_UP))
                .status(PaymentStatus.PENDING)
                .transactionRef(trimOrNull(request.getTransactionRef()))
                .proofImageUrl(trimOrNull(request.getProofImageUrl()))
                .build();

        order.addPaymentTransaction(tx);
        orderRepository.save(order);

        telegramNotificationService.notifyPaymentProofSubmitted(order, tx);

        return OrderMapper.toPaymentTransactionResponse(tx);
    }

    @Transactional
    public VnpayCreateUrlResponse createVnpayUrl(
            UUID customerId,
            VnpayCreateUrlRequest request,
            String clientIp) {

        Order order = orderRepository.findById(request.getOrderId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (!customerId.equals(order.getCustomerId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You do not have permission to pay for this order");
        }
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.COMPLETED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Cannot initiate VNPAY payment for order in status " + order.getStatus());
        }

        PaymentPhase phase = request.getPaymentPhase() != null
                ? request.getPaymentPhase()
                : PaymentPhase.DEPOSIT_50;

        BigDecimal amount = resolveVnpayAmount(order, phase, request.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Payment amount must be greater than 0");
        }

        String txnRef = order.getOrderCode() + "-" + System.currentTimeMillis();

        PaymentTransaction tx = PaymentTransaction.builder()
                .paymentPhase(phase)
                .paymentMethod(PaymentMethod.VNPAY_SANDBOX)
                .amount(amount)
                .status(PaymentStatus.PENDING)
                .transactionRef(txnRef)
                .build();

        order.addPaymentTransaction(tx);
        orderRepository.save(order);

        Map<String, String> vnpParams = new TreeMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", vnpTmnCode);
        vnpParams.put("vnp_Amount", String.valueOf(amount.multiply(BigDecimal.valueOf(100)).longValue()));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", txnRef);
        vnpParams.put("vnp_OrderInfo", "Thanh toan don hang " + order.getOrderCode());
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", vnpReturnUrl);
        vnpParams.put("vnp_IpAddr", (clientIp != null && !clientIp.isBlank()) ? clientIp : "127.0.0.1");
        vnpParams.put("vnp_CreateDate", LocalDateTime.now(VN_ZONE).format(VNPAY_DATE_FORMAT));

        String query = buildQueryString(vnpParams);
        String secureHash = hmacSha512(vnpHashSecret, query);
        String paymentUrl = vnpPayUrl + "?" + query + "&vnp_SecureHash=" + secureHash;

        return VnpayCreateUrlResponse.builder()
                .paymentUrl(paymentUrl)
                .transactionRef(txnRef)
                .orderId(order.getId())
                .amount(amount)
                .build();
    }

    @Transactional
    public VnpayReturnResponse handleVnpayReturn(Map<String, String> params) {
        if (params == null || params.isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Missing VNPAY callback parameters");
        }

        String receivedHash = params.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Missing vnp_SecureHash");
        }

        Map<String, String> sortedParams = new TreeMap<>();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (key != null && value != null && !value.isBlank()
                    && !key.equals("vnp_SecureHash") && !key.equals("vnp_SecureHashType")) {
                sortedParams.put(key, value);
            }
        }

        String hashData = buildQueryString(sortedParams);
        String expectedHash = hmacSha512(vnpHashSecret, hashData);

        if (!MessageDigest.isEqual(
                expectedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8),
                receivedHash.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Invalid VNPAY signature");
        }

        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Missing vnp_TxnRef");
        }

        PaymentTransaction tx = paymentTransactionRepository.findByTransactionRef(txnRef)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Payment transaction not found for ref: " + txnRef));

        Order order = tx.getOrder();
        String responseCode = params.getOrDefault("vnp_ResponseCode", "");
        boolean isSuccess = "00".equals(responseCode);

        if (tx.getStatus() == PaymentStatus.PENDING) {
            if (isSuccess) {
                tx.setStatus(PaymentStatus.VERIFIED);
                tx.setVerifiedAt(Instant.now());
                order.setPaidAmount(order.getPaidAmount().add(tx.getAmount()).setScale(2, RoundingMode.HALF_UP));

                if (order.getStatus() == OrderStatus.AWAITING_DEPOSIT
                        && order.getPaidAmount().compareTo(order.getDepositRequiredAmount()) >= 0) {
                    order.setStatus(OrderStatus.IN_PRODUCTION);
                    order.addStatusLog(OrderStatusLog.builder()
                            .fromStatus(OrderStatus.AWAITING_DEPOSIT)
                            .toStatus(OrderStatus.IN_PRODUCTION)
                            .changedByUserId(order.getCustomerId())
                            .note("Auto-advanced to IN_PRODUCTION after VNPAY payment verification")
                            .build());
                }
            } else {
                tx.setStatus(PaymentStatus.FAILED);
            }
            orderRepository.save(order);
        }

        return VnpayReturnResponse.builder()
                .verified(tx.getStatus() == PaymentStatus.VERIFIED)
                .orderId(order.getId())
                .orderCode(order.getOrderCode())
                .transactionRef(txnRef)
                .responseCode(responseCode)
                .paymentStatus(tx.getStatus())
                .orderStatus(order.getStatus())
                .amount(tx.getAmount())
                .message(tx.getStatus() == PaymentStatus.VERIFIED
                        ? "VNPAY payment verified successfully"
                        : "VNPAY payment failed or cancelled")
                .build();
    }

    public static String buildQueryString(Map<String, String> sortedParams) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : sortedParams.entrySet()) {
            if (entry.getValue() == null || entry.getValue().isEmpty()) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            sb.append('=');
            sb.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    public static String hmacSha512(String key, String data) {
        try {
            Mac hmac512 = Mac.getInstance("HmacSHA512");
            SecretKeySpec secretKey = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512");
            hmac512.init(secretKey);
            byte[] bytes = hmac512.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(bytes.length * 2);
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to compute HMAC-SHA512", ex);
        }
    }

    private BigDecimal resolveVnpayAmount(Order order, PaymentPhase phase, BigDecimal requestedAmount) {
        if (requestedAmount != null) {
            return requestedAmount.setScale(2, RoundingMode.HALF_UP);
        }
        if (phase == PaymentPhase.DEPOSIT_50) {
            return order.getDepositRequiredAmount().subtract(order.getPaidAmount())
                    .max(BigDecimal.ZERO)
                    .setScale(2, RoundingMode.HALF_UP);
        }
        return order.getTotalAmount().subtract(order.getPaidAmount())
                .max(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private String trimOrNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }
}
