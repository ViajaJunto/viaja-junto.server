# ViajaJunto — API

[![CI](https://github.com/ViajaJunto/viaja-junto.server/actions/workflows/ci.yml/badge.svg)](https://github.com/ViajaJunto/viaja-junto.server/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=ViajaJunto_viaja-junto.server&metric=alert_status)](https://sonarcloud.io/project/overview?id=ViajaJunto_viaja-junto.server)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ViajaJunto_viaja-junto.server&metric=coverage)](https://sonarcloud.io/project/overview?id=ViajaJunto_viaja-junto.server)

REST API of **ViajaJunto**, a collaborative trip planner: a group organizes
itineraries with several destinations, dates, activities, a budget and shared
expenses in one place, sees the plan on a map and reads what other travellers
thought of the places. Built for the Software Construction course (PUCRS).

> The full specification (requirements, architecture, data model) lives in
> [`docs/`](docs/index.md).

## Contents

- [Stack](#stack)
- [Prerequisites](#prerequisites)
- [Quick start](#quick-start)
- [Environment variables (`.env`)](#environment-variables-env)
- [Google sign-in, development token and administrators](#google-sign-in-development-token-and-administrators)
- [API documentation (Swagger / Scalar)](#api-documentation-swagger--scalar)
- [Endpoint overview](#endpoint-overview)
- [Database](#database)
- [Running everything with Docker Compose](#running-everything-with-docker-compose)
- [Photos and storage (S3)](#photos-and-storage-s3)
- [Emulated AWS environment (MiniStack)](#emulated-aws-environment-ministack)
- [Tests](#tests)
- [Quality and continuous integration](#quality-and-continuous-integration)
- [Project layout](#project-layout)
- [npm scripts](#npm-scripts)
- [Troubleshooting](#troubleshooting)
- [Contributing and team](#contributing-and-team)

## Stack

| Layer | Technology |
| ----- | ---------- |
| Runtime and framework | Node.js 22, NestJS 12, TypeScript |
| Database | PostgreSQL 17 with Prisma 7 (`pg` driver adapter) |
| Authentication | Passport.js: Google sign-in (OAuth 2.0) and JWT on protected routes |
| Validation | `class-validator` for payloads, Zod for environment variables |
| Files | Amazon S3 (MiniStack locally) |
| External integrations | Google Places (activities around a destination), OpenStreetMap / Nominatim (place search and import), Wikipedia (fallback photos) |
| HTTP security | Helmet, CORS allow-list, per-IP rate limiting (`@nestjs/throttler`) |
| Documentation | OpenAPI generated from `@nestjs/swagger` decorators, rendered with Scalar |
| Tests and quality | Vitest (unit and e2e), oxlint, Prettier, Spectral, SonarCloud, Trivy |
| Infrastructure | Docker / Docker Compose, CloudFormation, MiniStack (AWS emulator) |

The code is organised in feature modules, each with
`domain / application / infrastructure / presentation` layers
([architecture §5.3](docs/architecture.md)).

## Prerequisites

| Tool | What for | Required? |
| ---- | -------- | --------- |
| **Node.js 22** and **npm 10** | Running the API, the tests and the scripts | Yes |
| **Docker Desktop** (with Compose) | Local PostgreSQL, the full stack and MiniStack | Yes, for the database |
| **AWS CLI v2** (`brew install awscli`) | Only for the emulated AWS environment (`npm run aws:*`) | No |
| Google Cloud account | OAuth credentials for Google sign-in; Places API key | Not for development (see the development token) |

> **npm version:** the Docker image uses npm 10. Newer versions (11+) rewrite
> `package-lock.json` in a way npm 10 rejects, and the image build fails with
> `Missing: typescript@... from lock file`. Install dependencies with
> **`npm ci`**, which never changes the lock file, and use
> `npm install <package>` only when you really add a package.

## Quick start

```bash
git clone https://github.com/ViajaJunto/viaja-junto.server.git
cd viaja-junto.server

cp .env.example .env        # then fill in JWT_SECRET and Google (see below)
npm ci                      # installs dependencies and runs `prisma generate`
npm run db:up               # starts PostgreSQL in Docker
npx prisma migrate deploy   # creates the tables
npm run db:seed             # optional: a sample destination (London)
npm run db:seed:demo        # optional: a large demo data set (see below)
npm run start:dev           # API on http://localhost:3000/api
```

Open **<http://localhost:3000/docs>** for the interactive API reference and
**<http://localhost:3000/api/health>** to check that the API and the database
are up.

The minimum `.env` to run the API locally:

```dotenv
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viajajunto?schema=public"
JWT_SECRET=<output of: openssl rand -base64 48>
GOOGLE_CLIENT_ID=placeholder.apps.googleusercontent.com   # or the real value
GOOGLE_CLIENT_SECRET=placeholder                          # or the real value
```

With placeholder Google values the API starts normally; only Google sign-in
does not work. To call protected routes without it, use the
[development token](#without-google-credentials-development-token).

## Environment variables (`.env`)

Every variable is validated at startup by
[`src/shared/config/env.ts`](src/shared/config/env.ts) (Zod). If a required
one is missing or malformed, the API **refuses to start** and lists the
problems. [`.env.example`](.env.example) documents all of them; copy it to
`.env`, which is git-ignored and must never be committed.

Legend: **Required** = the API does not start without it. **Optional** = it has
a default or only turns a feature off.

### Application

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `NODE_ENV` | Optional | `development` | `development`, `test` or `production` |
| `PORT` | Optional | `3000` | HTTP port of the API |
| `API_PREFIX` | Optional | `api` | Prefix of every route (`/api/trips`) |
| `SWAGGER_PATH` | Optional | `docs` | Path of the interactive documentation (`/docs`) |

### Database

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `DATABASE_URL` | **Required** | — | PostgreSQL connection string. Must start with `postgresql://`. The value in `.env.example` already points at the Docker database |

### Google sign-in (OAuth)

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `GOOGLE_CLIENT_ID` | **Required** | — | OAuth client ID (Google Cloud Console). Can be a placeholder to develop without sign-in |
| `GOOGLE_CLIENT_SECRET` | **Required** | — | OAuth client secret. **Never share or commit the real value** |
| `GOOGLE_CALLBACK_URL` | Optional | `http://localhost:3000/api/auth/google/callback` | Where Google returns after sign-in. Must be registered as an *Authorized redirect URI* in Google Cloud |
| `AUTH_REDIRECT_URL` | Optional | `http://localhost:5173/auth/callback` | Frontend page that receives the token after sign-in |

### Frontend (CORS)

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `CORS_ORIGINS` | Optional | `http://localhost:5173` | Browser origins allowed to call the API, comma-separated, no trailing slash (`http://localhost:5173,https://app.example.com`) |

### Tokens (JWT)

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `JWT_SECRET` | **Required** | — | Secret that signs the tokens, **at least 32 characters**. Generate it with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Optional | `3600` | Token lifetime, in seconds |
| `JWT_SECRET_PREVIOUS` | Optional | — | To rotate `JWT_SECRET` without signing everyone out: put the **old** secret here and the new one in `JWT_SECRET`. Old tokens stay valid until they expire; remove it after `JWT_EXPIRES_IN` seconds |

### Rate limiting

Counted per IP, in a fixed window. Over the limit the API answers `429` with a
`Retry-After` header.

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `THROTTLE_TTL_SECONDS` | Optional | `60` | Window length, in seconds |
| `THROTTLE_LIMIT` | Optional | `300` | Reads (GET) per window |
| `THROTTLE_WRITE_LIMIT` | Optional | `60` | Writes (POST, PATCH, PUT, DELETE) per window |
| `THROTTLE_STRICT_LIMIT` | Optional | `10` | Sensitive routes: sign-in, joining a trip with a code, photo uploads, writing reviews and the places routes |
| `TRUST_PROXY_HOPS` | Optional | `0` | How many reverse proxies sit in front of the API (e.g. `1` behind a load balancer), so the real IP is read from `X-Forwarded-For`. Leave `0` when clients connect directly |

### Places: OpenStreetMap (Nominatim)

Used by administrators to search for and import cities and places
(`/places/search`, `/places/import/*`).

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `PLACES_USER_AGENT` | Optional | — | Identification required by Nominatim's usage policy, with a contact: `ViajaJunto/1.0 (you@example.com)`. **Without it these routes answer `503`**. Also sent to Wikipedia when fetching fallback photos |
| `PLACES_BASE_URL` | Optional | `https://nominatim.openstreetmap.org` | Nominatim server |
| `PLACES_TIMEOUT_MS` | Optional | `5000` | Maximum wait for Nominatim, in ms |

### Places: Google Places

Used by `GET /destination-catalog/:id/activities`: the API answers from the
catalog first and, when it has too few activities, fetches the most popular
ones from Google Places and copies them into the catalog with their photo and
Maps link.

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `GOOGLE_PLACES_API_KEY` | Optional | — | **Places API (New)** key, with billing enabled on the Google Cloud project (every search and every photo is billed). **Without it the external search answers `503`**; what is already in the catalog is still returned |
| `GOOGLE_PLACES_TIMEOUT_MS` | Optional | `10000` | Maximum wait for Google, in ms |

### Photo storage (S3)

Without `S3_BUCKET` the API starts normally and only photo uploads answer
`503`. AWS credentials are **not** set here: the SDK reads them from its
default chain (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`, the ECS task role or
`~/.aws`).

| Variable | Required? | Default | What it is |
| -------- | --------- | ------- | ---------- |
| `AWS_REGION` | Optional | `us-east-1` | Bucket region |
| `S3_BUCKET` | Optional | — | Name of the photos bucket |
| `S3_ENDPOINT` | Optional | — | Custom endpoint (MiniStack, LocalStack, MinIO). Leave empty on real AWS |
| `S3_PUBLIC_URL` | Optional | — | URL the browser uses to open photos, bucket included. Needed when the API reaches S3 through a different, internal address |
| `S3_FORCE_PATH_STYLE` | Optional | `false` | `true` for emulators, which address the bucket as `host/bucket` instead of a subdomain |

To use the MiniStack bucket while running the API with `npm run start:dev`,
after `npm run aws:deploy`:

```dotenv
S3_BUCKET=viajajunto-photos-000000000000
S3_ENDPOINT=http://localhost:4566
S3_FORCE_PATH_STYLE=true
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
```

### Docker Compose

Read only by `docker-compose.yml`, not by the API.

| Variable | Default | What it is |
| -------- | ------- | ---------- |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `postgres` / `postgres` / `viajajunto` | Credentials and name of the container database. Must match `DATABASE_URL` |
| `POSTGRES_PORT` | `5432` | PostgreSQL port on your machine |
| `ADMINER_PORT` | `8080` | Adminer port (web database client) |
| `API_PORT` | `3000` | API port when it runs through Compose |
| `API_IMAGE` | `viajajunto-api:local` | API image; change it to run the one published on Docker Hub |
| `MINISTACK_PORT` | `4566` | MiniStack port |

### What works without the optional integrations

| Missing | What happens |
| ------- | ------------ |
| Real Google credentials | The API starts; Google sign-in fails. Use the development token |
| `S3_BUCKET` | Photo uploads answer `503`; everything else works |
| `GOOGLE_PLACES_API_KEY` | `GET /destination-catalog/:id/activities` answers from the catalog only, or `503` when it would need to search outside |
| `PLACES_USER_AGENT` | Place search and import (`/places/*`) answer `503` |

## Google sign-in, development token and administrators

### Setting up Google sign-in

Google is the **only** sign-in method; there are no passwords.

1. In the [Google Cloud Console](https://console.cloud.google.com/), open
   **APIs & Services → Credentials** and create an **OAuth client ID** of type
   *Web application*.
2. Under **Authorized redirect URIs**, register
   `http://localhost:3000/api/auth/google/callback` (it must equal
   `GOOGLE_CALLBACK_URL`).
3. Copy the client ID and client secret into `.env`.

The flow starts at `GET /api/auth/google`, which must be opened **in the
browser** (a full page load, not `fetch`/XHR — the redirect to Google is
blocked by CORS when called from a script, including the documentation's
"Send" button). After consent, the API redirects to
`AUTH_REDIRECT_URL#access_token=<jwt>&token_type=Bearer&expires_in=<s>`.
Subsequent calls send the `Authorization: Bearer <token>` header.
`POST /api/auth/logout` revokes every token of the user, on every device.

### Without Google credentials: development token

Mints a one-hour token signed with your `JWT_SECRET`. The user is created in
the database if the email is new, so `DATABASE_URL` must point at the API's
database, with the migrations applied.

```bash
npm run auth:dev-token                                    # dev@viajajunto.local
npm run auth:dev-token -- someone@example.com
npm run auth:dev-token -- someone@example.com --admin     # also makes them an administrator

curl -H "Authorization: Bearer $(npm run -s auth:dev-token)" http://localhost:3000/api/auth/me
```

In the interactive documentation, paste the token under **Authentication →
Bearer**.

> Development only: whoever holds `JWT_SECRET` can mint a token for any user.

### Administrators

Only an administrator (`role = ADMIN`) creates, edits, deletes or imports
entries of the destination and activity catalogs and uploads their photos. The
API never grants the role by itself; promote an account in the database (or
mint a token with `--admin`):

```sql
UPDATE "user" SET role = 'ADMIN' WHERE email = 'someone@example.com';
```

## API documentation (Swagger / Scalar)

With the API running, the interactive reference is at
**<http://localhost:3000/docs>** (the path comes from `SWAGGER_PATH`). It is
generated from the decorators in the code, so it describes exactly what the API
does: every endpoint, parameter, body, example and status code, error codes
included. Routes with a padlock require `Authorization: Bearer <token>`.

To export and validate the contract, as CI does:

```bash
npm run openapi:generate   # builds and writes openapi.json (with the /api/... paths)
npm run openapi:lint       # validates it with Spectral (.spectral.yaml)
```

Conventions that apply to the whole API:

| Topic | Rule |
| ----- | ---- |
| Pagination | Lists accept `page` (default 1) and `limit` (default 20, maximum 100) and answer `{ data, meta }` |
| Trip permissions | The creator (`OWNER`) manages the trip and its members; an `EDITOR` changes destinations, activities, budget and expenses; a `VIEWER` only reads. Anyone outside the trip gets `404` |
| Catalogs | Public reads; writes for administrators only (`403`) |
| Errors | Shape `{ statusCode, message, error }`; `422` lists every violated validation rule |
| Rate limiting | `429` with `Retry-After` when over the limit |

Status codes in use: `400` (invalid UUID in the path), `401` (missing or
invalid token), `403` (not allowed), `404` (does not exist or is not visible to
you), `409` (conflict: duplicate, in use, already a member), `413` (file too
large), `422` (validation), `429` (rate limit), `502`/`504` (external provider
failed or timed out), `503` (optional integration not configured, or database
down on `/health`).

## Endpoint overview

All routes carry the `/api` prefix. Full details at `/docs`.

| Module | Main routes | Who can |
| ------ | ----------- | ------- |
| Health | `GET /health` | Public |
| Auth | `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`, `POST /auth/logout` | Public (sign-in); signed-in user |
| Users | `GET /users`, `GET/PATCH/DELETE /users/:id`, `GET /users/me/visited-countries` | Signed-in user; only your own account can be changed |
| Trips | CRUD on `/trips` (`?status=` filter), `POST /trips/join`, `GET /trips/:id/invite-code`, `POST /trips/:id/invite-code/regenerate` | Members read; the creator edits, deletes and manages the invite code |
| Trip Members | CRUD on `/trip-members` (`?tripId=` filter) | Members read; the creator invites, changes permissions and removes |
| Trip Destinations | CRUD on `/trip-destinations` (`?tripId=` filter), `PUT /trips/:tripId/destinations/order` | Members read; creator and `EDITOR` change |
| Trip Activities | CRUD on `/trip-activities` (`?tripDestinationId=` filter) | Members read; creator and `EDITOR` change |
| Budgets | CRUD on `/budgets`, `GET /trips/:id/budget/summary` | Members read; creator and `EDITOR` change |
| Trip Expenses | CRUD on `/trip-expenses` (`?tripId=` filter), `GET /trips/:id/expenses/summary` | Members read; creator and `EDITOR` change |
| Destination Catalog | `GET /destination-catalog` (`q`, `country`, `category` filters), `/top`, `/:id`, `/:id/details`; POST/PATCH/DELETE; `PUT /:id/photo` | Public reads; writes for administrators only |
| Activity Catalog | `GET /activity-catalog` (`q`, `type`, `minRating`, `city`, `country`, `destinationId`, `sort`), `/:id`, `/:id/details`; POST/PATCH/DELETE; `PUT /:id/photo` | Public reads; writes for administrators only |
| Places | `GET /destination-catalog/:id/activities`, `GET /places/search`, `POST /places/import/destinations`, `POST /places/import/activities` | Signed-in user (activities); administrator (search and import) |
| Reviews | CRUD on `/reviews` (`?activityId=` filter) | Public reads; writing needs sign-in; only the author edits or deletes |
| Destination Reviews | CRUD on `/destination-reviews` (`?destinationId=` filter) | Public reads; only travellers with a completed trip to the destination can review |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/read-all`, `PATCH /notifications/:id/read` | Each user sees only their own |

## Database

The schema is in [`prisma/schema.prisma`](prisma/schema.prisma) and the
migrations in [`prisma/migrations/`](prisma/migrations). Main entities: `user`,
`trip`, `trip_member`, `trip_destination`, `trip_activity`, `budget`,
`trip_expense` (with `trip_expense_share`), `destination_catalog`,
`activity_catalog`, `review`, `destination_review` and `notification`. The
model is summarised in [architecture §5.2](docs/architecture.md).

| Task | Command |
| ---- | ------- |
| Apply the existing migrations | `npx prisma migrate deploy` |
| Create a migration after changing the schema | `npm run prisma:migrate` |
| Drop the database, re-apply everything and seed | `npm run db:reset` |
| Sample data (London destination, with a photo when S3 is set) | `npm run db:seed` |
| Browse the data | `npm run prisma:studio` or `npm run db:admin` (Adminer on <http://localhost:8080>) |
| PostgreSQL logs | `npm run db:logs` |

Before generating a migration, update your branch with `master`, so migrations
do not end up in an order that conflicts with someone else's.

## Running everything with Docker Compose

```bash
npm run stack:up                     # PostgreSQL, migrations and the API (with build)
docker compose --profile tools up -d # plus Adminer on http://localhost:8080
npm run stack:logs                   # API logs
npm run stack:down                   # stops everything (MiniStack and Adminer included)
npm run db:nuke                      # stops everything and deletes the database volume
```

The API answers on `http://localhost:3000/api` (`API_PORT`). Compose reads the
same `.env`; inside the Compose network the database is reached by the name
`postgres`, and that is already configured.

## Photos and storage (S3)

Catalog destinations and activities have a photo. An administrator uploads the
image to `PUT /api/destination-catalog/:id/photo` (or
`/activity-catalog/:id/photo`) as `multipart/form-data`, in the `file` field:

```bash
curl -X PUT http://localhost:3000/api/destination-catalog/<id>/photo \
  -H "Authorization: Bearer $(npm run -s auth:dev-token -- admin@example.com --admin)" \
  -F file=@photo.jpg
```

- Accepts JPEG, PNG and WebP up to 5 MB. The type is checked from the file
  content, not the extension (`422` for a fake file, `413` when too large).
- Each upload writes a new key (`destinations/<id>/<uuid>.jpg`), stores only
  the public URL in the database (`photoUrl`) and only then deletes the
  previous photo.
- The bucket is publicly readable: the browser downloads the image straight
  from S3, without going through the API.

## Emulated AWS environment (MiniStack)

Hosting on AWS (RDS, ECR, ECS, S3, Secrets Manager, IAM, CloudWatch Logs) is
reproduced on your machine with [MiniStack](https://ministack.org), driven by
CloudFormation. Nothing is billed and no AWS account is used.

Prerequisites: Docker Desktop **running**, AWS CLI v2 and a `.env` with
`JWT_SECRET` and the Google variables filled in (placeholders are fine).

```bash
npm run aws:up        # starts MiniStack on http://localhost:4566
npm run aws:deploy    # RDS, image in ECR, migrations, app stack (ECS, S3, secrets) and seed
npm run aws:status    # stacks, database, images, ECS service, stopped tasks and bucket
npm run aws:destroy   # removes everything deploy created (empties and deletes the bucket)
npm run aws:down      # removes the MiniStack container
```

The ECS API answers on `http://localhost:3000/api` (change it with
`HOST_PORT=3001 npm run aws:deploy`). MiniStack keeps its state in memory: if
the container restarts, run `npm run aws:deploy` again. Templates and scripts
live in [`infra/`](infra); [architecture §9](docs/architecture.md) explains
every step and where MiniStack differs from AWS.

## Tests

```bash
npm test             # unit tests
npm run test:cov     # with coverage (CI enforces the thresholds in vitest.config.ts)
npm run test:e2e     # end-to-end, against a real PostgreSQL
```

Unit tests never touch a database. The **e2e** tests boot the whole application
and use a real PostgreSQL; use a separate database, with the migrations
applied:

```bash
docker compose exec postgres createdb -U postgres viajajunto_test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public"
npx prisma migrate deploy
npm run test:e2e
```

The e2e suites run in parallel on the same database: each one creates rows with
unique names and removes exactly those when it ends (`test/support`). They
never truncate tables.

## Quality and continuous integration

Every pull request runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Job | What it checks |
| --- | -------------- |
| Lint | oxlint with no warnings and Prettier formatting |
| Tests | Migrations, unit tests with coverage and e2e tests on PostgreSQL |
| API contract | Generates `openapi.json` and validates it with Spectral |
| SonarCloud | Static analysis and quality gate |
| Image scan | Docker image build and Trivy scan (fails on HIGH/CRITICAL with a fix available) |
| Publish image | Publishes to Docker Hub from `master` and `v*` tags |

Before opening a PR, run locally:

```bash
npm run lint && npx prettier --check "src/**/*.ts" "test/**/*.ts"
npm run test:cov
npm run openapi:generate && npm run openapi:lint
```

## Project layout

```
src/
├── main.ts, app.module.ts
├── shared/
│   ├── config/        Environment variable validation (Zod)
│   ├── database/      PrismaService and shared queries (visible trips, ratings)
│   ├── events/        Trip events (they produce notifications)
│   ├── expenses/      Framework-free expense-splitting library
│   ├── http/          CORS, Helmet, rate limiting, error filters, OpenAPI, common DTOs
│   └── storage/       Photo uploads to S3
└── modules/<feature>/
    ├── domain/          Entities and repository contracts — no framework, no ORM
    ├── application/     Use cases (services) and DTOs
    ├── infrastructure/  Prisma repositories and other adapters
    ├── presentation/    Controllers (HTTP routes and OpenAPI documentation)
    └── <feature>.module.ts
prisma/      Schema, migrations, seed and seed images
scripts/     Development token and OpenAPI export
test/        End-to-end tests and helpers
infra/       CloudFormation templates and scripts of the emulated AWS environment
docs/        Requirements, architecture, reuse plan and visual identity
```

Dependencies point inwards only
(`presentation → application → domain ← infrastructure`); see
[architecture §5.3](docs/architecture.md).

## npm scripts

| Command | What it does |
| ------- | ------------ |
| `npm run start:dev` | API with reload on change |
| `npm run start:debug` | Same, with the Node inspector |
| `npm run build` / `npm run start:prod` | Builds / runs the compiled API |
| `npm test` / `npm run test:watch` / `npm run test:cov` | Unit tests (once / watch mode / with coverage) |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` / `npm run format` | oxlint / Prettier |
| `npm run db:up` / `npm run db:down` / `npm run db:nuke` | Starts PostgreSQL / stops the containers / stops them and deletes the volume |
| `npm run db:logs` / `npm run db:admin` | Database logs / Adminer |
| `npm run db:seed` / `npm run db:reset` | Sample data / recreates the database from scratch |
| `npm run db:seed:demo` | Large demo data set: 41 users, 64 destinations, 930 activities, 36 trips with members, itinerary, budgets, expenses and reviews. Repeatable; `-- --clean` removes only what it created. Development only |
| `npm run prisma:migrate` / `npm run prisma:generate` / `npm run prisma:studio` | New migration / regenerates the client / browses the data |
| `npm run auth:dev-token` | Development JWT |
| `npm run openapi:generate` / `npm run openapi:lint` | Exports / validates the OpenAPI contract |
| `npm run stack:up` / `npm run stack:logs` / `npm run stack:down` | Full stack on Docker Compose |
| `npm run aws:up` / `aws:deploy` / `aws:status` / `aws:destroy` / `aws:down` | Emulated AWS environment |

## Troubleshooting

| Symptom | Cause and fix |
| ------- | ------------- |
| The API does not start and lists `Invalid environment variables` | A required variable is missing or malformed in `.env` (e.g. `JWT_SECRET` shorter than 32 characters). The message names it |
| `Cannot connect to the Docker daemon` | Docker Desktop is not running. Open it and wait until it starts (`docker ps` must answer) |
| The image build fails with `npm ci can only install packages when your package.json and package-lock.json ... are in sync` | `package-lock.json` was rewritten by a newer npm. Restore it with `git checkout package-lock.json` and use `npm ci` |
| `port is already allocated` / port 3000 is taken | Another API is running: the Compose `api` (`docker compose stop api`) or an `npm run start:dev` in another terminal. Do not run the Compose API and the MiniStack API on the same port at the same time |
| `npm run aws:deploy` hangs on "ECS: registering the task definition" | The ECS task cannot start; almost always because port 3000 is taken. `npm run aws:status` shows why tasks stopped |
| "Load failed" / CORS error when trying `/auth/google` in the documentation | That route redirects to Google and only works when opened in the browser. Use the development token for the other routes |
| `401` on every route after changing `JWT_SECRET` | Old tokens are no longer valid. Mint a new one, or use `JWT_SECRET_PREVIOUS` during the rotation |
| `403` when creating or editing a catalog entry | The account is not an administrator. See [Administrators](#administrators) |
| `503` on photo upload or on the places routes | The optional integration is not configured (`S3_BUCKET`, `GOOGLE_PLACES_API_KEY` or `PLACES_USER_AGENT`) |
| `429 Too Many Requests` | Rate limit reached. Wait the `Retry-After` seconds, or raise the `THROTTLE_*` values in your development `.env` |

## Contributing and team

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). In short: pick an issue, work on a
branch, keep the change small, add tests for business rules and edge cases, and
open a pull request. Code, comments, tests and documentation are written in
English.

| Member | GitHub |
| ------ | ------ |
| Gustavo de Freitas Fidélis | [@gustavofid](https://github.com/gustavofid) |
| Bernardo Lykawka Medeiros da Silva | [@BernardoLykawka](https://github.com/BernardoLykawka) |
