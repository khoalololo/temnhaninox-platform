# Tem Nhãn Inox — Implementation Progress Tracker

## Current Phase: Phase 3 (`order-service`, State Machine & Payments)

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

### Phase 3: `order-service` (8083), State Machine & Payments [IN PROGRESS]
- [ ] Entities & repositories (`Cart`, `CartItem`, `Order`, `OrderItem`, `PaymentTransaction`, `OrderStatusLog`)
- [ ] Persistent cart & checkout (order code `TNI-YYYYMMDD-XXXX`, catalog snapshot capture)
- [ ] 7-step order status state machine, sample prototype image upload, 50% deposit verification
- [ ] VNPAY sandbox callback & Telegram admin alerts

### Phase 4: Angular 18+ Storefront, 3D Quote Builder & Admin Cockpit [PENDING]
- [ ] Core layout, JWT auth interceptor, route guards (`authGuard`, `adminGuard`)
- [ ] Shopee-style storefront (`/`, `/products`, `/products/:slug`)
- [ ] 3-panel Quote Portal (`/quote-builder`) with Three.js interactive 3D nameplate preview
- [ ] Streamlined checkout & 7-step customer order tracker (`/checkout`, `/account/orders/:id`)
- [ ] Single-screen Admin Cockpit (`/admin/dashboard`, `/admin/orders/:id`, `/admin/catalog`)

### Phase 5: End-to-End Integration & Verification [PENDING]
- [ ] Full cross-service workflow test (Quote -> Sample Upload -> 50% Deposit -> Production -> Completion)
