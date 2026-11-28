# Tem Nhãn Inox - Implementation Progress Tracker

## Current Phase: Phase 5 (End-to-End Integration & Verification) - all feature phases written; verification in progress

**Last updated: 2026-11-28.** The latest frontend changes build successfully with `npm run build`; `git diff --check` passes. Backend tests were not run for the current uncompiled changes because Maven and `backend/mvnw.cmd` are unavailable in this environment. Owner-confirmed historical verification remains: `mvn test` passed on all modules through Phases B/E/F, and Google sign-in works. Still pending: `node scripts/e2e-smoke.mjs`, `docker compose up --build`, manual UC-01 and UC-03-UC-16, and backend verification for current Phase G changes. See `docs/feature_completion_plan.md` for implementation details and open questions.

**Recent work summary (2026-11-27 to 2026-11-28):** Fixed private payment-proof viewing through an admin-authorized API stream and gateway route. Tightened payment verification so an individual bank-transfer receipt is required, VNPAY transactions cannot be manually changed, and verifying one transaction does not approve sibling transactions. Added total unit quantity to order summaries. Refined responsive admin order/payment inspection and the no-horizontal-scroll Kanban while preserving transition and payment guards. Refreshed storefront/admin navigation, theme/account controls, product editing and image ordering, product detail galleries, quantity controls, account/cart/order views, and quote-builder/3D preview readability. The 3D workspace now has more vertical space and frames models according to the selected dimensions while preserving proportions. Standardized square solid-fill tags and filled action buttons, with distinct semantic colors and individually varied catalog category colors. Product shape metadata is not currently modeled, so the preview remains rectangular until catalog and pricing contracts define supported shapes. See Phase G in `docs/feature_completion_plan.md` for implementation details and remaining verification.

**Owner decisions recorded 2026-11-27:** 1 ly = 1 mm; the 5,000,000 đ/m² thin-sheet rate applies to metals only (Mica/Decal need their own rate - value still to be provided); this project is the previous SE project, not the capstone.

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
- [x] Deterministic `PricingEngineService` (thin metal `<= 1mm` area × rate vs. thick metal `> 1mm` mass x price/kg x 5 formula; non-metal materials (Mica/Decal) use their own per-material đ/m² rate and are refused until one is configured; `1,000+` bulk discount, `10%` VAT, `50%` deposit)
- [x] Public catalog (`GET /api/v1/catalog/categories`, `/materials`, `/products`, `/products/{slug}`), quote (`POST /api/v1/quotes/calculate`), S3 upload (`POST /api/v1/files/upload` with `forcePathStyle(true)` and auto-bucket creation), and Admin CRUD endpoints (`/api/v1/admin/catalog/**`, `GET/PUT /api/v1/admin/pricing/rules`)
- [x] JUnit 5 pricing formula & S3 upload tests passing (`mvn test -pl catalog-pricing-service`: 10/10 passed - 7 `PricingEngineServiceTest`, 3 `S3StorageServiceTest`)

### Phase 3A: `order-service` (8083) - Cart & Checkout Core [COMPLETED]
- [x] `pom.xml`, `application.yml` (`order_schema`, `ddl-auto=validate`, `app.services.catalog-url`), and `OrderServiceApplication`
- [x] JPA entities & repositories (`Cart`, `CartItem`, `Order`, `OrderItem`, `PaymentTransaction`, `OrderStatusLog`) mapped to `order_schema`
- [x] `CatalogPricingClient` using Spring `RestClient` (`POST /api/v1/quotes/calculate`, `GET /api/v1/catalog/products`, `GET /api/v1/catalog/materials`)
- [x] Persistent cart service & controller (`GET /api/v1/cart`, `POST /api/v1/cart/items`, `PUT /api/v1/cart/items/{itemId}` with `1,000+` bulk recalculation, `DELETE /api/v1/cart/items/{itemId}`, `DELETE /api/v1/cart`)
- [x] Checkout & customer order query endpoints (`POST /api/v1/orders/checkout` with snapshot freezing, `TNI-YYYYMMDD-XXXX` order code, VAT validation, 50% vs. 100% deposit logic; `GET /api/v1/orders`, `GET /api/v1/orders/{id}`) and `GlobalExceptionHandler`
- [x] JUnit 5 tests passing (`mvn test -pl order-service`: 12/12 passed - 5 `CartServiceTest`, 4 `OrderServiceTest`, 3 `OrderControllerTest`)

### Phase 3B: `order-service` (8083) - State Machine, Payments & Notifications [COMPLETED]
- [x] Customer workflow & payment endpoints (`POST /api/v1/orders/{id}/approve-prototype`, `POST /api/v1/orders/{id}/cancel`, `POST /api/v1/orders/{id}/payments/proof`) with immutable `OrderStatusLog` audit entries
- [x] Admin order cockpit (`AdminOrderController`, `AdminOrderService`) enforcing `X-User-Role: ADMIN`: `GET /api/v1/admin/orders` (filterable by `status`, `orderType`, `search`), `GET /api/v1/admin/orders/{id}`, `PATCH /api/v1/admin/orders/{id}/quote` (item price override + total/VAT/50% deposit recalculation), `POST /api/v1/admin/orders/{id}/items/{itemId}/prototype`, `PATCH /api/v1/admin/orders/{id}/status` (7-step state machine + deposit gate before `IN_PRODUCTION` + `productionWorkerNote`), `PATCH /api/v1/admin/orders/{id}/vat-invoice`, `PATCH /api/v1/admin/payments/{paymentId}/verify`
- [x] Payment verification safeguards: require a receipt before verifying a bank transfer, reject manual verification of VNPAY transactions, and update only the selected payment transaction
- [x] VNPAY sandbox integration (`POST /api/v1/payments/vnpay/create-url`, `GET /api/v1/payments/vnpay-return` with `HMAC-SHA512` signature verification and auto-advance to `IN_PRODUCTION`)
- [x] Async `TelegramNotificationService` (`@Async` + `RestClient`, no-ops safely when credentials are blank) for new custom quotes & payment proofs
- [x] Admin dashboard KPI endpoint (`GET /api/v1/admin/dashboard/summary`: `pendingQuotesCount`, `awaitingDepositCount`, `inProductionCount`, `vatPendingCount`, `monthlyRevenue`)
- [x] JUnit 5 tests passing (`mvn test -pl order-service`: 39/39 passed - includes admin/customer role-separation controller tests)

### Phase 4A: Angular 18+ - Core App Shell & Auth [COMPLETE]
- [x] Top header/navbar layout with search bar, category quick-links, cart button, theme toggle, and login trigger
- [x] `AuthService` (signals/localStorage), HTTP JWT interceptor & route guards (`authGuard`, `adminGuard`)
- [x] Login/Register pages and Customer Profile / Saved VAT Profiles
- [x] Forgot/Reset password flow & Google OAuth sign-in (implemented in Phase B; Google verified working by the owner, reset flow still to be checked with Mailpit - UC-01)

### Phase 4B: Angular 18+ - Storefront & Cart [IMPLEMENTED; MANUAL UC CHECKS PENDING]
- [x] Landing page hero + category grid + workshop gallery
- [x] `/products` filterable catalog (search by keyword/SKU, filter by `STANDARD_ITEM` vs `CUSTOM_TEMPLATE`, nested category tree sidebar, `CatalogApiService` `images[]` normalization with `(error)` placeholder fallback, `font-sans tabular-nums` readability styling on prices/dimensions)
- [x] `/products` pagination, data-driven category mega-menu, responsive mobile drawer, and `/products/:slug` gallery/specification/CTA page
- [x] Expanded the workshop showcase with additional product photos and an infinite, momentum-driven drag/trackpad carousel; product detail has a larger infinite image carousel, thumbnail navigation, and a compact zoom control with keyboard-accessible lightbox
- [x] Refined storefront navigation, product detail quantity selection and image gallery controls; product stock/type badges use the shared solid-fill square tag style
- [x] Product category filters use individually varied colors, with lighter related shades for subcategories and a separate neutral “all categories” control
- [x] Applied shared semantic badge colors across product, cart, quote, account, and admin surfaces; primary CTAs remain white text on brand green
- [x] Shopping cart view
- [x] Consistent list/detail loading, empty, retry/error states; search autocomplete; shared toast notifications; static About/Contact and custom 404/500 views

### Phase 4C: Angular 18+ - 3-Panel 3D Quote Builder [COMPLETED]
- [x] Standalone `Nameplate3dViewerComponent` (Three.js WebGL canvas, dynamic width/height/thickness scaling, metallic PBR shaders for Inox/Nhôm/Đồng/Mica, logo `artworkDataUrl` texture mapping, `.cdr`/CAD filename badge, camera presets, corner rivets)
- [x] Live pricing receipt wired to `/api/v1/quotes/calculate`, SeaweedFS file upload, and Add-to-Cart (`QuoteBuilderComponent`)

### Phase 4D: Angular 18+ - Checkout, Order Tracker & Admin Cockpit [COMPLETED]
- [x] Streamlined checkout (`/checkout`) with cart item summary, 50% deposit vs. 100% payment breakdown, saved VAT profile auto-fill, and VAT 10% accordion
- [x] Customer 7-step timeline (`/account/orders/:id`) with `CANCELLED` state banner, `estimatedCompletionDate`, sample approval, VNPAY redirect, and bank transfer receipt upload
- [x] Admin cockpit (`/admin` dashboard KPIs, order management queue & inspector drawer with per-item unit price override, prototype upload, deposit-gated status transitions, VAT invoice number, pricing rule editor, and paginated/filterable product create/edit/delete/image upload)
- [x] Paginated/filterable admin orders and customer directory; admin customer search endpoint guarded at gateway and controller
- [x] Unit-aware pricing rule editor; product active toggle; shared notifications and accessible delete confirmation
- [x] Refined admin navigation and typography, reorganized product editor into clear sections, and moved live order/revenue summary into the Orders tab with loading/error/empty states
- [x] Admin payment-proof preview uses an authenticated admin endpoint to stream private S3 objects; API gateway routes the endpoint to catalog-pricing-service
- [x] Admin order interface now supports responsive order inspection and payment-proof preview; admin navigation, theme/account controls, and product image ordering were visually refined
- [x] Admin navigation uses the shared hover/underline treatment and compact icon controls; storefront theme/account order and product edit navigation were refined
- [x] Kanban presentation refreshed to compact responsive lanes with no horizontal scrolling, solid semantic tags, and simplified order cards; existing direct-move rules and payment guards remain unchanged
- [x] Shared button variants use role-based fills: green/white primary, neutral secondary, amber ghost, red destructive; quote-builder navigation, catalog category controls, quantity presets, file selection, and 3D preview controls follow the system
- [x] Catalog category buttons now use a distinct hue per top-level category and lighter shades for child categories; semantic status tags intentionally retain consistent colors for the same meaning
- [x] Quote 3D preview information and interaction instructions use opaque high-contrast panels
- [x] Enlarged the quote 3D workspace and auto-fit its preview from the selected dimensions; product links provide their configured default dimensions. Shape-specific catalog/quote support remains open because products currently have no shape field and pricing assumes rectangular dimensions.
- [x] Restyled pricing, order, product, and customer admin views to match storefront spacing/type; localized order statuses and standardized paginator order, controls, and spacing across list pages
- [x] Vietnamese phone/MST validation and print-friendly order summary (browser Save as PDF; not a tax invoice)

### Phase 5: End-to-End Integration & Verification [PENDING]
- [ ] Full cross-service workflow test (Quote -> Sample Upload -> 50% Deposit -> Production -> Completion)[cite: 123, 128, 129]
- [ ] Manually verify UC-03 through UC-12 at desktop and 375px mobile; no live-browser verification was performed in this task
- [x] Latest frontend production build passed on 2026-11-28 after the shared button/tag, catalog navigation, Kanban, and 3D preview changes; `git diff --check` passed
- [ ] Run backend tests for the latest order summary quantity field, payment-proof streaming endpoint and gateway route (Maven/wrapper unavailable in current environment)
- [x] Admin/customer separation: backend denies ADMIN access to cart, customer order, and VNPAY create-url routes; customer route flows remain enabled. `mvn test -pl order-service` passed (39/39), and frontend `npm run build` passed.

### Phase E: Hardening [MERGED - `mvn test` passes (owner-run); stack start-up on an empty DB not yet verified]
- [x] VNPAY IPN endpoint + amount verification + idempotent processing (+4 unit tests)
- [x] Secret fallbacks removed from main config; dev defaults moved to `application-dev.yml`; admin seed from `ADMIN_EMAIL`/`ADMIN_PASSWORD`
- [x] Flyway baselines per service; `init.sql` made non-destructive; `infra/postgres/dev-reset.sql` added; `infra/.env.example` added
- [x] Run `mvn test` (all modules) - passed (owner)
- [ ] Start every service on the existing DB and on an empty DB
- [x] Gateway-only network exposure written in `infra/docker-compose.yml` (not yet run)
- [ ] Manual UC-03..UC-12 and the full quote to deposit to production to completion run (Phase 5)

### Phase B + Docker wiring [MERGED - Google sign-in verified; reset flow and Docker not yet run]
- [x] Forgot/reset password + Google sign-in (backend, Flyway V2, frontend pages, Mailpit)
- [x] Dockerfiles for api-gateway/auth/catalog/order/frontend; gateway route URLs from env; compose S3_* names fixed
- [x] `mvn test` passed (owner)
- [ ] `docker compose -f infra/docker-compose.yml up --build` and verify through http://localhost:4200 only
- [ ] UC-01 (Mailpit)
- [x] UC-02 Google sign-in works (owner, 2026-11-27)

### Phase F: Automated verification [MERGED - unit tests pass; smoke script not run yet]
- [x] Fix: COMPLETED now requires the full balance verified (+2 tests); JaCoCo + pricing boundary tests (+2)
- [x] `scripts/e2e-smoke.mjs` end-to-end lifecycle + guards + IPN
- [x] `mvn test` passed (owner)
- [ ] Start the stack, run `node scripts/e2e-smoke.mjs`, fix whatever it reports

### Phase G: Admin Kanban, UI/UX polish, image previews, per-material pricing [IMPLEMENTED IN WORKTREE; FRONTEND BUILDS; LATEST BACKEND CHANGES UNVERIFIED]
- [x] Site-wide UI glyph cleanup: replaced visible text arrows and status marks with inline SVGs or plain text; the iconography rule is recorded in `.junie/guidelines.md` and `docs/feature_completion_plan.md`
- [x] Admin Kanban board at `/admin/board` - responsive grid of all visible workflow stages with no horizontal scrolling (7 columns normally, 8 when cancelled is shown; 4 at medium widths and 2 on small screens), compact order cards, solid semantic tags; drag/drop and direct-move/payment guards remain unchanged
- [x] Shared UI primitives (`.tni-*` classes, `shared/utils/order-ui.ts`, `app-image-lightbox`): semantic solid-fill square status/type/payment tags, progress bars, switches, avatars, thumbnails, empty states, sticky tables
- [x] Admin cockpit polish: responsive order queue/inspector, payment progress, customer design/prototype previews, authenticated private payment-proof preview, pricing by material, product thumbnails/stock and customer state indicators
- [x] Private payment-proof stream: fixed-bucket object retrieval with key validation, admin-role guarded controller, safe response content types, and gateway route. Current backend changes still need Maven compilation/tests.
- [x] Order summary API now provides total item quantity for the Kanban cards, in addition to line-item count. Current DTO/mapper change still needs Maven compilation/tests.
- [x] Customer order screens: card list with “cần thao tác” hints and filters; detail with numbered stepper, localized timeline, correct VAT %, payment history, previewable images; the internal `productionWorkerNote` is no longer shown to customers
- [x] Bug fixes found during review: VAT rate displayed as `0.1%` instead of `10%`; raw enum names in the customer timeline and admin inspector; native checkbox for product visibility
- [x] Pricing: 5,000,000 đ/m² is metal-only; per-material rate for Mica/Decal (Flyway `V2__material_specific_thin_sheet_rate.sql`, `PricingEngineService`, +1 test, 1 test updated) - **uncompiled; run `mvn test -pl catalog-pricing-service`**
- [x] Earlier Phase G frontend build and screenshots reviewed at 1440 px light, 1440 px dark and 390 px dark using mocked API responses; latest no-horizontal-scroll and color-system changes have a passing build but still need a browser visual review
- [ ] Run backend tests for catalog-pricing-service and order-service; compile/test payment-proof controller and gateway route changes; apply Flyway migrations on startup
- [ ] Enter the Mica/Decal đ/m² in Admin to Định giá (needs the uncle's number) - until then mica quotes return a validation error
- [ ] Verify UC-13 (Kanban drag-and-drop in a real browser), UC-14, UC-15, UC-16 and visually review latest no-scroll layout at desktop/tablet/mobile sizes
- [ ] Open: customer-visible progress note separate from the internal worker note (backend change in order-service); Kanban has no touch drag (use buttons on phones)

### Phase H: Customer progress note, VNPAY/Telegram wiring (branch `feature/customer-note-and-ops`) [WRITTEN — backend NOT compiled]
- [x] Internal worker note vs customer-visible progress note split (order-service Flyway `V2__customer_progress_note.sql`, entity/DTO/mapper, admin inputs, customer display); the customer API no longer returns the internal note (+3 tests)
- [x] Telegram alert when VNPAY confirms a payment (`notifyPaymentConfirmed`)
- [x] `VNPAY_RETURN_URL` / `VNPAY_PAY_URL` passed through docker-compose and `.env.example`
- [ ] `mvn test -pl order-service` (new tests: `OrderMapperVisibilityTest`, `AdminOrderServiceTest`), then start the service so Flyway applies V2
- [ ] VNPAY sandbox run (needs merchant credentials + public IPN URL), Telegram bot token/chat id
- [ ] Future: AI chatbot, enhanced 3D quote builder (see plan section 6)

