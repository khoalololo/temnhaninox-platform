package com.temnhaninox.catalog.repository;

import com.temnhaninox.catalog.entity.MaterialProcessingRule;
import com.temnhaninox.catalog.entity.MaterialProcessingRuleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaterialProcessingRuleRepository extends JpaRepository<MaterialProcessingRule, MaterialProcessingRuleId> {

    @Query("SELECT r FROM MaterialProcessingRule r JOIN FETCH r.processingMethod pm WHERE r.material.id = :materialId AND pm.isActive = true ORDER BY pm.name ASC")
    List<MaterialProcessingRule> findActiveByMaterialId(@Param("materialId") UUID materialId);

    @Query("SELECT r FROM MaterialProcessingRule r JOIN FETCH r.material m JOIN FETCH r.processingMethod pm ORDER BY m.name ASC, pm.name ASC")
    List<MaterialProcessingRule> findAllWithDetails();

    Optional<MaterialProcessingRule> findByIdMaterialIdAndIdProcessingMethodId(UUID materialId, UUID processingMethodId);
}
