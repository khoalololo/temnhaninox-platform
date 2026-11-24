package com.temnhaninox.order.repository;

import com.temnhaninox.order.entity.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    Page<Order> findByCustomerIdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    Optional<Order> findByOrderCode(String orderCode);

    @Query("SELECT MAX(o.orderCode) FROM Order o WHERE o.orderCode LIKE CONCAT(:prefix, '%')")
    Optional<String> findMaxOrderCodeByPrefix(@Param("prefix") String prefix);
}
