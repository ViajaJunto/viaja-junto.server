import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DestinationReview } from '../domain/destination-review.entity.js';
import type { DestinationReviewRepository } from '../domain/destination-review.repository.js';
import { DestinationReviewsService } from './destination-reviews.service.js';

const base: DestinationReview = {
  id: '99999999-9999-4999-8999-999999999999',
  userId: '11111111-1111-4111-8111-111111111111',
  destinationId: '66666666-6666-4666-8666-666666666666',
  rating: 5,
  comment: null,
  createdAt: new Date('2026-08-02T19:45:00.000Z'),
};

type RepoMock = {
  [K in keyof DestinationReviewRepository]: ReturnType<typeof vi.fn>;
};

describe('DestinationReviewsService', () => {
  const author = { id: base.userId, email: 'ana@example.com' };
  const stranger = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'eve@example.com',
  };

  let repository: RepoMock;
  let service: DestinationReviewsService;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      destinationExists: vi.fn().mockResolvedValue(true),
      hasCompletedTripTo: vi.fn().mockResolvedValue(true),
    };
    service = new DestinationReviewsService(
      repository as unknown as DestinationReviewRepository,
    );
  });

  describe('findAll', () => {
    it('turns page and limit into a window and scopes to a destination', async () => {
      repository.findAll.mockResolvedValue({ items: [base], total: 1 });

      const result = await service.findAll({
        page: 3,
        limit: 15,
        destinationId: base.destinationId,
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        { skip: 30, take: 15 },
        { destinationId: base.destinationId },
      );
      expect(result.meta.total).toBe(1);
      expect(result.data[0]).toMatchObject({ id: base.id, comment: null });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the review does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne(base.id)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const dto = { destinationId: base.destinationId, rating: 4 };

    it('lets a traveller who completed a trip there review, as themselves', async () => {
      repository.create.mockResolvedValue(base);

      await service.create(dto, author);

      expect(repository.hasCompletedTripTo).toHaveBeenCalledWith(
        author.id,
        base.destinationId,
      );
      expect(repository.create).toHaveBeenCalledWith({
        ...dto,
        userId: author.id,
      });
    });

    it('forbids someone who never completed a trip to the destination', async () => {
      repository.hasCompletedTripTo.mockResolvedValue(false);

      await expect(service.create(dto, author)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('answers 404 for a destination that does not exist, before judging eligibility', async () => {
      repository.destinationExists.mockResolvedValue(false);

      await expect(service.create(dto, author)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.hasCompletedTripTo).not.toHaveBeenCalled();
    });
  });

  describe('update and remove', () => {
    beforeEach(() => repository.findById.mockResolvedValue(base));

    it('lets the author edit the rating and comment', async () => {
      repository.update.mockResolvedValue({ ...base, rating: 3 });

      await service.update(base.id, { rating: 3 }, author);

      expect(repository.update).toHaveBeenCalledWith(base.id, { rating: 3 });
    });

    it('forbids editing someone else’s review', async () => {
      await expect(
        service.update(base.id, { rating: 1 }, stranger),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.update).not.toHaveBeenCalled();
    });

    it('lets the author delete, and forbids anyone else', async () => {
      await service.remove(base.id, author);
      expect(repository.remove).toHaveBeenCalledWith(base.id);

      repository.remove.mockClear();
      await expect(service.remove(base.id, stranger)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repository.remove).not.toHaveBeenCalled();
    });

    it('answers 404 when the review is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove(base.id, author)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
