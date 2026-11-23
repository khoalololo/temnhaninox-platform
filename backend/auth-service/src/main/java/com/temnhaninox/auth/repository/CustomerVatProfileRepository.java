package com.temnhaninox.auth.repository;

import com.temnhaninox.auth.entity.CustomerVatProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CustomerVatProfileRepository extends JpaRepository<CustomerVatProfile, UUID> {

    List<CustomerVatProfile> findAllByUserIdOrderByIsDefaultDescCreatedAtDesc(UUID userId);

    Optional<CustomerVatProfile> findByIdAndUserId(UUID id, UUID userId);

    @Modifying
    @Query("UPDATE CustomerVatProfile v SET v.isDefault = false WHERE v.user.id = :userId AND v.isDefault = true")
    void clearDefaultForUser(@Param("userId") UUID userId);
}
