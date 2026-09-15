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


## 6. Size and performance

The system is intended for a general audience and must support multiple simultaneous users working on shared trips. The main pages should load in less than 3 seconds under normal network conditions.

## 7. Quality attributes

The client-server architecture with frontend/server separation supports:

- Maintainability: each layer can evolve independently.
- Testability: the API can be tested in isolation.
- Security: access control is centralized in the backend.
- Scalability: frontend and backend can scale independently.

## 8. References

- Project scope document — ViajaJunto
- Requirements document — ViajaJunto
