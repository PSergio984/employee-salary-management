import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { seed } from '../prisma/seed.js';

describe('Auth & Session Integration against Neon Test Database', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUsername = 'admin_test';
  const testAdminPassword = 'TestPassword2026!';

  beforeAll(async () => {
    // Read test database connection strictly from ignored environment variables
    const testDbUrl =
      process.env.TEST_DATABASE_URL ||
      (process.env.NODE_ENV === 'test' ? process.env.DATABASE_URL : undefined);
    const testDirectUrl =
      process.env.TEST_DIRECT_URL ||
      (process.env.NODE_ENV === 'test' ? process.env.DIRECT_URL : undefined);

    if (!testDbUrl || !testDirectUrl) {
      throw new Error(
        'TEST_DATABASE_URL and TEST_DIRECT_URL must be provided via ignored environment variables.',
      );
    }

    // Fail-closed safety check: ensure test target differs from development database
    const devDbUrl = process.env.DATABASE_URL;
    if (process.env.TEST_DATABASE_URL && devDbUrl && process.env.TEST_DATABASE_URL === devDbUrl) {
      throw new Error(
        'Safety violation: TEST_DATABASE_URL must be isolated and distinct from the development database.',
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
              DATABASE_URL: process.env.DATABASE_URL,
              DIRECT_URL: process.env.DIRECT_URL,
              CLIENT_ORIGIN: testClientOrigin,
              COOKIE_SECURE: 'false',
              PORT: 5051,
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
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Repeat-safe Seed Verification', () => {
    it('executes real seed twice on isolated test target and preserves password hash', async () => {
      // 1. Ensure clean slate for test user
      await prisma.authSession.deleteMany({
        where: { adminUser: { username: testAdminUsername } },
      });
      await prisma.adminUser.deleteMany({
        where: { username: testAdminUsername },
      });

      process.env.ADMIN_USERNAME = testAdminUsername;
      process.env.ADMIN_PASSWORD = testAdminPassword;

      // 2. Execute real seed() function first time
      await seed();

      const adminAfterFirst = await prisma.adminUser.findUnique({
        where: { username: testAdminUsername },
      });
      expect(adminAfterFirst).not.toBeNull();
      const initialHash = adminAfterFirst!.passwordHash;
      expect(initialHash).toBeDefined();

      // 3. Execute real seed() function second time with different password in env
      process.env.ADMIN_PASSWORD = 'DifferentNewPassword999!';
      await seed();

      const adminAfterSecond = await prisma.adminUser.findUnique({
        where: { username: testAdminUsername },
      });
      expect(adminAfterSecond).not.toBeNull();
      // Verifies password was NOT reset or overwritten
      expect(adminAfterSecond!.passwordHash).toBe(initialHash);

      // Verify original password still matches
      const isMatch = await bcrypt.compare(
        testAdminPassword,
        adminAfterSecond!.passwordHash,
      );
      expect(isMatch).toBe(true);

      // Verify the different password does NOT match
      const isDifferentMatch = await bcrypt.compare(
        'DifferentNewPassword999!',
        adminAfterSecond!.passwordHash,
      );
      expect(isDifferentMatch).toBe(false);
    });
  });

  describe('CSRF and Origin Protection', () => {
    it('rejects POST /api/auth/login when X-Salary-Client header is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Origin', testClientOrigin)
        .send({ username: testAdminUsername, password: testAdminPassword });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('CSRF_REJECTED');
      expect(res.body.error?.message).toContain('X-Salary-Client');
    });

    it('rejects POST /api/auth/login when Origin is untrusted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', 'http://untrusted-site.evil')
        .send({ username: testAdminUsername, password: testAdminPassword });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('CSRF_REJECTED');
    });

    it('rejects POST /api/auth/login when Origin is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .send({ username: testAdminUsername, password: testAdminPassword });

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe('CSRF_REJECTED');
    });
  });

  describe('Authentication and Credentials', () => {
    it('returns 401 with structured error for invalid password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ username: testAdminUsername, password: 'WrongPassword123!' });

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('returns 401 for unknown user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ username: 'nonexistent_user', password: testAdminPassword });

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('INVALID_CREDENTIALS');
      expect(res.headers['set-cookie']).toBeUndefined();
    });

    it('returns 400 for invalid/empty request payload', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ username: '', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Session Lifecycle: Login, Refresh, Expiry, and Logout', () => {
    let sessionCookie: string;
    let originalExpiresAt: string;

    it('logs in successfully and sets HttpOnly cookie with 8-hour expiry', async () => {
      const beforeLogin = Date.now();
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ username: testAdminUsername, password: testAdminPassword });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.username).toBe(testAdminUsername);
      expect(res.body.expiresAt).toBeDefined();
      originalExpiresAt = res.body.expiresAt;

      // Verify no password hash or secrets returned in body
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.rawSecret).toBeUndefined();
      expect(res.body.tokenHash).toBeUndefined();

      // Check cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const rawCookie = Array.isArray(cookies) ? cookies[0] : cookies;
      expect(rawCookie).toContain('salary_session=');
      expect(rawCookie).toContain('HttpOnly');
      expect(rawCookie).toContain('Path=/');
      expect(rawCookie).toContain('SameSite=Lax');

      sessionCookie = rawCookie.split(';')[0];
      const tokenValue = sessionCookie.replace('salary_session=', '');

      // Verify DB record
      const expectedTokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');
      const dbSession = await prisma.authSession.findUnique({
        where: { tokenHash: expectedTokenHash },
      });
      expect(dbSession).not.toBeNull();
      expect(dbSession!.revokedAt).toBeNull();

      // Verify 8-hour lifetime (~28800 seconds)
      const expiryTime = new Date(dbSession!.expiresAt).getTime();
      const durationHours = (expiryTime - beforeLogin) / (1000 * 60 * 60);
      expect(durationHours).toBeGreaterThanOrEqual(7.99);
      expect(durationHours).toBeLessThanOrEqual(8.01);
    });

    it('restores session identity via GET /api/auth/me without sliding expiry', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe(testAdminUsername);
      expect(res.body.expiresAt).toBe(originalExpiresAt);

      // Verify GET /api/auth/session alias returns the same
      const resAlias = await request(app.getHttpServer())
        .get('/api/auth/session')
        .set('Cookie', sessionCookie);

      expect(resAlias.status).toBe(200);
      expect(resAlias.body.expiresAt).toBe(originalExpiresAt);
    });

    it('rejects expired session when expiry is past', async () => {
      const tokenValue = sessionCookie.replace('salary_session=', '');
      const tokenHash = crypto.createHash('sha256').update(tokenValue).digest('hex');

      // Set expiry to 1 hour in the past
      await prisma.authSession.update({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 3600 * 1000) },
      });

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(401);
      expect(res.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('logs out and revokes session on server', async () => {
      // 1. Login fresh session
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ username: testAdminUsername, password: testAdminPassword });

      expect(loginRes.status).toBe(200);
      const freshCookie = (loginRes.headers['set-cookie'] as string[])[0].split(';')[0];
      const freshToken = freshCookie.replace('salary_session=', '');
      const freshTokenHash = crypto.createHash('sha256').update(freshToken).digest('hex');

      // 2. Call logout with CSRF protection
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .set('Cookie', freshCookie);

      expect(logoutRes.status).toBe(204);

      // Verify Set-Cookie clears the cookie
      const clearCookie = logoutRes.headers['set-cookie'] as string[];
      expect(clearCookie).toBeDefined();
      expect(clearCookie[0]).toContain('salary_session=;');

      // Verify DB record has revokedAt set
      const revokedSession = await prisma.authSession.findUnique({
        where: { tokenHash: freshTokenHash },
      });
      expect(revokedSession).not.toBeNull();
      expect(revokedSession!.revokedAt).not.toBeNull();

      // 3. Subsequent request with revoked cookie is rejected with 401
      const checkRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', freshCookie);

      expect(checkRes.status).toBe(401);
      expect(checkRes.body.error?.code).toBe('UNAUTHORIZED');
    });

    it('preserves authenticated session and rejects logout when CSRF verification fails', async () => {
      // 1. Fresh login
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ username: testAdminUsername, password: testAdminPassword });

      expect(loginRes.status).toBe(200);
      const cookie = (loginRes.headers['set-cookie'] as string[])[0].split(';')[0];
      const token = cookie.replace('salary_session=', '');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // 2. Attempt logout WITHOUT required X-Salary-Client header
      const failedLogoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Origin', testClientOrigin)
        .set('Cookie', cookie);

      expect(failedLogoutRes.status).toBe(403);
      expect(failedLogoutRes.body.error?.code).toBe('CSRF_REJECTED');

      // 3. Verify session was NOT revoked in database
      const dbSession = await prisma.authSession.findUnique({
        where: { tokenHash },
      });
      expect(dbSession).not.toBeNull();
      expect(dbSession!.revokedAt).toBeNull();

      // 4. Verify user remains authenticated on /api/auth/me
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.username).toBe(testAdminUsername);
    });
  });
});
