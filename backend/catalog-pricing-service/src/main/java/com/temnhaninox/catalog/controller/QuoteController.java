package com.temnhaninox.catalog.controller;

import com.temnhaninox.catalog.service.PricingEngineService;
import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.dto.QuoteCalculationRequest;
import com.temnhaninox.common.dto.QuoteCalculationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/quotes")
@RequiredArgsConstructor
public class QuoteController {

    private final PricingEngineService pricingEngineService;

    @PostMapping("/calculate")
    public ApiResponse<QuoteCalculationResponse> calculateQuote(@Valid @RequestBody QuoteCalculationRequest request) {
        return ApiResponse.ok(pricingEngineService.calculateQuote(request));
    }
}
