import { Global, Logger, Module } from '@nestjs/common';
import { env } from '../config/env.js';
import { PhotoStorageService } from './application/photo-storage.service.js';
import { ObjectStorage } from './domain/object-storage.js';
import { S3ObjectStorage } from './infrastructure/s3-object-storage.js';
import { UnconfiguredObjectStorage } from './infrastructure/unconfigured-object-storage.js';

/**
 * Global so any feature module can inject ObjectStorage, the same way
 * PrismaModule exposes PrismaService.
 */
@Global()
@Module({
  providers: [
    PhotoStorageService,
    {
      provide: ObjectStorage,
      useFactory: (): ObjectStorage => {
        if (!env.S3_BUCKET) {
          new Logger('StorageModule').warn(
            'S3_BUCKET is not set: photo uploads will answer 503',
          );
          return new UnconfiguredObjectStorage();
        }

        return new S3ObjectStorage({
          bucket: env.S3_BUCKET,
          region: env.AWS_REGION,
          endpoint: env.S3_ENDPOINT,
          publicUrl: env.S3_PUBLIC_URL,
          forcePathStyle: env.S3_FORCE_PATH_STYLE,
        });
      },
    },
  ],
  exports: [ObjectStorage, PhotoStorageService],
})
export class StorageModule {}
