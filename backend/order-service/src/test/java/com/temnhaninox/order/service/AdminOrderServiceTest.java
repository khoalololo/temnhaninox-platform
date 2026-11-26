package com.temnhaninox.order.service;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import com.temnhaninox.common.enums.PaymentMethod;
import com.temnhaninox.common.enums.PaymentPhase;
import com.temnhaninox.common.enums.PaymentStatus;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.dto.AdminDashboardSummaryResponse;
import com.temnhaninox.order.dto.AdminQuoteItemPriceUpdate;
import com.temnhaninox.order.dto.AdminQuoteReviewRequest;
import com.temnhaninox.order.dto.AdminUpdateOrderStatusRequest;
import com.temnhaninox.order.dto.AdminVerifyPaymentRequest;
import com.temnhaninox.order.dto.AttachPrototypeRequest;
import com.temnhaninox.order.dto.OrderDetailResponse;
import com.temnhaninox.order.dto.UpdateVatInvoiceRequest;
import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.entity.OrderItem;
import com.temnhaninox.order.entity.PaymentTransaction;
import com.temnhaninox.order.repository.OrderRepository;
import com.temnhaninox.order.repository.PaymentTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminOrderServiceTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;

    @InjectMocks
    private AdminOrderService adminOrderService;

    private UUID adminId;
    private UUID orderId;
    private UUID itemId;

    @BeforeEach
    void setUp() {
        adminId = UUID.randomUUID();
        orderId = UUID.randomUUID();
        itemId = UUID.randomUUID();
    }

    @Test
    void getAdminOrders_usesEmptySearchInsteadOfNullWhenSearchIsOmitted() {
        when(orderRepository.searchAdminOrders(any(), any(), any(), any())).thenReturn(Page.empty());

        adminOrderService.getAdminOrders(null, null, null, 0, 20);

        verify(orderRepository).searchAdminOrders(null, null, "", PageRequest.of(0, 20));
    }

    @Test
    void reviewQuote_overridesItemPrice_recalculatesTotalsAndAdvancesToQuoteApproved() {
        OrderItem item = OrderItem.builder()
                .id(itemId)
                .itemName("Custom Inox 304")
                .systemUnitPrice(new BigDecimal("20000.00"))
                .finalUnitPrice(new BigDecimal("20000.00"))
                .quantity(100)
                .lineTotal(new BigDecimal("2000000.00"))
                .build();

        Order order = baseOrder(OrderStatus.QUOTE_PENDING, OrderType.CUSTOM_QUOTE_ORDER, true);
        order.addItem(item);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminQuoteReviewRequest request = AdminQuoteReviewRequest.builder()
                .items(List.of(AdminQuoteItemPriceUpdate.builder()
                        .orderItemId(itemId)
                        .finalUnitPrice(new BigDecimal("18000.00"))
                        .build()))
                .estimatedCompletionDate(LocalDate.of(2026, 12, 1))
                .adminInternalNote("VIP discount applied")
                .build();

        OrderDetailResponse response = adminOrderService.reviewQuote(adminId, orderId, request);

        assertThat(response.getStatus()).isEqualTo(OrderStatus.QUOTE_APPROVED);
        assertThat(response.getSubtotalAmount()).isEqualByComparingTo("1800000.00");
        assertThat(response.getVatAmount()).isEqualByComparingTo("180000.00");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("1980000.00");
        assertThat(response.getDepositRequiredAmount()).isEqualByComparingTo("990000.00");
        assertThat(response.getEstimatedCompletionDate()).isEqualTo(LocalDate.of(2026, 12, 1));
        assertThat(response.getStatusLogs()).hasSize(1);
        assertThat(response.getStatusLogs().get(0).getFromStatus()).isEqualTo(OrderStatus.QUOTE_PENDING);
        assertThat(response.getStatusLogs().get(0).getToStatus()).isEqualTo(OrderStatus.QUOTE_APPROVED);
    }

    @Test
    void attachPrototypeImage_inQuoteApproved_setsUrlAndMovesToPrototyping() {
        OrderItem item = OrderItem.builder()
                .id(itemId)
                .itemName("Custom Inox 304")
                .systemUnitPrice(new BigDecimal("20000.00"))
                .finalUnitPrice(new BigDecimal("20000.00"))
                .quantity(10)
                .lineTotal(new BigDecimal("200000.00"))
                .build();

        Order order = baseOrder(OrderStatus.QUOTE_APPROVED, OrderType.CUSTOM_QUOTE_ORDER, false);
        order.addItem(item);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDetailResponse response = adminOrderService.attachPrototypeImage(
                adminId, orderId, itemId,
                AttachPrototypeRequest.builder()
                        .prototypeImageUrl("https://s3.local/prototypes/sample1.jpg")
                        .build());

        assertThat(response.getStatus()).isEqualTo(OrderStatus.PROTOTYPING);
        assertThat(response.getItems().get(0).getPrototypeImageUrl())
                .isEqualTo("https://s3.local/prototypes/sample1.jpg");
        assertThat(response.getStatusLogs()).hasSize(1);
        assertThat(response.getStatusLogs().get(0).getToStatus()).isEqualTo(OrderStatus.PROTOTYPING);
    }

    @Test
    void updateOrderStatus_toInProductionBeforeDepositPaid_throwsValidationError() {
        Order order = baseOrder(OrderStatus.AWAITING_DEPOSIT, OrderType.CUSTOM_QUOTE_ORDER, false);
        order.setDepositRequiredAmount(new BigDecimal("500000.00"));
        order.setPaidAmount(new BigDecimal("100000.00"));

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        AdminUpdateOrderStatusRequest request = AdminUpdateOrderStatusRequest.builder()
                .targetStatus(OrderStatus.IN_PRODUCTION)
                .build();

        assertThatThrownBy(() -> adminOrderService.updateOrderStatus(adminId, orderId, request))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void updateOrderStatus_inProductionToReadyForDelivery_savesWorkerNote() {
        Order order = baseOrder(OrderStatus.IN_PRODUCTION, OrderType.CUSTOM_QUOTE_ORDER, false);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminUpdateOrderStatusRequest request = AdminUpdateOrderStatusRequest.builder()
                .targetStatus(OrderStatus.READY_FOR_DELIVERY)
                .productionWorkerNote("CNC batch #12 finished & QC passed")
                .build();

        OrderDetailResponse response = adminOrderService.updateOrderStatus(adminId, orderId, request);

        assertThat(response.getStatus()).isEqualTo(OrderStatus.READY_FOR_DELIVERY);
        assertThat(response.getProductionWorkerNote()).isEqualTo("CNC batch #12 finished & QC passed");
        assertThat(response.getStatusLogs()).hasSize(1);
    }

    @Test
    void updateOrderStatus_invalidTransition_throwsValidationError() {
        Order order = baseOrder(OrderStatus.COMPLETED, OrderType.CUSTOM_QUOTE_ORDER, false);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        AdminUpdateOrderStatusRequest request = AdminUpdateOrderStatusRequest.builder()
                .targetStatus(OrderStatus.CANCELLED)
                .build();

        assertThatThrownBy(() -> adminOrderService.updateOrderStatus(adminId, orderId, request))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void verifyPayment_verifiedDeposit_incrementsPaidAmountAndAutoAdvancesToInProduction() {
        UUID paymentId = UUID.randomUUID();
        Order order = baseOrder(OrderStatus.AWAITING_DEPOSIT, OrderType.CUSTOM_QUOTE_ORDER, false);
        order.setDepositRequiredAmount(new BigDecimal("500000.00"));
        order.setPaidAmount(BigDecimal.ZERO);

        PaymentTransaction tx = PaymentTransaction.builder()
                .id(paymentId)
                .paymentPhase(PaymentPhase.DEPOSIT_50)
                .paymentMethod(PaymentMethod.BANK_TRANSFER)
                .amount(new BigDecimal("500000.00"))
                .status(PaymentStatus.PENDING)
                .proofImageUrl("https://s3.local/receipts/tx1.jpg")
                .build();
        order.addPaymentTransaction(tx);

        when(paymentTransactionRepository.findById(paymentId)).thenReturn(Optional.of(tx));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> inv.getArgument(0));

        OrderDetailResponse response = adminOrderService.verifyPayment(
                adminId, paymentId,
                AdminVerifyPaymentRequest.builder().status(PaymentStatus.VERIFIED).build());

        assertThat(response.getPaidAmount()).isEqualByComparingTo("500000.00");
        assertThat(response.getStatus()).isEqualTo(OrderStatus.IN_PRODUCTION);
        assertThat(response.getPaymentTransactions().get(0).getStatus()).isEqualTo(PaymentStatus.VERIFIED);
        assertThat(response.getStatusLogs()).hasSize(1);
        assertThat(response.getStatusLogs().get(0).getToStatus()).isEqualTo(OrderStatus.IN_PRODUCTION);
    }

    @Test
    void updateVatInvoice_whenNotRequired_throwsValidationError() {
        Order order = baseOrder(OrderStatus.COMPLETED, OrderType.DIRECT_STORE_ORDER, false);
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> adminOrderService.updateVatInvoice(
                orderId, UpdateVatInvoiceRequest.builder().vatInvoiceNumber("HD-001").build()))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void getDashboardSummary_returnsKpiCountersAndMonthlyRevenue() {
        when(orderRepository.countByStatus(OrderStatus.QUOTE_PENDING)).thenReturn(3L);
        when(orderRepository.countByStatus(OrderStatus.AWAITING_DEPOSIT)).thenReturn(5L);
        when(orderRepository.countByStatus(OrderStatus.IN_PRODUCTION)).thenReturn(7L);
        when(orderRepository.countPendingVatInvoices()).thenReturn(2L);
        when(paymentTransactionRepository.sumVerifiedAmountBetween(any(Instant.class), any(Instant.class)))
                .thenReturn(new BigDecimal("15500000.00"));

        AdminDashboardSummaryResponse summary = adminOrderService.getDashboardSummary();

        assertThat(summary.getPendingQuotesCount()).isEqualTo(3L);
        assertThat(summary.getAwaitingDepositCount()).isEqualTo(5L);
        assertThat(summary.getInProductionCount()).isEqualTo(7L);
        assertThat(summary.getVatPendingCount()).isEqualTo(2L);
        assertThat(summary.getMonthlyRevenue()).isEqualByComparingTo("15500000.00");
    }

    private Order baseOrder(OrderStatus status, OrderType orderType, boolean requiresVat) {
        return Order.builder()
                .id(orderId)
                .orderCode("TNI-20261124-0001")
                .customerId(UUID.randomUUID())
                .orderType(orderType)
                .status(status)
                .recipientName("Nguyen Van A")
                .recipientPhone("0901234567")
                .shippingAddress("123 Le Loi")
                .subtotalAmount(new BigDecimal("1000000.00"))
                .discountAmount(BigDecimal.ZERO)
                .vatRate(requiresVat ? new BigDecimal("0.10") : BigDecimal.ZERO)
                .vatAmount(requiresVat ? new BigDecimal("100000.00") : BigDecimal.ZERO)
                .totalAmount(requiresVat ? new BigDecimal("1100000.00") : new BigDecimal("1000000.00"))
                .depositRequiredAmount(new BigDecimal("500000.00"))
                .paidAmount(BigDecimal.ZERO)
                .requiresVatInvoice(requiresVat)
                .items(new ArrayList<>())
                .paymentTransactions(new ArrayList<>())
                .statusLogs(new ArrayList<>())
                .build();
    }
}
