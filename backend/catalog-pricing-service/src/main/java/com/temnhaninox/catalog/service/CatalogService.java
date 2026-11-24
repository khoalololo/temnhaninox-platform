package com.temnhaninox.catalog.service;

import com.temnhaninox.catalog.dto.CategoryRequest;
import com.temnhaninox.catalog.dto.CategoryResponse;
import com.temnhaninox.catalog.dto.MaterialProcessingRuleRequest;
import com.temnhaninox.catalog.dto.MaterialProcessingRuleResponse;
import com.temnhaninox.catalog.dto.MaterialRequest;
import com.temnhaninox.catalog.dto.MaterialResponse;
import com.temnhaninox.catalog.dto.ProcessingMethodResponse;
import com.temnhaninox.catalog.dto.ProductRequest;
import com.temnhaninox.catalog.dto.ProductResponse;
import com.temnhaninox.catalog.entity.Category;
import com.temnhaninox.catalog.entity.Material;
import com.temnhaninox.catalog.entity.MaterialProcessingRule;
import com.temnhaninox.catalog.entity.MaterialProcessingRuleId;
import com.temnhaninox.catalog.entity.ProcessingMethod;
import com.temnhaninox.catalog.entity.Product;
import com.temnhaninox.catalog.repository.CategoryRepository;
import com.temnhaninox.catalog.repository.MaterialProcessingRuleRepository;
import com.temnhaninox.catalog.repository.MaterialRepository;
import com.temnhaninox.catalog.repository.ProcessingMethodRepository;
import com.temnhaninox.catalog.repository.ProductRepository;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.enums.ProductType;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final CategoryRepository categoryRepository;
    private final MaterialRepository materialRepository;
    private final ProcessingMethodRepository processingMethodRepository;
    private final MaterialProcessingRuleRepository materialProcessingRuleRepository;
    private final ProductRepository productRepository;

    // -------------------------------------------------------------------------
    // Public Catalog
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<CategoryResponse> getActiveCategoryTree() {
        List<Category> categories = categoryRepository.findAllByIsActiveTrueOrderByDisplayOrderAscNameAsc();
        return buildCategoryTree(categories);
    }

    @Transactional(readOnly = true)
    public List<MaterialResponse> getActiveMaterialsWithMethods() {
        List<Material> materials = materialRepository.findAllByIsActiveTrueOrderByNameAsc();
        return materials.stream()
                .map(material -> toMaterialResponse(material, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getActiveProducts(
            UUID categoryId,
            String categorySlug,
            ProductType productType,
            String search,
            int page,
            int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<Product> spec = (root, query, cb) -> {
            if (Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("category", JoinType.LEFT);
                root.fetch("material", JoinType.LEFT);
                root.fetch("processingMethod", JoinType.LEFT);
            }

            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.isTrue(root.get("isActive")));

            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (categorySlug != null && !categorySlug.isBlank()) {
                predicates.add(cb.equal(root.get("category").get("slug"), categorySlug.trim()));
            }
            if (productType != null) {
                predicates.add(cb.equal(root.get("productType"), productType));
            }
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("sku")), pattern),
                        cb.like(cb.lower(cb.coalesce(root.get("description"), "")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Product> productPage = productRepository.findAll(spec, pageable);
        return toPageResponse(productPage);
    }

    @Transactional(readOnly = true)
    public ProductResponse getActiveProductBySlug(String slug) {
        Product product = productRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Product not found: " + slug));
        return toProductResponse(product);
    }

    // -------------------------------------------------------------------------
    // Admin: Categories
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return buildCategoryTree(categoryRepository.findAllByOrderByDisplayOrderAscNameAsc());
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest request) {
        String slug = request.getSlug().trim().toLowerCase();
        if (categoryRepository.existsBySlug(slug)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Category slug already exists: " + slug);
        }

        Category parent = null;
        if (request.getParentId() != null) {
            parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Parent category not found"));
        }

        Category category = Category.builder()
                .parent(parent)
                .name(request.getName().trim())
                .slug(slug)
                .displayOrder(request.getDisplayOrder() != null ? request.getDisplayOrder() : 0)
                .isActive(request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE)
                .build();

        return toFlatCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse updateCategory(UUID id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Category not found"));

        String slug = request.getSlug().trim().toLowerCase();
        if (categoryRepository.existsBySlugAndIdNot(slug, id)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Category slug already exists: " + slug);
        }

        Category parent = null;
        if (request.getParentId() != null) {
            if (request.getParentId().equals(id)) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Category cannot be its own parent");
            }
            parent = categoryRepository.findById(request.getParentId())
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Parent category not found"));
        }

        category.setParent(parent);
        category.setName(request.getName().trim());
        category.setSlug(slug);
        if (request.getDisplayOrder() != null) {
            category.setDisplayOrder(request.getDisplayOrder());
        }
        if (request.getIsActive() != null) {
            category.setIsActive(request.getIsActive());
        }

        return toFlatCategoryResponse(categoryRepository.save(category));
    }

    @Transactional
    public void deleteCategory(UUID id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Category not found"));
        categoryRepository.delete(category);
    }

    // -------------------------------------------------------------------------
    // Admin: Materials
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<MaterialResponse> getAllMaterials() {
        return materialRepository.findAllByOrderByNameAsc().stream()
                .map(material -> toMaterialResponse(material, false))
                .toList();
    }

    @Transactional
    public MaterialResponse createMaterial(MaterialRequest request) {
        String code = request.getCode().trim().toUpperCase();
        if (materialRepository.existsByCodeIgnoreCase(code)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Material code already exists: " + code);
        }
        validateThicknessBounds(request);

        Material material = Material.builder()
                .code(code)
                .name(request.getName().trim())
                .isMetal(request.getIsMetal())
                .densityKgM3(request.getDensityKgM3())
                .pricePerKg(request.getPricePerKg())
                .thinSheetRatePerM2(request.getThinSheetRatePerM2())
                .minThicknessMm(request.getMinThicknessMm())
                .maxThicknessMm(request.getMaxThicknessMm())
                .pbrPreviewConfig(request.getPbrPreviewConfig() != null
                        ? new HashMap<>(request.getPbrPreviewConfig())
                        : new HashMap<>(Map.of("baseColor", "#d4d7d9", "metalness", 0.9, "roughness", 0.25)))
                .isActive(request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE)
                .build();

        return toMaterialResponse(materialRepository.save(material), false);
    }

    @Transactional
    public MaterialResponse updateMaterial(UUID id, MaterialRequest request) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Material not found"));

        String code = request.getCode().trim().toUpperCase();
        if (materialRepository.existsByCodeIgnoreCaseAndIdNot(code, id)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Material code already exists: " + code);
        }
        validateThicknessBounds(request);

        material.setCode(code);
        material.setName(request.getName().trim());
        material.setIsMetal(request.getIsMetal());
        material.setDensityKgM3(request.getDensityKgM3());
        material.setPricePerKg(request.getPricePerKg());
        material.setThinSheetRatePerM2(request.getThinSheetRatePerM2());
        material.setMinThicknessMm(request.getMinThicknessMm());
        material.setMaxThicknessMm(request.getMaxThicknessMm());
        if (request.getPbrPreviewConfig() != null) {
            material.setPbrPreviewConfig(new HashMap<>(request.getPbrPreviewConfig()));
        }
        if (request.getIsActive() != null) {
            material.setIsActive(request.getIsActive());
        }

        return toMaterialResponse(materialRepository.save(material), false);
    }

    @Transactional
    public void deleteMaterial(UUID id) {
        Material material = materialRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Material not found"));
        materialRepository.delete(material);
    }

    // -------------------------------------------------------------------------
    // Admin: Processing Methods & Material-Processing Rules
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<ProcessingMethodResponse> getAllProcessingMethods() {
        return processingMethodRepository.findAllByOrderByNameAsc().stream()
                .map(pm -> ProcessingMethodResponse.builder()
                        .id(pm.getId())
                        .code(pm.getCode())
                        .name(pm.getName())
                        .description(pm.getDescription())
                        .isActive(pm.getIsActive())
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MaterialProcessingRuleResponse> getAllMaterialProcessingRules() {
        return materialProcessingRuleRepository.findAllWithDetails().stream()
                .map(this::toRuleResponse)
                .toList();
    }

    @Transactional
    public MaterialProcessingRuleResponse upsertMaterialProcessingRule(MaterialProcessingRuleRequest request) {
        Material material = materialRepository.findById(request.getMaterialId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Material not found"));
        ProcessingMethod method = processingMethodRepository.findById(request.getProcessingMethodId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Processing method not found"));

        MaterialProcessingRuleId ruleId = new MaterialProcessingRuleId(material.getId(), method.getId());
        MaterialProcessingRule rule = materialProcessingRuleRepository.findById(ruleId)
                .orElseGet(() -> MaterialProcessingRule.builder()
                        .id(ruleId)
                        .material(material)
                        .processingMethod(method)
                        .build());

        rule.setBaseLeadTimeDays(request.getBaseLeadTimeDays());
        return toRuleResponse(materialProcessingRuleRepository.save(rule));
    }

    @Transactional
    public void deleteMaterialProcessingRule(UUID materialId, UUID processingMethodId) {
        MaterialProcessingRuleId ruleId = new MaterialProcessingRuleId(materialId, processingMethodId);
        MaterialProcessingRule rule = materialProcessingRuleRepository.findById(ruleId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Material-processing rule not found"));
        materialProcessingRuleRepository.delete(rule);
    }

    // -------------------------------------------------------------------------
    // Admin: Products
    // -------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> getAllProducts(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Specification<Product> spec = (root, query, cb) -> {
            if (Long.class != query.getResultType() && long.class != query.getResultType()) {
                root.fetch("category", JoinType.LEFT);
                root.fetch("material", JoinType.LEFT);
                root.fetch("processingMethod", JoinType.LEFT);
            }
            return cb.conjunction();
        };

        return toPageResponse(productRepository.findAll(spec, pageable));
    }

    @Transactional
    public ProductResponse createProduct(ProductRequest request) {
        String sku = request.getSku().trim().toUpperCase();
        String slug = request.getSlug().trim().toLowerCase();
        if (productRepository.existsBySkuIgnoreCase(sku)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Product SKU already exists: " + sku);
        }
        if (productRepository.existsBySlug(slug)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Product slug already exists: " + slug);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Category not found"));
        Material material = resolveOptionalMaterial(request.getMaterialId());
        ProcessingMethod method = resolveOptionalProcessingMethod(request.getProcessingMethodId());

        Product product = Product.builder()
                .category(category)
                .material(material)
                .processingMethod(method)
                .sku(sku)
                .name(request.getName().trim())
                .slug(slug)
                .description(request.getDescription())
                .productType(request.getProductType())
                .basePrice(request.getBasePrice())
                .defaultWidthMm(request.getDefaultWidthMm())
                .defaultHeightMm(request.getDefaultHeightMm())
                .defaultThicknessMm(request.getDefaultThicknessMm())
                .stockQuantity(request.getStockQuantity() != null ? request.getStockQuantity() : 0)
                .images(request.getImages() != null ? new ArrayList<>(request.getImages()) : new ArrayList<>())
                .isActive(request.getIsActive() != null ? request.getIsActive() : Boolean.TRUE)
                .build();

        Product saved = productRepository.save(product);
        return toProductResponse(productRepository.findWithDetailsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public ProductResponse updateProduct(UUID id, ProductRequest request) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Product not found"));

        String sku = request.getSku().trim().toUpperCase();
        String slug = request.getSlug().trim().toLowerCase();
        if (productRepository.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Product SKU already exists: " + sku);
        }
        if (productRepository.existsBySlugAndIdNot(slug, id)) {
            throw new BusinessException(ErrorCode.DUPLICATE_RESOURCE, "Product slug already exists: " + slug);
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Category not found"));
        Material material = resolveOptionalMaterial(request.getMaterialId());
        ProcessingMethod method = resolveOptionalProcessingMethod(request.getProcessingMethodId());

        product.setCategory(category);
        product.setMaterial(material);
        product.setProcessingMethod(method);
        product.setSku(sku);
        product.setName(request.getName().trim());
        product.setSlug(slug);
        product.setDescription(request.getDescription());
        product.setProductType(request.getProductType());
        product.setBasePrice(request.getBasePrice());
        product.setDefaultWidthMm(request.getDefaultWidthMm());
        product.setDefaultHeightMm(request.getDefaultHeightMm());
        product.setDefaultThicknessMm(request.getDefaultThicknessMm());
        if (request.getStockQuantity() != null) {
            product.setStockQuantity(request.getStockQuantity());
        }
        if (request.getImages() != null) {
            product.setImages(new ArrayList<>(request.getImages()));
        }
        if (request.getIsActive() != null) {
            product.setIsActive(request.getIsActive());
        }

        Product saved = productRepository.save(product);
        return toProductResponse(productRepository.findWithDetailsById(saved.getId()).orElse(saved));
    }

    @Transactional
    public void deleteProduct(UUID id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Product not found"));
        productRepository.delete(product);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private void validateThicknessBounds(MaterialRequest request) {
        if (request.getMinThicknessMm().compareTo(request.getMaxThicknessMm()) > 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "minThicknessMm cannot exceed maxThicknessMm");
        }
    }

    private Material resolveOptionalMaterial(UUID materialId) {
        if (materialId == null) {
            return null;
        }
        return materialRepository.findById(materialId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Material not found"));
    }

    private ProcessingMethod resolveOptionalProcessingMethod(UUID processingMethodId) {
        if (processingMethodId == null) {
            return null;
        }
        return processingMethodRepository.findById(processingMethodId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Processing method not found"));
    }

    private List<CategoryResponse> buildCategoryTree(List<Category> categories) {
        Map<UUID, CategoryResponse> nodeMap = new LinkedHashMap<>();
        for (Category category : categories) {
            nodeMap.put(category.getId(), toFlatCategoryResponse(category));
        }

        List<CategoryResponse> roots = new ArrayList<>();
        for (Category category : categories) {
            CategoryResponse current = nodeMap.get(category.getId());
            UUID parentId = category.getParent() != null ? category.getParent().getId() : null;
            if (parentId != null && nodeMap.containsKey(parentId)) {
                nodeMap.get(parentId).getChildren().add(current);
            } else {
                roots.add(current);
            }
        }
        return roots;
    }

    private CategoryResponse toFlatCategoryResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .name(category.getName())
                .slug(category.getSlug())
                .displayOrder(category.getDisplayOrder())
                .isActive(category.getIsActive())
                .build();
    }

    private MaterialResponse toMaterialResponse(Material material, boolean onlyActiveMethods) {
        List<MaterialProcessingRule> rules = onlyActiveMethods
                ? materialProcessingRuleRepository.findActiveByMaterialId(material.getId())
                : materialProcessingRuleRepository.findActiveByMaterialId(material.getId());

        List<ProcessingMethodResponse> allowedMethods = rules.stream()
                .map(rule -> ProcessingMethodResponse.builder()
                        .id(rule.getProcessingMethod().getId())
                        .code(rule.getProcessingMethod().getCode())
                        .name(rule.getProcessingMethod().getName())
                        .description(rule.getProcessingMethod().getDescription())
                        .baseLeadTimeDays(rule.getBaseLeadTimeDays())
                        .isActive(rule.getProcessingMethod().getIsActive())
                        .build())
                .toList();

        return MaterialResponse.builder()
                .id(material.getId())
                .code(material.getCode())
                .name(material.getName())
                .isMetal(material.getIsMetal())
                .densityKgM3(material.getDensityKgM3())
                .pricePerKg(material.getPricePerKg())
                .thinSheetRatePerM2(material.getThinSheetRatePerM2())
                .minThicknessMm(material.getMinThicknessMm())
                .maxThicknessMm(material.getMaxThicknessMm())
                .pbrPreviewConfig(material.getPbrPreviewConfig())
                .isActive(material.getIsActive())
                .allowedProcessingMethods(allowedMethods)
                .build();
    }

    private MaterialProcessingRuleResponse toRuleResponse(MaterialProcessingRule rule) {
        return MaterialProcessingRuleResponse.builder()
                .materialId(rule.getMaterial().getId())
                .materialCode(rule.getMaterial().getCode())
                .materialName(rule.getMaterial().getName())
                .processingMethodId(rule.getProcessingMethod().getId())
                .processingMethodCode(rule.getProcessingMethod().getCode())
                .processingMethodName(rule.getProcessingMethod().getName())
                .baseLeadTimeDays(rule.getBaseLeadTimeDays())
                .build();
    }

    private PageResponse<ProductResponse> toPageResponse(Page<Product> page) {
        return PageResponse.<ProductResponse>builder()
                .content(page.getContent().stream().map(this::toProductResponse).toList())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    private ProductResponse toProductResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .categoryId(product.getCategory() != null ? product.getCategory().getId() : null)
                .categoryName(product.getCategory() != null ? product.getCategory().getName() : null)
                .categorySlug(product.getCategory() != null ? product.getCategory().getSlug() : null)
                .materialId(product.getMaterial() != null ? product.getMaterial().getId() : null)
                .materialCode(product.getMaterial() != null ? product.getMaterial().getCode() : null)
                .materialName(product.getMaterial() != null ? product.getMaterial().getName() : null)
                .processingMethodId(product.getProcessingMethod() != null ? product.getProcessingMethod().getId() : null)
                .processingMethodCode(product.getProcessingMethod() != null ? product.getProcessingMethod().getCode() : null)
                .processingMethodName(product.getProcessingMethod() != null ? product.getProcessingMethod().getName() : null)
                .sku(product.getSku())
                .name(product.getName())
                .slug(product.getSlug())
                .description(product.getDescription())
                .productType(product.getProductType())
                .basePrice(product.getBasePrice())
                .defaultWidthMm(product.getDefaultWidthMm())
                .defaultHeightMm(product.getDefaultHeightMm())
                .defaultThicknessMm(product.getDefaultThicknessMm())
                .stockQuantity(product.getStockQuantity())
                .images(product.getImages() != null ? product.getImages() : List.of())
                .isActive(product.getIsActive())
                .createdAt(product.getCreatedAt())
                .build();
    }
}
