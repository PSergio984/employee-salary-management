import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Salary Components Shared Catalog - Neon Real Database E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUsername = 'admin_catalog_tester';
  const testAdminPassword = 'CatalogPassword2026!';
  let authCookie: string;

  beforeAll(async () => {
    const testDbUrl =
      process.env.TEST_DATABASE_URL ||
      (process.env.NODE_ENV === 'test' ? process.env.DATABASE_URL : undefined);
    const testDirectUrl =
      process.env.TEST_DIRECT_URL ||
      (process.env.NODE_ENV === 'test' ? process.env.DIRECT_URL : undefined);

    if (!testDbUrl || !testDirectUrl) {
      throw new Error(
        'TEST_DATABASE_URL and TEST_DIRECT_URL must be provided via environment.',
      );
    }

    process.env.DATABASE_URL = testDbUrl;
    process.env.DIRECT_URL = testDirectUrl;
    process.env.CLIENT_ORIGIN = testClientOrigin;
    process.env.COOKIE_SECURE = 'false';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              DATABASE_URL: testDbUrl,
              DIRECT_URL: testDirectUrl,
              CLIENT_ORIGIN: testClientOrigin,
              COOKIE_SECURE: 'false',
              PORT: 5052,
            }),
          ],
        }),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);

    // Clean test slate
    await prisma.authSession.deleteMany({
      where: { adminUser: { username: testAdminUsername } },
    });
    await prisma.adminUser.deleteMany({
      where: { username: testAdminUsername },
    });

    const passwordHash = await bcrypt.hash(testAdminPassword, 10);
    await prisma.adminUser.create({
      data: {
        username: testAdminUsername,
        passwordHash,
      },
    });

    // Obtain authenticated session cookie
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Salary-Client', 'web')
      .set('Origin', testClientOrigin)
      .send({ username: testAdminUsername, password: testAdminPassword });

    expect(loginRes.status).toBe(200);
    const cookieHeader = loginRes.headers['set-cookie'];
    expect(cookieHeader).toBeDefined();
    authCookie = Array.isArray(cookieHeader) ? cookieHeader[0] : (cookieHeader as string);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Authentication and CSRF Guards', () => {
    it('rejects GET /api/salary-components without session cookie with 401', async () => {
      const res = await request(app.getHttpServer()).get('/api/salary-components');
      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('rejects POST /api/salary-components without CSRF header with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .send({ name: 'CSRF Fail Component' });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('CSRF_REJECTED');
    });

    it('rejects POST /api/salary-components from untrusted origin with 403', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', 'http://malicious-origin.com')
        .send({ name: 'Untrusted Origin Component' });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('CSRF_REJECTED');
    });
  });

  describe('Input Validation on Component Creation', () => {
    it('rejects blank name with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects whitespace-only name with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: '     ' });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-string name payload with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Dynamic Creation and Active Uniqueness', () => {
    it('creates an arbitrary dynamic novel component successfully', async () => {
      const novelName = `Night Shift Differential ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: novelName });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(novelName);
      expect(res.body.isActive).toBe(true);
      expect(res.body.version).toBe(1);
      expect(res.body.createdAt).toBeDefined();
    });

    it('enforces trim/case-insensitive active uniqueness and returns 409 Conflict', async () => {
      const baseName = `Hazard Pay ${Date.now()}`;
      // 1. Initial creation
      const res1 = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: baseName });
      expect(res1.status).toBe(201);

      // 2. Exact duplicate
      const res2 = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: baseName });
      expect(res2.status).toBe(409);
      expect(res2.body.error?.code).toBe('CONFLICT');
      expect(res2.body.error?.message).toContain('already exists');

      // 3. Different casing
      const res3 = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: baseName.toUpperCase() });
      expect(res3.status).toBe(409);
      expect(res3.body.error?.code).toBe('CONFLICT');

      // 4. Leading/trailing whitespace
      const res4 = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: `   ${baseName.toLowerCase()}   ` });
      expect(res4.status).toBe(409);
      expect(res4.body.error?.code).toBe('CONFLICT');
    });

    it('handles simultaneous concurrent duplicate creates correctly with exactly one success and one 409', async () => {
      const concurrentName = `Concurrent Allowance ${Date.now()}`;

      // Dispatch 2 requests simultaneously
      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/salary-components')
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ name: concurrentName }),
        request(app.getHttpServer())
          .post('/api/salary-components')
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ name: concurrentName }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Verify exactly one row in PostgreSQL database
      const rows = await prisma.salaryComponent.findMany({
        where: { name: concurrentName },
      });
      expect(rows).toHaveLength(1);
    });
  });

  describe('Search and Deterministic 20-Row Pagination', () => {
    it('paginates deterministically with default 20-row limit', async () => {
      // Create 22 unique components with a distinct prefix
      const prefix = `BatchPagination_${Date.now()}`;
      for (let i = 1; i <= 22; i++) {
        const numStr = i.toString().padStart(2, '0');
        await request(app.getHttpServer())
          .post('/api/salary-components')
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ name: `${prefix} Item ${numStr}` });
      }

      // Page 1
      const resPage1 = await request(app.getHttpServer())
        .get(`/api/salary-components?search=${prefix}&page=1&pageSize=20`)
        .set('Cookie', authCookie);

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.total).toBe(22);
      expect(resPage1.body.page).toBe(1);
      expect(resPage1.body.pageSize).toBe(20);
      expect(resPage1.body.items).toHaveLength(20);
      expect(resPage1.body.items[0].name).toBe(`${prefix} Item 01`);
      expect(resPage1.body.items[19].name).toBe(`${prefix} Item 20`);

      // Page 2
      const resPage2 = await request(app.getHttpServer())
        .get(`/api/salary-components?search=${prefix}&page=2&pageSize=20`)
        .set('Cookie', authCookie);

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.total).toBe(22);
      expect(resPage2.body.page).toBe(2);
      expect(resPage2.body.items).toHaveLength(2);
      expect(resPage2.body.items[0].name).toBe(`${prefix} Item 21`);
      expect(resPage2.body.items[1].name).toBe(`${prefix} Item 22`);
    });

    it('filters items correctly via search query (case-insensitive substring)', async () => {
      const searchTarget = `SearchTarget_${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: `${searchTarget} Alpha` });

      await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: `${searchTarget} Beta` });

      const res = await request(app.getHttpServer())
        .get(`/api/salary-components?search=${searchTarget.toLowerCase()}`)
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((i: any) => i.name)).toContain(`${searchTarget} Alpha`);
      expect(res.body.items.map((i: any) => i.name)).toContain(`${searchTarget} Beta`);
    });
  });

  describe('Component Rename and Expected-Version Optimistic Concurrency', () => {
    it('updates component name and increments version when expectedVersion matches', async () => {
      const initialName = `Original Name ${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: initialName });

      const compId = createRes.body.id;
      expect(createRes.body.version).toBe(1);

      const updatedName = `Renamed Novel Allowance ${Date.now()}`;
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/salary-components/${compId}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          name: updatedName,
          expectedVersion: 1,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.id).toBe(compId);
      expect(updateRes.body.name).toBe(updatedName);
      expect(updateRes.body.version).toBe(2);

      // Verify single fetch reflects update
      const getRes = await request(app.getHttpServer())
        .get(`/api/salary-components/${compId}`)
        .set('Cookie', authCookie);
      expect(getRes.status).toBe(200);
      expect(getRes.body.name).toBe(updatedName);
      expect(getRes.body.version).toBe(2);
    });

    it('rejects update with 409 Conflict when expectedVersion does not match current version', async () => {
      const compName = `Version Stale Test ${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: compName });

      const compId = createRes.body.id;

      // Send update with wrong version
      const updateRes = await request(app.getHttpServer())
        .patch(`/api/salary-components/${compId}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          name: `Modified Stale ${Date.now()}`,
          expectedVersion: 99,
        });

      expect(updateRes.status).toBe(409);
      expect(updateRes.body.error?.code).toBe('CONFLICT');
      expect(updateRes.body.error?.message).toContain('Stale version conflict');
    });

    it('same-value rename is a no-op that preserves current version', async () => {
      const compName = `Noop Rename Test ${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: compName });

      const compId = createRes.body.id;

      const noopRes = await request(app.getHttpServer())
        .patch(`/api/salary-components/${compId}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          name: `  ${compName}  `,
          expectedVersion: 1,
        });

      expect(noopRes.status).toBe(200);
      expect(noopRes.body.version).toBe(1);
    });

    it('rejects rename when the new name conflicts with another active component', async () => {
      const comp1Name = `First Active Comp ${Date.now()}`;
      const comp2Name = `Second Active Comp ${Date.now()}`;

      await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: comp1Name });

      const createRes2 = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: comp2Name });

      // Attempt to rename comp2 to comp1Name
      const conflictRes = await request(app.getHttpServer())
        .patch(`/api/salary-components/${createRes2.body.id}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          name: comp1Name.toLowerCase(),
          expectedVersion: 1,
        });

      expect(conflictRes.status).toBe(409);
      expect(conflictRes.body.error?.code).toBe('CONFLICT');
    });

    it('handles concurrent renames where first increments version and second fails with 409 stale conflict', async () => {
      const initialName = `Race Rename Base ${Date.now()}`;
      const createRes = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: initialName });

      const compId = createRes.body.id;

      // Dispatch 2 competing rename requests both expecting version 1
      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/salary-components/${compId}`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ name: `Winner Alpha ${Date.now()}`, expectedVersion: 1 }),
        request(app.getHttpServer())
          .patch(`/api/salary-components/${compId}`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ name: `Winner Beta ${Date.now()}`, expectedVersion: 1 }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Verify the component in PostgreSQL ended up at version 2
      const freshComp = await prisma.salaryComponent.findUnique({
        where: { id: compId },
      });
      expect(freshComp?.version).toBe(2);
    });
  });

  describe('Archival Readiness and Partial Unique Index Verification', () => {
    it('allows reusing a name if prior component with same nameKey is inactive', async () => {
      const reusedName = `Reused Archive Name ${Date.now()}`;
      const nameKey = reusedName.trim().toLowerCase();

      // Create an archived / inactive component directly
      await prisma.salaryComponent.create({
        data: {
          name: reusedName,
          nameKey,
          isActive: false, // archived
          version: 1,
        },
      });

      // Now create an active component with the same name via HTTP API
      const res = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: reusedName });

      // Partial index allows this because the other is inactive
      expect(res.status).toBe(201);
      expect(res.body.name).toBe(reusedName);
      expect(res.body.isActive).toBe(true);

      // Verify both exist in the database with differing isActive values
      const rows = await prisma.salaryComponent.findMany({
        where: { nameKey },
        orderBy: { id: 'asc' },
      });
      expect(rows).toHaveLength(2);
      expect(rows[0].isActive).toBe(false);
      expect(rows[1].isActive).toBe(true);
    });
  });
});
