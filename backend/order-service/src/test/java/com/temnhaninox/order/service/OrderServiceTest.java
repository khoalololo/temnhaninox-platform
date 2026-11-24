package com.temnhaninox.order.service;

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
import com.temnhaninox.order.entity.Cart;
import com.temnhaninox.order.entity.CartItem;
import com.temnhaninox.order.entity.Order;
import com.temnhaninox.order.repository.CartRepository;
import com.temnhaninox.order.repository.OrderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    private static final Pattern ORDER_CODE_PATTERN = Pattern.compile("^TNI-\\d{8}-\\d{4}$");

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CatalogPricingClient catalogPricingClient;

    @InjectMocks
    private OrderService orderService;

    private UUID customerId;
    private UUID materialId;
    private UUID processingMethodId;
    private UUID productId;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        materialId = UUID.randomUUID();
        processingMethodId = UUID.randomUUID();
        productId = UUID.randomUUID();
    }

    @Test
    void checkout_customOrder_freezesSnapshotsComputes50PercentDepositAndFormatsOrderCode() {
        CartItem customItem = CartItem.builder()
                .id(UUID.randomUUID())
                .itemType(ItemType.CUSTOM_ITEM)
                .materialId(materialId)
                .processingMethodId(processingMethodId)
                .widthMm(new BigDecimal("80"))
                .heightMm(new BigDecimal("40"))
                .thicknessMm(new BigDecimal("1.5"))
                .quantity(100)
                .estimatedUnitPrice(new BigDecimal("20000.00"))
                .designFileUrl("https://s3.local/designs/panel.cdr")
                .build();

        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        cart.addItem(customItem);

        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));

        CatalogProcessingMethodDto pm = CatalogProcessingMethodDto.builder()
                .id(processingMethodId)
                .code("AN_MON")
                .name("Ăn mòn điện hóa / Hóa chất")
                .build();
        CatalogMaterialDto material = CatalogMaterialDto.builder()
                .id(materialId)
                .code("INOX_304")
                .name("Inox 304 (Thép không gỉ 304)")
                .compatibleProcessingMethods(List.of(pm))
                .build();
        Map<UUID, CatalogMaterialDto> materialsMap = Map.of(materialId, material);

        when(catalogPricingClient.getMaterialsMap()).thenReturn(materialsMap);
        when(catalogPricingClient.getProcessingMethodsMap(materialsMap)).thenReturn(Map.of(processingMethodId, pm));
        when(catalogPricingClient.calculateQuote(any(QuoteCalculationRequest.class))).thenReturn(
                QuoteCalculationResponse.builder()
                        .unitPrice(new BigDecimal("20000.00"))
                        .quantity(100)
                        .subtotalAmount(new BigDecimal("2000000.00"))
                        .discountAmount(BigDecimal.ZERO)
                        .calculatedWeightKg(new BigDecimal("0.0381"))
                        .build()
        );
        when(orderRepository.findMaxOrderCodeByPrefix(anyString())).thenReturn(Optional.of("TNI-20261124-0001"));
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        CheckoutRequest request = CheckoutRequest.builder()
                .recipientName("Nguyen Van A")
                .recipientPhone("0901234567")
                .shippingAddress("123 Le Loi, Q1, TP.HCM")
                .requiresVatInvoice(true)
                .vatCompanyName("Cong ty TNHH ABC")
                .vatTaxCode("0312345678")
                .vatCompanyAddress("123 Le Loi, Q1, TP.HCM")
                .build();

        OrderDetailResponse response = orderService.checkout(customerId, request);

        assertThat(response.getOrderCode()).matches(ORDER_CODE_PATTERN);
        assertThat(response.getOrderCode()).endsWith("-0002");
        assertThat(response.getOrderType()).isEqualTo(OrderType.CUSTOM_QUOTE_ORDER);
        assertThat(response.getStatus()).isEqualTo(OrderStatus.QUOTE_PENDING);
        assertThat(response.getSubtotalAmount()).isEqualByComparingTo("2000000.00");
        assertThat(response.getVatRate()).isEqualByComparingTo("0.10");
        assertThat(response.getVatAmount()).isEqualByComparingTo("200000.00");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("2200000.00");
        assertThat(response.getDepositRequiredAmount()).isEqualByComparingTo("1100000.00");
        assertThat(response.getItems()).hasSize(1);
        assertThat(response.getItems().get(0).getMaterialNameSnapshot()).isEqualTo("Inox 304 (Thép không gỉ 304)");
        assertThat(response.getItems().get(0).getProcessingNameSnapshot()).isEqualTo("Ăn mòn điện hóa / Hóa chất");
        assertThat(response.getItems().get(0).getCalculatedWeightKg()).isEqualByComparingTo("0.0381");
        assertThat(response.getStatusLogs()).hasSize(1);
        assertThat(response.getStatusLogs().get(0).getToStatus()).isEqualTo(OrderStatus.QUOTE_PENDING);
        assertThat(cart.getItems()).isEmpty();
    }

    @Test
    void checkout_standardOrderOnly_createsDirectStoreOrderWithFullDepositRequired() {
        CartItem standardItem = CartItem.builder()
                .id(UUID.randomUUID())
                .itemType(ItemType.STANDARD_ITEM)
                .productId(productId)
                .quantity(2)
                .estimatedUnitPrice(new BigDecimal("50000.00"))
                .build();

        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        cart.addItem(standardItem);

        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));
        when(cartRepository.save(any(Cart.class))).thenAnswer(inv -> inv.getArgument(0));
        when(catalogPricingClient.getMaterialsMap()).thenReturn(Map.of());
        when(catalogPricingClient.getProcessingMethodsMap(Map.of())).thenReturn(Map.of());
        when(catalogPricingClient.getAllProducts()).thenReturn(List.of(
                CatalogProductDto.builder()
                        .id(productId)
                        .name("Bảng tên phòng Inox")
                        .basePrice(new BigDecimal("50000.00"))
                        .stockQuantity(10)
                        .active(true)
                        .build()
        ));
        when(orderRepository.findMaxOrderCodeByPrefix(anyString())).thenReturn(Optional.empty());
        when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(UUID.randomUUID());
            return o;
        });

        CheckoutRequest request = CheckoutRequest.builder()
                .recipientName("Tran Thi B")
                .recipientPhone("0909998888")
                .shippingAddress("456 Nguyen Trai, Ha Noi")
                .requiresVatInvoice(false)
                .build();

        OrderDetailResponse response = orderService.checkout(customerId, request);

        assertThat(response.getOrderCode()).matches(ORDER_CODE_PATTERN);
        assertThat(response.getOrderCode()).endsWith("-0001");
        assertThat(response.getOrderType()).isEqualTo(OrderType.DIRECT_STORE_ORDER);
        assertThat(response.getStatus()).isEqualTo(OrderStatus.AWAITING_DEPOSIT);
        assertThat(response.getTotalAmount()).isEqualByComparingTo("100000.00");
        assertThat(response.getDepositRequiredAmount()).isEqualByComparingTo("100000.00");
    }

    @Test
    void checkout_requiresVatInvoiceWithoutCompanyDetails_throwsValidationError() {
        CartItem standardItem = CartItem.builder()
                .id(UUID.randomUUID())
                .itemType(ItemType.STANDARD_ITEM)
                .productId(productId)
                .quantity(1)
                .estimatedUnitPrice(new BigDecimal("50000.00"))
                .build();

        Cart cart = Cart.builder().id(UUID.randomUUID()).customerId(customerId).items(new ArrayList<>()).build();
        cart.addItem(standardItem);

        when(cartRepository.findByCustomerId(customerId)).thenReturn(Optional.of(cart));

        CheckoutRequest request = CheckoutRequest.builder()
                .recipientName("Nguyen Van A")
                .recipientPhone("0901234567")
                .shippingAddress("123 Le Loi")
                .requiresVatInvoice(true)
                .vatCompanyName("Cong ty ABC")
                .vatTaxCode("")
                .vatCompanyAddress(null)
                .build();

        assertThatThrownBy(() -> orderService.checkout(customerId, request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.VALIDATION_ERROR);
    }

    @Test
    void getCustomerOrderDetail_differentCustomer_throwsForbidden() {
        UUID orderId = UUID.randomUUID();
        UUID ownerId = UUID.randomUUID();
        Order order = Order.builder().id(orderId).customerId(ownerId).build();
        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.getCustomerOrderDetail(customerId, orderId))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.FORBIDDEN);
    }
}
