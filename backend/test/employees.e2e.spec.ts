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

describe('Employee Onboarding Integration against Neon Test Database (Ticket 02)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let authCookie: string;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUser = 'admin_emp_test';

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

    // Clean up test employee and salary tables
    await prisma.employeeSalaryComponent.deleteMany({});
    await prisma.basicSalaryAssignment.deleteMany({});
    await prisma.employee.deleteMany({});
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Employee Creation & Name Validations', () => {
    it('creates an employee with valid accents, hyphens, and apostrophes in names', async () => {
      const payload = {
        employeeId: 'EMP-001',
        firstName: 'José',
        middleName: "D'Angelo",
        lastName: 'Dela Cruz-Santos',
        dateHired: '2026-01-15',
      };

      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.employeeId).toBe('EMP-001');
      expect(res.body.firstName).toBe('José');
      expect(res.body.middleName).toBe("D'Angelo");
      expect(res.body.lastName).toBe('Dela Cruz-Santos');
      expect(res.body.dateHired).toBe('2026-01-15');
      expect(res.body.isActive).toBe(true);
      expect(res.body.version).toBe(1);
    });

    it('creates another employee sharing the exact same name with distinct ID (Story 10)', async () => {
      const payload = {
        employeeId: 'EMP-002',
        firstName: 'José',
        middleName: "D'Angelo",
        lastName: 'Dela Cruz-Santos',
        dateHired: '2026-02-01',
      };

      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.employeeId).toBe('EMP-002');
      expect(res.body.lastName).toBe('Dela Cruz-Santos');
    });

    it('rejects creation when required fields are missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: '',
          firstName: '',
          lastName: '',
          dateHired: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('rejects invalid names containing digits or symbols', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-003',
          firstName: 'John123',
          lastName: 'Doe',
          dateHired: '2026-01-01',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('INVALID_NAME');
    });
  });

  describe('Employee ID Normalization & Uniqueness', () => {
    it('preserves leading zeros in textual employee ID (Story 8)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: '00789',
          firstName: 'Maria',
          lastName: 'Santos',
          dateHired: '2026-03-10',
        });

      expect(res.status).toBe(201);
      expect(res.body.employeeId).toBe('00789');

      // Check DB record: employeeId is '00789', employeeIdKey is '00789'
      const inDb = await prisma.employee.findUnique({
        where: { id: res.body.id },
      });
      expect(inDb!.employeeId).toBe('00789');
      expect(inDb!.employeeIdKey).toBe('00789');
    });

    it('rejects duplicate employee ID with different casing or surrounding whitespace', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: '  emp-001  ', // Already taken by EMP-001
          firstName: 'Another',
          lastName: 'Person',
          dateHired: '2026-03-11',
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('DUPLICATE_EMPLOYEE_ID');
    });
  });

  describe('Hire Date Validations & Asia/Manila Calendar', () => {
    it('rejects hire dates in the future compared to Asia/Manila current date (Story 7)', async () => {
      const futureDate = '2099-12-31';
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-FUTURE',
          firstName: 'Future',
          lastName: 'Worker',
          dateHired: futureDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('FUTURE_HIRE_DATE');
    });

    it('rejects invalid calendar dates like 2026-02-30', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-INV-DATE',
          firstName: 'Invalid',
          lastName: 'DateUser',
          dateHired: '2026-02-30',
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe('INVALID_HIRE_DATE');
    });
  });

  describe('Search & Deterministic 20-row Pagination', () => {
    it('searches employees by ID or name and paginates deterministically', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employees?search=José&page=1&pageSize=20')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.pageSize).toBe(20);
      expect(res.body.page).toBe(1);

      // Verify items match search
      for (const item of res.body.items) {
        const full = `${item.employeeId} ${item.firstName} ${item.lastName}`;
        expect(full.toLowerCase()).toContain('jos');
      }
    });

    it('retrieves single employee by ID', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/employees?pageSize=1')
        .set('Cookie', authCookie);

      const firstId = listRes.body.items[0].id;

      const detailRes = await request(app.getHttpServer())
        .get(`/api/employees/${firstId}`)
        .set('Cookie', authCookie);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.id).toBe(firstId);
      expect(detailRes.body.version).toBeDefined();
    });
  });

  describe('Business-ID Correction & Optimistic Concurrency Control (Story 9 & 40)', () => {
    it('corrects business ID while preserving internal ID and increments version', async () => {
      // Find EMP-002
      const emp2 = await prisma.employee.findUnique({
        where: { employeeIdKey: 'EMP-002' },
      });
      expect(emp2).not.toBeNull();

      const patchRes = await request(app.getHttpServer())
        .patch(`/api/employees/${emp2!.id}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: emp2!.version,
          employeeId: 'EMP-002-CORRECTED',
          firstName: 'José Luis',
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.id).toBe(emp2!.id); // Internal PK unchanged
      expect(patchRes.body.employeeId).toBe('EMP-002-CORRECTED');
      expect(patchRes.body.firstName).toBe('José Luis');
      expect(patchRes.body.version).toBe(emp2!.version + 1);

      // Check DB
      const updated = await prisma.employee.findUnique({
        where: { id: emp2!.id },
      });
      expect(updated!.employeeId).toBe('EMP-002-CORRECTED');
      expect(updated!.employeeIdKey).toBe('EMP-002-CORRECTED');
    });

    it('rejects stale edit with 409 VERSION_CONFLICT when version has changed', async () => {
      const emp2 = await prisma.employee.findFirst({
        where: { employeeIdKey: 'EMP-002-CORRECTED' },
      });

      // Stale attempt using previous version (version - 1)
      const staleRes = await request(app.getHttpServer())
        .patch(`/api/employees/${emp2!.id}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: emp2!.version - 1,
          firstName: 'Stale Name',
        });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error?.code).toBe('VERSION_CONFLICT');
    });

    it('handles concurrent updates with the same expectedVersion: exactly one 200 and one 409', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-CONCUR-01',
          firstName: 'Concurrency',
          lastName: 'Tester',
          dateHired: '2026-01-01',
        });
      expect(createRes.status).toBe(201);
      const empId = createRes.body.id;
      const initialVersion = createRes.body.version;

      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .patch(`/api/employees/${empId}`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ firstName: 'WinnerA', expectedVersion: initialVersion }),
        request(app.getHttpServer())
          .patch(`/api/employees/${empId}`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ firstName: 'WinnerB', expectedVersion: initialVersion }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const finalEmp = await prisma.employee.findUnique({
        where: { id: empId },
      });
      expect(finalEmp!.version).toBe(initialVersion + 1);
    });
  });
});
