package com.temnhaninox.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "order_items", schema = "order_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(name = "product_id")
    private UUID productId;

    @Column(name = "item_name", nullable = false, length = 255)
    private String itemName;

    @Column(name = "material_id")
    private UUID materialId;

    @Column(name = "material_name_snapshot", length = 150)
    private String materialNameSnapshot;

    @Column(name = "processing_method_id")
    private UUID processingMethodId;

    @Column(name = "processing_name_snapshot", length = 150)
    private String processingNameSnapshot;

    @Column(name = "width_mm", precision = 8, scale = 2)
    private BigDecimal widthMm;

    @Column(name = "height_mm", precision = 8, scale = 2)
    private BigDecimal heightMm;

    @Column(name = "thickness_mm", precision = 5, scale = 2)
    private BigDecimal thicknessMm;

    @Column(name = "calculated_weight_kg", precision = 10, scale = 4)
    private BigDecimal calculatedWeightKg;

    @Column(name = "system_unit_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal systemUnitPrice;

    @Column(name = "final_unit_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal finalUnitPrice;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    @Column(name = "line_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal lineTotal;

    @Column(name = "design_file_url", columnDefinition = "TEXT")
    private String designFileUrl;

    @Column(name = "prototype_image_url", columnDefinition = "TEXT")
    private String prototypeImageUrl;
}
