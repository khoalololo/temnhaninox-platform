package com.temnhaninox.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "material_processing_rules", schema = "catalog_pricing_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MaterialProcessingRule {

    @EmbeddedId
    private MaterialProcessingRuleId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("materialId")
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("processingMethodId")
    @JoinColumn(name = "processing_method_id", nullable = false)
    private ProcessingMethod processingMethod;

    @Builder.Default
    @Column(name = "base_lead_time_days", nullable = false)
    private Integer baseLeadTimeDays = 7;

    @PrePersist
    protected void onCreate() {
        if (this.baseLeadTimeDays == null) {
            this.baseLeadTimeDays = 7;
        }
    }
}
