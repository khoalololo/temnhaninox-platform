package com.temnhaninox.catalog.controller;

import com.temnhaninox.catalog.dto.CategoryRequest;
import com.temnhaninox.catalog.dto.CategoryResponse;
import com.temnhaninox.catalog.dto.MaterialProcessingRuleRequest;
import com.temnhaninox.catalog.dto.MaterialProcessingRuleResponse;
import com.temnhaninox.catalog.dto.MaterialRequest;
import com.temnhaninox.catalog.dto.MaterialResponse;
import com.temnhaninox.catalog.dto.PricingRuleResponse;
import com.temnhaninox.catalog.dto.PricingRuleUpdateRequest;
import com.temnhaninox.catalog.dto.ProcessingMethodResponse;
import com.temnhaninox.catalog.dto.ProductRequest;
import com.temnhaninox.catalog.dto.ProductResponse;
import com.temnhaninox.catalog.service.CatalogService;
import com.temnhaninox.catalog.service.PricingEngineService;
import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminCatalogController {

    private final CatalogService catalogService;
    private final PricingEngineService pricingEngineService;

    // -------------------------------------------------------------------------
    // Categories
    // -------------------------------------------------------------------------

    @GetMapping("/catalog/categories")
    public ApiResponse<List<CategoryResponse>> getAllCategories(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        return ApiResponse.ok(catalogService.getAllCategories());
    }

    @PostMapping("/catalog/categories")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CategoryResponse> createCategory(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody CategoryRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Category created", catalogService.createCategory(request));
    }

    @PutMapping("/catalog/categories/{id}")
    public ApiResponse<CategoryResponse> updateCategory(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID id,
            @Valid @RequestBody CategoryRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Category updated", catalogService.updateCategory(id, request));
    }

    @DeleteMapping("/catalog/categories/{id}")
    public ApiResponse<Void> deleteCategory(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID id) {
        requireAdmin(role);
        catalogService.deleteCategory(id);
        return ApiResponse.ok("Category deleted", null);
    }

    // -------------------------------------------------------------------------
    // Materials
    // -------------------------------------------------------------------------

    @GetMapping("/catalog/materials")
    public ApiResponse<List<MaterialResponse>> getAllMaterials(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        return ApiResponse.ok(catalogService.getAllMaterials());
    }

    @PostMapping("/catalog/materials")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MaterialResponse> createMaterial(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody MaterialRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Material created", catalogService.createMaterial(request));
    }

    @PutMapping("/catalog/materials/{id}")
    public ApiResponse<MaterialResponse> updateMaterial(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID id,
            @Valid @RequestBody MaterialRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Material updated", catalogService.updateMaterial(id, request));
    }

    @DeleteMapping("/catalog/materials/{id}")
    public ApiResponse<Void> deleteMaterial(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID id) {
        requireAdmin(role);
        catalogService.deleteMaterial(id);
        return ApiResponse.ok("Material deleted", null);
    }

    // -------------------------------------------------------------------------
    // Processing Methods & Material-Processing Rules
    // -------------------------------------------------------------------------

    @GetMapping("/catalog/processing-methods")
    public ApiResponse<List<ProcessingMethodResponse>> getAllProcessingMethods(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        return ApiResponse.ok(catalogService.getAllProcessingMethods());
    }

    @GetMapping("/catalog/material-processing-rules")
    public ApiResponse<List<MaterialProcessingRuleResponse>> getAllMaterialProcessingRules(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        return ApiResponse.ok(catalogService.getAllMaterialProcessingRules());
    }

    @PutMapping("/catalog/material-processing-rules")
    public ApiResponse<MaterialProcessingRuleResponse> upsertMaterialProcessingRule(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody MaterialProcessingRuleRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Material-processing rule saved", catalogService.upsertMaterialProcessingRule(request));
    }

    @DeleteMapping("/catalog/material-processing-rules/{materialId}/{processingMethodId}")
    public ApiResponse<Void> deleteMaterialProcessingRule(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID materialId,
            @PathVariable UUID processingMethodId) {
        requireAdmin(role);
        catalogService.deleteMaterialProcessingRule(materialId, processingMethodId);
        return ApiResponse.ok("Material-processing rule deleted", null);
    }

    // -------------------------------------------------------------------------
    // Products
    // -------------------------------------------------------------------------

    @GetMapping("/catalog/products")
    public ApiResponse<PageResponse<ProductResponse>> getAllProducts(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        requireAdmin(role);
        return ApiResponse.ok(catalogService.getAllProducts(page, size));
    }

    @PostMapping("/catalog/products")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProductResponse> createProduct(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody ProductRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Product created", catalogService.createProduct(request));
    }

    @PutMapping("/catalog/products/{id}")
    public ApiResponse<ProductResponse> updateProduct(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID id,
            @Valid @RequestBody ProductRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Product updated", catalogService.updateProduct(id, request));
    }

    @DeleteMapping("/catalog/products/{id}")
    public ApiResponse<Void> deleteProduct(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @PathVariable UUID id) {
        requireAdmin(role);
        catalogService.deleteProduct(id);
        return ApiResponse.ok("Product deleted", null);
    }

    // -------------------------------------------------------------------------
    // Pricing Rules
    // -------------------------------------------------------------------------

    @GetMapping("/pricing/rules")
    public ApiResponse<List<PricingRuleResponse>> getPricingRules(
            @RequestHeader(value = "X-User-Role", required = false) String role) {
        requireAdmin(role);
        return ApiResponse.ok(pricingEngineService.getAllRules());
    }

    @PutMapping("/pricing/rules")
    public ApiResponse<List<PricingRuleResponse>> updatePricingRules(
            @RequestHeader(value = "X-User-Role", required = false) String role,
            @Valid @RequestBody PricingRuleUpdateRequest request) {
        requireAdmin(role);
        return ApiResponse.ok("Pricing rules updated", pricingEngineService.updateRules(request));
    }

    private void requireAdmin(String role) {
        if (!UserRole.ADMIN.name().equalsIgnoreCase(role)) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Admin role required");
        }
    }
}
