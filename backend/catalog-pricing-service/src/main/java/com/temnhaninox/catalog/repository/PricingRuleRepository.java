package com.temnhaninox.catalog.repository;

import com.temnhaninox.catalog.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PricingRuleRepository extends JpaRepository<PricingRule, String> {

    List<PricingRule> findAllByOrderByRuleKeyAsc();
}
