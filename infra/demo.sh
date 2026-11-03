#!/usr/bin/env bash
# Live demo of the photos bucket (S3) running on MiniStack, in six steps.
#
#   npm run aws:up && npm run aws:deploy     # before the presentation
#   npm run aws:demo                         # during it
#
# Every step prints what to say, the command it is about to run, runs it and
# waits for Enter. DEMO_AUTO=1 runs straight through (rehearsal / CI),
# DEMO_FROM=<n> starts at step n.
#
# Nothing here touches a real AWS account: every call goes to MiniStack.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Reuses the deploy script's settings and helpers (endpoint, credentials,
# DB name/user/password, network, awsl, env_value) without running it.
# shellcheck source=deploy.sh
source "$ROOT/infra/deploy.sh"

DEMO_AUTO="${DEMO_AUTO:-0}"
DEMO_FROM="${DEMO_FROM:-1}"
DEMO_PHOTO="${DEMO_PHOTO:-$ROOT/prisma/seed-assets/destinations/london.jpg}"
ADMIN_ID="d0d0d0d0-0000-4000-8000-000000000001"
ADMIN_EMAIL="demo-admin@viajajunto.local"
SCRATCH_BUCKET="viajajunto-demo-privado"
STEP=0

# ── presentation helpers ─────────────────────────────────────────────────
bold=$'\033[1m'; dim=$'\033[2m'; green=$'\033[32m'; cyan=$'\033[36m'
yellow=$'\033[33m'; red=$'\033[31m'; reset=$'\033[0m'

pause() {
  if [[ "$DEMO_AUTO" == 1 ]]; then return; fi
  printf '\n%s  [Enter] para continuar%s' "$dim" "$reset"
  read -r _
}

# step "Title" "What to say while it runs"
step() {
  STEP=$((STEP + 1))
  SKIP=0
  if (( STEP < DEMO_FROM )); then SKIP=1; return; fi
  [[ "$DEMO_AUTO" == 1 ]] || clear
  printf '%s%s── %d. %s %s\n' "$bold" "$green" "$STEP" "$1" "$reset"
  printf '%s%s%s\n' "$dim" "$2" "$reset"
}

# Shows the command (as the audience would type it) and runs it.
run() {
  [[ "$SKIP" == 1 ]] && return 0
  local shown="$*"
  # awsl is our wrapper adding --endpoint-url; the audience sees plain aws.
  printf '\n%s$ %s%s\n' "$cyan" "${shown//awsl /aws }" "$reset"
  eval "$@"
}

# Same, for AWS CLI calls: shows `aws ...`, runs it against MiniStack.
aws_run() {
  [[ "$SKIP" == 1 ]] && return 0
  printf '\n%s$ aws %s%s\n' "$cyan" "$*" "$reset"
  eval awsl "$@"
}

note() { [[ "$SKIP" == 1 ]] || printf '\n%s→ %s%s\n' "$yellow" "$*" "$reset"; }
fail() { printf '\n%s✗ %s%s\n' "$red" "$*" "$reset" >&2; exit 1; }

stack_output() {
  awsl cloudformation describe-stacks --stack-name viajajunto-app \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}

# Prints a short-lived JWT for the demo admin, signed with JWT_SECRET from .env
# (the same secret the deployed API received through Secrets Manager).
admin_token() {
  JWT_SECRET="$(env_value JWT_SECRET)" SUB="$ADMIN_ID" EMAIL="$ADMIN_EMAIL" node -e '
    const { createHmac } = require("node:crypto");
    const now = Math.floor(Date.now() / 1000);
    const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
    const head = b64({ alg: "HS256", typ: "JWT" });
    const body = b64({ sub: process.env.SUB, email: process.env.EMAIL, iat: now, exp: now + 3600 });
    const sig = createHmac("sha256", process.env.JWT_SECRET).update(head + "." + body).digest("base64url");
    console.log(head + "." + body + "." + sig);
  '
}

# Catalog writes are admin-only, and Google sign-in is not configured
# locally, so the demo creates (or promotes) its own admin in RDS.
ensure_admin() {
  local host port
  host=$(awsl rds describe-db-instances --db-instance-identifier "$DB_ID" \
    --query 'DBInstances[0].Endpoint.Address' --output text)
  port=$(awsl rds describe-db-instances --db-instance-identifier "$DB_ID" \
    --query 'DBInstances[0].Endpoint.Port' --output text)
  docker run --rm --network "$NETWORK" \
    -e DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$host:$port/$DB_NAME" \
    -e ADMIN_ID="$ADMIN_ID" -e ADMIN_EMAIL="$ADMIN_EMAIL" \
    viajajunto-migrate:local node -e '
      const pg = require("pg");
      const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
      db.connect()
        .then(() => db.query(
          `INSERT INTO "user" (id, name, email, role)
           VALUES ($1, $2, $3, $4::"UserRole")
           ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
           RETURNING id`,
          [process.env.ADMIN_ID, "Demo Admin", process.env.ADMIN_EMAIL, "ADMIN"]))
        .then((r) => console.log(r.rows[0].id))
        .finally(() => db.end());
    '
}

# ── preflight ────────────────────────────────────────────────────────────
command -v aws >/dev/null || fail "AWS CLI não encontrado (brew install awscli)"
command -v node >/dev/null || fail "Node.js não encontrado"
curl -fsS "$ENDPOINT/_ministack/health" >/dev/null \
  || fail "MiniStack fora do ar. Rode: npm run aws:up && npm run aws:deploy"
awsl cloudformation describe-stacks --stack-name viajajunto-app >/dev/null 2>&1 \
  || fail "Stack viajajunto-app não existe. Rode antes: npm run aws:deploy"
[[ -f "$DEMO_PHOTO" ]] || fail "Foto da demo não encontrada: $DEMO_PHOTO"

API_URL="${API_URL:-$(stack_output ApiUrl)}"
BUCKET="$(stack_output PhotosBucketName)"
PUBLIC_URL="$(stack_output PhotosPublicUrl)"
curl -fsS "$API_URL" >/dev/null 2>&1 \
  || fail "A API não responde em $API_URL. Veja: npm run aws:status"

# ── 1. the bucket ────────────────────────────────────────────────────────
step "O bucket de fotos" \
"Este é o S3 do ViajaJunto, rodando no MiniStack (localhost:4566) com o AWS CLI oficial.
Um bucket, uma política que libera só leitura (s3:GetObject) para qualquer um,
e as chaves seguem destinations/<id do destino>/<arquivo>."
aws_run s3 ls
run "awsl s3api get-bucket-policy --bucket $BUCKET --query Policy --output text | python3 -m json.tool"
aws_run s3 ls "s3://$BUCKET" --recursive --human-readable
pause

# ── 2. public read ───────────────────────────────────────────────────────
step "Qualquer navegador lê a foto direto do S3" \
"A URL salva no banco aponta para o bucket. A API não serve a imagem: o navegador baixa do S3."
DEST_JSON="$(curl -fsS "$API_URL/destination-catalog?limit=100")"
DEST_ID="$(printf '%s' "$DEST_JSON" | node -e '
  let s = ""; process.stdin.on("data", (c) => (s += c)).on("end", () => {
    const d = JSON.parse(s).data;
    const pick = d.find((x) => x.name === "Londres") || d[0];
    console.log(pick ? pick.id : "");
  });')"
[[ -n "$DEST_ID" ]] || fail "Nenhum destino no catálogo. Rode o deploy sem SKIP_SEED=1."
run "curl -s $API_URL/destination-catalog/$DEST_ID | python3 -m json.tool"
OLD_URL="$(curl -fsS "$API_URL/destination-catalog/$DEST_ID" | node -pe 'JSON.parse(require("fs").readFileSync(0)).photoUrl || ""')"
if [[ -n "$OLD_URL" ]]; then
  run "curl -sI '$OLD_URL' | grep -iE '^(HTTP|content-type|content-length)'"
  note "Abra no navegador: $OLD_URL"
  if [[ "$DEMO_AUTO" != 1 ]] && command -v open >/dev/null; then open "$OLD_URL"; fi
else
  note "Este destino ainda não tem foto — o próximo passo envia uma."
fi
pause

# ── 3. upload through the API ────────────────────────────────────────────
step "Enviando uma foto nova pela API" \
"Só administradores alteram o catálogo. Criamos um admin de demonstração no RDS
e assinamos um token com o JWT_SECRET do .env (o login do Google não está configurado localmente)."
[[ "$SKIP" == 1 ]] || ensure_admin >/dev/null
TOKEN="$(admin_token)"
run "curl -s -X PUT $API_URL/destination-catalog/$DEST_ID/photo \\
  -H \"Authorization: Bearer \$TOKEN\" \\
  -F 'file=@$DEMO_PHOTO' | python3 -m json.tool"
NEW_URL="$(curl -fsS "$API_URL/destination-catalog/$DEST_ID" | node -pe 'JSON.parse(require("fs").readFileSync(0)).photoUrl || ""')"
note "Nova URL: $NEW_URL"
pause

# ── 4. what changed in the bucket ────────────────────────────────────────
step "O que mudou no bucket" \
"Cada upload ganha uma chave nova (UUID): a foto é imutável e pode ficar em cache para sempre.
A foto anterior foi apagada só depois que o banco passou a apontar para a nova."
aws_run s3 ls "s3://$BUCKET/destinations/$DEST_ID/"
run "curl -sI '$NEW_URL' | grep -iE '^(HTTP|content-type|cache-control)'"
if [[ -n "$OLD_URL" && "$OLD_URL" != "$NEW_URL" ]]; then
  run "curl -s -o /dev/null -w 'foto antiga: HTTP %{http_code}\n' '$OLD_URL'"
fi
pause

# ── 5. validation and security ───────────────────────────────────────────
step "A API protege o bucket" \
"Ninguém grava no bucket diretamente: só a API, que exige token de admin
e confere o tipo real do arquivo pelos bytes, não pela extensão."
run "curl -s -o /dev/null -w 'sem token: HTTP %{http_code}\n' -X PUT $API_URL/destination-catalog/$DEST_ID/photo -F 'file=@$DEMO_PHOTO'"
FAKE="${TMPDIR:-/tmp}/viajajunto-demo-$$.jpg"
printf 'isto nao e uma imagem, so tem extensao .jpg\n' > "$FAKE"
run "curl -s -X PUT $API_URL/destination-catalog/$DEST_ID/photo -H \"Authorization: Bearer \$TOKEN\" -F 'file=@$FAKE;type=image/jpeg'; echo"
rm -f "$FAKE"
pause

# ── 6. private objects and pre-signed URLs ───────────────────────────────
step "Bucket privado e URL pré-assinada" \
"Para arquivos que não podem ser públicos, o bucket fica privado e geramos uma URL
assinada que expira. Bucket temporário, removido no fim do passo."
SAMPLE="${TMPDIR:-/tmp}/viajajunto-roteiro-$$.txt"
printf 'Roteiro privado da viagem\n' > "$SAMPLE"
aws_run s3 mb "s3://$SCRATCH_BUCKET"
aws_run s3 cp --no-progress "$SAMPLE" "s3://$SCRATCH_BUCKET/roteiro.txt"
run "curl -s -o /dev/null -w 'sem assinatura: HTTP %{http_code}\n' $ENDPOINT/$SCRATCH_BUCKET/roteiro.txt"
note "Na AWS isto daria 403 AccessDenied. O MiniStack não aplica o bloqueio a leituras anônimas — limitação do emulador."
run "PRESIGNED=\$(awsl s3 presign s3://$SCRATCH_BUCKET/roteiro.txt --expires-in 300); echo \"\$PRESIGNED\""
run 'curl -s "$PRESIGNED"'
aws_run s3 rb "s3://$SCRATCH_BUCKET" --force
rm -f "$SAMPLE"
pause

printf '\n%sFim da demo. Para limpar tudo: npm run aws:destroy%s\n' "$bold" "$reset"
