package com.temnhaninox.order.repository;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
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

    @Query("""
            SELECT o FROM Order o
            WHERE (:status IS NULL OR o.status = :status)
              AND (:orderType IS NULL OR o.orderType = :orderType)
              AND (:search IS NULL OR LOWER(o.orderCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(o.recipientPhone) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY o.createdAt DESC
            """)
    Page<Order> searchAdminOrders(
            @Param("status") OrderStatus status,
            @Param("orderType") OrderType orderType,
            @Param("search") String search,
            Pageable pageable);

    long countByStatus(OrderStatus status);

    @Query("""
            SELECT COUNT(o) FROM Order o
            WHERE o.requiresVatInvoice = true
              AND (o.vatInvoiceNumber IS NULL OR TRIM(o.vatInvoiceNumber) = '')
              AND o.status <> com.temnhaninox.common.enums.OrderStatus.CANCELLED
            """)
    long countPendingVatInvoices();
}
