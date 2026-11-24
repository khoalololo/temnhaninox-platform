package com.temnhaninox.order.service;

import com.temnhaninox.common.dto.QuoteCalculationRequest;
import com.temnhaninox.common.dto.QuoteCalculationResponse;
import com.temnhaninox.common.enums.ItemType;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.client.CatalogPricingClient;
import com.temnhaninox.order.client.dto.CatalogProductDto;
import com.temnhaninox.order.dto.AddCartItemRequest;
import com.temnhaninox.order.dto.CartResponse;
import com.temnhaninox.order.dto.UpdateCartItemRequest;
import com.temnhaninox.order.entity.Cart;
import com.temnhaninox.order.entity.CartItem;
import com.temnhaninox.order.repository.CartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CatalogPricingClient catalogPricingClient;

    @InjectMocks
    private CartService cartService;

    private UUID customerId;
    private UUID productId;
    private UUID materialId;
    private UUID processingMethodId;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        productId = UUID.randomUUID();
        materialId = UUID.randomUUID();
        processingMethodId = UUID.randomUUID();
    }

    @Test
    void getCart_autoCreatesEmptyCartWhenAbsent() {
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.empty());
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> {
            Cart c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CartResponse response = cartService.getCart(customerId);

        assertThat(response.getCustomerId()).isEqualTo(customerId);
        assertThat(response.getItems()).isEmpty();
        assertThat(response.getEstimatedSubtotal()).isEqualByComparingTo("0.00");
        assertThat(response.getTotalItems()).isZero();
    }

    @Test
    void addItem_standardItem_validatesStockAndUsesAuthoritativePrice() {
        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        CatalogProductDto product = CatalogProductDto.builder()
                .id(productId)
                .name("Tem Inox 304 Chữ Nổi")
                .basePrice(new BigDecimal("45000.00"))
                .stockQuantity(50)
                .active(true)
                .build();
        when(catalogPricingClient.findProductById(productId)).thenReturn(Optional.of(product));

        AddCartItemRequest request = AddCartItemRequest.builder()
                .itemType(ItemType.STANDARD_ITEM)
                .productId(productId)
                .quantity(3)
                .build();

        CartResponse response = cartService.addItem(customerId, request);

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getEstimatedUnitPrice()).isEqualByComparingTo("45000.00");
        assertThat(response.getItems().get(0).getLineTotal()).isEqualByComparingTo("135000.00");
        assertThat(response.getEstimatedSubtotal()).isEqualByComparingTo("135000.00");
        assertThat(response.getTotalItems()).isEqualTo(3);
    }

    @Test
    void addItem_standardItem_throwsWhenInsufficientStock() {
        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        CatalogProductDto product = CatalogProductDto.builder()
                .id(productId)
                .name("Tem Inox 304")
                .basePrice(new BigDecimal("45000.00"))
                .stockQuantity(2)
                .active(true)
                .build();
        when(catalogPricingClient.findProductById(productId)).thenReturn(Optional.of(product));

        AddCartItemRequest request = AddCartItemRequest.builder()
                .itemType(ItemType.STANDARD_ITEM)
                .productId(productId)
                .quantity(5)
                .build();

        assertThatThrownBy(() -> cartService.addItem(customerId, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void addItem_customItem_requiresDesignFileAndCalculatesQuote() {
        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        QuoteCalculationResponse quote = QuoteCalculationResponse.builder()
                .unitPrice(new BigDecimal("15000.00"))
                .quantity(100)
                .subtotalAmount(new BigDecimal("1500000.00"))
                .discountAmount(BigDecimal.ZERO)
                .calculatedWeightKg(new BigDecimal("0.0250"))
                .build();
        when(catalogPricingClient.calculateQuote(any(QuoteCalculationRequest.class))).thenReturn(quote);

        AddCartItemRequest request = AddCartItemRequest.builder()
                .itemType(ItemType.CUSTOM_ITEM)
                .materialId(materialId)
                .processingMethodId(processingMethodId)
                .widthMm(new BigDecimal("50"))
                .heightMm(new BigDecimal("30"))
                .thicknessMm(new BigDecimal("0.5"))
                .quantity(100)
                .designFileUrl("https://s3.local/designs/logo.cdr")
                .build();

        CartResponse response = cartService.addItem(customerId, request);

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getEstimatedUnitPrice()).isEqualByComparingTo("15000.00");
        assertThat(response.getEstimatedSubtotal()).isEqualByComparingTo("1500000.00");
    }

    @Test
    void updateItem_customItemCrossing1000Threshold_recalculatesBulkDiscountedPrice() {
        UUID itemId = UUID.randomUUID();
        CartItem existingItem = CartItem.builder()
                .id(itemId)
                .itemType(ItemType.CUSTOM_ITEM)
                .materialId(materialId)
                .processingMethodId(processingMethodId)
                .widthMm(new BigDecimal("50"))
                .heightMm(new BigDecimal("30"))
                .thicknessMm(new BigDecimal("0.5"))
                .quantity(500)
                .estimatedUnitPrice(new BigDecimal("15000.00"))
                .designFileUrl("https://s3.local/designs/logo.cdr")
                .build();

        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        cart.addItem(existingItem);

        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1,000+ bulk discount: 10% off 15,000 -> 13,500 per unit
        QuoteCalculationResponse bulkQuote = QuoteCalculationResponse.builder()
                .unitPrice(new BigDecimal("15000.00"))
                .quantity(1000)
                .subtotalAmount(new BigDecimal("15000000.00"))
                .discountRate(new BigDecimal("0.10"))
                .discountAmount(new BigDecimal("1500000.00"))
                .build();
        when(catalogPricingClient.calculateQuote(any(QuoteCalculationRequest.class))).thenReturn(bulkQuote);

        CartResponse response = cartService.updateItem(customerId, itemId,
                UpdateCartItemRequest.builder().quantity(1000).customerNote("Urgent").build());

        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getQuantity()).isEqualTo(1000);
        assertThat(response.getItems().get(0).getEstimatedUnitPrice()).isEqualByComparingTo("13500.00");
        assertThat(response.getEstimatedSubtotal()).isEqualByComparingTo("13500000.00");
        verify(catalogPricingClient).calculateQuote(any(QuoteCalculationRequest.class));
    }
}
