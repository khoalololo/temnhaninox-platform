# Tem Nhãn Inox Platform — Engineering & Agent Guidelines

## 1. Tech Stack & Local Infrastructure
- **Backend**: Java 17, Spring Boot 3.3.5, Spring Cloud 2023.0.3, Maven multi-module (`backend/pom.xml`).
- **Frontend**: Angular 18+ (Standalone Components, Signals/RxJS), Tailwind CSS v3, Three.js (`frontend/`).
- **Database**: Native local PostgreSQL on `localhost:5432`, database `temnhaninox_db`.
  - Schemas: `auth_schema` (`auth-service`), `catalog_pricing_schema` (`catalog-pricing-service`), `order_schema` (`order-service`).
  - Schema DDL is already initialized via `infra/postgres/init.sql`. Always set `spring.jpa.hibernate.ddl-auto=validate`. Never use `create` or `update`.
- **Object Storage**: S3-compatible SeaweedFS running in Docker on `http://localhost:9000` (credentials in `infra/.env`). Configure AWS SDK v2 `S3Client` with `forcePathStyle(true)`.
- **Service Ports**:
  - `api-gateway`: `8080` (Spring Cloud Gateway WebFlux — never add `spring-boot-starter-web` here)
  - `auth-service`: `8081`
  - `catalog-pricing-service`: `8082`
  - `order-service`: `8083`
  - `frontend`: `4200` (proxies `/api` to `http://localhost:8080`)

## 2. Architectural & Coding Rules
- **Shared Contracts**: Always reuse DTOs, enums, `ApiResponse<T>`, `PageResponse<T>`, `ErrorCode`, and `BusinessException` from `common-dto` (`com.temnhaninox.common`). Do not duplicate enums or response wrappers inside individual services.
- **Cross-Schema Isolation**: Never create JPA `@ManyToOne` / `@OneToMany` relationships or DB foreign keys across different PostgreSQL schemas. Store cross-service IDs as plain `UUID` columns alongside immutable snapshot fields (e.g., `materialNameSnapshot`, `finalUnitPrice`).
- **Spring Conventions**: Use constructor injection (`@RequiredArgsConstructor`), Jakarta validation (`@Valid`), `BigDecimal` for all currency/weight/dimension math (`RoundingMode.HALF_UP`), and a `@RestControllerAdvice` returning `ApiResponse` on every service.
- **Security Headers**: `api-gateway` validates JWTs and injects `X-User-Id` and `X-User-Role` headers downstream. Downstream services trust those headers for authenticated endpoints.
- **No Unsolicited Git Commits**: Never run `git commit` or `git push`. Leave changes staged or unstaged for manual review.

## 3. Mandatory Task Execution & Tracking Protocol
1. **Read State First**: Before writing code, read `PROJECT_STATUS.md` to verify what is already built and which phase is active.
2. **Scope Discipline**: Only modify files required for the requested phase/slice. Do not rewrite unrelated modules.
3. **Verify Before Finishing**:
   - Backend changes: Run `mvn test -pl <modified-modules>` inside `backend/` and ensure 100% pass rate.
   - Frontend changes: Run `npm run build` inside `frontend/` and ensure zero TypeScript/template errors.
4. **Update Tracker**: At the end of every task, update `PROJECT_STATUS.md` (check off completed items, list created endpoints/components, and note any follow-up items) before reporting completion.
