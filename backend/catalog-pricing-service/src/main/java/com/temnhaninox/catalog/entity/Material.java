package com.temnhaninox.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "materials", schema = "catalog_pricing_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    @Builder.Default
    @Column(name = "is_metal", nullable = false)
    private Boolean isMetal = Boolean.TRUE;

    @Column(name = "density_kg_m3", precision = 10, scale = 2)
    private BigDecimal densityKgM3;

    @Column(name = "price_per_kg", precision = 12, scale = 2)
    private BigDecimal pricePerKg;

    /** Per-material thin-sheet rate (VND/m2). Null for metals = use the global THIN_SHEET_RATE_M2 rule; null for non-metals = not configured yet. */
    @Column(name = "thin_sheet_rate_per_m2", precision = 12, scale = 2)
    private BigDecimal thinSheetRatePerM2;

    @Builder.Default
    @Column(name = "min_thickness_mm", nullable = false, precision = 5, scale = 2)
    private BigDecimal minThicknessMm = new BigDecimal("0.20");

    @Builder.Default
    @Column(name = "max_thickness_mm", nullable = false, precision = 5, scale = 2)
    private BigDecimal maxThicknessMm = new BigDecimal("10.00");

    @Builder.Default
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "pbr_preview_config", nullable = false, columnDefinition = "jsonb")
    private Map<String, Object> pbrPreviewConfig = new HashMap<>(Map.of(
            "baseColor", "#d4d7d9",
            "metalness", 0.9,
            "roughness", 0.25
    ));

    @Builder.Default
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = Boolean.TRUE;

    @PrePersist
    protected void onCreate() {
        if (this.isMetal == null) {
            this.isMetal = Boolean.TRUE;
        }
        if (this.minThicknessMm == null) {
            this.minThicknessMm = new BigDecimal("0.20");
        }
        if (this.maxThicknessMm == null) {
            this.maxThicknessMm = new BigDecimal("10.00");
        }
        if (this.pbrPreviewConfig == null) {
            this.pbrPreviewConfig = new HashMap<>(Map.of(
                    "baseColor", "#d4d7d9",
                    "metalness", 0.9,
                    "roughness", 0.25
            ));
        }
        if (this.isActive == null) {
            this.isActive = Boolean.TRUE;
        }
    }
}
