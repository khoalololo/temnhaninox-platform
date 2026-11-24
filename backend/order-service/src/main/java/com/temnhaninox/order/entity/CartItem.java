package com.temnhaninox.order.entity;

import com.temnhaninox.common.enums.ItemType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cart_items", schema = "order_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cart_id", nullable = false)
    private Cart cart;

    @Column(name = "product_id")
    private UUID productId;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false, length = 30)
    private ItemType itemType;

    @Column(name = "material_id")
    private UUID materialId;

    @Column(name = "processing_method_id")
    private UUID processingMethodId;

    @Column(name = "width_mm", precision = 8, scale = 2)
    private BigDecimal widthMm;

    @Column(name = "height_mm", precision = 8, scale = 2)
    private BigDecimal heightMm;

    @Column(name = "thickness_mm", precision = 5, scale = 2)
    private BigDecimal thicknessMm;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "estimated_unit_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal estimatedUnitPrice;

    @Column(name = "design_file_url", columnDefinition = "TEXT")
    private String designFileUrl;

    @Column(name = "customer_note", columnDefinition = "TEXT")
    private String customerNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
