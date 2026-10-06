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
user(#id, name, email, google_id, created_at)

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
│   ├── database/
│   │   ├── prisma.service.ts      PrismaClient exposed as a Nest provider
│   │   └── prisma.module.ts       @Global — injectable from any module
│   └── storage/                   Photo uploads (S3), same layering as a module
│       ├── domain/                ObjectStorage port, photo rules (types, size, keys)
│       ├── application/           PhotoStorageService: upload / discard
│       ├── infrastructure/        S3ObjectStorage, UnconfiguredObjectStorage (503)
│       ├── http/                  Multipart interceptor, file pipe, OpenAPI decorator
│       └── storage.module.ts      @Global — picks S3 when S3_BUCKET is set
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
itself. This is what keeps `googleId` out of `UserResponseDto` — a new
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

**Authentication.** Google is the only sign-in method; there are no
passwords. It is built on Passport.js (`passport-google-oauth20` and
`passport-jwt`) in `src/modules/auth`:

1. The frontend navigates the browser (full page load, not fetch) to
   `GET /api/auth/google`, which redirects to the Google consent screen.
2. Google redirects back to `GET /api/auth/google/callback`. The API finds the
   user by Google id, links an existing account by verified email, or creates
   one on first sign-in.
3. The API signs its own JWT (HS256, `JWT_EXPIRES_IN` seconds) and redirects to
   `AUTH_REDIRECT_URL#access_token=<jwt>&token_type=Bearer&expires_in=<s>`.
   On failure it redirects to `AUTH_REDIRECT_URL#error=google_sign_in_failed`.
   The token sits in the fragment so it never reaches server logs or the
   Referer header.
4. The client sends `Authorization: Bearer <token>` on later requests.
   `GET /api/auth/me` returns the current user. Signing out means the client
   discards the token.

Login CSRF is prevented by the OAuth `state` parameter, kept in a short-lived
httpOnly cookie (`CookieStateStore`) because the API holds no session.
Only Google-verified emails are accepted, since accounts are linked by email.

Required configuration: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_CALLBACK_URL` (registered as an authorized redirect URI in Google
Cloud Console), `AUTH_REDIRECT_URL`, `JWT_SECRET` (32+ characters) and
`JWT_EXPIRES_IN`. See `.env.example`.

Endpoints are documented with `@ApiBearerAuth` and expect
`Authorization: Bearer <token>`. Public by design, matching the scope document
("a visitor can browse and read reviews, but cannot create trips"):

| Endpoint | Reason |
| -------- | ------ |
| `GET /auth/google`, `GET /auth/google/callback` | Sign-in — there is no token yet |
| `GET /destination-catalog`, `GET /destination-catalog/{id}` | Destination discovery |
| `GET /activity-catalog`, `GET /activity-catalog/{id}` | Activity discovery |
| `GET /reviews`, `GET /reviews/{id}` | Reading community reviews |

Everything else requires a token. `JwtAuthGuard` and the `@CurrentUser()`
decorator are available in `src/modules/auth/presentation`; so far only
`GET /auth/me` applies the guard, and the resource controllers still have to
adopt it.

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

## 8. Continuous integration

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
| **Publish image** | `docker/build-push-action` | — (does not run on pull requests) |

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


**Publishing.** The `publish` job runs only on a push to the default branch or
on a `v*` tag, never on a pull request, and it lists every other job in `needs`.
A failing Trivy scan or a red Quality Gate therefore blocks the release, not
just the pull request. Tags are derived from the ref by `docker/metadata-action`:

| Ref | Tags pushed |
| --- | ----------- |
| push on the default branch | `latest`, `sha-<commit>` |
| tag `v1.4.2` | `1.4.2`, `1.4`, `1`, `sha-<commit>` |

Authentication uses a Docker Hub **Access Token**, never an account password.

**Branch protection.** The default branch accepts merges through pull requests
only, with these five checks required: `Lint`, `Tests`, `API contract`,
`SonarCloud` and `Image scan`. `Publish image` is deliberately not required —
it does not run on pull requests.

**Required secrets.**

| Secret | Used by |
| ------ | ------- |
| `SONAR_TOKEN` | SonarCloud job |
| `DOCKERHUB_USERNAME` | Publish job |
| `DOCKERHUB_TOKEN` | Publish job (Docker Hub Access Token) |


## 9. Emulated AWS deployment (MiniStack)

The API can be deployed to a local AWS environment emulated by
[MiniStack](https://ministack.org), reproducing how it would be hosted on AWS
without an account. Templates and scripts live in `infra/`.

```
CloudFormation ─┬─ viajajunto-registry ── ECR repository
                └─ viajajunto-app ─────── Secrets Manager (DATABASE_URL, app keys)
                                          S3 bucket (photos) + public-read policy
                                          IAM execution role, IAM task role (S3 write)
                                          CloudWatch log group
                                          ECS cluster ─ task definition ─ service
RDS API ────────── PostgreSQL 17 instance
```

| Step | Service | What happens |
| ---- | ------- | ------------ |
| 1 | RDS | A real PostgreSQL container is started |
| 2 | CloudFormation | `registry.yaml` creates the ECR repository |
| 3 | ECR | The API image is pushed to MiniStack's registry (`localhost:4566`) |
| 4 | — | Prisma migrations run against the RDS endpoint |
| 5 | CloudFormation | `app.yaml` creates the secrets, photos bucket, IAM roles, log group, cluster, task definition and service |
| 6 | ECS | The service starts the API container with `DATABASE_URL` injected from Secrets Manager |
| 7 | S3 + RDS | `prisma/seed.mjs` inserts sample destinations and uploads their photos to the bucket (skip with `SKIP_SEED=1`) |

```bash
npm run aws:up        # start MiniStack
npm run aws:deploy    # steps 1-7; the API answers on http://localhost:3001/api
npm run aws:status    # stacks, RDS, ECR images, ECS service and tasks
npm run aws:destroy   # remove everything deploy created
```

Requires Docker and the AWS CLI v2. All calls go to `http://localhost:4566`
with dummy credentials; no real AWS account is involved.

**Design choices.**

- *ECS on the EC2 launch type with bridge networking*, not Fargate. Fargate
  requires `awsvpc`, which publishes no port on the host, so the API would be
  unreachable locally. Bridge mode maps container port 3000 to host port 3001.
- *Single task, fixed host port* means a new task cannot start while the old
  one holds the port, so the service uses `MinimumHealthyPercent: 0` /
  `MaximumPercent: 100`: stop, then start.
- *The connection string never appears in the task definition*. ECS resolves
  it from Secrets Manager at launch, using the execution role.
- *Photos live in S3, the database stores only their URL.* The bucket is
  public-read, so `photoUrl` works directly in an `<img>`; only the API's task
  role can write. Each upload gets a new key (`destinations/<id>/<uuid>.jpg`),
  so objects are immutable and cacheable, and the replaced photo is deleted
  after the record points at the new one.
- *Two S3 addresses.* The API reaches MiniStack by its internal address
  (`AWS_ENDPOINT_URL`, injected by ECS), while the URL saved in the database
  uses `S3_PUBLIC_URL` (`http://localhost:4566/<bucket>`), the address a
  browser on the host can open.
- *The bucket is disposable*, like the rest of the emulated environment:
  MiniStack keeps it in memory and `aws:destroy` empties and removes it.
  `aws:deploy` re-uploads the sample photos every time.

**Photo upload.** `PUT /api/destination-catalog/{id}/photo` and
`PUT /api/activity-catalog/{id}/photo` take `multipart/form-data` with a
`file` field (JPEG, PNG or WebP, up to 5 MB, checked by magic number) and
require a bearer token:

```bash
curl -X PUT http://localhost:3001/api/destination-catalog/<id>/photo \
  -H "Authorization: Bearer <token>" -F file=@london.jpg
```

Without `S3_BUCKET` (plain `start:dev`, CI) the API still boots and these two
routes answer 503.

**Emulator limitations, and how they are handled.** The templates are written
for real AWS; `deploy.sh` compensates where MiniStack diverges:

| Divergence | Handling |
| ---------- | -------- |
| `AWS::RDS::DBInstance` in a template is metadata only — no database starts | The instance is created through the RDS API, and its endpoint is passed to `app.yaml` as a parameter |
| The CloudFormation provisioner drops `Secrets` from `AWS::ECS::TaskDefinition`, and `Ref` on a secret returns its name instead of its ARN | After the stack is created, the same task definition is registered again through the ECS API with the secret ARN, and the service is redeployed |
| MiniStack is reached by IP from task containers, where bucket subdomains cannot resolve | The task sets `S3_FORCE_PATH_STYLE=true` (harmless on AWS) |

Neither workaround is needed on AWS; both are isolated in `deploy.sh` and
marked as such.


## 10. References

- Project scope document — ViajaJunto
- Requirements document — ViajaJunto
