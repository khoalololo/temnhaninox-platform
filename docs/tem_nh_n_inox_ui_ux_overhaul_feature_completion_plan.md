# TEM NHÃN INOX — UI/UX Overhaul & Feature Completion Plan
**Document type:** Agent execution plan (phases A–D, follows completed Phase 1–3 backend and initial Phase 4 storefront work)
**Status:** Design system, catalog seeding, image normalization, and numeric typography fixes verified against live app (2026-11-25)

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

## 2. Feature Gap Analysis

### Tier 1 — Must-fix before demo-ready (blocks real usage)
| # | Feature | Status / Notes |
|---|---|---|
| 1 | Forgot/reset password flow | Pending (Phase B) |
| 2 | Pagination controls on list views (catalog `/products`, admin orders, admin customers) | Backend `PageResponse` ready; frontend paginator UI pending (Phase C) |
| 3 | Data-driven top nav category dropdown / mega-menu | Category tree API & sidebar tree working; top nav dropdown pending (Phase C) |
| 4 | Detailed product page (`/products/:slug`: multi-image gallery, spec table, differentiated CTA) | Pending (Phase C) |
| 5 | Admin product management UI (create/edit/delete + S3 image upload) | Backend API ready; UI pending (Phase D) |
| 6 | Admin pricing-rule management UI (owner-editable rates, thickness threshold, bulk tiers) | Backend API ready; UI pending (Phase D) |
| 7 | Mobile-responsive nav (hamburger/drawer below 768px) | Pending (Phase C) |
| 8 | Consistent loading/empty/error states across all list and detail views | Placeholder empty state done; skeleton/error states pending |

### Tier 2 — Should add soon
| # | Feature | Notes |
|---|---|---|
| 9 | Google sign-in | Phase B (requires `GOOGLE_CLIENT_ID`) |
| 10 | Order-tracking stepper UI on `/account/orders/:id` | Visualizes the 7-step lifecycle |
| 11 | Toast/snackbar notification system | Replace any `alert()` calls |
| 12 | Breadcrumbs on category/product pages | |
| 13 | Form validation polish (Vietnamese phone format, MST/VAT format check) | |
| 14 | Session/JWT expiry handling (auto-redirect on 401) | |
| 15 | Admin dashboard summary widgets (`/api/v1/admin/dashboard/summary`) | Backend endpoint ready; UI pending |

### Tier 3 — Nice-to-have, defer
| # | Feature |
|---|---|
| 16 | Printable/downloadable VAT invoice PDF |
| 17 | Static content pages (Về chúng tôi, Liên hệ) |
| 18 | 404/500 custom error pages |
| 19 | Search autocomplete dropdown |

---

## 3. Use-Case Checklist (verify manually)

| ID | Actor | Scenario | Steps | Expected result |
|---|---|---|---|---|
| UC-01 | Customer | Forgot password | Click "Quên mật khẩu" → enter email → check Mailpit (`localhost:8025`) → click reset link → set new password | Can log in with new password; old password fails; reset link cannot be reused |
| UC-02 | Customer | Google sign-in | Click "Đăng nhập với Google" → select Google account | Account created or matched by email; logged in with app JWT |
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
1. **Google OAuth:** Create a Web OAuth Client ID in Google Cloud Console with `http://localhost:4200` as an authorized JavaScript origin and copy `GOOGLE_CLIENT_ID`.
2. **Dev Email:** No external provider needed—Phase B adds `axllent/mailpit` (`1025` SMTP / `8025` Web UI) to `infra/docker-compose.yml`.

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

### Phase B — Auth Completeness (Google Sign-In + Forgot/Reset Password)

```
Implement Google sign-in and forgot/reset password for backend/auth-service (8081) and the Angular frontend, building on the existing JWT auth from Phase 1.

### Part 1: Database (infra/postgres/init.sql)
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

---

### Phase C — Catalog Pagination, Mega-Menu, Mobile Drawer & Product Detail Page

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

### Phase D — Admin Product & Pricing Management

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

## 5. Open Business Rules Pending Owner Confirmation
1. **"1 ly" unit:** Confirm whether "1 ly" means `1.0mm` or `0.1mm` (determines thin-sheet area pricing vs. thick-metal weight pricing).
2. **Mica/Decal rate:** Confirm whether the `5,000,000 VND/m²` thin-sheet rate applies uniformly to Mica/Decal or requires a separate rate in `catalog_pricing_schema.materials` (configurable in Phase D without code changes).