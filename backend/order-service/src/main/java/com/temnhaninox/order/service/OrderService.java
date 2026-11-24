package com.temnhaninox.order.service;

import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.dto.QuoteCalculationRequest;
import com.temnhaninox.common.dto.QuoteCalculationResponse;
import com.temnhaninox.common.enums.ItemType;
import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.client.CatalogPricingClient;
import com.temnhaninox.order.client.dto.CatalogMaterialDto;
import com.temnhaninox.order.client.dto.CatalogProcessingMethodDto;
import com.temnhaninox.order.client.dto.CatalogProductDto;
import com.temnhaninox.order.dto.CheckoutRequest;
import com.temnhaninox.order.dto.OrderDetailResponse;
import com.temnhaninox.order.dto.OrderSummaryResponse;
import com.temnhaninox.order.entity.Cart;
import com.temnhaninox.order.entity.CartItem;
import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.entity.OrderItem;
import com.temnhaninox.order.entity.OrderStatusLog;
import com.temnhaninox.order.repository.CartRepository;
import com.temnhaninox.order.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal VAT_RATE = new BigDecimal("0.10");
    private static final BigDecimal DEPOSIT_RATE = new BigDecimal("0.50");
    private static final DateTimeFormatter ORDER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OrderRepository orderRepository;
    private final CartRepository cartRepository;
    private final CatalogPricingClient catalogPricingClient;
    private final TelegramNotificationService telegramNotificationService;

    @Transactional
    public OrderDetailResponse checkout(UUID customerId, CheckoutRequest request) {
        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VALIDATION_ERROR, "Cart is empty"));

        if (cart.getItems() == null || cart.getItems().isEmpty()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Cart is empty");
        }

        validateVatDetails(request);

        boolean hasCustomItem = cart.getItems().stream()
                .anyMatch(item -> item.getItemType() == ItemType.CUSTOM_ITEM);
        boolean hasStandardItem = cart.getItems().stream()
                .anyMatch(item -> item.getItemType() == ItemType.STANDARD_ITEM);

        Map<UUID, CatalogMaterialDto> materialsMap = catalogPricingClient.getMaterialsMap();
        Map<UUID, CatalogProcessingMethodDto> processingMap = catalogPricingClient.getProcessingMethodsMap(materialsMap);
        Map<UUID, CatalogProductDto> productsMap = hasStandardItem
                ? catalogPricingClient.getAllProducts().stream()
                        .filter(p -> p.getId() != null)
                        .collect(Collectors.toMap(CatalogProductDto::getId, Function.identity(), (a, b) -> a))
                : Map.of();

        OrderType orderType = hasCustomItem ? OrderType.CUSTOM_QUOTE_ORDER : OrderType.DIRECT_STORE_ORDER;
        OrderStatus initialStatus = hasCustomItem ? OrderStatus.QUOTE_PENDING : OrderStatus.AWAITING_DEPOSIT;

        Order order = Order.builder()
                .orderCode(generateOrderCode())
                .customerId(customerId)
                .orderType(orderType)
                .status(initialStatus)
                .recipientName(request.getRecipientName().trim())
                .recipientPhone(request.getRecipientPhone().trim())
                .shippingAddress(request.getShippingAddress().trim())
                .customerNote(request.getCustomerNote())
                .requiresVatInvoice(request.isRequiresVatInvoice())
                .vatCompanyName(request.isRequiresVatInvoice() ? request.getVatCompanyName().trim() : null)
                .vatTaxCode(request.isRequiresVatInvoice() ? request.getVatTaxCode().trim() : null)
                .vatCompanyAddress(request.isRequiresVatInvoice() ? request.getVatCompanyAddress().trim() : null)
                .subtotalAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .vatRate(BigDecimal.ZERO)
                .vatAmount(BigDecimal.ZERO)
                .totalAmount(BigDecimal.ZERO)
                .depositRequiredAmount(BigDecimal.ZERO)
                .paidAmount(BigDecimal.ZERO)
                .build();

        BigDecimal subtotalAmount = BigDecimal.ZERO;
        BigDecimal totalDiscountAmount = BigDecimal.ZERO;

        for (CartItem cartItem : cart.getItems()) {
            if (cartItem.getItemType() == ItemType.STANDARD_ITEM) {
                CatalogProductDto product = productsMap.get(cartItem.getProductId());
                if (product == null || !product.isActive()) {
                    throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                            "Product not found or inactive: " + cartItem.getProductId());
                }
                int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
                if (stock < cartItem.getQuantity()) {
                    throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                            "Insufficient stock for product '" + product.getName() + "': available=" + stock);
                }

                BigDecimal unitPrice = product.getBasePrice().setScale(2, RoundingMode.HALF_UP);
                BigDecimal lineTotal = unitPrice
                        .multiply(BigDecimal.valueOf(cartItem.getQuantity()))
                        .setScale(2, RoundingMode.HALF_UP);

                String materialSnapshot = resolveMaterialName(product.getMaterialName(), product.getMaterialId(), materialsMap);
                String processingSnapshot = resolveProcessingName(product.getProcessingMethodName(), product.getProcessingMethodId(), processingMap);

                OrderItem orderItem = OrderItem.builder()
                        .productId(product.getId())
                        .itemName(product.getName())
                        .materialId(product.getMaterialId())
                        .materialNameSnapshot(materialSnapshot)
                        .processingMethodId(product.getProcessingMethodId())
                        .processingNameSnapshot(processingSnapshot)
                        .widthMm(product.getWidthMm())
                        .heightMm(product.getHeightMm())
                        .thicknessMm(product.getThicknessMm())
                        .systemUnitPrice(unitPrice)
                        .finalUnitPrice(unitPrice)
                        .quantity(cartItem.getQuantity())
                        .lineTotal(lineTotal)
                        .designFileUrl(cartItem.getDesignFileUrl())
                        .build();

                order.addItem(orderItem);
                subtotalAmount = subtotalAmount.add(lineTotal);
            } else {
                QuoteCalculationResponse quote = catalogPricingClient.calculateQuote(
                        QuoteCalculationRequest.builder()
                                .materialId(cartItem.getMaterialId())
                                .processingMethodId(cartItem.getProcessingMethodId())
                                .widthMm(cartItem.getWidthMm())
                                .heightMm(cartItem.getHeightMm())
                                .thicknessMm(cartItem.getThicknessMm())
                                .quantity(cartItem.getQuantity())
                                .requiresVatInvoice(false)
                                .build()
                );

                BigDecimal systemUnitPrice = quote.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
                BigDecimal itemSubtotal = quote.getSubtotalAmount() != null
                        ? quote.getSubtotalAmount().setScale(2, RoundingMode.HALF_UP)
                        : systemUnitPrice.multiply(BigDecimal.valueOf(cartItem.getQuantity())).setScale(2, RoundingMode.HALF_UP);
                BigDecimal itemDiscount = quote.getDiscountAmount() != null
                        ? quote.getDiscountAmount().setScale(2, RoundingMode.HALF_UP)
                        : BigDecimal.ZERO;
                BigDecimal netLineTotal = itemSubtotal.subtract(itemDiscount).setScale(2, RoundingMode.HALF_UP);
                BigDecimal finalUnitPrice = netLineTotal
                        .divide(BigDecimal.valueOf(cartItem.getQuantity()), 2, RoundingMode.HALF_UP);

                String materialSnapshot = resolveMaterialName(null, cartItem.getMaterialId(), materialsMap);
                String processingSnapshot = resolveProcessingName(null, cartItem.getProcessingMethodId(), processingMap);
                String itemName = String.format("Custom %s (%sx%sx%smm)",
                        materialSnapshot != null ? materialSnapshot : "Nameplate",
                        cartItem.getWidthMm().stripTrailingZeros().toPlainString(),
                        cartItem.getHeightMm().stripTrailingZeros().toPlainString(),
                        cartItem.getThicknessMm().stripTrailingZeros().toPlainString());

                OrderItem orderItem = OrderItem.builder()
                        .itemName(itemName)
                        .materialId(cartItem.getMaterialId())
                        .materialNameSnapshot(materialSnapshot)
                        .processingMethodId(cartItem.getProcessingMethodId())
                        .processingNameSnapshot(processingSnapshot)
                        .widthMm(cartItem.getWidthMm())
                        .heightMm(cartItem.getHeightMm())
                        .thicknessMm(cartItem.getThicknessMm())
                        .calculatedWeightKg(quote.getCalculatedWeightKg())
                        .systemUnitPrice(systemUnitPrice)
                        .finalUnitPrice(finalUnitPrice)
                        .quantity(cartItem.getQuantity())
                        .lineTotal(netLineTotal)
                        .designFileUrl(cartItem.getDesignFileUrl())
                        .build();

                order.addItem(orderItem);
                subtotalAmount = subtotalAmount.add(itemSubtotal);
                totalDiscountAmount = totalDiscountAmount.add(itemDiscount);
            }
        }

        BigDecimal netSubtotal = subtotalAmount.subtract(totalDiscountAmount).setScale(2, RoundingMode.HALF_UP);
        BigDecimal vatRate = request.isRequiresVatInvoice() ? VAT_RATE : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal vatAmount = request.isRequiresVatInvoice()
                ? netSubtotal.multiply(VAT_RATE).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = netSubtotal.add(vatAmount).setScale(2, RoundingMode.HALF_UP);
        BigDecimal depositRequiredAmount = orderType == OrderType.CUSTOM_QUOTE_ORDER
                ? totalAmount.multiply(DEPOSIT_RATE).setScale(2, RoundingMode.HALF_UP)
                : totalAmount;

        order.setSubtotalAmount(subtotalAmount.setScale(2, RoundingMode.HALF_UP));
        order.setDiscountAmount(totalDiscountAmount.setScale(2, RoundingMode.HALF_UP));
        order.setVatRate(vatRate);
        order.setVatAmount(vatAmount);
        order.setTotalAmount(totalAmount);
        order.setDepositRequiredAmount(depositRequiredAmount);

        order.addStatusLog(OrderStatusLog.builder()
                .fromStatus(null)
                .toStatus(initialStatus)
                .changedByUserId(customerId)
                .note("Order created via checkout")
                .build());

        Order savedOrder = orderRepository.save(order);

        cart.clearItems();
        cartRepository.save(cart);

        if (orderType == OrderType.CUSTOM_QUOTE_ORDER) {
            telegramNotificationService.notifyNewCustomQuote(savedOrder);
        }

        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> getCustomerOrders(UUID customerId, int page, int size) {
        Page<Order> orderPage = orderRepository.findByCustomerIdOrderByCreatedAtDesc(
                customerId, PageRequest.of(page, size));

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
    public OrderDetailResponse getCustomerOrderDetail(UUID customerId, UUID orderId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (!customerId.equals(order.getCustomerId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You do not have permission to view this order");
        }

        return OrderMapper.toOrderDetailResponse(order);
    }

    @Transactional
    public OrderDetailResponse approvePrototype(UUID customerId, UUID orderId, String note) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (!customerId.equals(order.getCustomerId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You do not have permission to approve prototype for this order");
        }
        if (order.getStatus() != OrderStatus.PROTOTYPING) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Prototype can only be approved when order status is PROTOTYPING, current: " + order.getStatus());
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.AWAITING_DEPOSIT);
        order.addStatusLog(OrderStatusLog.builder()
                .fromStatus(previousStatus)
                .toStatus(OrderStatus.AWAITING_DEPOSIT)
                .changedByUserId(customerId)
                .note(isBlank(note) ? "Customer approved sample prototype" : note.trim())
                .build());

        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    @Transactional
    public OrderDetailResponse cancelOrder(UUID customerId, UUID orderId, String note) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Order not found"));

        if (!customerId.equals(order.getCustomerId())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "You do not have permission to cancel this order");
        }
        if (order.getStatus() != OrderStatus.QUOTE_PENDING && order.getStatus() != OrderStatus.QUOTE_APPROVED) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Customer can only cancel orders in QUOTE_PENDING or QUOTE_APPROVED status, current: " + order.getStatus());
        }

        OrderStatus previousStatus = order.getStatus();
        order.setStatus(OrderStatus.CANCELLED);
        order.addStatusLog(OrderStatusLog.builder()
                .fromStatus(previousStatus)
                .toStatus(OrderStatus.CANCELLED)
                .changedByUserId(customerId)
                .note(isBlank(note) ? "Order cancelled by customer" : note.trim())
                .build());

        Order savedOrder = orderRepository.save(order);
        return OrderMapper.toOrderDetailResponse(savedOrder);
    }

    private void validateVatDetails(CheckoutRequest request) {
        if (!request.isRequiresVatInvoice()) {
            return;
        }
        if (isBlank(request.getVatCompanyName())
                || isBlank(request.getVatTaxCode())
                || isBlank(request.getVatCompanyAddress())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "vatCompanyName, vatTaxCode, and vatCompanyAddress are required when requiresVatInvoice is true");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private String generateOrderCode() {
        String datePart = LocalDate.now(VN_ZONE).format(ORDER_DATE_FORMAT);
        String prefix = "TNI-" + datePart + "-";
        int nextSeq = orderRepository.findMaxOrderCodeByPrefix(prefix)
                .map(maxCode -> {
                    String suffix = maxCode.substring(prefix.length());
                    return Integer.parseInt(suffix) + 1;
                })
                .orElse(1);
        return String.format("%s%04d", prefix, nextSeq);
    }

    private String resolveMaterialName(String fallbackName, UUID materialId, Map<UUID, CatalogMaterialDto> materialsMap) {
        if (materialId != null && materialsMap.containsKey(materialId)) {
            return materialsMap.get(materialId).getName();
        }
        return fallbackName;
    }

    private String resolveProcessingName(String fallbackName, UUID processingMethodId, Map<UUID, CatalogProcessingMethodDto> processingMap) {
        if (processingMethodId != null && processingMap.containsKey(processingMethodId)) {
            return processingMap.get(processingMethodId).getName();
        }
        return fallbackName;
    }
}
