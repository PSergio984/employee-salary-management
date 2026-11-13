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

describe('Employee Archival & Read-Only Retained Records Integration (Ticket 06)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let authCookie: string;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUser = 'admin_archive_test';

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

    // Clean up test tables
    await prisma.employeeSalaryComponent.deleteMany({});
    await prisma.basicSalaryAssignment.deleteMany({});
    await prisma.salaryComponent.deleteMany({});
    await prisma.employee.deleteMany({});
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Employee Archival with Retained Records (Acceptance Criteria 1 & 2)', () => {
    let empId: number;
    let compId: number;

    it('creates an employee, assigns basic salary and a component', async () => {
      // 1. Create Employee
      const empRes = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-ARCH-001',
          firstName: 'Juan',
          middleName: 'Santos',
          lastName: 'Dela Cruz',
          dateHired: '2026-01-15',
        });
      expect(empRes.status).toBe(201);
      empId = empRes.body.id;
      expect(empRes.body.version).toBe(1);

      // 2. Assign Basic Salary (version increments to 2)
      const salaryRes = await request(app.getHttpServer())
        .put(`/api/employees/${empId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          amount: '25000.00',
          expectedVersion: 1,
          expectedCurrentId: null,
        });
      expect(salaryRes.status).toBe(200);
      expect(salaryRes.body.employeeVersion).toBe(2);

      // 3. Create Salary Component Definition
      const compRes = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          name: 'Transportation Allowance',
        });
      expect(compRes.status).toBe(201);
      compId = compRes.body.id;

      // 4. Assign Component (version increments to 3)
      const assignRes = await request(app.getHttpServer())
        .post(`/api/employees/${empId}/components`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          componentId: compId,
          amount: '3500.00',
          expectedVersion: 2,
        });
      expect(assignRes.status).toBe(201);
      expect(assignRes.body.employeeVersion).toBe(3);
    });

    it('archives the employee and increments version while retaining all relationships and records intact', async () => {
      const archiveRes = await request(app.getHttpServer())
        .post(`/api/employees/${empId}/archive`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: 3,
        });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body.id).toBe(empId);
      expect(archiveRes.body.isActive).toBe(false);
      expect(archiveRes.body.version).toBe(4);

      // Verify real PostgreSQL database row states
      const dbEmp = await prisma.employee.findUnique({
        where: { id: empId },
      });
      expect(dbEmp!.isActive).toBe(false);
      expect(dbEmp!.version).toBe(4);

      // Basic salary is retained intact in PostgreSQL
      const dbSalary = await prisma.basicSalaryAssignment.findFirst({
        where: { employeeId: empId, isActive: true },
      });
      expect(dbSalary).not.toBeNull();
      expect(Number(dbSalary!.amount)).toBe(25000);
      expect(dbSalary!.isActive).toBe(true);

      // Employee salary component is retained intact in PostgreSQL
      const dbComp = await prisma.employeeSalaryComponent.findFirst({
        where: { employeeId: empId, componentId: compId, isActive: true },
      });
      expect(dbComp).not.toBeNull();
      expect(Number(dbComp!.amount)).toBe(3500);
      expect(dbComp!.isActive).toBe(true);
    });

    it('rejects archiving an already archived employee with 409 EMPLOYEE_ALREADY_ARCHIVED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/employees/${empId}/archive`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: 4,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('EMPLOYEE_ALREADY_ARCHIVED');
    });

    it('rejects archiving with stale version with 409 VERSION_CONFLICT', async () => {
      // Create new employee
      const empRes = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-STALE-ARCH',
          firstName: 'Stale',
          lastName: 'Tester',
          dateHired: '2026-02-01',
        });
      const newEmpId = empRes.body.id;

      const res = await request(app.getHttpServer())
        .post(`/api/employees/${newEmpId}/archive`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: 99, // Mismatched version
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('VERSION_CONFLICT');
    });

    it('returns 404 EMPLOYEE_NOT_FOUND when archiving a non-existent employee', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees/999999/archive')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: 1,
        });

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('EMPLOYEE_NOT_FOUND');
    });
  });

  describe('Directory Filtering: Default Excludes Archived (Acceptance Criteria 2)', () => {
    it('default listing excludes archived employees', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employees')
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ employeeId: string; isActive: boolean }>;
      const archived = items.find((e) => e.employeeId === 'EMP-ARCH-001');
      expect(archived).toBeUndefined();
      items.forEach((e) => expect(e.isActive).toBe(true));
    });

    it('status=archived returns archived employees only', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employees?status=archived')
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ employeeId: string; isActive: boolean }>;
      const archived = items.find((e) => e.employeeId === 'EMP-ARCH-001');
      expect(archived).toBeDefined();
      items.forEach((e) => expect(e.isActive).toBe(false));
    });

    it('status=all returns both active and archived employees', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/employees?status=all')
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(res.status).toBe(200);
      const items = res.body.items as Array<{ employeeId: string; isActive: boolean }>;
      const archived = items.find((e) => e.employeeId === 'EMP-ARCH-001');
      const active = items.find((e) => e.employeeId === 'EMP-STALE-ARCH');
      expect(archived).toBeDefined();
      expect(active).toBeDefined();
    });
  });

  describe('Read-Only Retained Inspection for Archived Employees (Acceptance Criteria 1 & 2)', () => {
    let empId: number;

    beforeAll(async () => {
      const emp = await prisma.employee.findUnique({
        where: { employeeIdKey: 'EMP-ARCH-001' },
      });
      empId = emp!.id;
    });

    it('allows reading employee profile details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/employees/${empId}`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(empId);
      expect(res.body.employeeId).toBe('EMP-ARCH-001');
      expect(res.body.isActive).toBe(false);
    });

    it('allows reading retained basic salary and basic salary history', async () => {
      const salaryRes = await request(app.getHttpServer())
        .get(`/api/employees/${empId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(salaryRes.status).toBe(200);
      expect(salaryRes.body.current).not.toBeNull();
      expect(salaryRes.body.current.amount).toBe('25000.00');

      const historyRes = await request(app.getHttpServer())
        .get(`/api/employees/${empId}/basic-salary/history`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.items.length).toBeGreaterThanOrEqual(1);
      expect(historyRes.body.items[0].amount).toBe('25000.00');
    });

    it('allows reading retained assigned components and component history', async () => {
      const compRes = await request(app.getHttpServer())
        .get(`/api/employees/${empId}/components`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(compRes.status).toBe(200);
      expect(compRes.body.items.length).toBe(1);
      expect(compRes.body.items[0].name).toBe('Transportation Allowance');
      expect(compRes.body.items[0].amount).toBe('3500.00');

      const historyRes = await request(app.getHttpServer())
        .get(`/api/employees/${empId}/components/history`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.items.length).toBe(1);
      expect(historyRes.body.items[0].name).toBe('Transportation Allowance');
    });

    it('allows calculating salary summary and statutory rates from retained records', async () => {
      const ratesRes = await request(app.getHttpServer())
        .get(`/api/employees/${empId}/salary-summary`)
        .set('Cookie', authCookie)
        .set('Origin', testClientOrigin);

      expect(ratesRes.status).toBe(200);
      expect(ratesRes.body.basicSalary).toBe('25000.00');
      expect(ratesRes.body.totalMonthlyCompensation).toBe('28500.00');
      expect(ratesRes.body.rates.basic.annual).toBe('300000.00');
      expect(ratesRes.body.rates.total.annual).toBe('342000.00');
      // 342,000 / 314 = 1089.17197... -> 1089.17
      expect(ratesRes.body.rates.total.daily).toBe('1089.17');
    });
  });

  describe('Rejection of Writes while Archived (Acceptance Criteria 3)', () => {
    let empId: number;
    let compId: number;

    beforeAll(async () => {
      const emp = await prisma.employee.findUnique({
        where: { employeeIdKey: 'EMP-ARCH-001' },
      });
      empId = emp!.id;

      const comp = await prisma.salaryComponent.findFirst({
        where: { name: 'Transportation Allowance' },
      });
      compId = comp!.id;
    });

    it('rejects profile update on archived employee with 409 EMPLOYEE_ARCHIVED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/employees/${empId}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: 4,
          firstName: 'NewFirstName',
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('EMPLOYEE_ARCHIVED');
    });

    it('rejects basic salary update on archived employee with 409 EMPLOYEE_ARCHIVED', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/employees/${empId}/basic-salary`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          amount: '30000.00',
          expectedVersion: 4,
          expectedCurrentId: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('EMPLOYEE_ARCHIVED');
    });

    it('rejects component assignment on archived employee with 409 EMPLOYEE_ARCHIVED', async () => {
      // Create another component
      const newComp = await request(app.getHttpServer())
        .post('/api/salary-components')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({ name: 'Meal Allowance' });

      const res = await request(app.getHttpServer())
        .post(`/api/employees/${empId}/components`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          componentId: newComp.body.id,
          amount: '2000.00',
          expectedVersion: 4,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('EMPLOYEE_ARCHIVED');
    });

    it('rejects component amount update on archived employee with 409 EMPLOYEE_ARCHIVED', async () => {
      const currentComp = await prisma.employeeSalaryComponent.findFirst({
        where: { employeeId: empId, componentId: compId, isActive: true },
      });

      const res = await request(app.getHttpServer())
        .put(`/api/employees/${empId}/components/${compId}`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          amount: '4000.00',
          expectedVersion: 4,
          expectedCurrentId: currentComp!.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('EMPLOYEE_ARCHIVED');
    });

    it('rejects component removal on archived employee with 409 EMPLOYEE_ARCHIVED', async () => {
      const currentComp = await prisma.employeeSalaryComponent.findFirst({
        where: { employeeId: empId, componentId: compId, isActive: true },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/employees/${empId}/components/${compId}/remove`)
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          expectedVersion: 4,
          expectedCurrentId: currentComp!.id,
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('EMPLOYEE_ARCHIVED');
    });
  });

  describe('Normalized Employee ID Reservation (Acceptance Criteria 4)', () => {
    it('rejects creating new employee with normalized ID matching archived employee', async () => {
      // emp-arch-001 in lower case with whitespace
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: '   emp-arch-001   ',
          firstName: 'Another',
          lastName: 'Person',
          dateHired: '2026-03-01',
        });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('DUPLICATE_EMPLOYEE_ID');
    });

    it('allows creating an employee with the same name as an archived employee when ID differs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-UNIQUE-999',
          firstName: 'Juan',
          middleName: 'Santos',
          lastName: 'Dela Cruz',
          dateHired: '2026-03-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.employeeId).toBe('EMP-UNIQUE-999');
      expect(res.body.firstName).toBe('Juan');
      expect(res.body.lastName).toBe('Dela Cruz');
    });
  });

  describe('Real PostgreSQL Concurrency & Race Invariants (Acceptance Criteria 1 & 3)', () => {
    it('race between employee archival and profile update: exactly one succeeds and one receives 409', async () => {
      // 1. Create a fresh employee
      const empRes = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-RACE-001',
          firstName: 'RaceA',
          lastName: 'Tester',
          dateHired: '2026-01-01',
        });
      expect(empRes.status).toBe(201);
      const raceEmpId = empRes.body.id;
      const initialVersion = empRes.body.version; // 1

      // 2. Fire concurrent archive and patch requests
      const [archiveRes, patchRes] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/employees/${raceEmpId}/archive`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ expectedVersion: initialVersion }),
        request(app.getHttpServer())
          .patch(`/api/employees/${raceEmpId}`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ firstName: 'RaceA-Updated', expectedVersion: initialVersion }),
      ]);

      const statuses = [archiveRes.status, patchRes.status].sort();
      expect(statuses).toEqual([200, 409]);

      // If archive won: archive is 200, patch got 409 (EMPLOYEE_ARCHIVED or VERSION_CONFLICT)
      // If patch won: patch is 200, archive got 409 (VERSION_CONFLICT)
      const finalDb = await prisma.employee.findUnique({
        where: { id: raceEmpId },
      });
      expect(finalDb!.version).toBe(initialVersion + 1);
    });

    it('race between employee archival and basic salary assignment: exactly one succeeds and one receives 409', async () => {
      // 1. Create fresh employee
      const empRes = await request(app.getHttpServer())
        .post('/api/employees')
        .set('Cookie', authCookie)
        .set('X-Salary-Client', 'web')
        .set('Origin', testClientOrigin)
        .send({
          employeeId: 'EMP-RACE-002',
          firstName: 'RaceB',
          lastName: 'Tester',
          dateHired: '2026-01-01',
        });
      expect(empRes.status).toBe(201);
      const raceEmpId = empRes.body.id;
      const initialVersion = empRes.body.version; // 1

      // 2. Fire concurrent archive and basic salary assignment
      const [archiveRes, salaryRes] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/employees/${raceEmpId}/archive`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({ expectedVersion: initialVersion }),
        request(app.getHttpServer())
          .put(`/api/employees/${raceEmpId}/basic-salary`)
          .set('Cookie', authCookie)
          .set('X-Salary-Client', 'web')
          .set('Origin', testClientOrigin)
          .send({
            amount: '35000.00',
            expectedVersion: initialVersion,
            expectedCurrentId: null,
          }),
      ]);

      const statuses = [archiveRes.status, salaryRes.status].sort();
      expect(statuses).toEqual([200, 409]);

      const finalDb = await prisma.employee.findUnique({
        where: { id: raceEmpId },
      });
      expect(finalDb!.version).toBe(initialVersion + 1);
    });
  });
});
