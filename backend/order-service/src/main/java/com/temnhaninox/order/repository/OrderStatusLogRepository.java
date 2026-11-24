package com.temnhaninox.order.repository;

import com.temnhaninox.order.entity.OrderStatusLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OrderStatusLogRepository extends JpaRepository<OrderStatusLog, UUID> {
}
