package com.temnhaninox.order.dto;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminQuoteReviewRequest {

    @Valid
    private List<AdminQuoteItemPriceUpdate> items;

    private LocalDate estimatedCompletionDate;
    private String adminInternalNote;
    private String note;
}
