# Tem Nhãn Inox — Implementation Progress Tracker

## Current Phase: Phase 1 (Auth Service & API Gateway)

### Phase 0: Infrastructure & Workspace Setup [COMPLETED]
- [x] Monorepo structure (`infra/`, `backend/`, `frontend/`) & `.gitignore`
- [x] Native local PostgreSQL `temnhaninox_db` initialized with `infra/postgres/init.sql` (`auth_schema`, `catalog_pricing_schema`, `order_schema` + seed data)
- [x] S3-compatible SeaweedFS running via `infra/docker-compose.yml` on port `9000`
- [x] Multi-module Maven parent (`backend/pom.xml`) & `common-dto` built and installed to local `.m2`
- [x] Angular 18+ standalone workspace scaffolded with Tailwind CSS, Three.js, and `/api` proxy

### Phase 1: `auth-service` (8081) & `api-gateway` (8080) [IN PROGRESS]
- [ ] `auth-service`: `User` & `CustomerVatProfile` JPA entities + repositories
- [ ] `auth-service`: `JwtTokenProvider`, Spring Security config, default `ADMIN` seeder (`admin@temnhaninox.com`)
- [ ] `auth-service`: Register, Login, Profile (`/users/me`), and VAT Profile CRUD endpoints
- [ ] `api-gateway`: Route definitions (`8081`, `8082`, `8083`), CORS (`localhost:4200`), JWT & `ADMIN` role `GlobalFilter`
- [ ] Unit/slice tests passing via `mvn test -pl auth-service,api-gateway`

### Phase 2: `catalog-pricing-service` (8082) & S3 File Upload [PENDING]
- [ ] Entities & repositories (`Category`, `Material`, `ProcessingMethod`, `MaterialProcessingRule`, `Product`, `PricingRule`)
- [ ] Deterministic `PricingEngineService` (thin sheet `<= 1mm` area formula vs. thick metal `> 1mm` mass formula, `1,000+` bulk discount, `10%` VAT, `50%` deposit)
- [ ] Public catalog + quote endpoints, Admin CRUD endpoints, and S3 upload (`/api/v1/files/upload`)
- [ ] JUnit 5 pricing formula edge-case tests passing

### Phase 3: `order-service` (8083), State Machine & Payments [PENDING]
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
