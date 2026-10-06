// Seeds the destination catalog with sample data and uploads each sample
// photo to S3 (MiniStack in the emulated AWS environment).
//
//   npm run db:seed                      local database, photos only if S3 is set
//   npm run aws:deploy                   runs this against RDS + the S3 bucket
//
// Idempotent: records have fixed ids and photos fixed keys, so running it
// again updates in place instead of duplicating anything.
//
// Plain JavaScript on purpose: it runs inside the migrate image with `node`,
// without a TypeScript build step.
import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import pg from 'pg';

const ASSETS = new URL('./seed-assets/', import.meta.url);

/** To add a destination: append an entry and drop its photo in seed-assets/destinations/. */
const DESTINATIONS = [
  {
    id: '7c1e9a52-3b4d-4f60-9a1e-2d8b5c6f0a11',
    name: 'Londres',
    country: 'Reino Unido',
    category: 'CITY',
    description:
      'Capital do Reino Unido, do Big Ben, das cabines telefonicas vermelhas e de museus gratuitos.',
    latitude: 51.5007,
    longitude: -0.1246,
    photo: 'destinations/london.jpg',
  },
];

const CONTENT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function storageFromEnv() {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) return null;

  const endpoint = process.env.S3_ENDPOINT || undefined;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
  const region = process.env.AWS_REGION || 'us-east-1';
  const publicUrl = (
    process.env.S3_PUBLIC_URL ||
    (endpoint && forcePathStyle
      ? `${endpoint.replace(/\/+$/, '')}/${bucket}`
      : `https://${bucket}.s3.${region}.amazonaws.com`)
  ).replace(/\/+$/, '');

  return {
    client: new S3Client({ region, endpoint, forcePathStyle }),
    bucket,
    publicUrl,
  };
}

async function uploadPhoto(storage, destination) {
  const ext = destination.photo.split('.').pop().toLowerCase();
  // Fixed key: re-seeding overwrites the same object instead of piling up copies.
  const key = `destinations/${destination.id}/seed.${ext}`;

  await storage.client.send(
    new PutObjectCommand({
      Bucket: storage.bucket,
      Key: key,
      Body: await readFile(new URL(destination.photo, ASSETS)),
      ContentType: CONTENT_TYPES[ext] ?? 'application/octet-stream',
    }),
  );

  return `${storage.publicUrl}/${key}`;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const storage = storageFromEnv();
  if (!storage) {
    console.warn('S3_BUCKET not set: seeding destinations without photos');
  }

  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  try {
    for (const destination of DESTINATIONS) {
      const photoUrl = storage ? await uploadPhoto(storage, destination) : null;

      await db.query(
        `INSERT INTO destination_catalog
           (id, name, country, category, description, latitude, longitude, photo_url)
         VALUES ($1, $2, $3, $4::"DestinationCategory", $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           country = EXCLUDED.country,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           latitude = EXCLUDED.latitude,
           longitude = EXCLUDED.longitude,
           -- Without S3, keep whatever photo the record already had.
           photo_url = COALESCE(EXCLUDED.photo_url, destination_catalog.photo_url)`,
        [
          destination.id,
          destination.name,
          destination.country,
          destination.category,
          destination.description,
          destination.latitude,
          destination.longitude,
          photoUrl,
        ],
      );

      console.log(`  ✓ ${destination.name}${photoUrl ? `  ${photoUrl}` : ''}`);
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
