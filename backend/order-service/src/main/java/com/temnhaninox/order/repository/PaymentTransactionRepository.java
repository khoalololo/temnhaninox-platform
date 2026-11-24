package com.temnhaninox.order.repository;

import com.temnhaninox.order.entity.PaymentTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface PaymentTransactionRepository extends JpaRepository<PaymentTransaction, UUID> {

    Optional<PaymentTransaction> findByTransactionRef(String transactionRef);

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0) FROM PaymentTransaction p
            WHERE p.status = com.temnhaninox.common.enums.PaymentStatus.VERIFIED
              AND p.verifiedAt >= :startOfMonth
              AND p.verifiedAt < :endOfMonth
            """)
    BigDecimal sumVerifiedAmountBetween(
            @Param("startOfMonth") Instant startOfMonth,
            @Param("endOfMonth") Instant endOfMonth);
}
