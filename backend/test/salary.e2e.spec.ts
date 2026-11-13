import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import bcrypt from 'bcryptjs';

describe('Basic Salary & Rate Integration against Neon Test Database (Ticket 03)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let authCookie: string;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUser = 'admin_salary_test';

  beforeAll(async () => {
    const testDbUrl =
      process.env.TEST_DATABASE_URL ||
      (process.env.NODE_ENV === 'test' ? process.env.DATABASE_URL : undefined);
    const testDirectUrl =
      process.env.TEST_DIRECT_URL ||
      (process.env.NODE_ENV === 'test' ? process.env.DIRECT_URL : undefined);

    if (!testDbUrl || !testDirectUrl) {
      throw new Error('TEST_DATABASE_URL and TEST_DIRECT_URL must be provided.');
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
              PORT: 5053,
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
    authService = app.get(AuthService);

    // Setup authenticated test admin session
    await prisma.authSession.deleteMany({
      where: { adminUser: { username: testAdminUser } },
    });
    await prisma.adminUser.deleteMany({
      where: { username: testAdminUser },
    });

    const hash = await bcrypt.hash('TestAdminPass123!', 10);
    const admin = await prisma.adminUser.create({
      data: {
        username: testAdminUser,
        passwordHash: hash,
      },
    });

    const { rawSecret } = await authService.createSession(admin.id);
    authCookie = `salary_session=${rawSecret}`;

    // Clean up test salary and employee tables
    await prisma.basicSalaryAssignment.deleteMany({});
    await prisma.employee.deleteMany({});
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Unassigned State & Initial Retrieval', () => {
    it('returns null current salary and unavailable rates for an unassigned employee', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-UNASSIGNED',
          employeeIdKey: 'emp-unassigned',
          firstName: 'Juan',
          lastName: 'Luna',
          dateHired: new Date('2024-01-15'),
          isActive: true,
        },
      });

      const resSalary = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie);

      expect(resSalary.status).toBe(200);
      expect(resSalary.body.current).toBeNull();
      expect(resSalary.body.employeeVersion).toBe(1);

      const resSummary = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/salary-summary`)
        .set('Cookie', authCookie);

      expect(resSummary.status).toBe(200);
      expect(resSummary.body.hasBasicSalary).toBe(false);
      expect(resSummary.body.basicSalary).toBeNull();
      expect(resSummary.body.rates.basic).toBeNull();
      expect(resSummary.body.rates.total).toBeNull();
    });
  });

  describe('Initial Assignment & Reference Rate Fixtures', () => {
    let employeeId: number;
    let currentSalaryId: number;

    beforeAll(async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-RATES-TEST',
          employeeIdKey: 'emp-rates-test',
          firstName: 'Clara',
          lastName: 'Santos',
          dateHired: new Date('2024-02-01'),
          isActive: true,
        },
      });
      employeeId = emp.id;
    });

    it('assigns first basic salary 20,000.00 and verifies rates match acceptance fixture', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '20000.00',
          expectedCurrentId: null,
          expectedVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.amount).toBe('20000.00');
      expect(res.body.current.isActive).toBe(true);
      expect(res.body.employeeVersion).toBe(2);
      currentSalaryId = res.body.current.id;

      // Verify rates: 20,000.00 -> Annual 240,000.00, Daily 764.33, Hourly 95.54, Per minute 1.59
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.hasBasicSalary).toBe(true);
      expect(summaryRes.body.basicSalary).toBe('20000.00');
      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '20000.00',
        annual: '240000.00',
        daily: '764.33',
        hourly: '95.54',
        minute: '1.59',
      });
    });

    it('updates to 25,000.00 and verifies rates: Daily 955.41, Hourly 119.43, Minute 1.99', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '25000.00',
          expectedCurrentId: currentSalaryId,
          expectedVersion: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.amount).toBe('25000.00');
      expect(res.body.employeeVersion).toBe(3);
      currentSalaryId = res.body.current.id;

      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '25000.00',
        annual: '300000.00',
        daily: '955.41',
        hourly: '119.43',
        minute: '1.99',
      });
    });

    it('updates to 30,000.00 and verifies rates: Daily 1146.50, Hourly 143.31, Minute 2.39', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '30000',
          expectedCurrentId: currentSalaryId,
          expectedVersion: 3,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.amount).toBe('30000.00');
      expect(res.body.employeeVersion).toBe(4);
      currentSalaryId = res.body.current.id;

      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '30000.00',
        annual: '360000.00',
        daily: '1146.50',
        hourly: '143.31',
        minute: '2.39',
      });
    });

    it('updates to 3.14 and verifies rates: Annual 37.68, Daily 0.12, Hourly 0.02, Minute 0.00', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '3.14',
          expectedCurrentId: currentSalaryId,
          expectedVersion: 4,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.amount).toBe('3.14');
      expect(res.body.employeeVersion).toBe(5);
      currentSalaryId = res.body.current.id;

      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '3.14',
        annual: '37.68',
        daily: '0.12',
        hourly: '0.02',
        minute: '0.00',
      });
    });

    it('updates to 62.80 and verifies rates: Annual 753.60, Daily 2.40, Hourly 0.30, Minute 0.01', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '62.8',
          expectedCurrentId: currentSalaryId,
          expectedVersion: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.amount).toBe('62.80');
      expect(res.body.employeeVersion).toBe(6);
      currentSalaryId = res.body.current.id;

      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '62.80',
        annual: '753.60',
        daily: '2.40',
        hourly: '0.30',
        minute: '0.01',
      });
    });

    it('asserts intermediate-rounding regression fixture 101.40 yields hourly 0.48 (not 0.49)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '101.40',
          expectedCurrentId: currentSalaryId,
          expectedVersion: 6,
        });

      expect(res.status).toBe(200);
      expect(res.body.employeeVersion).toBe(7);
      currentSalaryId = res.body.current.id;

      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '101.40',
        annual: '1216.80',
        daily: '3.88',
        hourly: '0.48',
        minute: '0.01',
      });
    });
  });

  describe('Explicit Zero vs Unassigned & Same-Amount No-Op', () => {
    let employeeId: number;
    let currentSalaryId: number;
    let recordedEmpVersion: number;

    beforeAll(async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-ZERO-TEST',
          employeeIdKey: 'emp-zero-test',
          firstName: 'Andres',
          lastName: 'Bonifacio',
          dateHired: new Date('2024-03-01'),
          isActive: true,
        },
      });
      employeeId = emp.id;
    });

    it('assigns explicit zero salary and distinguishes it from unassigned', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '0.00',
          expectedCurrentId: null,
          expectedVersion: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.amount).toBe('0.00');
      currentSalaryId = res.body.current.id;
      recordedEmpVersion = res.body.employeeVersion;

      const summaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/salary-summary`)
        .set('Cookie', authCookie);

      expect(summaryRes.body.hasBasicSalary).toBe(true);
      expect(summaryRes.body.basicSalary).toBe('0.00');
      expect(summaryRes.body.rates.basic).toEqual({
        monthly: '0.00',
        annual: '0.00',
        daily: '0.00',
        hourly: '0.00',
        minute: '0.00',
      });
    });

    it('performs a no-op when same amount is submitted', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '0',
          expectedCurrentId: currentSalaryId,
          expectedVersion: recordedEmpVersion,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.id).toBe(currentSalaryId);
      expect(res.body.employeeVersion).toBe(recordedEmpVersion);

      // Verify no extra history row was created
      const historyRes = await request(app.getHttpServer())
        .get(`/api/employees/${employeeId}/basic-salary/history`)
        .set('Cookie', authCookie);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.total).toBe(1);
    });
  });

  describe('History Retention & Ordering', () => {
    it('retains previous amounts with timestamps and correct active flags', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-HIST-TEST',
          employeeIdKey: 'emp-hist-test',
          firstName: 'Apolinario',
          lastName: 'Mabini',
          dateHired: new Date('2024-04-01'),
          isActive: true,
        },
      });

      // 1st assignment: 15,000.00
      const r1 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '15000.00', expectedCurrentId: null, expectedVersion: 1 });
      expect(r1.status).toBe(200);

      // 2nd assignment: 18,000.00
      const r2 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '18000.00', expectedCurrentId: r1.body.current.id, expectedVersion: 2 });
      expect(r2.status).toBe(200);

      // 3rd assignment: 22,500.00
      const r3 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '22500.00', expectedCurrentId: r2.body.current.id, expectedVersion: 3 });
      expect(r3.status).toBe(200);

      const historyRes = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/basic-salary/history`)
        .set('Cookie', authCookie);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.total).toBe(3);
      const items = historyRes.body.items;

      // Most recent first
      expect(items[0].id).toBe(r3.body.current.id);
      expect(items[0].amount).toBe('22500.00');
      expect(items[0].isActive).toBe(true);
      expect(items[0].endedAt).toBeNull();

      // Second row
      expect(items[1].id).toBe(r2.body.current.id);
      expect(items[1].amount).toBe('18000.00');
      expect(items[1].isActive).toBe(false);
      expect(items[1].endedAt).not.toBeNull();

      // Third row
      expect(items[2].id).toBe(r1.body.current.id);
      expect(items[2].amount).toBe('15000.00');
      expect(items[2].isActive).toBe(false);
      expect(items[2].endedAt).not.toBeNull();
    });
  });

  describe('Optimistic Concurrency & Partial Unique Index Guard', () => {
    it('rejects stale expectedCurrentId with 409 Conflict', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-STALE-TEST',
          employeeIdKey: 'emp-stale-test',
          firstName: 'Gabriela',
          lastName: 'Silang',
          dateHired: new Date('2024-05-01'),
          isActive: true,
        },
      });

      const r1 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '12000.00', expectedCurrentId: null, expectedVersion: 1 });
      expect(r1.status).toBe(200);

      // Attempt update with wrong expectedCurrentId
      const staleRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '14000.00', expectedCurrentId: 999999, expectedVersion: 2 });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error.message).toMatch(/Stale current salary ID/);

      // Attempt update with expectedCurrentId: null when record already exists
      const staleNullRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '14000.00', expectedCurrentId: null, expectedVersion: 2 });

      expect(staleNullRes.status).toBe(409);
    });

    it('rejects stale expectedVersion with 409 Conflict', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-VERSION-TEST',
          employeeIdKey: 'emp-version-test',
          firstName: 'Melchora',
          lastName: 'Aquino',
          dateHired: new Date('2024-06-01'),
          isActive: true,
        },
      });

      const r1 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '16000.00',
          expectedCurrentId: null,
          expectedVersion: 1,
        });
      expect(r1.status).toBe(200);
      expect(r1.body.employeeVersion).toBe(2);

      // Attempt update with stale version 1
      const staleVerRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({
          amount: '17000.00',
          expectedCurrentId: r1.body.current.id,
          expectedVersion: 1,
        });

      expect(staleVerRes.status).toBe(409);
      expect(staleVerRes.body.error.message).toMatch(/version conflict/i);
    });

    it('rejects salary updates for archived employees with 409 Conflict', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-ARCH-TEST',
          employeeIdKey: 'emp-arch-test',
          firstName: 'Emilio',
          lastName: 'Aguinaldo',
          dateHired: new Date('2024-07-01'),
          isActive: false, // Archived
        },
      });

      const res = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '20000.00', expectedCurrentId: null, expectedVersion: 1 });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/archived/i);
    });

    it('coordinates concurrent first-assignment writes: exactly one 200 and one 409, preserving single-current invariant', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-CONCUR-SAL-1',
          employeeIdKey: 'emp-concur-sal-1',
          firstName: 'Teresa',
          lastName: 'Magbanua',
          dateHired: new Date('2024-07-15'),
          isActive: true,
        },
      });

      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .put(`/api/employees/${emp.id}/basic-salary`)
          .set('Cookie', authCookie)
          .set('Origin', testClientOrigin)
          .set('X-Salary-Client', 'web')
          .send({ amount: '21000.00', expectedCurrentId: null, expectedVersion: 1 }),
        request(app.getHttpServer())
          .put(`/api/employees/${emp.id}/basic-salary`)
          .set('Cookie', authCookie)
          .set('Origin', testClientOrigin)
          .set('X-Salary-Client', 'web')
          .send({ amount: '22000.00', expectedCurrentId: null, expectedVersion: 1 }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Assert database has exactly one active basic salary row
      const activeRows = await prisma.basicSalaryAssignment.findMany({
        where: { employeeId: emp.id, isActive: true },
      });
      expect(activeRows.length).toBe(1);
    });

    it('coordinates concurrent update writes with the same expectedCurrentId: exactly one 200 and one 409', async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-CONCUR-SAL-2',
          employeeIdKey: 'emp-concur-sal-2',
          firstName: 'Diego',
          lastName: 'Silang',
          dateHired: new Date('2024-07-20'),
          isActive: true,
        },
      });

      const initialRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '19000.00', expectedCurrentId: null, expectedVersion: 1 });
      expect(initialRes.status).toBe(200);
      const currentSalaryId = initialRes.body.current.id;

      const [resA, resB] = await Promise.all([
        request(app.getHttpServer())
          .put(`/api/employees/${emp.id}/basic-salary`)
          .set('Cookie', authCookie)
          .set('Origin', testClientOrigin)
          .set('X-Salary-Client', 'web')
          .send({ amount: '23000.00', expectedCurrentId: currentSalaryId, expectedVersion: 2 }),
        request(app.getHttpServer())
          .put(`/api/employees/${emp.id}/basic-salary`)
          .set('Cookie', authCookie)
          .set('Origin', testClientOrigin)
          .set('X-Salary-Client', 'web')
          .send({ amount: '24000.00', expectedCurrentId: currentSalaryId, expectedVersion: 2 }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([200, 409]);

      // Exactly one current salary remains
      const activeRows = await prisma.basicSalaryAssignment.findMany({
        where: { employeeId: emp.id, isActive: true },
      });
      expect(activeRows.length).toBe(1);
    });
  });

  describe('Validation & Boundary Enforcement', () => {
    let employeeId: number;

    beforeAll(async () => {
      const emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP-VAL-TEST',
          employeeIdKey: 'emp-val-test',
          firstName: 'Marcelo',
          lastName: 'del Pilar',
          dateHired: new Date('2024-08-01'),
          isActive: true,
        },
      });
      employeeId = emp.id;
    });

    it('rejects request when expectedVersion is omitted with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '25000.00', expectedCurrentId: null });

      expect(res.status).toBe(400);
    });

    it('rejects request when expectedVersion is not an integer >= 1 with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '25000.00', expectedCurrentId: null, expectedVersion: 0 });

      expect(res.status).toBe(400);
    });

    it('rejects request when expectedCurrentId is omitted with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '25000.00', expectedVersion: 1 });

      expect(res.status).toBe(400);
    });

    it('rejects request when expectedCurrentId is invalid type with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '25000.00', expectedCurrentId: -5, expectedVersion: 1 });

      expect(res.status).toBe(400);
    });

    it('rejects negative amounts with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '-500.00', expectedCurrentId: null, expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects non-numeric characters and symbols with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: 'PHP 25,000.00', expectedCurrentId: null, expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects more than two decimal places with 400 Bad Request', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '20000.555', expectedCurrentId: null, expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects numeric(14,2) overflow amounts (> 999,999,999,999.99) before database coercion', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${employeeId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .send({ amount: '1000000000000.00', expectedCurrentId: null, expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
