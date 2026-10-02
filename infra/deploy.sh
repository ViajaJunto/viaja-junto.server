#!/usr/bin/env bash
# Deploys the ViajaJunto API to the AWS environment emulated by MiniStack:
#
#   RDS (PostgreSQL) -> ECR (image) -> migrations -> ECS service
#
# Usage:  npm run aws:up && npm run aws:deploy
#
# Requires Docker and the AWS CLI v2 (brew install awscli). No real AWS
# account is touched: every call goes to http://localhost:4566.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/infra/.out"

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
REGISTRY="${ENDPOINT#http://}"            # localhost:4566 — MiniStack's ECR registry
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_PAGER=""

DB_ID="viajajunto-db"
DB_NAME="viajajunto"
DB_USER="viajajunto"
DB_PASSWORD="${DB_PASSWORD:-viajajunto-local}"
IMAGE_TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo latest)}"
HOST_PORT="${HOST_PORT:-3001}"
NETWORK="${MINISTACK_NETWORK:-viajajunto_default}"

log()  { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '\n\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
awsl() { aws --endpoint-url "$ENDPOINT" "$@"; }

# Reads KEY from the environment, falling back to the project's .env file.
env_value() {
  local key="$1" value="${!1:-}"
  if [[ -z "$value" && -f "$ROOT/.env" ]]; then
    value=$(grep -E "^${key}=" "$ROOT/.env" | tail -1 | cut -d= -f2-)
    # Strip surrounding quotes with bash expansion: BSD sed (macOS) has no
    # \x escapes, so a sed-based version behaves differently there.
    value="${value%\"}"; value="${value#\"}"
    value="${value%\'}"; value="${value#\'}"
  fi
  printf '%s' "$value"
}

check_prereqs() {
  command -v aws >/dev/null    || die "AWS CLI not found. Install it with: brew install awscli"
  command -v docker >/dev/null || die "Docker not found."
  curl -fsS "$ENDPOINT/_ministack/health" >/dev/null \
    || die "MiniStack is not answering on $ENDPOINT. Start it with: npm run aws:up"
  mkdir -p "$OUT"
  ok "MiniStack up at $ENDPOINT"

  # src/shared/config/env.ts makes these mandatory: without them the API
  # exits at boot, and ECS keeps restarting a task that never answers.
  GOOGLE_CLIENT_ID=$(env_value GOOGLE_CLIENT_ID)
  GOOGLE_CLIENT_SECRET=$(env_value GOOGLE_CLIENT_SECRET)
  JWT_SECRET=$(env_value JWT_SECRET)
  local missing=()
  [[ -n "$GOOGLE_CLIENT_ID" ]]     || missing+=(GOOGLE_CLIENT_ID)
  [[ -n "$GOOGLE_CLIENT_SECRET" ]] || missing+=(GOOGLE_CLIENT_SECRET)
  [[ ${#JWT_SECRET} -ge 32 ]]      || missing+=("JWT_SECRET (min. 32 chars)")
  if (( ${#missing[@]} )); then
    die "Missing in .env: ${missing[*]}
  Generate a JWT secret with: openssl rand -base64 48"
  fi
  ok "application secrets found in .env"
}

# ── 1. RDS ───────────────────────────────────────────────────────────────
# Created through the RDS API, not CloudFormation: MiniStack provisions
# AWS::RDS::DBInstance from a template as metadata only, without starting a
# database. The RDS API path starts a real PostgreSQL container.
create_database() {
  log "RDS: PostgreSQL instance"
  if awsl rds describe-db-instances --db-instance-identifier "$DB_ID" >/dev/null 2>&1; then
    ok "instance $DB_ID already exists"
  else
    awsl rds create-db-instance \
      --db-instance-identifier "$DB_ID" \
      --engine postgres --engine-version 17 \
      --db-instance-class db.t3.micro --allocated-storage 20 \
      --master-username "$DB_USER" --master-user-password "$DB_PASSWORD" \
      --db-name "$DB_NAME" >/dev/null
    ok "instance $DB_ID requested"
  fi
  awsl rds wait db-instance-available --db-instance-identifier "$DB_ID"
  DB_HOST=$(awsl rds describe-db-instances --db-instance-identifier "$DB_ID" \
    --query 'DBInstances[0].Endpoint.Address' --output text)
  DB_PORT=$(awsl rds describe-db-instances --db-instance-identifier "$DB_ID" \
    --query 'DBInstances[0].Endpoint.Port' --output text)
  ok "available at $DB_HOST:$DB_PORT"
}

# ── 2. ECR ───────────────────────────────────────────────────────────────
deploy_registry() {
  log "CloudFormation: registry stack"
  awsl cloudformation deploy --stack-name viajajunto-registry \
    --template-file "$ROOT/infra/cloudformation/registry.yaml" \
    --no-fail-on-empty-changeset >/dev/null
  ok "stack viajajunto-registry"
}

push_image() {
  IMAGE="$REGISTRY/viajajunto-api:$IMAGE_TAG"
  if [[ "${SKIP_BUILD:-0}" != 1 ]]; then
    log "Docker: building the API and migration images"
    docker compose -f "$ROOT/docker-compose.yml" build api migrate
  fi
  log "ECR: pushing $IMAGE"
  docker tag viajajunto-api:local "$IMAGE"
  docker push -q "$IMAGE" >/dev/null
  ok "image available in ECR (tag $IMAGE_TAG)"
}

# ── 3. Migrations ────────────────────────────────────────────────────────
# One-off container on MiniStack's network, the same network the RDS and ECS
# containers join, so the RDS endpoint resolves exactly as it will for the API.
run_migrations() {
  log "Prisma: applying migrations to RDS"
  docker run --rm --network "$NETWORK" \
    -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public" \
    viajajunto-migrate:local npx prisma migrate deploy
  ok "migrations applied"
}

# ── 4. ECS ───────────────────────────────────────────────────────────────
deploy_app() {
  log "CloudFormation: application stack"
  awsl cloudformation deploy --stack-name viajajunto-app \
    --template-file "$ROOT/infra/cloudformation/app.yaml" \
    --capabilities CAPABILITY_NAMED_IAM --no-fail-on-empty-changeset \
    --parameter-overrides \
      Image="$IMAGE" DbHost="$DB_HOST" DbPort="$DB_PORT" \
      DbName="$DB_NAME" DbUser="$DB_USER" DbPassword="$DB_PASSWORD" \
      HostPort="$HOST_PORT" \
      GoogleClientId="$GOOGLE_CLIENT_ID" GoogleClientSecret="$GOOGLE_CLIENT_SECRET" \
      JwtSecret="$JWT_SECRET" >/dev/null
  ok "stack viajajunto-app"
}

# MiniStack workaround — not needed on real AWS.
#
# MiniStack's CloudFormation provisioner drops the `Secrets` entries of an
# AWS::ECS::TaskDefinition (it converts PortMappings, Environment and others
# to the ECS API casing, but not Secrets), and `Ref` on a Secrets Manager
# secret returns its name instead of its ARN. Together they make ECS start the
# API without DATABASE_URL. Registering the same task definition again through
# the ECS API, with the secret's ARN, restores what the template declares.
fix_task_secrets() {
  log "ECS: registering the task definition with its secret (MiniStack workaround)"
  local db_arn app_arn td_file="$OUT/taskdef.json"
  db_arn=$(awsl secretsmanager describe-secret --secret-id viajajunto/database-url \
    --query ARN --output text)
  app_arn=$(awsl secretsmanager describe-secret --secret-id viajajunto/app \
    --query ARN --output text)
  awsl ecs describe-task-definition --task-definition viajajunto-api \
    --query taskDefinition --output json > "$OUT/taskdef-cfn.json"
  DB_ARN="$db_arn" APP_ARN="$app_arn" node -e '
    const [src, dst] = process.argv.slice(1);
    const td = JSON.parse(require("fs").readFileSync(src, "utf8"));
    const keep = ["family", "containerDefinitions", "networkMode", "executionRoleArn",
                  "taskRoleArn", "requiresCompatibilities", "cpu", "memory", "volumes"];
    const out = {};
    for (const k of keep) if (td[k] !== undefined && td[k] !== "") out[k] = td[k];
    for (const c of out.containerDefinitions) {
      // Mirrors the Secrets block of app.yaml.
      const app = (key) => ({ name: key, valueFrom: `${process.env.APP_ARN}:${key}::` });
      c.secrets = [
        { name: "DATABASE_URL", valueFrom: process.env.DB_ARN },
        app("GOOGLE_CLIENT_ID"), app("GOOGLE_CLIENT_SECRET"), app("JWT_SECRET"),
      ];
      // CloudFormation parameters arrive as strings; the ECS API wants numbers.
      for (const p of c.portMappings ?? [])
        for (const k of ["containerPort", "hostPort"]) if (p[k] !== undefined) p[k] = Number(p[k]);
    }
    require("fs").writeFileSync(dst, JSON.stringify(out));
  ' "$OUT/taskdef-cfn.json" "$td_file"
  local revision
  revision=$(awsl ecs register-task-definition --cli-input-json "file://$td_file" \
    --query taskDefinition.taskDefinitionArn --output text)
  awsl ecs update-service --cluster viajajunto --service viajajunto-api \
    --task-definition "$revision" --force-new-deployment >/dev/null
  # Without this the health check below could be answered by the old task,
  # the one still missing DATABASE_URL, before ECS replaces it.
  awsl ecs wait services-stable --cluster viajajunto --services viajajunto-api
  ok "service stable on ${revision##*/}"
}

wait_for_api() {
  log "Waiting for the API on http://localhost:$HOST_PORT/api"
  for _ in $(seq 1 60); do
    if curl -fsS "http://localhost:$HOST_PORT/api" >/dev/null 2>&1; then
      ok "API answering"
      return
    fi
    sleep 2
  done
  die "API did not answer in 2 minutes. Inspect it with: npm run aws:status"
}

summary() {
  cat <<SUMMARY

  ViajaJunto deployed to the emulated AWS environment

    API        http://localhost:$HOST_PORT/api
    Docs       http://localhost:$HOST_PORT/docs
    Image      $IMAGE
    Database   RDS $DB_ID ($DB_HOST:$DB_PORT)

  Inspect:   npm run aws:status
  Tear down: npm run aws:destroy
SUMMARY
}

main() {
  check_prereqs
  create_database
  deploy_registry
  push_image
  run_migrations
  deploy_app
  fix_task_secrets
  wait_for_api
  summary
}

# Allows sourcing the file to run a single step in isolation.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
