## Software Architecture Document

### Revision history

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 25/08/2026 | 0.1 | Initial version | Gustavo de Freitas Fidélis, Bernardo Lykawka Medeiros da Silva |

## 1. Introduction

### 1.1 Purpose
This document presents an overview of the software architecture for the ViajaJunto system and establishes architectural decisions relevant to its development.

### 1.2 Scope
This document covers the architecture of ViajaJunto, a web application for collaborative trip planning. It should be followed by the development team to maintain the proposed architecture, including separation between frontend and backend, database organization, and access control.

### 1.3 Definitions and abbreviations

| Abbreviation | Definition |
| ----------- | ---------- |
| API | Application Programming Interface |
| REST | Representational State Transfer |
| JWT | JSON Web Token |
| ERD | Entity-Relationship Diagram |
| DLD | Logical Data Diagram |
| MVC | Model-View-Controller |

## 2. Architectural representation

The application follows a client-server architecture with clear separation of concerns:

- Frontend: responsive web application that consumes the backend REST API and renders the interface.
- Backend: REST API responsible for business logic, authentication, authorization, persistence, and integration orchestration.
- Maps service: handles interactive map display and routing.
- Places/activities service: integrates external APIs to enrich local data and discover activities.
- Database: relational storage for users, trips, destinations, activities, budgets, and reviews.

## 3. Architecture goals and constraints

| Constraint | Tool or decision |
| ---------- | ---------------- |
| Language | TypeScript (Node.js) |
| Framework | NestJS 12 |
| Platform | Web browser |
| Persistence | PostgreSQL via Prisma ORM |
| Security | Password hash; JWT authentication; trip-level authorization |
| Language of interface | Portuguese (pt-BR) |
| Interactive map | Example: jsVectormap or Google Maps API |

## 4. Logical view

The system is organized into five main blocks:

- Presentation layer (frontend): responsible for the user interface and map interactions.
- Business layer (backend/API): responsible for business rules, authentication, permissions, and orchestration.
- Maps service: encapsulates geolocation, routes, and markers.
- Activities service: integrates with external APIs to enrich activity information.
- Data layer (database): responsible for persistence of users, trips, destinations, activities, budgets, and evaluations.

## 5. Implementation view

### 5.1 Entity-relationship model

The relational model is composed of the following entities:

- `user`
- `trip`
- `trip_member`
- `destination_catalog`
- `trip_destination`
- `activity_catalog`
- `trip_activity`
- `budget`
- `review`

### 5.2 Data model summary

```
user(#id, name, email, password_hash, created_at)

trip(#id, name, description, start_date, end_date, status, *created_by->user, created_at)

trip_member(#id, *trip_id->trip, *user_id->user, permission, joined_at)

destination_catalog(#id, name, country, category, description, latitude, longitude, photo_url)

trip_destination(#id, *trip_id->trip, *destination_catalog_id->destination_catalog, arrival, departure, description, order)

activity_catalog(#id, name, description, activity_type, location, city, country, latitude, longitude, google_place_id, photo_url, source, average_rating, created_at)

trip_activity(#id, *trip_destination_id->trip_destination, *activity_catalog_id->activity_catalog, date_time, duration_minutes, expected_cost, status)

budget(#id, *trip_id->trip, total_value, planned_activities)

review(#id, *user_id->user, *activity_catalog_id->activity_catalog, rating, comment, created_at)
```

> Legend: `#` primary key, `*` foreign key

### 5.3 Source code organization

The backend follows a **hybrid layered structure**: feature-first at the top level,
with DDD layers inside each feature module. Every module owns its full vertical slice,
so a change to one aggregate stays inside one directory.

```
src/
├── app.module.ts                  Root module — wires PrismaModule + feature modules
├── main.ts
├── shared/
│   └── database/
│       ├── prisma.service.ts      PrismaClient exposed as a Nest provider
│       └── prisma.module.ts       @Global — injectable from any module
└── modules/
    └── <feature>/                 e.g. trips, users, budgets, reviews
        ├── domain/                Enterprise rules — no framework, no ORM
        │   ├── <entity>.entity.ts
        │   └── <entity>.repository.ts     Abstract class = persistence contract
        ├── application/           Use cases
        │   ├── dto/
        │   └── <feature>.service.ts
        ├── infrastructure/        Technical detail
        │   └── <entity>.prisma.repository.ts
        ├── presentation/          HTTP boundary
        │   └── <feature>.controller.ts
        └── <feature>.module.ts    Binds the contract to its implementation
```

**Dependency rule.** Dependencies point inwards only:

```
presentation ──▶ application ──▶ domain ◀── infrastructure
```

`domain` imports nothing from the other layers. `application` depends on the
repository *contract* declared in `domain`, never on Prisma. Each feature module
performs the binding:

```ts
{ provide: TripRepository, useClass: TripPrismaRepository }
```

The contract is declared as an `abstract class` rather than a TypeScript
`interface` because Nest's dependency injection container resolves providers by a
runtime token, and interfaces are erased at compile time.

Swapping PostgreSQL for another database — or Prisma for another ORM — means adding
a new class under `infrastructure/` and changing a single line in the module.
No service or controller is touched.

### 5.4 Feature modules

| Module | Route | Aggregate |
| ------ | ----- | --------- |
| `users` | `/users` | `user` |
| `trips` | `/trips` | `trip` |
| `trip-members` | `/trip-members` | `trip_member` |
| `destination-catalog` | `/destination-catalog` | `destination_catalog` |
| `trip-destinations` | `/trip-destinations` | `trip_destination` |
| `activity-catalog` | `/activity-catalog` | `activity_catalog` |
| `trip-activities` | `/trip-activities` | `trip_activity` |
| `budgets` | `/budgets` | `budget` |
| `reviews` | `/reviews` | `review` |


### 5.5 Database access (Prisma 7)

Prisma 7 splits the database connection into two independent paths, and
`schema.prisma` no longer holds the URL:

| Path | Consumer | Where the URL comes from |
| ---- | -------- | ------------------------ |
| CLI — `generate`, `migrate`, `studio` | Prisma CLI | `prisma.config.ts` |
| Runtime — queries from the API | `PrismaClient` | Driver adapter (`PrismaPg`) |

`prisma.config.ts` (project root) loads `.env` and declares the datasource URL
for the CLI. At runtime, `PrismaService` builds a `PrismaPg` adapter from
`DATABASE_URL` and passes it to the `PrismaClient` constructor — a driver
adapter is mandatory in Prisma 7 unless the project uses Prisma Accelerate.

The generator is still `prisma-client-js`, which Prisma 7 labels *legacy* but
continues to support; the client is emitted into `node_modules/.prisma/client`
and imported as `@prisma/client`. Migrating to the newer `prisma-client`
generator later means setting an explicit `output` directory in the schema and
updating the single import inside `prisma.service.ts` — no other file refers to
the ORM.

**Local setup**

PostgreSQL runs in Docker — `docker-compose.yml` at the project root defines the
database service with a named volume (data survives restarts) and a healthcheck.
Prisma migrations fail while the container is still booting, so wait for the
health status to report `healthy` before migrating.

```bash
cp .env.example .env          # defaults already match docker-compose.yml
npm install

npm run db:up                 # starts PostgreSQL (docker compose up -d)
docker compose ps             # wait until postgres is "healthy"

npm run prisma:generate       # emits the typed client
npm run prisma:migrate        # applies migrations to the database
npm run start:dev
```

| Script | Purpose |
| ------ | ------- |
| `npm run db:up` | Start PostgreSQL in the background |
| `npm run db:down` | Stop the containers, keeping the data |
| `npm run db:nuke` | Stop and delete the volume — wipes the database |
| `npm run db:logs` | Follow the PostgreSQL logs |
| `npm run db:admin` | Also start Adminer on `http://localhost:8080` |

Adminer sits behind the `tools` Compose profile, so a plain `db:up` starts only
the database.


### 5.6 API conventions

**Validation.** Two libraries with two distinct jobs, so no rule is written twice:

| Library | Scope | Where |
| ------- | ----- | ----- |
| `class-validator` + `class-transformer` | HTTP request payloads | `**/application/dto/*.dto.ts` |
| `zod` | Environment variables, at boot | `src/shared/config/env.ts` |

A global `ValidationPipe` runs with `whitelist`, `forbidNonWhitelisted` and
`transform` enabled: unknown properties are rejected rather than ignored, and
DTOs are instantiated for real so `@Type()` conversions apply. Validation
failures return **422**, keeping them distinct from a malformed request (400).

Update DTOs are derived from their Create counterpart with
`PartialType` / `OmitType` / `PickType`, so validation rules and OpenAPI
metadata live in exactly one place.

**Responses.** Every endpoint returns a `*ResponseDto` built explicitly from the
domain entity through a static `from()` mapper, rather than returning the entity
itself. This is what keeps `passwordHash` out of `UserResponseDto` — a new
column cannot leak into the API by accident.

**Pagination.** Offset based. List endpoints accept `page` (default 1) and
`limit` (default 20, maximum 100) and answer with:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1, "limit": 20, "total": 137,
    "totalPages": 7, "hasNext": true, "hasPrevious": false
  }
}
```

The page and the total are read inside a single `$transaction`, so both come
from the same database snapshot. Each resource has a deterministic default
ordering — itinerary position for trip destinations, chronological for planned
activities, newest first for trips and reviews — which is what makes paging
stable across requests.

**Authentication.** Endpoints are documented with `@ApiBearerAuth` and expect
`Authorization: Bearer <token>`. Public by design, matching the scope document
("a visitor can browse and read reviews, but cannot create trips"):

| Endpoint | Reason |
| -------- | ------ |
| `POST /users` | Sign-up — there is no token yet |
| `GET /destination-catalog`, `GET /destination-catalog/{id}` | Destination discovery |
| `GET /activity-catalog`, `GET /activity-catalog/{id}` | Activity discovery |
| `GET /reviews`, `GET /reviews/{id}` | Reading community reviews |

Everything else — 38 of the 45 resource operations — requires a token. The
guard that enforces this is not implemented yet; the contract is documented
first so the frontend can be built against it.

**Status codes.**

| Code | Meaning |
| ---- | ------- |
| `200` | Read or update succeeded |
| `201` | Resource created |
| `204` | Deleted, no body |
| `400` | Path parameter is not a valid UUID |
| `401` | Missing or invalid token |
| `404` | No resource with that id |
| `409` | Unique constraint violated (duplicate email, member, budget or review) |
| `422` | Payload failed validation — one message per violated rule |


## 6. Size and performance

The system is intended for a general audience and must support multiple simultaneous users working on shared trips. The main pages should load in less than 3 seconds under normal network conditions.

## 7. Quality attributes

The client-server architecture with frontend/server separation supports:

- Maintainability: each layer can evolve independently.
- Testability: the API can be tested in isolation.
- Security: access control is centralized in the backend.
- Scalability: frontend and backend can scale independently.

## 9. Continuous integration

Every push to `master` and every pull request runs `.github/workflows/ci.yml`.
The five jobs are independent except for SonarCloud, which waits on the test
job for its coverage report.

| Job | Gate | Fails the PR when |
| --- | ---- | ----------------- |
| **Lint** | `oxlint --deny-warnings` + `prettier --check` | Any lint error or warning, or unformatted code |
| **Tests** | `vitest` with v8 coverage, against a PostgreSQL service container | A test fails or coverage drops below the thresholds in `vitest.config.ts` |
| **API contract** | `spectral lint` over the generated OpenAPI document | The contract breaks a `spectral:oas` rule |
| **SonarCloud** | `sonarqube-scan-action` with `sonar.qualitygate.wait=true` | The Quality Gate does not pass |
| **Image scan** | `trivy-action` on the built image | A HIGH or CRITICAL vulnerability with a known fix |

**Contract linting.** `scripts/generate-openapi.mjs` boots the real `AppModule`
with `PrismaService` stubbed and writes the OpenAPI document to disk, so the
contract Spectral checks is produced by the same decorators the API serves —
it cannot drift. The file is generated in CI rather than committed.

**Coverage.** `npm run test:cov` writes `coverage/lcov.info`, which is uploaded
as an artifact and handed to SonarCloud. The scan job never re-runs the suite.
Excluded from coverage: DI wiring, entity interfaces, abstract contracts and the
Prisma adapters, which only run against a real database and belong to the e2e
suite instead. The reasons are listed in `vitest.config.ts` and mirrored in
`sonar-project.properties`.

**Image.** The `Dockerfile` is multi-stage: dependencies and the Prisma client
are built in a full Node image, and only `dist/`, production `node_modules` and
the generated client reach the runtime layer, which runs as the unprivileged
`node` user. The image is loaded into the local daemon and scanned; nothing is
pushed to a registry.

Trivy runs with `ignore-unfixed: true`. A vulnerability with no released patch
cannot be acted on, so gating on it would block every pull request with no way
forward. Set it to `false` to gate on those as well.

**Required secrets.** `SONAR_TOKEN`, from the SonarCloud project settings. The
project key and organization live in `sonar-project.properties`.


## 10. References

- Project scope document — ViajaJunto
- Requirements document — ViajaJunto
