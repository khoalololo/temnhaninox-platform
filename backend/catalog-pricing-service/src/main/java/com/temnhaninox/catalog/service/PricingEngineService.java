package com.temnhaninox.catalog.service;

import com.temnhaninox.catalog.dto.PricingRuleResponse;
import com.temnhaninox.catalog.dto.PricingRuleUpdateRequest;
import com.temnhaninox.catalog.entity.Material;
import com.temnhaninox.catalog.entity.MaterialProcessingRule;
import com.temnhaninox.catalog.entity.PricingRule;
import com.temnhaninox.catalog.entity.ProcessingMethod;
import com.temnhaninox.catalog.repository.MaterialProcessingRuleRepository;
import com.temnhaninox.catalog.repository.MaterialRepository;
import com.temnhaninox.catalog.repository.PricingRuleRepository;
import com.temnhaninox.catalog.repository.ProcessingMethodRepository;
import com.temnhaninox.common.dto.QuoteCalculationRequest;
import com.temnhaninox.common.dto.QuoteCalculationResponse;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PricingEngineService {

    public static final String RULE_THIN_SHEET_THRESHOLD_MM = "THIN_SHEET_THRESHOLD_MM";
    public static final String RULE_THIN_SHEET_RATE_M2 = "THIN_SHEET_RATE_M2";
    public static final String RULE_THICK_METAL_MULTIPLIER = "THICK_METAL_MULTIPLIER";
    public static final String RULE_BULK_DISCOUNT_MIN_QTY = "BULK_DISCOUNT_MIN_QTY";
    public static final String RULE_BULK_DISCOUNT_RATE = "BULK_DISCOUNT_RATE";
    public static final String RULE_VAT_RATE = "VAT_RATE";
    public static final String RULE_DEPOSIT_RATE = "DEPOSIT_RATE";

    private static final BigDecimal DEFAULT_THIN_SHEET_THRESHOLD_MM = new BigDecimal("1.0000");
    private static final BigDecimal DEFAULT_THIN_SHEET_RATE_M2 = new BigDecimal("5000000.0000");
    private static final BigDecimal DEFAULT_THICK_METAL_MULTIPLIER = new BigDecimal("5.0000");
    private static final BigDecimal DEFAULT_BULK_DISCOUNT_MIN_QTY = new BigDecimal("1000.0000");
    private static final BigDecimal DEFAULT_BULK_DISCOUNT_RATE = new BigDecimal("0.1000");
    private static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal("0.1000");
    private static final BigDecimal DEFAULT_DEPOSIT_RATE = new BigDecimal("0.5000");
    private static final BigDecimal THOUSAND = new BigDecimal("1000");

    private final MaterialRepository materialRepository;
    private final ProcessingMethodRepository processingMethodRepository;
    private final MaterialProcessingRuleRepository materialProcessingRuleRepository;
    private final PricingRuleRepository pricingRuleRepository;

    @Transactional(readOnly = true)
    public QuoteCalculationResponse calculateQuote(QuoteCalculationRequest request) {
        Material material = materialRepository.findByIdAndIsActiveTrue(request.getMaterialId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Material not found or inactive"));

        ProcessingMethod processingMethod = processingMethodRepository.findByIdAndIsActiveTrue(request.getProcessingMethodId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Processing method not found or inactive"));

        BigDecimal thicknessMm = request.getThicknessMm();
        if (thicknessMm.compareTo(material.getMinThicknessMm()) < 0
                || thicknessMm.compareTo(material.getMaxThicknessMm()) > 0) {
            throw new BusinessException(
                    ErrorCode.INVALID_THICKNESS_RANGE,
                    String.format("Thickness %.2fmm is outside allowed range [%.2fmm, %.2fmm] for %s",
                            thicknessMm, material.getMinThicknessMm(), material.getMaxThicknessMm(), material.getName())
            );
        }

        MaterialProcessingRule compatibilityRule = materialProcessingRuleRepository
                .findByIdMaterialIdAndIdProcessingMethodId(material.getId(), processingMethod.getId())
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INCOMPATIBLE_MATERIAL_PROCESS,
                        String.format("Processing method '%s' is not compatible with material '%s'",
                                processingMethod.getName(), material.getName())
                ));

        Map<String, BigDecimal> rules = pricingRuleRepository.findAll().stream()
                .collect(Collectors.toMap(PricingRule::getRuleKey, PricingRule::getRuleValue, (a, b) -> b));

        BigDecimal thinSheetThresholdMm = rules.getOrDefault(RULE_THIN_SHEET_THRESHOLD_MM, DEFAULT_THIN_SHEET_THRESHOLD_MM);
        BigDecimal thinSheetRateM2Rule = rules.getOrDefault(RULE_THIN_SHEET_RATE_M2, DEFAULT_THIN_SHEET_RATE_M2);
        BigDecimal thickMetalMultiplier = rules.getOrDefault(RULE_THICK_METAL_MULTIPLIER, DEFAULT_THICK_METAL_MULTIPLIER);
        int bulkMinQty = rules.getOrDefault(RULE_BULK_DISCOUNT_MIN_QTY, DEFAULT_BULK_DISCOUNT_MIN_QTY).intValue();
        BigDecimal bulkDiscountRate = rules.getOrDefault(RULE_BULK_DISCOUNT_RATE, DEFAULT_BULK_DISCOUNT_RATE);
        BigDecimal vatRateRule = rules.getOrDefault(RULE_VAT_RATE, DEFAULT_VAT_RATE);
        BigDecimal depositRate = rules.getOrDefault(RULE_DEPOSIT_RATE, DEFAULT_DEPOSIT_RATE);

        BigDecimal widthM = request.getWidthMm().divide(THOUSAND, 6, RoundingMode.HALF_UP);
        BigDecimal heightM = request.getHeightMm().divide(THOUSAND, 6, RoundingMode.HALF_UP);
        BigDecimal areaM2 = widthM.multiply(heightM).setScale(6, RoundingMode.HALF_UP);

        String formulaMode;
        BigDecimal calculatedWeightKg;
        BigDecimal unitPrice;

        boolean useThinSheetFormula = thicknessMm.compareTo(thinSheetThresholdMm) <= 0
                || !Boolean.TRUE.equals(material.getIsMetal());

        if (useThinSheetFormula) {
            formulaMode = "THIN_SHEET_AREA";
            calculatedWeightKg = BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
            BigDecimal ratePerM2 = material.getThinSheetRatePerM2() != null
                    ? material.getThinSheetRatePerM2()
                    : thinSheetRateM2Rule;
            unitPrice = areaM2.multiply(ratePerM2).setScale(2, RoundingMode.HALF_UP);
        } else {
            formulaMode = "THICK_METAL_MASS";
            if (material.getDensityKgM3() == null || material.getPricePerKg() == null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        "Density and pricePerKg must be configured for thick metal material: " + material.getName());
            }
            BigDecimal thicknessM = thicknessMm.divide(THOUSAND, 6, RoundingMode.HALF_UP);
            BigDecimal volumeM3 = widthM.multiply(heightM).multiply(thicknessM);
            calculatedWeightKg = volumeM3.multiply(material.getDensityKgM3()).setScale(4, RoundingMode.HALF_UP);
            unitPrice = calculatedWeightKg
                    .multiply(material.getPricePerKg())
                    .multiply(thickMetalMultiplier)
                    .setScale(2, RoundingMode.HALF_UP);
        }

        int quantity = request.getQuantity();
        BigDecimal subtotalAmount = unitPrice.multiply(BigDecimal.valueOf(quantity)).setScale(2, RoundingMode.HALF_UP);

        BigDecimal appliedDiscountRate = quantity >= bulkMinQty
                ? bulkDiscountRate.setScale(4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        BigDecimal discountAmount = subtotalAmount.multiply(appliedDiscountRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxableAmount = subtotalAmount.subtract(discountAmount);

        BigDecimal appliedVatRate = request.isRequiresVatInvoice()
                ? vatRateRule.setScale(4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        BigDecimal vatAmount = taxableAmount.multiply(appliedVatRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = taxableAmount.add(vatAmount).setScale(2, RoundingMode.HALF_UP);
        BigDecimal depositRequiredAmount = totalAmount.multiply(depositRate).setScale(2, RoundingMode.HALF_UP);

        return QuoteCalculationResponse.builder()
                .pricingFormulaMode(formulaMode)
                .areaM2(areaM2)
                .calculatedWeightKg(calculatedWeightKg)
                .unitPrice(unitPrice)
                .quantity(quantity)
                .subtotalAmount(subtotalAmount)
                .discountRate(appliedDiscountRate)
                .discountAmount(discountAmount)
                .vatRate(appliedVatRate)
                .vatAmount(vatAmount)
                .totalAmount(totalAmount)
                .depositRequiredAmount(depositRequiredAmount)
                .estimatedLeadTimeDays(compatibilityRule.getBaseLeadTimeDays())
                .build();
    }

    @Transactional(readOnly = true)
    public List<PricingRuleResponse> getAllRules() {
        return pricingRuleRepository.findAllByOrderByRuleKeyAsc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public List<PricingRuleResponse> updateRules(PricingRuleUpdateRequest request) {
        for (PricingRuleUpdateRequest.RuleItem item : request.getRules()) {
            PricingRule rule = pricingRuleRepository.findById(item.getRuleKey())
                    .orElseThrow(() -> new BusinessException(
                            ErrorCode.RESOURCE_NOT_FOUND,
                            "Pricing rule not found: " + item.getRuleKey()
                    ));
            rule.setRuleValue(item.getRuleValue());
            if (item.getDescription() != null && !item.getDescription().isBlank()) {
                rule.setDescription(item.getDescription().trim());
            }
            pricingRuleRepository.save(rule);
        }
        return getAllRules();
    }

    private PricingRuleResponse toResponse(PricingRule rule) {
        return PricingRuleResponse.builder()
                .ruleKey(rule.getRuleKey())
                .ruleValue(rule.getRuleValue())
                .description(rule.getDescription())
                .updatedAt(rule.getUpdatedAt())
                .build();
    }
}
