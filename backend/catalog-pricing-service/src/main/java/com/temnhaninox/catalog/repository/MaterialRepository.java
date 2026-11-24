package com.temnhaninox.catalog.repository;

import com.temnhaninox.catalog.entity.Material;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MaterialRepository extends JpaRepository<Material, UUID> {

    List<Material> findAllByIsActiveTrueOrderByNameAsc();

    List<Material> findAllByOrderByNameAsc();

    Optional<Material> findByIdAndIsActiveTrue(UUID id);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
}
