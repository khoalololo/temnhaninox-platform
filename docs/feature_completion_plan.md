# TEM NHÃN INOX — UI/UX Overhaul & Feature Completion Plan
**Document type:** Agent execution plan (phases A–D, follows completed Phase 1–3 backend and initial Phase 4 storefront work)
**Status (2026-11-26, updated after review):** Phase C and D implementations exist in code; Phase E (hardening, below) was written on branch `hardening/phase5-prep` and is **uncompiled/untested until you run `mvn test` locally** (the authoring sandbox could not reach Maven Central); Google sign-in and forgot/reset-password flows remain intentionally excluded per owner request. Production frontend build and modified backend module tests pass. Manual Use-Case Checklist verification remains pending.

> **How to use this document:** Execute ONE phase at a time. After each phase, stop and manually verify against the Use-Case Checklist (Section 3) before telling the agent to proceed to the next phase. Do not trust a "done" report from the agent without clicking through the actual running app yourself — this is the same rule as the Master Implementation Plan review: an agent's report of completion and the feature actually working are two different facts.

---

## 1. Design System Specification

### 1.1 Current Visual Direction & Resolved Fixes
The storefront uses an industrial green/slate palette (`#146c2e` primary brand green on clean light/dark surfaces) with local NVX workshop & product photography mapped from `public/assets/products/`.

Resolved in recent updates:
- **Database & Asset Seeding:** `infra/postgres/init.sql` (`DROP SCHEMA IF EXISTS ... CASCADE`) and `infra/postgres/seed_products.sql` (11 categories, 37 products) run cleanly; `CatalogApiService` normalizes `images[]` to `imageUrl` and `galleryUrls` with an `(error)` fallback to the diagonal-hatch `"Chưa có ảnh"` placeholder for any missing upstream image.
- **Numeric Readability:** Replaced narrow `font-mono` glyphs on product prices (`60.000 đ`), dimensions (`400 × 300 × 1.2 mm`), SKUs, and stock counters with `font-sans tabular-nums` so numbers align cleanly and remain legible at card sizes.
- **Remaining Visual Polish:**
  - Upgrade top-left photo status badges (`GIA CÔNG 3D`, `CÓ SẴN`) from translucent dark pills to high-contrast solid pills (`bg-emerald-900/90 text-white backdrop-blur-sm`) so they remain legible over dark product photos.
  - Keep card border radii at `<= 10px` with `1px` borders at rest and subtle elevation on hover only.

### 1.2 Color Tokens

```css
:root {
  /* Light / Industrial Storefront Surfaces */
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-raised: #F1F5F9;
  --color-border: #E2E8F0;

  /* Text */
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-text-muted: #64748B;

  /* Brand Accents */
  --color-primary: #146C2E;       /* NVX industrial green — primary CTA & active states */
  --color-primary-hover: #0F5423;
  --color-accent: #F97316;        /* industrial amber — quote/highlight secondary accent */
  --color-steel: #4C7FA8;         /* steel blue — informational tags & secondary links */

  /* Status */
  --color-success: #16A34A;
  --color-danger: #DC2626;
  --color-warning: #EAB308;
}
```

### 1.3 Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings (`h1`–`h3`) | **Space Grotesk** / **Be Vietnam Pro** | 600–700 | Clean Vietnamese diacritic support with geometric industrial weight |
| Body & UI text | **Be Vietnam Pro** / **IBM Plex Sans** | 400–500 | Default UI font |
| Prices, Dimensions, SKUs & Tables | **Sans-serif + `tabular-nums`** | 600–700 | Replaces `font-mono` for crisp numeric legibility and aligned columns |

### 1.4 Spacing, Radius & Elevation
- Base spacing unit: `4px` (`4, 8, 12, 16, 24, 32, 48, 64, 96`).
- Border radius: `6px` for inputs/buttons/badges, `10px` max for cards, `999px` for pills/tags.
- Elevation: `1px` `--color-border` outline on cards at rest; introduce subtle shadow only on hover/focus (`0 4px 16px rgba(0, 0, 0, 0.08)` in light mode, `rgba(0, 0, 0, 0.3)` in dark mode).

---

## 2. Consolidated Feature Gap Tiers

This audit combines the gaps in the original Phase 0–5 checklist with the Phase C/D completion plan. “Implemented” means code exists; it does not mean the runtime/manual acceptance check has passed. Google sign-in and forgot/reset-password are intentionally excluded by owner request.

### Tier 1 — Verify or resolve before production/demo sign-off
| # | Gap | Current evidence / status | Required follow-up |
|---|---|---|---|
| 1 | Full cross-service order lifecycle is not verified end-to-end | Unit tests cover individual services and transitions; no cross-service integration test or recorded manual run covers custom quote → admin review → prototype → deposit → production → completion. | **Automated now:** `node scripts/e2e-smoke.mjs` (see Phase F) drives the whole lifecycle through the gateway and asserts every state, guard and price. Run it, then still do the visual UC walkthrough by hand. |
| 2 | Storefront/admin acceptance checks are still pending | Pagination, product detail, admin catalog/pricing, order tracking, dashboard, loading/error states, and mobile navigation are implemented in code. The tracker explicitly says UC-03–UC-12 and 375px checks are pending. | Run and record UC-03–UC-12 on desktop and a 375px viewport. UC-01/UC-02 remain excluded, not outstanding work. |
| 3 | Production RBAC depends on trusted network boundaries | The gateway validates JWTs, strips spoofed identity headers, and has tests for 401/403 behavior. Downstream services accept `X-User-Id`/`X-User-Role`; no repository deployment config currently restricts direct access to their ports. JWT config also has a development fallback secret. | Before deployment, make services reachable only through the gateway (private network/bind/firewall) and require a strong shared `JWT_SECRET` with no production fallback. Verify gateway-mediated and direct-service denial. |

### Tier 2 — Align implementation with the Phase 0/3/5 architecture checklist
| # | Gap | Current evidence / status | Required follow-up |
|---|---|---|---|
| 4 | Repeatable Docker/Nginx deployment setup (Dockerfiles for 4 services + frontend added, gateway routes parametrized via `*_SERVICE_URL`, compose env names fixed (S3_*), Mailpit added — **docker build not run yet**) | `docker-compose.yml` and `nginx/default.conf` were deleted by the UI overhaul commit and restored by the owner in `65ed853` (check they are pushed). `infra/.env.example` is new. In compose, publish ONLY the gateway/nginx port; keep 8081–8083, Postgres and S3 on the internal network. | Add the agreed Compose topology and Nginx config if these remain deployment requirements; document ports, health checks, and gateway-only routing. |
| 5 | Storage topology/bucket acceptance criteria do not match | The app uses SeaweedFS S3 configuration and allows `design-files` and `product-images` (two bucket names). The screenshot checklist refers to MinIO and three verified buckets, while the repository has no Compose setup to provision/verify them. | Confirm SeaweedFS vs. MinIO and define the intended third bucket/use before changing storage; then provision and verify the agreed buckets reproducibly. |
| 6 | Admin order UI differs from the requested Phase 5 layout | `/admin` provides an orders tab/list and inspector in a tabbed cockpit. It does not provide the screenshot’s Kanban-plus-table `OrdersBoardComponent` / single-screen board layout. Core order operations exist. | Decide whether that exact layout is still required; if yes, build the board/table view and verify processing an order through completion without direct database access. |
| 7 | Order-state logic is not factored into the named state-machine service | Transition validation and deposit gates exist in `AdminOrderService`/`OrderService`; there is no separate `OrderStateMachineService` as named in the Phase 3 checklist. | Extract a dedicated service only if the architecture requirement is retained; preserve and test the existing transition and deposit rules. |

### Tier 3 — Evidence and quality gates
| # | Gap | Current evidence / status | Required follow-up |
|---|---|---|---|
| 8 | “100%” pricing test coverage is not demonstrated | Pricing formula tests cover representative thin/thick, bulk, VAT, and deposit cases, but no coverage report was found to substantiate 100% coverage. | **Done:** JaCoCo added to the parent pom; run `mvn test` and open `catalog-pricing-service/target/site/jacoco/index.html`. Added 999/1000-unit and 1.00/1.01 mm boundary tests. Quote the real number from the report; do not claim 100% unless it says so. |
| 9 | Runtime infrastructure claims are not verified by repository state | The tracker records earlier local PostgreSQL/SeaweedFS setup, but there is no checked-in deployment definition to reproduce the claimed running services, schemas, or buckets. | Re-run the setup from documented commands and record schema/bucket/health checks after Tier 2 deployment decisions are resolved. |

### Tier 4 — Deferred or awaiting owner decision
| # | Item | Status |
|---|---|---|
| 10 | Google sign-in and forgot/reset-password | Intentionally excluded per owner request; do not implement unless requested later. |
| 11 | Meaning of “1 ly” for pricing threshold | Awaiting owner confirmation whether this means `1.0mm` or `0.1mm`. |
| 12 | Mica/Decal pricing rate | Awaiting owner confirmation whether the thin-sheet rate applies uniformly or needs a separate material rate. |
| 13 | Official VAT invoice PDF | Current print-friendly order summary is not a tax invoice; a compliant invoice integration remains out of scope until specified. |

---

## 3. Use-Case Checklist (verify manually)

| ID | Actor | Scenario | Steps | Expected result |
|---|---|---|---|---|
| UC-01 | Customer | Forgot password | `/login` → "Quên mật khẩu?" → enter email → open Mailpit (http://localhost:8025) → click link → set new password → log in with it | Same success message for unknown emails; link works once and expires after 1 h; reusing it fails |
| UC-02 | Customer | Google sign-in | Set `GOOGLE_CLIENT_ID` (backend) and `app-config.ts` (frontend), click the Google button | New CUSTOMER account created, JWT issued; an existing ADMIN email is refused; button hidden when no client ID |
| UC-03 | Visitor | Browse paginated catalog | Open `/products` with 37 seeded items | Shows page size (e.g., 12) + pagination bar; page 2 loads next set |
| UC-04 | Visitor | Use category mega-menu | Hover/click "Sản phẩm" in top nav | Dropdown shows nested categories (`Tem Nhãn` → `Inox`, `Nhôm`, `Đồng`, `Mica`, `Decal`, `CNC`, `Laser`, `Máy Móc`, `Hoá Chất`, `Vật Phẩm Lưu Niệm`) |
| UC-05 | Visitor | View product detail | Click a product card | Image gallery with thumbnail swap, full spec table, "Thêm vào giỏ" (`STANDARD_ITEM`) or "Tuỳ chỉnh kích thước 3D" (`CUSTOM_TEMPLATE`) |
| UC-06 | Admin | Create a new product | Admin → Products → New | Set name, category, type, upload images via `/api/v1/files/upload`, save; appears in catalog immediately |
| UC-07 | Admin | Edit a pricing rule | Admin → Pricing Rules → edit thin-sheet rate | Change persists; next quote calculation reflects new rate immediately |
| UC-08 | Customer | Track an order | Open Orders → select an order | Visual 7-step lifecycle stepper with status history |
| UC-09 | Any user | Mobile nav | Resize viewport to 375px | Nav collapses to hamburger drawer with all links reachable and no horizontal overflow |
| UC-10 | Any user | List error state | Stop backend, reload `/products` | Styled error state with retry button |
| UC-11 | Customer | Session expiry | Expired JWT on authenticated request | Redirects to login with notification |
| UC-12 | Admin | View dashboard | Open `/admin` | Live KPI widgets from `/api/v1/admin/dashboard/summary` |

---

## 4. Agent Execution Prompts

Run these as separate sessions, in order. **Stop after each and run the relevant Use-Case rows above before starting the next.**

### Manual Prerequisites
Phase B is deferred and is not part of the current acceptance scope. If the owner reopens it, configure Google OAuth and a development email sink (for example Mailpit) before implementation and verification.

---

### Phase A — Remaining Design System Polish

```
Apply the remaining design system updates from docs/PHASE_UI_IMPLEMENTATION_PLAN.md Section 1 across the Angular frontend.

### Scope
1. Standardize CSS variables (:root tokens from Section 1.2) in `frontend/src/styles.css` with clean light/dark surface support.
2. Ensure Google Fonts (`Space Grotesk` for headings and `Be Vietnam Pro` for UI/body) are loaded in `index.html` and mapped in `styles.css` / Tailwind config.
3. Ensure all numeric fields (prices, dimensions, SKUs, stock counts, table numbers) use `font-sans tabular-nums` instead of `font-mono`.
4. Upgrade product card top-left status badges (`GIA CÔNG 3D`, `CÓ SẴN`) to high-contrast solid pills (`bg-emerald-900/90 text-white backdrop-blur-sm`) so they remain crisp on dark product images.
5. Audit all cards/panels so border-radius is <= 10px with a 1px border outline at rest and subtle shadow on hover only.

### Verification
- Run `npm run build` with zero errors and visually inspect `/products` in both light and dark modes.
```

---

### Phase B — Auth Completeness (Google Sign-In + Forgot/Reset Password) [IMPLEMENTED on branch feature/phase-b-auth; NOT RUN — verify UC-01/UC-02]

```
Already implemented (see summary below). Do not re-run this prompt; use it only as the spec to verify against.

Implement Google sign-in and forgot/reset password for backend/auth-service (8081) and the Angular frontend, building on the existing JWT auth from Phase 1.

### Part 1: Database (new Flyway migration `backend/auth-service/src/main/resources/db/migration/V2__google_and_password_reset.sql`; do NOT edit init.sql or V1)
1. Alter `auth_schema.users`: add `auth_provider` (VARCHAR, 'LOCAL' | 'GOOGLE', default 'LOCAL'), add `google_id` (VARCHAR, nullable, unique), and make `password_hash` nullable.
2. New table `auth_schema.password_reset_tokens`: `id` (UUID PK), `user_id` (FK to users), `token` (VARCHAR, unique, indexed), `expires_at` (TIMESTAMP WITH TIME ZONE), `used_at` (TIMESTAMP WITH TIME ZONE, nullable).

### Part 2: backend/auth-service
1. Add `com.google.api-client:google-api-client` (`GoogleIdTokenVerifier`) and `spring-boot-starter-mail`.
2. `POST /api/v1/auth/google` — verify `{ idToken }` against `GOOGLE_CLIENT_ID`, find or create a `CUSTOMER` user (`authProvider=GOOGLE`, `googleId=sub`), and return the standard `ApiResponse<AuthResponse>` JWT.
3. `POST /api/v1/auth/forgot-password` — accept `{ email }`, always return a generic success response, generate a 1-hour UUID reset token if the user exists, and send a reset link (`http://localhost:4200/reset-password?token=<token>`) via Spring Mail (`localhost:1025`).
4. `POST /api/v1/auth/reset-password` — validate `{ token, newPassword }` (exists, unexpired, unused), update `password_hash` (BCrypt), and set `used_at = NOW()`.

### Part 3: infra/docker-compose.yml
Add a `mailpit` service (`axllent/mailpit`) exposing SMTP on `1025` and Web UI on `8025`.

### Part 4: frontend
1. Load `https://accounts.google.com/gsi/client` in `index.html` and wire "Đăng nhập với Google" on the Login page to `POST /api/v1/auth/google`.
2. Build `ForgotPasswordComponent` (`/forgot-password`) and `ResetPasswordComponent` (`/reset-password`) styled with the NVX design system.

### Verification
- Verify UC-01 and UC-02 manually using Mailpit at `http://localhost:8025` and run JUnit tests for `auth-service`.
```

**Phase B implementation summary (branch `feature/phase-b-auth`, uncompiled backend — run `mvn test`):**
- Flyway `V2__google_signin_and_password_reset.sql` (validated on Postgres 16): `auth_provider`, `google_id` (unique), nullable `password_hash` and `phone`, `password_reset_tokens` (stores SHA-256 hash only).
- `POST /api/v1/auth/forgot-password` (always generic 200), `POST /api/v1/auth/reset-password` (1 h, single use, invalidates all of the user's tokens), `POST /api/v1/auth/google` (verifies via Google tokeninfo, checks audience + `email_verified`, never links to an ADMIN account).
- Spring Mail + Mailpit in compose; frontend `/forgot-password`, `/reset-password`, Google button on `/login`.
- Manual prerequisite: create the Google OAuth Client ID and set it in two places (backend env + `app-config.ts`).
- Known limits: tokeninfo adds one HTTP call per Google login (fine at this scale; switch to `GoogleIdTokenVerifier` if volume grows); no rate limit on forgot-password yet; no "change password" screen for logged-in users yet.

---

### Phase C — Catalog Pagination, Mega-Menu, Mobile Drawer & Product Detail Page [IMPLEMENTED; MANUAL CHECKS PENDING]

```
Implement catalog pagination, the data-driven category dropdown menu, mobile drawer nav, and the detailed product page.

### Part 1: frontend — PaginatorComponent
Build a reusable `PaginatorComponent` (prev/next, page numbers, current-page highlight, `tabular-nums`) and wire `page`, `size`, and `totalPages` from `PageResponse<Product>` into `/products` and admin list views.

### Part 2: frontend — NavbarComponent
1. Use the cached `/api/v1/catalog/categories` tree to render a hover/click dropdown menu under "Sản phẩm" matching the nested hierarchy (`Tem Nhãn` → `Inox`, `Nhôm`, `Đồng`, `Mica`, `Decal`, `CNC`, `Laser`, `Máy Móc`, `Hoá Chất`, `Vật Phẩm Lưu Niệm`).
2. Add a mobile drawer below `768px` with a hamburger toggle, Escape/outside-click close handling, and zero horizontal overflow.

### Part 3: frontend — ProductDetailComponent (`/products/:slug`)
1. Breadcrumb trail (`Trang chủ / Category / Product name`).
2. Image gallery with main photo, thumbnail strip switcher using `galleryUrls` / `images[]`, and fallback placeholder on missing images.
3. Full specification table (material, default dimensions, thickness, processing method, estimated lead time).
4. Differentiated CTA: quantity selector + "Thêm vào giỏ" for `STANDARD_ITEM`, or "Tuỳ chỉnh kích thước 3D" routing to `/quote-builder` pre-filled with the product's material and category for `CUSTOM_TEMPLATE`.

### Verification
- Confirm UC-03, UC-04, UC-05, and UC-09 pass manually on desktop and a `375px` mobile viewport.
```

---

### Phase D — Admin Product & Pricing Management [IMPLEMENTED; MANUAL CHECKS PENDING]

```
Build the admin UI for product and pricing-rule management wired to the existing backend admin endpoints.

### Part 1: frontend — AdminProductListComponent & AdminProductFormComponent
1. Paginated product table with image thumbnail, name, SKU, category, product type, price/stock, active toggle, and edit/delete actions, plus search and category/type filters.
2. Create/edit product form supporting `STANDARD_ITEM` (fixed price, stock quantity) and `CUSTOM_TEMPLATE` (material, processing method, default dimensions).
3. Multi-image uploader wired to `POST /api/v1/files/upload` with thumbnail previews, reordering, and image removal.

### Part 2: frontend — AdminPricingRuleListComponent
1. Owner-editable form for `pricing_rules` (`THIN_SHEET_RATE_M2`, `THICK_METAL_MULTIPLIER`, `THIN_SHEET_THRESHOLD_MM` with explicit `mm` unit label, `BULK_DISCOUNT_MIN_QTY`, `BULK_DISCOUNT_RATE`, `VAT_RATE`, `DEPOSIT_RATE`).
2. Ensure updates persist via `PUT /api/v1/admin/pricing/rules` and immediately affect new quote calculations on `/quote-builder`.

### Verification
- Confirm UC-06 and UC-07 pass manually end-to-end.
```

---

### Phase E — Hardening Before Phase 5 [WRITTEN, NOT YET RUN — verify locally]

Done on branch `hardening/phase5-prep` (review the diff, then run `cd backend && mvn test` and start all services):

| # | Change | How to verify |
|---|---|---|
| E1 | VNPAY **IPN** endpoint `GET /api/v1/payments/vnpay-ipn` (public in gateway) returning VNPAY's `{RspCode, Message}`; shared signature check; **amount must match** `vnp_Amount = amount×100`; processing is idempotent (only `PENDING` changes), so IPN + browser return in any order never double-count. | 4 new tests in `PaymentServiceTest`. Manually: pay in sandbox, close the tab before returning, confirm order still reaches `IN_PRODUCTION`. IPN needs a public URL (e.g. ngrok) registered in the VNPAY merchant portal. |
| E2 | **Secrets**: no more hardcoded fallbacks in `application.yml`. Local dev uses `application-dev.yml` (active by default). Production sets `SPRING_PROFILES_ACTIVE=prod` and must supply `JWT_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `S3_*`, `VNPAY_*` or the service fails to start. See `infra/.env.example`. | Start with `SPRING_PROFILES_ACTIVE=prod` and no env → startup error. Start normally → works as before. |
| E3 | **Flyway** per service (`db/migration/V1__baseline_*.sql`, history table in each service's own schema, `baseline-on-migrate` so your existing DB is adopted, not rebuilt). `init.sql` no longer drops anything; `infra/postgres/dev-reset.sql` is the explicit dev wipe. Baseline SQL was checked to produce a schema identical to the old `init.sql` (pg_dump diff) with 5 materials, 7 pricing rules, 12 compatibility rows. | Start each service on your existing DB: Flyway should log "Successfully baselined". On an empty DB: it should create everything and Hibernate `validate` must pass. All future schema changes = new `V2__...sql`, never edit V1. |

**Still open after Phase E**
- Downstream services still trust `X-User-*` headers: fix by network isolation (compose) now; consider a gateway-signed internal token later.
- Existing admin keeps its old password; change it manually (no password-change UI yet — add with Phase B).
- Phase B Part 1 must now be a Flyway migration `auth-service/.../V2__google_and_password_reset.sql`, not an edit to `init.sql`.
- Pricing unit/rate questions in Section 5 still block trusting any quote.

---

### Phase F — Automated verification & guard fixes [WRITTEN, NOT YET RUN]

Branch `feature/e2e-smoke-and-coverage` (includes Phase B):
- **Bug fixed:** admin could move an order to `COMPLETED` without the full balance being verified (the `BALANCE_NOT_SETTLED` error code existed but was never used). `AdminOrderService.updateOrderStatus` now enforces `paidAmount >= totalAmount`; 2 new tests.
- **`scripts/e2e-smoke.mjs`** (Node 18+, no dependencies): auth and role checks (401/403, admin cannot use the cart), password-reset enumeration safety, pricing vector (INOX_304 100×50×2 mm ×10 = 33,702.50/unit, +10% VAT), custom order `QUOTE_PENDING → QUOTE_APPROVED → PROTOTYPING → AWAITING_DEPOSIT → IN_PRODUCTION → READY_FOR_DELIVERY → COMPLETED` including the guards (no production before deposit, no completion before balance), status history, cross-customer isolation, standard-item order, and VNPAY IPN (wrong amount 04, bad signature 97, success 00, replay 02). Creates throw-away users/orders: dev DB only. `CHECK_DIRECT=1` also reports whether service ports are reachable directly.
- Run: start Postgres + object storage + the 4 services (or compose), then `node scripts/e2e-smoke.mjs`. Exit code 1 on any failure.

**Decisions recorded for the remaining Tier 2 items**
- Admin layout (#6, Kanban + single-screen cockpit): the tabbed inspector already supports the full workflow; build a board only if the uncle asks to see orders by status at a glance.
- `OrderStateMachineService` (#7): transitions live in `AdminOrderService`/`OrderService` and are unit-tested; extract only if you want it as a showcase of design, not for correctness.
- Storage (#5): decide MinIO vs SeaweedFS (compose uses SeaweedFS) and whether a third bucket (e.g. `payment-proofs`) is wanted; payment proofs currently go through `design-files`.

---

## 5. Open Business Rules Pending Owner Confirmation
1. **"1 ly" unit:** Confirm whether "1 ly" means `1.0mm` or `0.1mm` (determines thin-sheet area pricing vs. thick-metal weight pricing).
2. **Mica/Decal rate:** Confirm whether the `5,000,000 VND/m²` thin-sheet rate applies uniformly to Mica/Decal or requires a separate rate in `catalog_pricing_schema.materials` (configurable in Phase D without code changes).