# Tem Nhãn Inox — Implementation Progress Tracker

## Current Phase: Phase 5 (End-to-End Integration & Verification) — Phase 4C & 4D Completed

### Phase 0: Infrastructure & Workspace Setup [COMPLETED]
- [x] Monorepo structure (`infra/`, `backend/`, `frontend/`) & `.gitignore`
- [x] Native local PostgreSQL `temnhaninox_db` initialized with idempotent `infra/postgres/init.sql` (`auth_schema`, `catalog_pricing_schema`, `order_schema` + seed data) and `infra/postgres/seed_products.sql` (11 categories, 37 catalog items)
- [x] S3-compatible SeaweedFS running via `infra/docker-compose.yml` on port `9000`
- [x] Multi-module Maven parent (`backend/pom.xml`) & `common-dto` built and installed to local `.m2`
- [x] Angular 18+ standalone workspace scaffolded with Tailwind CSS, Three.js, and `/api` proxy
- [x] Local static assets (`frontend/public/assets/images/` & `frontend/public/assets/products/`) downloaded and mapped

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

### Phase 3B: `order-service` (8083) — State Machine, Payments & Notifications [COMPLETED]
- [x] Customer workflow & payment endpoints (`POST /api/v1/orders/{id}/approve-prototype`, `POST /api/v1/orders/{id}/cancel`, `POST /api/v1/orders/{id}/payments/proof`) with immutable `OrderStatusLog` audit entries
- [x] Admin order cockpit (`AdminOrderController`, `AdminOrderService`) enforcing `X-User-Role: ADMIN`: `GET /api/v1/admin/orders` (filterable by `status`, `orderType`, `search`), `GET /api/v1/admin/orders/{id}`, `PATCH /api/v1/admin/orders/{id}/quote` (item price override + total/VAT/50% deposit recalculation), `POST /api/v1/admin/orders/{id}/items/{itemId}/prototype`, `PATCH /api/v1/admin/orders/{id}/status` (7-step state machine + deposit gate before `IN_PRODUCTION` + `productionWorkerNote`), `PATCH /api/v1/admin/orders/{id}/vat-invoice`, `PATCH /api/v1/admin/payments/{paymentId}/verify`
- [x] VNPAY sandbox integration (`POST /api/v1/payments/vnpay/create-url`, `GET /api/v1/payments/vnpay-return` with `HMAC-SHA512` signature verification and auto-advance to `IN_PRODUCTION`)
- [x] Async `TelegramNotificationService` (`@Async` + `RestClient`, no-ops safely when credentials are blank) for new custom quotes & payment proofs
- [x] Admin dashboard KPI endpoint (`GET /api/v1/admin/dashboard/summary`: `pendingQuotesCount`, `awaitingDepositCount`, `inProductionCount`, `vatPendingCount`, `monthlyRevenue`)
- [x] JUnit 5 tests passing (`mvn test -pl order-service`: 39/39 passed — includes admin/customer role-separation controller tests)

### Phase 4A: Angular 18+ — Core App Shell & Auth [COMPLETE EXCEPT DEFERRED AUTH FLOWS]
- [x] Top header/navbar layout with search bar, category quick-links, cart button, theme toggle, and login trigger
- [x] `AuthService` (signals/localStorage), HTTP JWT interceptor & route guards (`authGuard`, `adminGuard`)
- [x] Login/Register pages and Customer Profile / Saved VAT Profiles
- [ ] Forgot/Reset password flow & Google OAuth sign-in (intentionally deferred per owner request)

### Phase 4B: Angular 18+ — Storefront & Cart [IMPLEMENTED; MANUAL UC CHECKS PENDING]
- [x] Landing page hero + category grid + workshop gallery
- [x] `/products` filterable catalog (search by keyword/SKU, filter by `STANDARD_ITEM` vs `CUSTOM_TEMPLATE`, nested category tree sidebar, `CatalogApiService` `images[]` normalization with `(error)` placeholder fallback, `font-sans tabular-nums` readability styling on prices/dimensions)
- [x] `/products` pagination, data-driven category mega-menu, responsive mobile drawer, and `/products/:slug` gallery/specification/CTA page
- [x] Expanded the workshop showcase with additional product photos and an infinite, momentum-driven drag/trackpad carousel; product detail has a larger infinite image carousel, thumbnail navigation, and a compact zoom control with keyboard-accessible lightbox
- [x] Shopping cart view
- [x] Consistent list/detail loading, empty, retry/error states; search autocomplete; shared toast notifications; static About/Contact and custom 404/500 views

### Phase 4C: Angular 18+ — 3-Panel 3D Quote Builder [COMPLETED]
- [x] Standalone `Nameplate3dViewerComponent` (Three.js WebGL canvas, dynamic width/height/thickness scaling, metallic PBR shaders for Inox/Nhôm/Đồng/Mica, logo `artworkDataUrl` texture mapping, `.cdr`/CAD filename badge, camera presets, corner rivets)
- [x] Live pricing receipt wired to `/api/v1/quotes/calculate`, SeaweedFS file upload, and Add-to-Cart (`QuoteBuilderComponent`)

### Phase 4D: Angular 18+ — Checkout, Order Tracker & Admin Cockpit [COMPLETED]
- [x] Streamlined checkout (`/checkout`) with cart item summary, 50% deposit vs. 100% payment breakdown, saved VAT profile auto-fill, and VAT 10% accordion
- [x] Customer 7-step timeline (`/account/orders/:id`) with `CANCELLED` state banner, `estimatedCompletionDate`, `productionWorkerNote`, sample approval, VNPAY redirect, and bank transfer receipt upload
- [x] Admin cockpit (`/admin` dashboard KPIs, order management queue & inspector drawer with per-item unit price override, prototype upload, deposit-gated status transitions, VAT invoice number, pricing rule editor, and paginated/filterable product create/edit/delete/image upload)
- [x] Paginated/filterable admin orders and customer directory; admin customer search endpoint guarded at gateway and controller
- [x] Unit-aware pricing rule editor; product active toggle; shared notifications and accessible delete confirmation
- [x] Refined admin navigation and typography, reorganized product editor into clear sections, and moved live order/revenue summary into the Orders tab with loading/error/empty states
- [x] Restyled pricing, order, product, and customer admin views to match storefront spacing/type; localized order statuses and standardized paginator order, controls, and spacing across list pages
- [x] Vietnamese phone/MST validation and print-friendly order summary (browser Save as PDF; not a tax invoice)

### Phase 5: End-to-End Integration & Verification [PENDING]
- [ ] Full cross-service workflow test (Quote -> Sample Upload -> 50% Deposit -> Production -> Completion)[cite: 123, 128, 129]
- [ ] Manually verify UC-03 through UC-12 at desktop and 375px mobile; no live-browser verification was performed in this task
- [x] Verification in this task: production `npm run build`; Maven tests for `auth-service`, `catalog-pricing-service`, and `api-gateway`
- [x] Admin/customer separation: backend denies ADMIN access to cart, customer order, and VNPAY create-url routes; customer route flows remain enabled. `mvn test -pl order-service` passed (39/39), and frontend `npm run build` passed.

### Phase E: Hardening (branch `hardening/phase5-prep`) [WRITTEN — NOT COMPILED OR RUN]
- [x] VNPAY IPN endpoint + amount verification + idempotent processing (+4 unit tests)
- [x] Secret fallbacks removed from main config; dev defaults moved to `application-dev.yml`; admin seed from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- [x] Flyway baselines per service; `init.sql` made non-destructive; `infra/postgres/dev-reset.sql` added; `infra/.env.example` added
- [ ] Run `mvn test` (all modules) and start every service on the existing DB and on an empty DB
- [ ] Gateway-only network exposure in `infra/docker-compose.yml`
- [ ] Manual UC-03..UC-12 and the full quote → deposit → production → completion run (Phase 5)

### Phase B + Docker wiring (branch `feature/phase-b-auth`) [WRITTEN — backend not compiled, nothing run]
- [x] Forgot/reset password + Google sign-in (backend, Flyway V2, frontend pages, Mailpit)
- [x] Dockerfiles for api-gateway/auth/catalog/order/frontend; gateway route URLs from env; compose S3_* names fixed
- [ ] `mvn test`, then `docker compose -f infra/docker-compose.yml up --build` and verify through http://localhost:4200 only
- [ ] UC-01 (Mailpit) and UC-02 (needs your Google client ID)

### Phase F: Automated verification (branch `feature/e2e-smoke-and-coverage`) [WRITTEN — not run]
- [x] Fix: COMPLETED now requires the full balance verified (+2 tests); JaCoCo + pricing boundary tests (+2)
- [x] `scripts/e2e-smoke.mjs` end-to-end lifecycle + guards + IPN
- [ ] Run `mvn test`, start the stack, run `node scripts/e2e-smoke.mjs`, fix whatever it reports
