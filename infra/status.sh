#!/usr/bin/env bash
# Shows what is running in the emulated AWS environment.
set -uo pipefail
ENDPOINT="${AWS_ENDPOINT_URL:-http://localhost:4566}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}" AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-us-east-1}" AWS_PAGER=""
awsl() { aws --endpoint-url "$ENDPOINT" "$@"; }

echo "── CloudFormation";  awsl cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE CREATE_FAILED \
  --query 'StackSummaries[].[StackName,StackStatus]' --output text
echo "── RDS";   awsl rds describe-db-instances \
  --query 'DBInstances[].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address,Endpoint.Port]' --output text
echo "── ECR";   awsl ecr list-images --repository-name viajajunto-api \
  --query 'imageIds[?imageTag].imageTag' --output text 2>/dev/null
echo "── ECS service"; awsl ecs describe-services --cluster viajajunto --services viajajunto-api \
  --query 'services[0].[status,desiredCount,runningCount,taskDefinition]' --output text 2>/dev/null
echo "── ECS tasks stopped recently"
for t in $(awsl ecs list-tasks --cluster viajajunto --desired-status STOPPED --query 'taskArns[]' --output text 2>/dev/null); do
  awsl ecs describe-tasks --cluster viajajunto --tasks "$t" \
    --query 'tasks[0].[taskDefinitionArn,stoppedReason]' --output text
done | tail -5
echo "── containers";  docker ps --filter name=ministack --format '{{.Names}}\t{{.Status}}\t{{.Ports}}'
