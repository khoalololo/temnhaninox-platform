package com.temnhaninox.order.controller;

import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import com.temnhaninox.order.exception.GlobalExceptionHandler;
import com.temnhaninox.order.service.OrderService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(OrderController.class)
@Import(GlobalExceptionHandler.class)
class OrderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrderService orderService;

    @Test
    void getOrders_missingUserHeader_returns401ApiResponse() throws Exception {
        mockMvc.perform(get("/api/v1/orders"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("UNAUTHORIZED"));
    }

    @Test
    void checkout_invalidBody_returns400ValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/orders/checkout")
                        .header("X-User-Id", UUID.randomUUID().toString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }

    @Test
    void getOrderDetail_forbidden_returns403ApiResponse() throws Exception {
        UUID customerId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        when(orderService.getCustomerOrderDetail(customerId, orderId))
                .thenThrow(new BusinessException(ErrorCode.FORBIDDEN, "Access denied"));

        mockMvc.perform(get("/api/v1/orders/{id}", orderId)
                        .header("X-User-Id", customerId.toString()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("FORBIDDEN"));
    }
}
