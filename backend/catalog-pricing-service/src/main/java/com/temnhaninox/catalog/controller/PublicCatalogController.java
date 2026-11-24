package com.temnhaninox.catalog.controller;

import com.temnhaninox.catalog.dto.CategoryResponse;
import com.temnhaninox.catalog.dto.MaterialResponse;
import com.temnhaninox.catalog.dto.ProductResponse;
import com.temnhaninox.catalog.service.CatalogService;
import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.enums.ProductType;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/catalog")
@RequiredArgsConstructor
public class PublicCatalogController {

    private final CatalogService catalogService;

    @GetMapping("/categories")
    public ApiResponse<List<CategoryResponse>> getCategories() {
        return ApiResponse.ok(catalogService.getActiveCategoryTree());
    }

    @GetMapping("/materials")
    public ApiResponse<List<MaterialResponse>> getMaterials() {
        return ApiResponse.ok(catalogService.getActiveMaterialsWithMethods());
    }

    @GetMapping("/products")
    public ApiResponse<PageResponse<ProductResponse>> getProducts(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String categorySlug,
            @RequestParam(required = false) ProductType productType,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(catalogService.getActiveProducts(categoryId, categorySlug, productType, search, page, size));
    }

    @GetMapping("/products/{slug}")
    public ApiResponse<ProductResponse> getProductBySlug(@PathVariable String slug) {
        return ApiResponse.ok(catalogService.getActiveProductBySlug(slug));
    }
}
