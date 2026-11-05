// Creates the photos bucket in MiniStack (the emulated S3) and makes its
// objects readable by everyone, so the photo links the API returns open in a
// browser. Idempotent. Used by the one-command demo (docker-compose.demo.yml).
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const Bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;
if (!Bucket || !endpoint) {
  console.error('S3_BUCKET and S3_ENDPOINT are required');
  process.exit(1);
}

const s3 = new S3Client({
  region: process.env.AWS_REGION ?? 'us-east-1',
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
  },
});

try {
  await s3.send(new HeadBucketCommand({ Bucket }));
  console.log(`Bucket ${Bucket} already exists`);
} catch {
  await s3.send(new CreateBucketCommand({ Bucket }));
  console.log(`Bucket ${Bucket} created`);
}

await s3.send(
  new PutBucketPolicyCommand({
    Bucket,
    Policy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${Bucket}/*` }],
    }),
  }),
);
console.log('Photos are publicly readable');
