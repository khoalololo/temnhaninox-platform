package com.temnhaninox.order.repository;

import com.temnhaninox.order.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {
}
