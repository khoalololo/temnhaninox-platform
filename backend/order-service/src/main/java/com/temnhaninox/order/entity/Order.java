package com.temnhaninox.order.entity;

import com.temnhaninox.common.enums.OrderStatus;
import com.temnhaninox.common.enums.OrderType;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "orders", schema = "order_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "order_code", nullable = false, unique = true, length = 30)
    private String orderCode;

    @Column(name = "customer_id", nullable = false)
    private UUID customerId;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 30)
    private OrderType orderType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    private OrderStatus status;

    @Column(name = "recipient_name", nullable = false, length = 150)
    private String recipientName;

    @Column(name = "recipient_phone", nullable = false, length = 20)
    private String recipientPhone;

    @Column(name = "shipping_address", nullable = false, columnDefinition = "TEXT")
    private String shippingAddress;

    @Column(name = "customer_note", columnDefinition = "TEXT")
    private String customerNote;

    @Column(name = "subtotal_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotalAmount;

    @Builder.Default
    @Column(name = "discount_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "vat_rate", nullable = false, precision = 4, scale = 2)
    private BigDecimal vatRate = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "vat_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal vatAmount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Builder.Default
    @Column(name = "deposit_required_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal depositRequiredAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "paid_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal paidAmount = BigDecimal.ZERO;

    @Builder.Default
    @Column(name = "requires_vat_invoice", nullable = false)
    private boolean requiresVatInvoice = false;

    @Column(name = "vat_company_name", length = 255)
    private String vatCompanyName;

    @Column(name = "vat_tax_code", length = 50)
    private String vatTaxCode;

    @Column(name = "vat_company_address", columnDefinition = "TEXT")
    private String vatCompanyAddress;

    @Column(name = "vat_invoice_number", length = 50)
    private String vatInvoiceNumber;

    @Column(name = "production_worker_note", length = 255)
    private String productionWorkerNote;

    @Column(name = "estimated_completion_date")
    private LocalDate estimatedCompletionDate;

    @Column(name = "admin_internal_note", columnDefinition = "TEXT")
    private String adminInternalNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderItem> items = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<PaymentTransaction> paymentTransactions = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<OrderStatusLog> statusLogs = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addItem(OrderItem item) {
        item.setOrder(this);
        this.items.add(item);
    }

    public void addPaymentTransaction(PaymentTransaction tx) {
        tx.setOrder(this);
        this.paymentTransactions.add(tx);
    }

    public void addStatusLog(OrderStatusLog log) {
        log.setOrder(this);
        this.statusLogs.add(log);
    }
}
