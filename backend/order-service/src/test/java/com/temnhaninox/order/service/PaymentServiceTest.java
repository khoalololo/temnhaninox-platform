package com.temnhaninox.order.service;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
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
import com.temnhaninox.order.entity.PaymentTransaction;
import com.temnhaninox.order.repository.OrderRepository;
import com.temnhaninox.order.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final String TMN_CODE = "TEST_TMN";
    private static final String HASH_SECRET = "TEST_SECRET_KEY_1234567890ABCDEF";
    private static final String RETURN_URL = "http://localhost:4200/payment/vnpay-return";
    private static final String PAY_URL = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private TelegramNotificationService telegramNotificationService;

    private PaymentService paymentService;

    private UUID customerId;
    private UUID orderId;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(
                orderRepository,
                paymentTransactionRepository,
                telegramNotificationService,
                TMN_CODE,
                HASH_SECRET,
                RETURN_URL,
                PAY_URL
        );
        customerId = UUID.randomUUID();
        orderId = UUID.randomUUID();
    }

    @Test
    void submitPaymentProof_createsPendingTransactionAndNotifiesTelegram() {
        Order order = Order.builder()
                .id(orderId)
                .orderCode("TNI-20261124-0001")
                .customerId(customerId)
                .orderType(OrderType.CUSTOM_QUOTE_ORDER)
                .status(OrderStatus.AWAITING_DEPOSIT)
                .depositRequiredAmount(new BigDecimal("500000.00"))
                .paidAmount(BigDecimal.ZERO)
                .paymentTransactions(new ArrayList<>())
                .statusLogs(new ArrayList<>())
                .build();

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        SubmitPaymentProofRequest request = SubmitPaymentProofRequest.builder()
                .paymentPhase(PaymentPhase.DEPOSIT_50)
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .amount(new BigDecimal("500000.00"))
                .transactionRef("VCB-123456")
                .proofImageUrl("https://s3.local/proofs/receipt.png")
                .build();

        PaymentTransactionResponse response = paymentService.submitPaymentProof(customerId, orderId, request);

        assertThat(response.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(response.getPaymentMethod()).isEqualTo(PaymentMethod.BANK_TRANSFER);
        assertThat(response.getAmount()).isEqualByComparingTo("500000.00");
        verify(telegramNotificationService).notifyPaymentProofSubmitted(any(Order.class), any(PaymentTransaction.class));
    }

    @Test
    void createVnpayUrl_generatesValidSignedRedirectUrl() {
        Order order = Order.builder()
                .id(orderId)
                .orderCode("TNI-20261124-0002")
                .customerId(customerId)
                .orderType(OrderType.CUSTOM_QUOTE_ORDER)
                .status(OrderStatus.AWAITING_DEPOSIT)
                .totalAmount(new BigDecimal("1000000.00"))
                .depositRequiredAmount(new BigDecimal("500000.00"))
                .paidAmount(BigDecimal.ZERO)
                .paymentTransactions(new ArrayList<>())
                .statusLogs(new ArrayList<>())
                .build();

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        VnpayCreateUrlRequest request = VnpayCreateUrlRequest.builder()
                .orderId(orderId)
                .paymentPhase(PaymentPhase.DEPOSIT_50)
                .build();

        VnpayCreateUrlResponse response = paymentService.createVnpayUrl(customerId, request, "127.0.0.1");

        assertThat(response.getAmount()).isEqualByComparingTo("500000.00");
        assertThat(response.getTransactionRef()).startsWith("TNI-20261124-0002-");
        assertThat(response.getPaymentUrl()).startsWith(PAY_URL + "?");
        assertThat(response.getPaymentUrl()).contains("vnp_TmnCode=" + TMN_CODE);
        assertThat(response.getPaymentUrl()).contains("vnp_Amount=50000000");
        assertThat(response.getPaymentUrl()).contains("&vnp_SecureHash=");
    }

    @Test
    void handleVnpayReturn_validSignatureAnd00Code_verifiesAndAdvancesToInProduction() {
        String txnRef = "TNI-20261124-0002-999";
        Order order = Order.builder()
                .id(orderId)
                .orderCode("TNI-20261124-0002")
                .customerId(customerId)
                .status(OrderStatus.AWAITING_DEPOSIT)
                .depositRequiredAmount(new BigDecimal("500000.00"))
                .paidAmount(BigDecimal.ZERO)
                .paymentTransactions(new ArrayList<>())
                .statusLogs(new ArrayList<>())
                .build();

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .paymentPhase(PaymentPhase.DEPOSIT_50)
                .paymentMethod(PaymentMethod.VNPAY_SANDBOX)
                .amount(new BigDecimal("500000.00"))
                .status(PaymentStatus.PENDING)
                .transactionRef(txnRef)
                .build();
        order.addPaymentTransaction(tx);

        when(paymentTransactionRepository.findByTransactionRef(txnRef)).thenReturn(Optional.of(tx));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Amount", "50000000");
        params.put("vnp_ResponseCode", "00");
        params.put("vnp_TmnCode", TMN_CODE);
        params.put("vnp_TxnRef", txnRef);
        String validHash = PaymentService.hmacSha512(HASH_SECRET, PaymentService.buildQueryString(params));
        params.put("vnp_SecureHash", validHash);

        VnpayReturnResponse response = paymentService.handleVnpayReturn(params);

        assertThat(response.isVerified()).isTrue();
        assertThat(response.getPaymentStatus()).isEqualTo(PaymentStatus.VERIFIED);
        assertThat(response.getOrderStatus()).isEqualTo(OrderStatus.IN_PRODUCTION);
        assertThat(order.getPaidAmount()).isEqualByComparingTo("500000.00");
        assertThat(order.getStatusLogs()).hasSize(1);
    }

    @Test
    void handleVnpayReturn_invalidSignature_throwsValidationError() {
        Map<String, String> params = Map.of(
                "vnp_TxnRef", "TNI-20261124-0002-999",
                "vnp_ResponseCode", "00",
                "vnp_SecureHash", "tampered_hash_value"
        );

        assertThatThrownBy(() -> paymentService.handleVnpayReturn(params))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    // ---- IPN (server-to-server) ----

    private PaymentTransaction pendingTx(Order order, String txnRef) {
        PaymentTransaction tx = PaymentTransaction.builder()
                .id(UUID.randomUUID())
                .paymentPhase(PaymentPhase.DEPOSIT_50)
                .paymentMethod(PaymentMethod.VNPAY_SANDBOX)
                .amount(new BigDecimal("500000.00"))
                .status(PaymentStatus.PENDING)
                .transactionRef(txnRef)
                .build();
        order.addPaymentTransaction(tx);
        return tx;
    }

    private Order awaitingDepositOrder() {
        return Order.builder()
                .id(orderId)
                .orderCode("TNI-20261124-0003")
                .customerId(customerId)
                .status(OrderStatus.AWAITING_DEPOSIT)
                .depositRequiredAmount(new BigDecimal("500000.00"))
                .paidAmount(BigDecimal.ZERO)
                .paymentTransactions(new ArrayList<>())
                .statusLogs(new ArrayList<>())
                .build();
    }

    private Map<String, String> signed(String txnRef, String amount, String code) {
        Map<String, String> params = new TreeMap<>();
        params.put("vnp_Amount", amount);
        params.put("vnp_ResponseCode", code);
        params.put("vnp_TmnCode", TMN_CODE);
        params.put("vnp_TxnRef", txnRef);
        params.put("vnp_SecureHash", PaymentService.hmacSha512(HASH_SECRET, PaymentService.buildQueryString(params)));
        return params;
    }

    @Test
    void ipn_validPayment_confirmsAndIsIdempotentOnReplay() {
        Order order = awaitingDepositOrder();
        PaymentTransaction tx = pendingTx(order, "REF-IPN-1");
        when(paymentTransactionRepository.findByTransactionRef("REF-IPN-1")).thenReturn(Optional.of(tx));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> params = signed("REF-IPN-1", "50000000", "00");
        assertThat(paymentService.handleVnpayIpn(params)).containsEntry("RspCode", "00");
        assertThat(order.getStatus()).isEqualTo(OrderStatus.IN_PRODUCTION);
        assertThat(order.getPaidAmount()).isEqualByComparingTo("500000.00");

        // VNPAY retries / browser return afterwards must not double-count
        assertThat(paymentService.handleVnpayIpn(params)).containsEntry("RspCode", "02");
        assertThat(order.getPaidAmount()).isEqualByComparingTo("500000.00");
        paymentService.handleVnpayReturn(params);
        assertThat(order.getPaidAmount()).isEqualByComparingTo("500000.00");
    }

    @Test
    void ipn_amountMismatch_isRejectedAndOrderUntouched() {
        Order order = awaitingDepositOrder();
        PaymentTransaction tx = pendingTx(order, "REF-IPN-2");
        when(paymentTransactionRepository.findByTransactionRef("REF-IPN-2")).thenReturn(Optional.of(tx));

        Map<String, String> result = paymentService.handleVnpayIpn(signed("REF-IPN-2", "100", "00"));

        assertThat(result).containsEntry("RspCode", "04");
        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.AWAITING_DEPOSIT);
    }

    @Test
    void ipn_badSignatureAndUnknownRef() {
        assertThat(paymentService.handleVnpayIpn(Map.of("vnp_TxnRef", "X", "vnp_SecureHash", "bad")))
                .containsEntry("RspCode", "97");
        when(paymentTransactionRepository.findByTransactionRef("NOPE")).thenReturn(Optional.empty());
        assertThat(paymentService.handleVnpayIpn(signed("NOPE", "100", "00"))).containsEntry("RspCode", "01");
    }

    @Test
    void return_successCodeWithWrongAmount_doesNotVerify() {
        Order order = awaitingDepositOrder();
        PaymentTransaction tx = pendingTx(order, "REF-RET-1");
        when(paymentTransactionRepository.findByTransactionRef("REF-RET-1")).thenReturn(Optional.of(tx));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        VnpayReturnResponse r = paymentService.handleVnpayReturn(signed("REF-RET-1", "100", "00"));

        assertThat(r.isVerified()).isFalse();
        assertThat(order.getPaidAmount()).isEqualByComparingTo("0");
    }
}
