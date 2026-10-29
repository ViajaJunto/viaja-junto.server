# ViajaJunto — API

[![CI](https://github.com/ViajaJunto/viaja-junto.server/actions/workflows/ci.yml/badge.svg)](https://github.com/ViajaJunto/viaja-junto.server/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=ViajaJunto_viaja-junto.server&metric=alert_status)](https://sonarcloud.io/project/overview?id=ViajaJunto_viaja-junto.server)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=ViajaJunto_viaja-junto.server&metric=coverage)](https://sonarcloud.io/project/overview?id=ViajaJunto_viaja-junto.server)

REST API of **ViajaJunto**, a collaborative trip-planning application: a group
organizes itineraries with several destinations, dates, activities and budgets
in one shared place, sees the plan on a map and reads what other travellers
thought of the places. Built for the Software Construction course.

## Documentation

The specification artifacts live in [`docs/`](docs/index.md) and are the source
of truth for what the system must do:

| Document | What it covers |
| -------- | -------------- |
| [`docs/requirements.md`](docs/requirements.md) | Functional and non-functional requirements, business rules |
| [`docs/architecture.md`](docs/architecture.md) | Architecture, data model, API conventions, CI, emulated AWS deployment |
| [`docs/reuse-plan.md`](docs/reuse-plan.md) | What is reused (Passport, Prisma, Zod/class-validator...) and what is built as a reusable library |
| [`docs/visual_id.md`](docs/visual_id.md) | Visual identity |

## Stack

- **NestJS 12** on **Node.js 22** and TypeScript, organised in feature modules
  with domain / application / infrastructure / presentation layers
  ([architecture §5.3](docs/architecture.md))
- **PostgreSQL** with **Prisma 7**
- **Passport.js**: sign-in with Google, API protected with JWT
- **class-validator** for payloads, **Zod** for environment variables
- **S3** for photos (MiniStack when emulated locally)
- **Vitest** for unit and end-to-end tests, **oxlint** and **Prettier**
- **OpenAPI** documentation rendered with Scalar

## Getting started

You need **Node.js 22** and **Docker** (for PostgreSQL).

```bash
git clone https://github.com/ViajaJunto/viaja-junto.server.git
cd viaja-junto.server

cp .env.example .env     # then edit it, see below
npm install              # also runs `prisma generate`
npm run db:up            # PostgreSQL in Docker
npx prisma migrate deploy
npm run db:seed          # optional: a sample destination
npm run start:dev        # http://localhost:3000/api
```

### Configuration

Every variable is validated at boot (`src/shared/config/env.ts`): if one is
missing or malformed the API refuses to start and lists the problems. The
commented [`.env.example`](.env.example) documents all of them. The ones you
must set:

| Variable | What to put |
| -------- | ----------- |
| `DATABASE_URL` | The default already points at the Docker database |
| `JWT_SECRET` | At least 32 characters: `openssl rand -base64 48` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | See below |

### Signing in with Google

Google is the only sign-in method; there are no passwords.

1. In the [Google Cloud Console](https://console.cloud.google.com/) open
   **APIs & Services → Credentials** and create an **OAuth client ID** of type
   *Web application*.
2. Register `http://localhost:3000/api/auth/google/callback` as an
   **Authorized redirect URI** (it must match `GOOGLE_CALLBACK_URL`).
3. Copy the client id and secret into `.env`.

The flow starts at `GET /api/auth/google` (open it in the browser, not with
`fetch`). After consent the API redirects to `AUTH_REDIRECT_URL` with the access
token in the URL fragment. See [architecture §5.6](docs/architecture.md) for the
full sequence.

#### Without Google credentials

To call protected routes while developing, mint a one-hour token signed with
your `JWT_SECRET`. It belongs to a real account: the script creates the user in
the database if the email is new, so `DATABASE_URL` must point at the API's
database (migrations applied).

```bash
npm run auth:dev-token                                    # dev@viajajunto.local
npm run auth:dev-token -- someone@example.com
npm run auth:dev-token -- someone@example.com --admin     # also makes them an administrator

curl -H "Authorization: Bearer $(npm run -s auth:dev-token)" http://localhost:3000/api/auth/me
```

> Development only: whoever holds `JWT_SECRET` can mint a token for any user.

#### Administrators

Only an administrator can change the destination and activity catalogs. The API
never grants the role; promote an account with SQL (or mint a token for one with
`--admin`, above):

```sql
UPDATE "user" SET role = 'ADMIN' WHERE email = 'someone@example.com';
```

### API reference

With the API running, the interactive reference is at
**<http://localhost:3000/docs>** (the path is `SWAGGER_PATH`). Every endpoint,
payload, status code and example is documented there. Protected routes expect
`Authorization: Bearer <token>`.

The OpenAPI document is generated and linted by `npm run openapi:generate` and
`npm run openapi:lint`, the same commands CI runs.

### Running everything with Docker Compose

```bash
docker compose up --build          # PostgreSQL, migrations and the API
docker compose --profile tools up  # plus Adminer on http://localhost:8080
```

The API answers on `http://localhost:3000/api` (`API_PORT`). Stop it with
`npm run db:down`; `npm run db:nuke` also deletes the database volume.

## Everyday commands

| Command | What it does |
| ------- | ------------ |
| `npm run start:dev` | API with reload on change |
| `npm run build` / `npm run start:prod` | Compile / run the compiled API |
| `npm run prisma:migrate` | Create and apply a migration from `prisma/schema.prisma` |
| `npm run db:reset` | Drop the database, re-apply the migrations and seed |
| `npm run prisma:studio` | Browse the data |
| `npm run lint` · `npm run format` | oxlint / Prettier |

## Tests

```bash
npm test                # unit tests
npm run test:cov        # with coverage (thresholds are enforced)
npm run test:e2e        # end-to-end tests against PostgreSQL
```

Unit tests never touch a database. The **end-to-end** tests boot the whole
application and use a real PostgreSQL, so point `DATABASE_URL` at a database
dedicated to them, with the migrations applied:

```bash
docker compose exec postgres createdb -U postgres viajajunto_test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/viajajunto_test?schema=public"
npx prisma migrate deploy
npm run test:e2e
```

The suites share that database and run in parallel, so each one creates its own
uniquely named rows and removes exactly those when it ends (`test/support`).
They never truncate tables, so they are safe next to data you care about, but
use a separate database anyway.

## Emulated AWS deployment

The deployment on AWS (RDS, ECR, ECS, S3, Secrets Manager) is reproduced locally
with [MiniStack](https://ministack.org), driven by CloudFormation:

```bash
npm run aws:up        # start MiniStack
npm run aws:deploy    # build, push and run everything; the API answers on http://localhost:3001/api
npm run aws:status    # stacks, RDS, ECR images, ECS service and tasks
npm run aws:destroy   # remove everything deploy created
```

[Architecture §9](docs/architecture.md) explains every step and the places where
MiniStack differs from AWS.

## Continuous integration

Every pull request runs (`.github/workflows/ci.yml`): lint and formatting, unit
tests with coverage, the end-to-end tests against PostgreSQL, OpenAPI generation
and linting (Spectral), a container image build with a Trivy vulnerability scan,
and a SonarCloud analysis with a quality gate. Images are published from
`master` and tags. [Architecture §8](docs/architecture.md) describes each job.

## Project layout

```
src/
├── main.ts, app.module.ts
├── shared/                 Config (Zod), database, storage (S3), HTTP helpers, reusable libraries
└── modules/<feature>/
    ├── domain/             Entities and repository contracts — no framework, no ORM
    ├── application/        Use cases (services) and DTOs
    ├── infrastructure/     Prisma repositories and other adapters
    ├── presentation/       Controllers
    └── <feature>.module.ts
prisma/                     Schema, migrations and the seed
test/                       End-to-end tests and their helpers
infra/                      CloudFormation templates and deploy scripts
docs/                       Specification
```

Dependencies point inwards only (`presentation → application → domain ←
infrastructure`); see [architecture §5.3](docs/architecture.md).

## Contributing

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md). In short: pick an issue, work on a branch,
keep the change small, add tests for business rules and edge cases, and open a
pull request. Code, comments, tests and documentation are written in English.

## Team

| Member | GitHub |
| ------ | ------ |
| Gustavo de Freitas Fidélis | [@gustavofid](https://github.com/gustavofid) |
| Bernardo Lykawka Medeiros da Silva | [@BernardoLykawka](https://github.com/BernardoLykawka) |
