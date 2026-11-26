package com.temnhaninox.gateway.filter;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.temnhaninox.common.dto.ApiResponse;
import com.temnhaninox.common.enums.UserRole;
import com.temnhaninox.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.io.buffer.DataBuffer;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Component
public class JwtAuthGlobalFilter implements GlobalFilter, Ordered {

    public static final String HEADER_USER_ID = "X-User-Id";
    public static final String HEADER_USER_ROLE = "X-User-Role";

    private final SecretKey signingKey;
    private final ObjectMapper objectMapper;

    public JwtAuthGlobalFilter(
            @Value("${app.jwt.secret}") String secret,
            ObjectMapper objectMapper) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.objectMapper = objectMapper;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        HttpMethod method = request.getMethod();
        String path = request.getURI().getPath();

        if (isPublicEndpoint(method, path)) {
            return chain.filter(exchange);
        }

        String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (!StringUtils.hasText(authHeader) || !authHeader.startsWith("Bearer ")) {
            return writeErrorResponse(exchange, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, "Missing or invalid Authorization header");
        }

        String token = authHeader.substring(7).trim();
        Claims claims;
        try {
            claims = Jwts.parser()
                    .verifyWith(signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException ex) {
            return writeErrorResponse(exchange, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, "Invalid or expired JWT token");
        }

        String userId = claims.getSubject();
        String role = claims.get("role", String.class);

        if (!StringUtils.hasText(userId) || !StringUtils.hasText(role)) {
            return writeErrorResponse(exchange, HttpStatus.UNAUTHORIZED, ErrorCode.UNAUTHORIZED, "Invalid JWT claims");
        }

        if (isAdminEndpoint(path) && !UserRole.ADMIN.name().equals(role)) {
            return writeErrorResponse(exchange, HttpStatus.FORBIDDEN, ErrorCode.FORBIDDEN, "Admin privileges required");
        }

        ServerHttpRequest mutatedRequest = request.mutate()
                .headers(headers -> {
                    headers.remove(HEADER_USER_ID);
                    headers.remove(HEADER_USER_ROLE);
                    headers.add(HEADER_USER_ID, userId);
                    headers.add(HEADER_USER_ROLE, role);
                })
                .build();

        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }

    private boolean isPublicEndpoint(HttpMethod method, String path) {
        if (method == HttpMethod.OPTIONS) {
            return true;
        }
        if (path.equals("/actuator/health")) {
            return true;
        }
        if (method == HttpMethod.GET && (path.startsWith("/api/v1/catalog/") || path.equals("/api/v1/catalog"))) {
            return true;
        }
        if (method == HttpMethod.POST && path.equals("/api/v1/quotes/calculate")) {
            return true;
        }
        if (method == HttpMethod.POST && path.startsWith("/api/v1/auth/")) {
            return true;
        }
        if (method == HttpMethod.GET && (path.equals("/api/v1/payments/vnpay-return") || path.equals("/api/v1/payments/vnpay-ipn"))) {
            return true;
        }
        return false;
    }

    private boolean isAdminEndpoint(String path) {
        return path.startsWith("/api/v1/admin/")
                || path.equals("/api/v1/admin")
                || path.startsWith("/api/v1/users/admin/");
    }

    private Mono<Void> writeErrorResponse(
            ServerWebExchange exchange,
            HttpStatus status,
            ErrorCode errorCode,
            String message) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        ApiResponse<Void> body = ApiResponse.error(errorCode.getCode(), message);
        byte[] bytes;
        try {
            bytes = objectMapper.writeValueAsBytes(body);
        } catch (JsonProcessingException e) {
            bytes = ("{\"success\":false,\"errorCode\":\"" + errorCode.getCode() + "\"}")
                    .getBytes(StandardCharsets.UTF_8);
        }
        DataBuffer buffer = response.bufferFactory().wrap(bytes);
        return response.writeWith(Mono.just(buffer));
    }

    @Override
    public int getOrder() {
        return -100;
    }
}
