package com.temnhaninox.order.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardSummaryResponse {

    private long pendingQuotesCount;
    private long awaitingDepositCount;
    private long inProductionCount;
    private long vatPendingCount;
    private BigDecimal monthlyRevenue;
}
