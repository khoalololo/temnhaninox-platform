package com.temnhaninox.order.service;

import com.temnhaninox.common.dto.QuoteCalculationRequest;
import com.temnhaninox.common.dto.QuoteCalculationResponse;
import com.temnhaninox.common.enums.ItemType;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.client.CatalogPricingClient;
import com.temnhaninox.order.client.dto.CatalogProductDto;
import com.temnhaninox.order.dto.AddCartItemRequest;
import com.temnhaninox.order.dto.CartItemResponse;
import com.temnhaninox.order.dto.CartResponse;
import com.temnhaninox.order.dto.UpdateCartItemRequest;
import com.temnhaninox.order.entity.Cart;
import com.temnhaninox.order.entity.CartItem;
import com.temnhaninox.order.repository.CartRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final CatalogPricingClient catalogPricingClient;

    @Transactional
    public CartResponse getCart(UUID customerId) {
        Cart cart = getOrCreateCart(customerId);
        return toCartResponse(cart);
    }

    @Transactional
    public CartResponse addItem(UUID customerId, AddCartItemRequest request) {
        Cart cart = getOrCreateCart(customerId);

        if (request.getItemType() == ItemType.STANDARD_ITEM) {
            addStandardItem(cart, request);
        } else if (request.getItemType() == ItemType.CUSTOM_ITEM) {
            addCustomItem(cart, request);
        } else {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Unsupported itemType");
        }

        Cart saved = cartRepository.save(cart);
        return toCartResponse(saved);
    }

    @Transactional
    public CartResponse updateItem(UUID customerId, UUID itemId, UpdateCartItemRequest request) {
        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Cart not found"));

        CartItem item = cart.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Cart item not found"));

        if (item.getItemType() == ItemType.STANDARD_ITEM) {
            CatalogProductDto product = catalogPricingClient.findActiveProductById(item.getProductId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                            "Product not found or inactive"));

            validateStock(product, request.getQuantity());
            item.setEstimatedUnitPrice(product.getBasePrice().setScale(2, RoundingMode.HALF_UP));
        } else {
            BigDecimal updatedUnitPrice = calculateCustomUnitPrice(
                    item.getMaterialId(),
                    item.getProcessingMethodId(),
                    item.getWidthMm(),
                    item.getHeightMm(),
                    item.getThicknessMm(),
                    request.getQuantity()
            );
            item.setEstimatedUnitPrice(updatedUnitPrice);
        }

        item.setQuantity(request.getQuantity());
        if (request.getCustomerNote() != null) {
            item.setCustomerNote(request.getCustomerNote());
        }
        cart.touchUpdatedAt();

        Cart saved = cartRepository.save(cart);
        return toCartResponse(saved);
    }

    @Transactional
    public CartResponse removeItem(UUID customerId, UUID itemId) {
        Cart cart = cartRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Cart not found"));

        CartItem item = cart.getItems().stream()
                .filter(i -> itemId.equals(i.getId()))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Cart item not found"));

        cart.removeItem(item);
        Cart saved = cartRepository.save(cart);
        return toCartResponse(saved);
    }

    @Transactional
    public void clearCart(UUID customerId) {
        cartRepository.findByCustomerId(customerId).ifPresent(cart -> {
            cart.clearItems();
            cartRepository.save(cart);
        });
    }

    private Cart getOrCreateCart(UUID customerId) {
        return cartRepository.findByCustomerId(customerId)
                .orElseGet(() -> cartRepository.save(Cart.builder()
                        .customerId(customerId)
                        .build()));
    }

    private void addStandardItem(Cart cart, AddCartItemRequest request) {
        if (request.getProductId() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "productId is required for STANDARD_ITEM");
        }

        CatalogProductDto product = catalogPricingClient.findActiveProductById(request.getProductId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND,
                        "Product not found or inactive"));

        CartItem existing = cart.getItems().stream()
                .filter(i -> i.getItemType() == ItemType.STANDARD_ITEM
                        && request.getProductId().equals(i.getProductId()))
                .findFirst()
                .orElse(null);

        if (existing != null) {
            int newQuantity = existing.getQuantity() + request.getQuantity();
            validateStock(product, newQuantity);
            existing.setQuantity(newQuantity);
            existing.setEstimatedUnitPrice(product.getBasePrice().setScale(2, RoundingMode.HALF_UP));
            if (request.getCustomerNote() != null) {
                existing.setCustomerNote(request.getCustomerNote());
            }
            cart.touchUpdatedAt();
        } else {
            validateStock(product, request.getQuantity());
            CartItem item = CartItem.builder()
                    .itemType(ItemType.STANDARD_ITEM)
                    .productId(product.getId())
                    .materialId(product.getMaterialId())
                    .processingMethodId(product.getProcessingMethodId())
                    .widthMm(product.getWidthMm())
                    .heightMm(product.getHeightMm())
                    .thicknessMm(product.getThicknessMm())
                    .quantity(request.getQuantity())
                    .estimatedUnitPrice(product.getBasePrice().setScale(2, RoundingMode.HALF_UP))
                    .customerNote(request.getCustomerNote())
                    .build();
            cart.addItem(item);
        }
    }

    private void addCustomItem(Cart cart, AddCartItemRequest request) {
        if (request.getMaterialId() == null || request.getProcessingMethodId() == null) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "materialId and processingMethodId are required for CUSTOM_ITEM");
        }
        if (request.getWidthMm() == null || request.getWidthMm().compareTo(BigDecimal.ONE) < 0
                || request.getHeightMm() == null || request.getHeightMm().compareTo(BigDecimal.ONE) < 0
                || request.getThicknessMm() == null || request.getThicknessMm().compareTo(new BigDecimal("0.1")) < 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Valid widthMm (>= 1.0), heightMm (>= 1.0), and thicknessMm (>= 0.1) are required for CUSTOM_ITEM");
        }
        if (request.getDesignFileUrl() == null || request.getDesignFileUrl().isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "designFileUrl is required for CUSTOM_ITEM");
        }

        BigDecimal unitPrice = calculateCustomUnitPrice(
                request.getMaterialId(),
                request.getProcessingMethodId(),
                request.getWidthMm(),
                request.getHeightMm(),
                request.getThicknessMm(),
                request.getQuantity()
        );

        CartItem item = CartItem.builder()
                .itemType(ItemType.CUSTOM_ITEM)
                .materialId(request.getMaterialId())
                .processingMethodId(request.getProcessingMethodId())
                .widthMm(request.getWidthMm())
                .heightMm(request.getHeightMm())
                .thicknessMm(request.getThicknessMm())
                .quantity(request.getQuantity())
                .estimatedUnitPrice(unitPrice)
                .designFileUrl(request.getDesignFileUrl())
                .customerNote(request.getCustomerNote())
                .build();

        cart.addItem(item);
    }

    private void validateStock(CatalogProductDto product, int requestedQuantity) {
        int stock = product.getStockQuantity() != null ? product.getStockQuantity() : 0;
        if (stock < requestedQuantity) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Insufficient stock for product '" + product.getName() + "': available=" + stock);
        }
    }

    private BigDecimal calculateCustomUnitPrice(
            UUID materialId,
            UUID processingMethodId,
            BigDecimal widthMm,
            BigDecimal heightMm,
            BigDecimal thicknessMm,
            int quantity) {
        QuoteCalculationRequest quoteRequest = QuoteCalculationRequest.builder()
                .materialId(materialId)
                .processingMethodId(processingMethodId)
                .widthMm(widthMm)
                .heightMm(heightMm)
                .thicknessMm(thicknessMm)
                .quantity(quantity)
                .requiresVatInvoice(false)
                .build();

        QuoteCalculationResponse quote = catalogPricingClient.calculateQuote(quoteRequest);

        if (quote.getSubtotalAmount() != null && quantity > 0) {
            BigDecimal discount = quote.getDiscountAmount() != null ? quote.getDiscountAmount() : BigDecimal.ZERO;
            return quote.getSubtotalAmount()
                    .subtract(discount)
                    .divide(BigDecimal.valueOf(quantity), 2, RoundingMode.HALF_UP);
        }
        return quote.getUnitPrice().setScale(2, RoundingMode.HALF_UP);
    }

    private CartResponse toCartResponse(Cart cart) {
        List<CartItemResponse> itemResponses = cart.getItems().stream()
                .map(this::toCartItemResponse)
                .toList();

        BigDecimal estimatedSubtotal = itemResponses.stream()
                .map(CartItemResponse::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        int totalItems = cart.getItems().stream()
                .mapToInt(CartItem::getQuantity)
                .sum();

        return CartResponse.builder()
                .id(cart.getId())
                .customerId(cart.getCustomerId())
                .items(itemResponses)
                .estimatedSubtotal(estimatedSubtotal)
                .totalItems(totalItems)
                .updatedAt(cart.getUpdatedAt())
                .build();
    }

    private CartItemResponse toCartItemResponse(CartItem item) {
        BigDecimal unitPrice = item.getEstimatedUnitPrice().setScale(2, RoundingMode.HALF_UP);
        BigDecimal lineTotal = unitPrice
                .multiply(BigDecimal.valueOf(item.getQuantity()))
                .setScale(2, RoundingMode.HALF_UP);

        return CartItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .itemType(item.getItemType())
                .materialId(item.getMaterialId())
                .processingMethodId(item.getProcessingMethodId())
                .widthMm(item.getWidthMm())
                .heightMm(item.getHeightMm())
                .thicknessMm(item.getThicknessMm())
                .quantity(item.getQuantity())
                .estimatedUnitPrice(unitPrice)
                .lineTotal(lineTotal)
                .designFileUrl(item.getDesignFileUrl())
                .customerNote(item.getCustomerNote())
                .createdAt(item.getCreatedAt())
                .build();
    }
}
