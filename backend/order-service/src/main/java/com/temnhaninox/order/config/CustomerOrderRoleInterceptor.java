package com.temnhaninox.order.config;

import com.temnhaninox.common.exception.BusinessException;
import com.temnhaninox.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration(proxyBeanMethods = false)
public class CustomerOrderRoleInterceptor implements HandlerInterceptor, WebMvcConfigurer {

    private static final String FORBIDDEN_MESSAGE =
            "Admin accounts cannot place or manage customer orders";

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this)
                .addPathPatterns(
                        "/api/v1/cart",
                        "/api/v1/cart/**",
                        "/api/v1/orders",
                        "/api/v1/orders/**",
                        "/api/v1/payments/vnpay/create-url");
    }

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler) {
        if ("ADMIN".equals(request.getHeader("X-User-Role"))) {
            throw new BusinessException(ErrorCode.FORBIDDEN, FORBIDDEN_MESSAGE);
        }
        return true;
    }
}
