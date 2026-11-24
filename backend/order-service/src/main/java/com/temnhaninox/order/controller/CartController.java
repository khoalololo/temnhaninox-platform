package com.temnhaninox.order.controller;

import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.order.dto.AddCartItemRequest;
import com.temnhaninox.order.dto.CartResponse;
import com.temnhaninox.order.dto.UpdateCartItemRequest;
import com.temnhaninox.order.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ApiResponse<CartResponse>> getCart(
            @RequestHeader("X-User-Id") UUID customerId) {
        return ResponseEntity.ok(ApiResponse.ok(cartService.getCart(customerId)));
    }

    @PostMapping("/items")
    public ResponseEntity<ApiResponse<CartResponse>> addItem(
            @RequestHeader("X-User-Id") UUID customerId,
            @Valid @RequestBody AddCartItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Item added to cart", cartService.addItem(customerId, request)));
    }

    @PutMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> updateItem(
            @RequestHeader("X-User-Id") UUID customerId,
            @PathVariable UUID itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Cart item updated",
                cartService.updateItem(customerId, itemId, request)));
    }

    @DeleteMapping("/items/{itemId}")
    public ResponseEntity<ApiResponse<CartResponse>> removeItem(
            @RequestHeader("X-User-Id") UUID customerId,
            @PathVariable UUID itemId) {
        return ResponseEntity.ok(ApiResponse.ok("Cart item removed",
                cartService.removeItem(customerId, itemId)));
    }

    @DeleteMapping
    public ResponseEntity<ApiResponse<Void>> clearCart(
            @RequestHeader("X-User-Id") UUID customerId) {
        cartService.clearCart(customerId);
        return ResponseEntity.ok(ApiResponse.ok("Cart cleared", null));
    }
}
