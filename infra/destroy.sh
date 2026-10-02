#!/usr/bin/env bash
# Removes everything deploy.sh created in MiniStack. MiniStack itself keeps
# running; stop it with `docker compose --profile aws down`.
set -euo pipefail

ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}"
export AWS_PAGER=""
awsl() { aws --endpoint-url "$ENDPOINT" "$@"; }

echo "▸ application stack (ECS service, task definition, secret, logs, IAM)"
awsl cloudformation delete-stack --stack-name viajajunto-app
awsl cloudformation wait stack-delete-complete --stack-name viajajunto-app

echo "▸ registry stack (ECR)"
# A repository that still holds images cannot be deleted, on AWS or here.
awsl ecr batch-delete-image --repository-name viajajunto-api \
  --image-ids "$(awsl ecr list-images --repository-name viajajunto-api \
    --query 'imageIds' --output json 2>/dev/null || echo '[]')" >/dev/null 2>&1 || true
awsl cloudformation delete-stack --stack-name viajajunto-registry
awsl cloudformation wait stack-delete-complete --stack-name viajajunto-registry

echo "▸ RDS instance"
awsl rds delete-db-instance --db-instance-identifier viajajunto-db \
  --skip-final-snapshot >/dev/null 2>&1 || true

echo "✓ done"
