package com.temnhaninox.order.controller;

import com.temnhaninox.order.dto.AdminDashboardSummaryResponse;
import com.temnhaninox.order.exception.GlobalExceptionHandler;
import com.temnhaninox.order.service.AdminOrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminOrderController.class)
@Import(GlobalExceptionHandler.class)
class AdminOrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminOrderService adminOrderService;

    @Test
    void getDashboardSummary_withoutAdminRole_returns403Forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("X-User-Role", "CUSTOMER"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }

    @Test
    void getDashboardSummary_withAdminRole_returns200Summary() throws Exception {
        when(adminOrderService.getDashboardSummary()).thenReturn(
                AdminDashboardSummaryResponse.builder()
                        .pendingQuotesCount(2)
                        .awaitingDepositCount(4)
                        .inProductionCount(6)
                        .vatPendingCount(1)
                        .monthlyRevenue(new BigDecimal("12000000.00"))
                        .build()
        );

        mockMvc.perform(get("/api/v1/admin/dashboard/summary")
                        .header("X-User-Role", "ADMIN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.pendingQuotesCount").value(2))
                .andExpect(jsonPath("$.data.monthlyRevenue").value(12000000.00));
    }
}
