package com.temnhaninox.catalog.repository;

import com.temnhaninox.catalog.entity.ProcessingMethod;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProcessingMethodRepository extends JpaRepository<ProcessingMethod, UUID> {

    List<ProcessingMethod> findAllByIsActiveTrueOrderByNameAsc();

    List<ProcessingMethod> findAllByOrderByNameAsc();

    Optional<ProcessingMethod> findByIdAndIsActiveTrue(UUID id);

    boolean existsByCodeIgnoreCase(String code);
}
