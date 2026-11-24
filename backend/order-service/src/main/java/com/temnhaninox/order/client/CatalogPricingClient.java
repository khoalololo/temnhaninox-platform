package com.temnhaninox.order.client;

import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.PageResponse;
import com.temnhaninox.common.dto.QuoteCalculationRequest;
import com.temnhaninox.common.dto.QuoteCalculationResponse;
import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.client.dto.CatalogMaterialDto;
import com.temnhaninox.order.client.dto.CatalogProcessingMethodDto;
import com.temnhaninox.order.client.dto.CatalogProductDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Component
public class CatalogPricingClient {

    private final RestClient restClient;

    public CatalogPricingClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.services.catalog-url:http://localhost:8082}") String catalogServiceUrl) {
        this.restClient = restClientBuilder
                .baseUrl(catalogServiceUrl)
                .build();
    }

    public QuoteCalculationResponse calculateQuote(QuoteCalculationRequest request) {
        try {
            ApiResponse<QuoteCalculationResponse> response = restClient.post()
                    .uri("/api/v1/quotes/calculate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .retrieve()
                    .body(new ParameterizedTypeReference<ApiResponse<QuoteCalculationResponse>>() {});

            if (response == null || !response.isSuccess() || response.getData() == null) {
                throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                        response != null && response.getMessage() != null
                                ? response.getMessage()
                                : "Failed to calculate quote from catalog-pricing-service");
            }
            return response.getData();
        } catch (RestClientResponseException ex) {
            log.warn("Catalog service returned error on quote calculation: status={} body={}",
                    ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Quote calculation rejected by catalog service: " + ex.getStatusText(), ex);
        } catch (RestClientException ex) {
            log.error("Failed to reach catalog-pricing-service for quote calculation", ex);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                    "Catalog pricing service is unavailable", ex);
        }
    }

    public List<CatalogProductDto> getAllProducts() {
        try {
            ApiResponse<PageResponse<CatalogProductDto>> response = restClient.get()
                    .uri("/api/v1/catalog/products?page=0&size=200")
                    .retrieve()
                    .body(new ParameterizedTypeReference<ApiResponse<PageResponse<CatalogProductDto>>>() {});

            if (response == null || !response.isSuccess() || response.getData() == null
                    || response.getData().getContent() == null) {
                return Collections.emptyList();
            }
            return response.getData().getContent();
        } catch (RestClientException ex) {
            log.error("Failed to fetch products from catalog-pricing-service", ex);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                    "Catalog pricing service is unavailable", ex);
        }
    }

    public Optional<CatalogProductDto> findProductById(UUID productId) {
        if (productId == null) {
            return Optional.empty();
        }
        return getAllProducts().stream()
                .filter(p -> productId.equals(p.getId()))
                .findFirst();
    }

    public Map<UUID, CatalogMaterialDto> getMaterialsMap() {
        try {
            ApiResponse<List<CatalogMaterialDto>> response = restClient.get()
                    .uri("/api/v1/catalog/materials")
                    .retrieve()
                    .body(new ParameterizedTypeReference<ApiResponse<List<CatalogMaterialDto>>>() {});

            if (response == null || !response.isSuccess() || response.getData() == null) {
                return Collections.emptyMap();
            }
            return response.getData().stream()
                    .filter(m -> m.getId() != null)
                    .collect(Collectors.toMap(CatalogMaterialDto::getId, Function.identity(), (a, b) -> a));
        } catch (RestClientException ex) {
            log.error("Failed to fetch materials from catalog-pricing-service", ex);
            throw new BusinessException(ErrorCode.INTERNAL_ERROR,
                    "Catalog pricing service is unavailable", ex);
        }
    }

    public Map<UUID, CatalogProcessingMethodDto> getProcessingMethodsMap(Map<UUID, CatalogMaterialDto> materialsMap) {
        Map<UUID, CatalogProcessingMethodDto> result = new HashMap<>();
        if (materialsMap != null) {
            for (CatalogMaterialDto material : materialsMap.values()) {
                if (material.getCompatibleProcessingMethods() != null) {
                    for (CatalogProcessingMethodDto pm : material.getCompatibleProcessingMethods()) {
                        if (pm.getId() != null) {
                            result.putIfAbsent(pm.getId(), pm);
                        }
                    }
                }
            }
        }
        return result;
    }
}
