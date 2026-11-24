package com.temnhaninox.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class MaterialProcessingRuleId implements Serializable {

    @Column(name = "material_id", nullable = false)
    private UUID materialId;

    @Column(name = "processing_method_id", nullable = false)
    private UUID processingMethodId;
}
