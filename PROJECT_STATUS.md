# Tem Nhãn Inox — Implementation Progress Tracker

## Current Phase: Phase 3B (`order-service` — State Machine, Payments & Notifications)

### Phase 0: Infrastructure & Workspace Setup [COMPLETED]
- [x] Monorepo structure (`infra/`, `backend/`, `frontend/`) & `.gitignore`
- [x] Native local PostgreSQL `temnhaninox_db` initialized with `infra/postgres/init.sql` (`auth_schema`, `catalog_pricing_schema`, `order_schema` + seed data)
- [x] S3-compatible SeaweedFS running via `infra/docker-compose.yml` on port `9000`
- [x] Multi-module Maven parent (`backend/pom.xml`) & `common-dto` built and installed to local `.m2`
- [x] Angular 18+ standalone workspace scaffolded with Tailwind CSS, Three.js, and `/api` proxy

### Phase 1: `auth-service` (8081) & `api-gateway` (8080) [COMPLETED]
- [x] `auth-service`: `User` & `CustomerVatProfile` JPA entities + repositories (`auth_schema.users`, `auth_schema.customer_vat_profiles`)
- [x] `auth-service`: `JwtTokenProvider`, `HeaderOrJwtAuthenticationFilter`, `SecurityConfig`, `DataInitializer` default `ADMIN` seeder (`admin@temnhaninox.com`)
- [x] `auth-service`: Register (`POST /api/v1/auth/register`), Login (`POST /api/v1/auth/login`), Profile (`GET/PUT /api/v1/users/me`), VAT Profile CRUD (`GET/POST /api/v1/users/me/vat-profiles`, `DELETE /api/v1/users/me/vat-profiles/{id}`), and `GlobalExceptionHandler`
- [x] `api-gateway`: Route definitions (`8081`, `8082`, `8083`), CORS (`http://localhost:4200`), `JwtAuthGlobalFilter` (public route bypass, JWT validation, `ADMIN` role guard on `/api/v1/admin/**`, `X-User-Id` & `X-User-Role` header injection)
- [x] Unit/slice tests passing via `mvn test -pl auth-service,api-gateway` (16/16 tests passed: 10 in `auth-service`, 6 in `api-gateway`)

### Phase 2: `catalog-pricing-service` (8082) & S3 File Upload [COMPLETED]
- [x] Entities & repositories (`Category`, `Material`, `ProcessingMethod`, `MaterialProcessingRule`, `Product`, `PricingRule`) mapped to `catalog_pricing_schema` with `ddl-auto=validate`
- [x] Deterministic `PricingEngineService` (thin sheet `<= 1mm` / non-metal area formula vs. thick metal `> 1mm` mass x 5 formula, `1,000+` bulk discount, `10%` VAT, `50%` deposit)
- [x] Public catalog (`GET /api/v1/catalog/categories`, `/materials`, `/products`, `/products/{slug}`), quote (`POST /api/v1/quotes/calculate`), S3 upload (`POST /api/v1/files/upload` with `forcePathStyle(true)` and auto-bucket creation), and Admin CRUD endpoints (`/api/v1/admin/catalog/**`, `GET/PUT /api/v1/admin/pricing/rules`)
- [x] JUnit 5 pricing formula & S3 upload tests passing (`mvn test -pl catalog-pricing-service`: 10/10 passed — 7 `PricingEngineServiceTest`, 3 `S3StorageServiceTest`)

### Phase 3A: `order-service` (8083) — Cart & Checkout Core [COMPLETED]
- [x] `pom.xml`, `application.yml` (`order_schema`, `ddl-auto=validate`, `app.services.catalog-url`), and `OrderServiceApplication`
- [x] JPA entities & repositories (`Cart`, `CartItem`, `Order`, `OrderItem`, `PaymentTransaction`, `OrderStatusLog`) mapped to `order_schema`
- [x] `CatalogPricingClient` using Spring `RestClient` (`POST /api/v1/quotes/calculate`, `GET /api/v1/catalog/products`, `GET /api/v1/catalog/materials`)
- [x] Persistent cart service & controller (`GET /api/v1/cart`, `POST /api/v1/cart/items`, `PUT /api/v1/cart/items/{itemId}` with `1,000+` bulk recalculation, `DELETE /api/v1/cart/items/{itemId}`, `DELETE /api/v1/cart`)
- [x] Checkout & customer order query endpoints (`POST /api/v1/orders/checkout` with snapshot freezing, `TNI-YYYYMMDD-XXXX` order code, VAT validation, 50% vs. 100% deposit logic; `GET /api/v1/orders`, `GET /api/v1/orders/{id}`) and `GlobalExceptionHandler`
- [x] JUnit 5 tests passing (`mvn test -pl order-service`: 12/12 passed — 5 `CartServiceTest`, 4 `OrderServiceTest`, 3 `OrderControllerTest`)

### Phase 3B: `order-service` (8083) — State Machine, Payments & Notifications [PENDING]
- [ ] 7-step order status transitions & audit logging
- [ ] Sample prototype photo upload & customer approval
- [ ] 50% deposit proof upload + admin verification
- [ ] VNPAY sandbox HMAC-SHA512 callback
- [ ] Telegram admin alerts & admin dashboard summary metrics

### Phase 4A: Angular 18+ — Core App Shell & Auth [PENDING]
- [ ] Navbar/footer layout, `AuthService` (signals/localStorage)
- [ ] HTTP JWT interceptor & route guards (`authGuard`, `adminGuard`)
- [ ] Login/Register pages and Customer Profile / Saved VAT Profiles

### Phase 4B: Angular 18+ — Storefront & Cart [PENDING]
- [ ] Landing page hero + category grid
- [ ] `/products` filterable catalog & `/products/:slug` detail page
- [ ] Shopping cart view

### Phase 4C: Angular 18+ — 3-Panel 3D Quote Builder [PENDING]
- [ ] Standalone `Nameplate3dViewerComponent` (Three.js WebGL canvas, dynamic width/height/thickness scaling, metallic PBR shaders for Inox/Nhôm/Đồng/Mica, logo texture mapping, `.cdr` CAD badge)
- [ ] Live pricing receipt wired to `/api/v1/quotes/calculate` and Add-to-Cart

### Phase 4D: Angular 18+ — Checkout, Order Tracker & Admin Cockpit [PENDING]
- [ ] Streamlined checkout (`/checkout`) with VAT accordion
- [ ] Customer 7-step timeline (`/account/orders/:id`) with sample approval & deposit receipt upload
- [ ] Admin cockpit (`/admin` dashboard, order management screen, catalog/pricing editor)

### Phase 5: End-to-End Integration & Verification [PENDING]
- [ ] Full cross-service workflow test (Quote -> Sample Upload -> 50% Deposit -> Production -> Completion)
