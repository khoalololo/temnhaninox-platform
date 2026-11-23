package com.temnhaninox.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.temnhaninox.common.enums.UserRole;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthGlobalFilterTest {

    private static final String SECRET = "TemNhanInox2026SuperSecretJwtSigningKeyMustBeAtLeast64BytesLong!";

    private JwtAuthGlobalFilter filter;
    private SecretKey signingKey;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthGlobalFilter(SECRET, new ObjectMapper());
        signingKey = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    private String createToken(UUID userId, UserRole role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", "test@temnhaninox.com")
                .claim("role", role.name())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + 60_000))
                .signWith(signingKey)
                .compact();
    }

    @Test
    void publicEndpoints_shouldBypassJwtCheck() {
        MockServerWebExchange catalogReq = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/catalog/products").build());
        MockServerWebExchange quoteReq = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/v1/quotes/calculate").build());
        MockServerWebExchange loginReq = MockServerWebExchange.from(
                MockServerHttpRequest.post("/api/v1/auth/login").build());
        MockServerWebExchange vnpayReq = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/payments/vnpay-return").build());

        GatewayFilterChain passThroughChain = exchange -> Mono.empty();

        filter.filter(catalogReq, passThroughChain).block();
        filter.filter(quoteReq, passThroughChain).block();
        filter.filter(loginReq, passThroughChain).block();
        filter.filter(vnpayReq, passThroughChain).block();

        assertThat(catalogReq.getResponse().getStatusCode()).isNull();
        assertThat(quoteReq.getResponse().getStatusCode()).isNull();
        assertThat(loginReq.getResponse().getStatusCode()).isNull();
        assertThat(vnpayReq.getResponse().getStatusCode()).isNull();
    }

    @Test
    void protectedEndpoint_withoutToken_shouldReturn401() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/users/me").build());

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void protectedEndpoint_withInvalidToken_shouldReturn401() {
        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer invalid.jwt.token")
                        .build());

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void protectedEndpoint_withValidCustomerToken_shouldInjectHeadersAndStripSpoofedHeaders() {
        UUID userId = UUID.randomUUID();
        String token = createToken(userId, UserRole.CUSTOMER);

        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/users/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .header(JwtAuthGlobalFilter.HEADER_USER_ID, "spoofed-id")
                        .header(JwtAuthGlobalFilter.HEADER_USER_ROLE, "ADMIN")
                        .build());

        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        filter.filter(exchange, ex -> {
            forwarded.set(ex);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get()).isNotNull();
        HttpHeaders downstreamHeaders = forwarded.get().getRequest().getHeaders();
        assertThat(downstreamHeaders.get(JwtAuthGlobalFilter.HEADER_USER_ID)).containsExactly(userId.toString());
        assertThat(downstreamHeaders.get(JwtAuthGlobalFilter.HEADER_USER_ROLE)).containsExactly("CUSTOMER");
    }

    @Test
    void adminEndpoint_withCustomerToken_shouldReturn403() {
        String token = createToken(UUID.randomUUID(), UserRole.CUSTOMER);

        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/admin/orders")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .build());

        filter.filter(exchange, ex -> Mono.empty()).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void adminEndpoint_withAdminToken_shouldPassAndInjectAdminHeaders() {
        UUID adminId = UUID.randomUUID();
        String token = createToken(adminId, UserRole.ADMIN);

        MockServerWebExchange exchange = MockServerWebExchange.from(
                MockServerHttpRequest.get("/api/v1/admin/orders")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .build());

        AtomicReference<ServerWebExchange> forwarded = new AtomicReference<>();
        filter.filter(exchange, ex -> {
            forwarded.set(ex);
            return Mono.empty();
        }).block();

        assertThat(forwarded.get()).isNotNull();
        assertThat(forwarded.get().getRequest().getHeaders().getFirst(JwtAuthGlobalFilter.HEADER_USER_ID))
                .isEqualTo(adminId.toString());
        assertThat(forwarded.get().getRequest().getHeaders().getFirst(JwtAuthGlobalFilter.HEADER_USER_ROLE))
                .isEqualTo("ADMIN");
    }
}
