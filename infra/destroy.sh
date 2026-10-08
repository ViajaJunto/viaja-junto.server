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

# MiniStack keeps its state in memory: if it is not running, the stacks,
# bucket and RDS instance are already gone and there is nothing to remove.
if ! curl -fsS "$ENDPOINT/_ministack/health" >/dev/null 2>&1; then
  echo "MiniStack is not running on $ENDPOINT: nothing to destroy."
  echo "Leftover containers it started (RDS, ECS tasks), if any:"
  docker ps -a --filter "label=ministack" --format '  {{.Names}}\t{{.Status}}' 2>/dev/null || true
  exit 0
fi

echo "▸ photos bucket (emptied first: S3 refuses to delete a bucket with objects)"
for bucket in $(awsl s3api list-buckets \
    --query "Buckets[?starts_with(Name, 'viajajunto-photos-')].Name" --output text 2>/dev/null); do
  awsl s3 rm "s3://$bucket" --recursive >/dev/null || true
done

echo "▸ application stack (ECS service, task definition, secrets, logs, IAM, S3)"
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
