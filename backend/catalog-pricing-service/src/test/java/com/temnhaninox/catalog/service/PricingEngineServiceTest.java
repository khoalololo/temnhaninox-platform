package com.temnhaninox.catalog.service;

import com.temnhaninox.catalog.entity.Material;
import com.temnhaninox.catalog.entity.MaterialProcessingRule;
import com.temnhaninox.catalog.entity.MaterialProcessingRuleId;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PricingEngineServiceTest {

    @Mock
    private MaterialRepository materialRepository;
    @Mock
    private ProcessingMethodRepository processingMethodRepository;
    @Mock
    private MaterialProcessingRuleRepository materialProcessingRuleRepository;
    @Mock
    private PricingRuleRepository pricingRuleRepository;

    @InjectMocks
    private PricingEngineService pricingEngineService;

    private UUID inox304Id;
    private UUID micaId;
    private UUID etchingId;
    private Material inox304;
    private Material mica;
    private ProcessingMethod etching;

    @BeforeEach
    void setUp() {
        inox304Id = UUID.fromString("11111111-1111-1111-1111-111111111101");
        micaId = UUID.fromString("11111111-1111-1111-1111-111111111105");
        etchingId = UUID.fromString("22222222-2222-2222-2222-222222222201");

        inox304 = Material.builder()
                .id(inox304Id)
                .code("INOX_304")
                .name("Inox 304")
                .isMetal(true)
                .densityKgM3(new BigDecimal("7930.00"))
                .pricePerKg(new BigDecimal("85000.00"))
                .thinSheetRatePerM2(new BigDecimal("5000000.00"))
                .minThicknessMm(new BigDecimal("0.30"))
                .maxThicknessMm(new BigDecimal("5.00"))
                .isActive(true)
                .build();

        mica = Material.builder()
                .id(micaId)
                .code("MICA_DECAL")
                .name("Mica / Decal")
                .isMetal(false)
                .thinSheetRatePerM2(new BigDecimal("5000000.00"))
                .minThicknessMm(new BigDecimal("0.10"))
                .maxThicknessMm(new BigDecimal("5.00"))
                .isActive(true)
                .build();

        etching = ProcessingMethod.builder()
                .id(etchingId)
                .code("AN_MON")
                .name("Ăn mòn điện hóa")
                .isActive(true)
                .build();

        lenient().when(pricingRuleRepository.findAll()).thenReturn(List.of(
                rule(PricingEngineService.RULE_THIN_SHEET_THRESHOLD_MM, "1.0000"),
                rule(PricingEngineService.RULE_THIN_SHEET_RATE_M2, "5000000.0000"),
                rule(PricingEngineService.RULE_THICK_METAL_MULTIPLIER, "5.0000"),
                rule(PricingEngineService.RULE_BULK_DISCOUNT_MIN_QTY, "1000.0000"),
                rule(PricingEngineService.RULE_BULK_DISCOUNT_RATE, "0.1000"),
                rule(PricingEngineService.RULE_VAT_RATE, "0.1000"),
                rule(PricingEngineService.RULE_DEPOSIT_RATE, "0.5000")
        ));
    }

    @Test
    void calculateQuote_thinSheetMetal_usesAreaFormula() {
        mockCompatible(inox304, etching, 7);

        QuoteCalculationRequest request = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("0.50"))
                .quantity(100)
                .requiresVatInvoice(false)
                .build();

        QuoteCalculationResponse response = pricingEngineService.calculateQuote(request);

        assertThat(response.getPricingFormulaMode()).isEqualTo("THIN_SHEET_AREA");
        assertThat(response.getAreaM2()).isEqualByComparingTo("0.005000");
        assertThat(response.getCalculatedWeightKg()).isEqualByComparingTo("0.0000");
        assertThat(response.getUnitPrice()).isEqualByComparingTo("25000.00");
        assertThat(response.getSubtotalAmount()).isEqualByComparingTo("2500000.00");
        assertThat(response.getDiscountAmount()).isEqualByComparingTo("0.00");
        assertThat(response.getVatAmount()).isEqualByComparingTo("0.00");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("2500000.00");
        assertThat(response.getDepositRequiredAmount()).isEqualByComparingTo("1250000.00");
        assertThat(response.getEstimatedLeadTimeDays()).isEqualTo(7);
    }

    @Test
    void calculateQuote_boundaryOneMm_usesThinSheetFormula() {
        mockCompatible(inox304, etching, 7);

        QuoteCalculationRequest request = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("1.00"))
                .quantity(10)
                .requiresVatInvoice(false)
                .build();

        QuoteCalculationResponse response = pricingEngineService.calculateQuote(request);

        assertThat(response.getPricingFormulaMode()).isEqualTo("THIN_SHEET_AREA");
        assertThat(response.getUnitPrice()).isEqualByComparingTo("25000.00");
    }

    @Test
    void calculateQuote_nonMetalOverOneMm_stillUsesThinSheetAreaFormula() {
        mockCompatible(mica, etching, 3);

        QuoteCalculationRequest request = QuoteCalculationRequest.builder()
                .materialId(micaId)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("3.00"))
                .quantity(10)
                .requiresVatInvoice(false)
                .build();

        QuoteCalculationResponse response = pricingEngineService.calculateQuote(request);

        assertThat(response.getPricingFormulaMode()).isEqualTo("THIN_SHEET_AREA");
        assertThat(response.getUnitPrice()).isEqualByComparingTo("25000.00");
        assertThat(response.getEstimatedLeadTimeDays()).isEqualTo(3);
    }

    @Test
    void calculateQuote_thickMetal_usesMassTimesFiveFormula() {
        mockCompatible(inox304, etching, 7);

        QuoteCalculationRequest request = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("2.00"))
                .quantity(100)
                .requiresVatInvoice(false)
                .build();

        QuoteCalculationResponse response = pricingEngineService.calculateQuote(request);

        // 0.1m * 0.05m * 0.002m = 0.00001 m3 * 7930 kg/m3 = 0.0793 kg
        // 0.0793 * 85000 * 5 = 33702.50 VND
        assertThat(response.getPricingFormulaMode()).isEqualTo("THICK_METAL_MASS");
        assertThat(response.getCalculatedWeightKg()).isEqualByComparingTo("0.0793");
        assertThat(response.getUnitPrice()).isEqualByComparingTo("33702.50");
        assertThat(response.getSubtotalAmount()).isEqualByComparingTo("3370250.00");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("3370250.00");
        assertThat(response.getDepositRequiredAmount()).isEqualByComparingTo("1685125.00");
    }

    @Test
    void calculateQuote_bulkDiscountAndVatToggle_appliesTenPercentDiscountAndTenPercentVat() {
        mockCompatible(inox304, etching, 7);

        QuoteCalculationRequest request = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("0.50"))
                .quantity(1000)
                .requiresVatInvoice(true)
                .build();

        QuoteCalculationResponse response = pricingEngineService.calculateQuote(request);

        // unit = 25,000 * 1000 = 25,000,000
        // discount 10% = 2,500,000 -> taxable = 22,500,000
        // VAT 10% = 2,250,000 -> total = 24,750,000
        // deposit 50% = 12,375,000
        assertThat(response.getSubtotalAmount()).isEqualByComparingTo("25000000.00");
        assertThat(response.getDiscountRate()).isEqualByComparingTo("0.1000");
        assertThat(response.getDiscountAmount()).isEqualByComparingTo("2500000.00");
        assertThat(response.getVatRate()).isEqualByComparingTo("0.1000");
        assertThat(response.getVatAmount()).isEqualByComparingTo("2250000.00");
        assertThat(response.getTotalAmount()).isEqualByComparingTo("24750000.00");
        assertThat(response.getDepositRequiredAmount()).isEqualByComparingTo("12375000.00");
    }

    @Test
    void calculateQuote_thicknessOutOfRange_throwsInvalidThicknessRange() {
        when(materialRepository.findByIdAndIsActiveTrue(inox304Id)).thenReturn(Optional.of(inox304));
        when(processingMethodRepository.findByIdAndIsActiveTrue(etchingId)).thenReturn(Optional.of(etching));

        QuoteCalculationRequest tooThin = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("0.10"))
                .quantity(10)
                .build();

        assertThatThrownBy(() -> pricingEngineService.calculateQuote(tooThin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_THICKNESS_RANGE);

        QuoteCalculationRequest tooThick = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("8.00"))
                .quantity(10)
                .build();

        assertThatThrownBy(() -> pricingEngineService.calculateQuote(tooThick))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INVALID_THICKNESS_RANGE);
    }

    @Test
    void calculateQuote_disallowedMaterialProcessingPair_throwsIncompatibleMaterialProcess() {
        when(materialRepository.findByIdAndIsActiveTrue(inox304Id)).thenReturn(Optional.of(inox304));
        when(processingMethodRepository.findByIdAndIsActiveTrue(etchingId)).thenReturn(Optional.of(etching));
        when(materialProcessingRuleRepository.findByIdMaterialIdAndIdProcessingMethodId(inox304Id, etchingId))
                .thenReturn(Optional.empty());

        QuoteCalculationRequest request = QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal("0.50"))
                .quantity(10)
                .build();

        assertThatThrownBy(() -> pricingEngineService.calculateQuote(request))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode())
                .isEqualTo(ErrorCode.INCOMPATIBLE_MATERIAL_PROCESS);
    }

    @Test
    void calculateQuote_bulkDiscountBoundary_999NoDiscount_1000GetsTenPercent() {
        mockCompatible(inox304, etching, 7);

        QuoteCalculationResponse at999 = pricingEngineService.calculateQuote(quoteOf(999));
        QuoteCalculationResponse at1000 = pricingEngineService.calculateQuote(quoteOf(1000));

        // unit price 25,000 (0.1m x 0.05m x 5,000,000)
        assertThat(at999.getDiscountAmount()).isEqualByComparingTo("0.00");
        assertThat(at999.getTotalAmount()).isEqualByComparingTo("24975000.00");
        assertThat(at1000.getDiscountAmount()).isEqualByComparingTo("2500000.00");
        assertThat(at1000.getTotalAmount()).isEqualByComparingTo("22500000.00");
    }

    @Test
    void calculateQuote_justAboveOneMm_switchesToThickMetalFormula() {
        mockCompatible(inox304, etching, 7);

        QuoteCalculationRequest request = quoteWith(1, "1.01");

        assertThat(pricingEngineService.calculateQuote(request).getPricingFormulaMode())
                .isEqualTo("THICK_METAL_MASS");
    }

    private QuoteCalculationRequest quoteOf(int quantity) {
        return quoteWith(quantity, "0.50");
    }

    private QuoteCalculationRequest quoteWith(int quantity, String thicknessMm) {
        return QuoteCalculationRequest.builder()
                .materialId(inox304Id)
                .processingMethodId(etchingId)
                .widthMm(new BigDecimal("100"))
                .heightMm(new BigDecimal("50"))
                .thicknessMm(new BigDecimal(thicknessMm))
                .quantity(quantity)
                .requiresVatInvoice(false)
                .build();
    }

    private void mockCompatible(Material material, ProcessingMethod method, int leadDays) {
        when(materialRepository.findByIdAndIsActiveTrue(material.getId())).thenReturn(Optional.of(material));
        when(processingMethodRepository.findByIdAndIsActiveTrue(method.getId())).thenReturn(Optional.of(method));
        MaterialProcessingRule rule = MaterialProcessingRule.builder()
                .id(new MaterialProcessingRuleId(material.getId(), method.getId()))
                .material(material)
                .processingMethod(method)
                .baseLeadTimeDays(leadDays)
                .build();
        when(materialProcessingRuleRepository.findByIdMaterialIdAndIdProcessingMethodId(material.getId(), method.getId()))
                .thenReturn(Optional.of(rule));
    }

    private PricingRule rule(String key, String value) {
        return PricingRule.builder()
                .ruleKey(key)
                .ruleValue(new BigDecimal(value))
                .description(key)
                .build();
    }
}
