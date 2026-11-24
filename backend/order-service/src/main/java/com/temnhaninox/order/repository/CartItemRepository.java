package com.temnhaninox.order.repository;

import com.temnhaninox.order.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CartItemRepository extends JpaRepository<CartItem, UUID> {
}
