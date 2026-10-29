import { randomUUID } from 'node:crypto';
import { expectPage } from '../support/expect-page.js';
import { startApp, type TestApp } from '../support/test-app.js';
import type { Account } from '../support/test-data.js';

describe('Trip members (e2e)', () => {
  let t: TestApp;
  let owner: Account;
  let editor: Account;
  let viewer: Account;
  let newcomer: Account;
  let outsider: Account;
  let tripId: string;

  beforeAll(async () => {
    t = await startApp();
    [owner, editor, viewer, newcomer, outsider] = await Promise.all(
      Array.from({ length: 5 }, () => t.data.user()),
    );
    tripId = (await t.data.trip(owner)).id;
    await t.data.member(tripId, editor, 'EDITOR');
    await t.data.member(tripId, viewer, 'VIEWER');
  });

  afterAll(() => t.close());

  describe('inviting', () => {
    it('lets the creator add a member with a permission', async () => {
      const { body } = await t
        .as(owner)
        .post('/trip-members', {
          tripId,
          userId: newcomer.id,
          permission: 'VIEWER',
        })
        .expect(201);

      expect(body).toMatchObject({
        tripId,
        userId: newcomer.id,
        permission: 'VIEWER',
      });
      expect(body).toHaveProperty('joinedAt');
    });

    it('answers 409 for a user who is already a member, and for the creator', async () => {
      await t
        .as(owner)
        .post('/trip-members', {
          tripId,
          userId: newcomer.id,
          permission: 'EDITOR',
        })
        .expect(409);
      await t
        .as(owner)
        .post('/trip-members', {
          tripId,
          userId: owner.id,
          permission: 'EDITOR',
        })
        .expect(409);
    });

    it('answers 404 for a user that does not exist', async () => {
      await t
        .as(owner)
        .post('/trip-members', {
          tripId,
          userId: randomUUID(),
          permission: 'VIEWER',
        })
        .expect(404);
    });

    it('forbids editors and viewers, and hides the trip from outsiders', async () => {
      const body = { tripId, userId: outsider.id, permission: 'VIEWER' };

      await t.as(editor).post('/trip-members', body).expect(403);
      await t.as(viewer).post('/trip-members', body).expect(403);
      await t.as(outsider).post('/trip-members', body).expect(404);
    });

    it.each([
      ['an unknown permission', { permission: 'ADMIN' }],
      ['a non-UUID user', { userId: 'ana' }],
      ['no permission', { permission: undefined }],
    ])('rejects %s with 422', async (_name, overrides) => {
      await t
        .as(owner)
        .post('/trip-members', {
          tripId,
          userId: outsider.id,
          permission: 'VIEWER',
          ...overrides,
        })
        .expect(422);
    });
  });

  describe('listing and reading', () => {
    it('lists the members of a trip, newest first, paginated', async () => {
      const all = await t
        .as(owner)
        .get(`/trip-members?tripId=${tripId}`)
        .expect(200);
      expectPage(all.body, { page: 1, limit: 20, total: 3 });
      const joined = all.body.data.map((m: { joinedAt: string }) => m.joinedAt);
      expect(joined).toEqual([...joined].sort().reverse());

      const paged = await t
        .as(owner)
        .get(`/trip-members?tripId=${tripId}&limit=2&page=2`)
        .expect(200);
      expectPage(paged.body, { page: 2, limit: 2, total: 3 });
      expect(paged.body.data).toHaveLength(1);
    });

    it('lets a viewer read the list, but not an outsider', async () => {
      await t.as(viewer).get(`/trip-members?tripId=${tripId}`).expect(200);
      await t.as(outsider).get(`/trip-members?tripId=${tripId}`).expect(404);
    });

    it('reads one member', async () => {
      const row = await t.prisma.tripMember.findFirstOrThrow({
        where: { tripId, userId: viewer.id },
      });

      await t.as(editor).get(`/trip-members/${row.id}`).expect(200);
      await t.as(outsider).get(`/trip-members/${row.id}`).expect(404);
      await t.as(owner).get(`/trip-members/${randomUUID()}`).expect(404);
    });
  });

  describe('changing permissions and removing', () => {
    it('lets the creator change a permission, and nobody else', async () => {
      const row = await t.prisma.tripMember.findFirstOrThrow({
        where: { tripId, userId: viewer.id },
      });

      await t
        .as(editor)
        .patch(`/trip-members/${row.id}`, { permission: 'EDITOR' })
        .expect(403);
      const { body } = await t
        .as(owner)
        .patch(`/trip-members/${row.id}`, { permission: 'EDITOR' })
        .expect(200);

      expect(body.permission).toBe('EDITOR');
    });

    it('does not allow changing who or where, only the permission', async () => {
      const row = await t.prisma.tripMember.findFirstOrThrow({
        where: { tripId, userId: editor.id },
      });

      await t
        .as(owner)
        .patch(`/trip-members/${row.id}`, { userId: outsider.id })
        .expect(422);
      await t
        .as(owner)
        .patch(`/trip-members/${row.id}`, { tripId: randomUUID() })
        .expect(422);
    });

    it('lets the creator remove a member, who then loses access', async () => {
      const leaving = await t.data.user();
      const row = await t.data.member(tripId, leaving, 'VIEWER');
      await t.as(leaving).get(`/trips/${tripId}`).expect(200);

      await t.as(editor).delete(`/trip-members/${row.id}`).expect(403);
      await t.as(owner).delete(`/trip-members/${row.id}`).expect(204);

      await t.as(leaving).get(`/trips/${tripId}`).expect(404);
    });
  });
});
