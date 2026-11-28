package com.temnhaninox.order.service;

import com.temnhaninox.common.dto.PageResponse;
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
import com.temnhaninox.order.dto.OrderSummaryResponse;
import com.temnhaninox.order.dto.UpdateVatInvoiceRequest;
import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.entity.OrderItem;
import com.temnhaninox.order.entity.OrderStatusLog;
import com.temnhaninox.order.entity.PaymentTransaction;
import com.temnhaninox.order.repository.OrderRepository;
import com.temnhaninox.order.repository.PaymentTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminOrderService {

    private static final BigDecimal VAT_RATE = new BigDecimal("0.10");
    private static final BigDecimal DEPOSIT_RATE = new BigDecimal("0.50");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orderRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> getAdminOrders(
            OrderStatus status,
            OrderType orderType,
            String search,
            int page,
            int size) {

        String normalizedSearch = isBlank(search) ? "" : search.trim().toLowerCase(Locale.ROOT);
        Page<Order> orderPage = orderRepository.searchAdminOrders(
                status, orderType, normalizedSearch, PageRequest.of(page, size));

        List<OrderSummaryResponse> content = orderPage.getContent().stream()
                .map(OrderMapper::toOrderSummaryResponse)
                .toList();

        return PageResponse.<OrderSummaryResponse>builder()
                .content(content)
                .page(orderPage.getNumber())
                .size(orderPage.getSize())
                .totalElements(orderPage.getTotalElements())
                .totalPages(orderPage.getTotalPages())
                .last(orderPage.isLast())
                .build();
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getAdminOrderDetail(UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));
        return OrderMapper.toOrderDetailResponse(order);
    }

    @Transactional
    public OrderDetailResponse reviewQuote(UUID adminUserId, UUID orderId, AdminQuoteReviewRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (order.getStatus() != OrderStatus.QUOTE_PENDING) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Quote review is only allowed when order status is QUOTE_PENDING, current: " + order.getStatus());
        }

        if (request != null && request.getItems() != null && !request.getItems().isEmpty()) {
            Map<UUID, OrderItem> itemMap = order.getItems().stream()
                    .collect(Collectors.toMap(OrderItem::getId, Function.identity()));

            for (AdminQuoteItemPriceUpdate itemUpdate : request.getItems()) {
                OrderItem item = itemMap.get(itemUpdate.getOrderItemId());
                if (item == null) {
                    throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                            "OrderItem not found in order: " + itemUpdate.getOrderItemId());
                }
                BigDecimal newUnitPrice = itemUpdate.getFinalUnitPrice().setScale(2, RoundingMode.HALF_UP);
                item.setFinalUnitPrice(newUnitPrice);
                item.setLineTotal(newUnitPrice
                        .multiply(BigDecimal.valueOf(item.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP));
            }

            BigDecimal subtotal = order.getItems().stream()
                    .map(OrderItem::getLineTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .setScale(2, RoundingMode.HALF_UP);
            BigDecimal vatAmount = order.isRequiresVatInvoice()
                    ? subtotal.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            BigDecimal totalAmount = subtotal.add(vatAmount).setScale(2, RoundingMode.HALF_UP);
            BigDecimal depositRequired = order.getOrderType() == OrderType.CUSTOM_QUOTE_ORDER
                    ? totalAmount.multiply(DEPOSIT_RATE).setScale(2, RoundingMode.HALF_UP)
                    : totalAmount;

            order.setSubtotalAmount(subtotal);
            order.setDiscountAmount(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
            order.setVatAmount(vatAmount);
            order.setTotalAmount(totalAmount);
            order.setDepositRequiredAmount(depositRequired);
        }

        if (request != null) {
            if (request.getEstimatedCompletionDate() != null) {
                order.setEstimatedCompletionDate(request.getEstimatedCompletionDate());
            }
            if (request.getAdminInternalNote() != null) {
                order.setAdminInternalNote(request.getAdminInternalNote().trim());
            }
        }

        order.setStatus(OrderStatus.QUOTE_APPROVED);
        order.addStatusLog(OrderStatusLog.builder()
                .fromStatus(OrderStatus.QUOTE_PENDING)
                .toStatus(OrderStatus.QUOTE_APPROVED)
                .changedByUserId(adminUserId)
                .note(request != null && !isBlank(request.getNote())
                        ? request.getNote().trim()
                        : "Admin approved quote")
                .build());

        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional
    public OrderDetailResponse attachPrototypeImage(
            UUID adminUserId,
            UUID orderId,
            UUID itemId,
            AttachPrototypeRequest request) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (order.getStatus() != OrderStatus.QUOTE_APPROVED && order.getStatus() != OrderStatus.PROTOTYPING) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Prototype image can only be attached in QUOTE_APPROVED or PROTOTYPING status, current: "
                            + order.getStatus());
        }

        OrderItem item = order.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "OrderItem not found in order: " + itemId));

        item.setPrototypeImageUrl(request.getPrototypeImageUrl().trim());

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.PROTOTYPING);
        order.addStatusLog(OrderStatusLog.builder()
                .fromStatus(previousStatus)
                .toStatus(OrderStatus.PROTOTYPING)
                .changedByUserId(adminUserId)
                .note(!isBlank(request.getNote())
                        ? request.getNote().trim()
                        : "Prototype image attached for item: " + item.getItemName())
                .build());

        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional
    public OrderDetailResponse updateOrderStatus(
            UUID adminUserId,
            UUID orderId,
            AdminUpdateOrderStatusRequest request) {

        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        OrderStatus current = order.getStatus();
        OrderStatus target = request.getTargetStatus();

        if (!isValidAdminTransition(current, target)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Invalid order status transition from " + current + " to " + target);
        }

        if (target == OrderStatus.IN_PRODUCTION
                && order.getPaidAmount().compareTo(order.getDepositRequiredAmount()) < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Cannot move order to IN_PRODUCTION before required deposit ("
                            + order.getDepositRequiredAmount() + ") is paid; current paidAmount="
                            + order.getPaidAmount());
        }

        if (target == OrderStatus.COMPLETED
                && order.getPaidAmount().compareTo(order.getTotalAmount()) < 0) {
            throw new BusinessException(ErrorCode.BALANCE_NOT_SETTLED,
                    "Cannot complete order before the full balance (" + order.getTotalAmount()
                            + ") is verified; current paidAmount=" + order.getPaidAmount());
        }

        if (request.getProductionWorkerNote() != null) {
            order.setProductionWorkerNote(request.getProductionWorkerNote().trim());
        }
        if (request.getCustomerProgressNote() != null) {
            order.setCustomerProgressNote(request.getCustomerProgressNote().trim());
        }
        if (request.getAdminInternalNote() != null) {
            order.setAdminInternalNote(request.getAdminInternalNote().trim());
        }

        order.setStatus(target);
        order.addStatusLog(OrderStatusLog.builder()
                .fromStatus(current)
                .toStatus(target)
                .changedByUserId(adminUserId)
                .note(!isBlank(request.getNote())
                        ? request.getNote().trim()
                        : "Admin updated status to " + target)
                .build());

        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional
    public OrderDetailResponse updateVatInvoice(UUID orderId, UpdateVatInvoiceRequest request) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (!order.isRequiresVatInvoice()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Order does not require a VAT invoice");
        }

        order.setVatInvoiceNumber(request.getVatInvoiceNumber().trim());
        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional
    public OrderDetailResponse verifyPayment(
            UUID adminUserId,
            UUID paymentId,
            AdminVerifyPaymentRequest request) {

        if (request.getStatus() != PaymentStatus.VERIFIED && request.getStatus() != PaymentStatus.FAILED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Payment verification status must be VERIFIED or FAILED");
        }

        PaymentTransaction tx = paymentTransactionRepository.findById(paymentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Payment transaction not found"));

        if (tx.getStatus() != PaymentStatus.PENDING) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Payment transaction is already processed with status: " + tx.getStatus());
        }

        Order order = tx.getOrder();
        if (tx.getPaymentMethod() == PaymentMethod.VNPAY_SANDBOX) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "VNPAY transactions are processed automatically and cannot be changed manually");
        }
        if (request.getStatus() == PaymentStatus.VERIFIED
                && tx.getPaymentMethod() == PaymentMethod.BANK_TRANSFER
                && isBlank(tx.getProofImageUrl())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "A bank transfer receipt is required before verifying payment");
        }
        if (request.getStatus() == PaymentStatus.VERIFIED && !isPaymentVerificationAllowed(order, tx)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Payment cannot be verified for order status " + order.getStatus()
                            + " and payment phase " + tx.getPaymentPhase());
        }

        tx.setStatus(request.getStatus());
        tx.setVerifiedAt(Instant.now());

        if (request.getStatus() == PaymentStatus.VERIFIED) {
            order.setPaidAmount(order.getPaidAmount().add(tx.getAmount()).setScale(2, RoundingMode.HALF_UP));

            if (order.getStatus() == OrderStatus.AWAITING_DEPOSIT
                    && order.getPaidAmount().compareTo(order.getDepositRequiredAmount()) >= 0) {
                order.setStatus(OrderStatus.IN_PRODUCTION);
                order.addStatusLog(OrderStatusLog.builder()
                        .fromStatus(OrderStatus.AWAITING_DEPOSIT)
                        .toStatus(OrderStatus.IN_PRODUCTION)
                        .changedByUserId(adminUserId)
                        .note(!isBlank(request.getNote())
                                ? request.getNote().trim()
                                : "Auto-advanced to IN_PRODUCTION after payment verification")
                        .build());
            }
        }

        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public AdminDashboardSummaryResponse getDashboardSummary() {
        LocalDate firstOfMonth = LocalDate.now(VN_ZONE).withDayOfMonth(1);
        Instant startOfMonth = firstOfMonth.atStartOfDay(VN_ZONE).toInstant();
        Instant endOfMonth = firstOfMonth.plusMonths(1).atStartOfDay(VN_ZONE).toInstant();

        BigDecimal monthlyRevenue = paymentTransactionRepository.sumVerifiedAmountBetween(startOfMonth, endOfMonth);

        return AdminDashboardSummaryResponse.builder()
                .pendingQuotesCount(orderRepository.countByStatus(OrderStatus.QUOTE_PENDING))
                .awaitingDepositCount(orderRepository.countByStatus(OrderStatus.AWAITING_DEPOSIT))
                .inProductionCount(orderRepository.countByStatus(OrderStatus.IN_PRODUCTION))
                .vatPendingCount(orderRepository.countPendingVatInvoices())
                .monthlyRevenue(monthlyRevenue != null ? monthlyRevenue : BigDecimal.ZERO)
                .build();
    }

    private boolean isValidAdminTransition(OrderStatus current, OrderStatus target) {
        if (current == null || target == null || current == target) {
            return false;
        }
        return switch (current) {
            case QUOTE_PENDING -> target == OrderStatus.CANCELLED;
            case QUOTE_APPROVED -> target == OrderStatus.PROTOTYPING
                    || target == OrderStatus.AWAITING_DEPOSIT
                    || target == OrderStatus.CANCELLED;
            case PROTOTYPING -> target == OrderStatus.AWAITING_DEPOSIT
                    || target == OrderStatus.CANCELLED;
            case AWAITING_DEPOSIT -> target == OrderStatus.IN_PRODUCTION
                    || target == OrderStatus.CANCELLED;
            case IN_PRODUCTION -> target == OrderStatus.READY_FOR_DELIVERY
                    || target == OrderStatus.CANCELLED;
            case READY_FOR_DELIVERY -> target == OrderStatus.COMPLETED
                    || target == OrderStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false;
        };
    }

    private boolean isPaymentVerificationAllowed(Order order, PaymentTransaction tx) {
        if (order.getOrderType() == OrderType.DIRECT_STORE_ORDER) {
            return order.getStatus() == OrderStatus.AWAITING_DEPOSIT
                    && tx.getPaymentPhase() == PaymentPhase.FULL_100;
        }
        return (order.getStatus() == OrderStatus.AWAITING_DEPOSIT
                && tx.getPaymentPhase() == PaymentPhase.DEPOSIT_50)
                || (order.getStatus() == OrderStatus.READY_FOR_DELIVERY
                && tx.getPaymentPhase() == PaymentPhase.BALANCE_50);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}