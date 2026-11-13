import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

export function validateTestDatabaseTarget(
  testDbUrl: string | undefined,
  testDirectUrl: string | undefined,
  devDbUrl: string | undefined,
): { testDbUrl: string; testDirectUrl: string } {
  if (!testDbUrl || testDbUrl.trim().length === 0) {
    throw new Error(
      'Safety violation: TEST_DATABASE_URL must be explicitly provided in test environment. Generic fallback is prohibited.',
    );
  }

  if (!testDirectUrl || testDirectUrl.trim().length === 0) {
    throw new Error(
      'Safety violation: TEST_DIRECT_URL must be explicitly provided in test environment. Generic fallback is prohibited.',
    );
  }

  if (devDbUrl && testDbUrl.trim() === devDbUrl.trim()) {
    throw new Error(
      'Safety violation: TEST_DATABASE_URL must be isolated and distinct from development DATABASE_URL.',
    );
  }

  return {
    testDbUrl: testDbUrl.trim(),
    testDirectUrl: testDirectUrl.trim(),
  };
}

describe('Employee Salary Components & Total Rates E2E (Ticket 05)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUser = 'admin_components_test';
  const testAdminPass = 'CompPass2026!';
  let authCookie: string;

  beforeAll(async () => {
    const { testDbUrl, testDirectUrl } = validateTestDatabaseTarget(
      process.env.TEST_DATABASE_URL,
      process.env.TEST_DIRECT_URL,
      process.env.DATABASE_URL,
    );

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
              PORT: 5055,
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

    // Clean test database tables in strict foreign key dependency order
    await prisma.employeeSalaryComponent.deleteMany({});
    await prisma.basicSalaryAssignment.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.salaryComponent.deleteMany({});

    // Setup authenticated test admin session
    let admin = await prisma.adminUser.findUnique({ where: { username: testAdminUser } });
    if (!admin) {
      const passwordHash = await bcrypt.hash(testAdminPass, 10);
      admin = await prisma.adminUser.create({
        data: { username: testAdminUser, passwordHash },
      });
    }

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('Origin', testClientOrigin)
      .set('X-Salary-Client', 'web')
      .send({ username: testAdminUser, password: testAdminPass });

    expect(loginRes.status).toBe(200);
    const cookies = loginRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    authCookie = Array.isArray(cookies) ? cookies.join('; ') : cookies!;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.employeeSalaryComponent.deleteMany({});
      await prisma.basicSalaryAssignment.deleteMany({});
      await prisma.employee.deleteMany({});
      await prisma.salaryComponent.deleteMany({});
    }
    if (app) {
      await app.close();
    }
  });

  // Helper to create an active test employee
  async function createTestEmployee(idPrefix: string) {
    const res = await request(app.getHttpServer())
      .post('/api/employees')
      .set('Origin', testClientOrigin)
      .set('X-Salary-Client', 'web')
      .set('Cookie', authCookie)
      .send({
        employeeId: `${idPrefix}-${Date.now()}`,
        firstName: 'Juan',
        lastName: 'Luna',
        dateHired: '2026-01-15',
      });
    expect(res.status).toBe(201);
    return res.body;
  }

  // Helper to create an active catalog component
  async function createCatalogComponent(name: string) {
    const res = await request(app.getHttpServer())
      .post('/api/salary-components')
      .set('Origin', testClientOrigin)
      .set('X-Salary-Client', 'web')
      .set('Cookie', authCookie)
      .send({ name });
    expect(res.status).toBe(201);
    return res.body;
  }

  describe('Prerequisites: Basic Salary Requirement', () => {
    it('rejects component assignment when employee has NO basic salary assigned (400)', async () => {
      const emp = await createTestEmployee('EMP-NOBASIC');
      const comp = await createCatalogComponent(`Meal Allowance ${Date.now()}`);

      const res = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '2500.00',
          expectedVersion: emp.version,
        });

      expect(res.status).toBe(400);
      const errMsg = res.body.error?.message || res.body.message;
      expect(errMsg).toMatch(/basic salary/i);
    });

    it('allows component assignment when basic salary is explicit zero (0.00 qualifies)', async () => {
      const emp = await createTestEmployee('EMP-ZEROBASIC');
      const comp = await createCatalogComponent(`Transit Allowance ${Date.now()}`);

      // Assign explicit zero basic salary
      const basicRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '0.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });
      expect(basicRes.status).toBe(200);

      // Now assigning component must succeed
      const assignRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '1500.00',
          expectedVersion: basicRes.body.employeeVersion,
        });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.item.amount).toBe('1500.00');
      expect(assignRes.body.item.isActive).toBe(true);
    });
  });

  describe('Amount Validation & Money Precision', () => {
    it('rejects invalid amounts: negative, non-numeric, or extra decimal places (400)', async () => {
      const emp = await createTestEmployee('EMP-AMTVALID');
      const comp = await createCatalogComponent(`Tool Allowance ${Date.now()}`);

      // Assign basic
      const basicRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '10000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });

      // Negative amount
      const negRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '-500.00',
          expectedVersion: basicRes.body.employeeVersion,
        });
      expect(negRes.status).toBe(400);

      // Three decimal places (reject before DB rounding)
      const threeDecRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '500.123',
          expectedVersion: basicRes.body.employeeVersion,
        });
      expect(threeDecRes.status).toBe(400);
    });
  });

  describe('Uniqueness & Optimistic Concurrency Invariants', () => {
    it('rejects duplicate active assignment for the same employee and component (409 Conflict)', async () => {
      const emp = await createTestEmployee('EMP-DUP');
      const comp = await createCatalogComponent(`Communication Allowance ${Date.now()}`);

      const basicRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '20000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });

      // First assignment succeeds
      const firstRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '3000.00',
          expectedVersion: basicRes.body.employeeVersion,
        });
      expect(firstRes.status).toBe(201);

      // Duplicate assignment returns 409 with guidance
      const dupRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '4000.00',
          expectedVersion: firstRes.body.employeeVersion,
        });
      expect(dupRes.status).toBe(409);
      const code = dupRes.body.error?.code || dupRes.body.code;
      expect(code).toBe('DUPLICATE_ACTIVE_COMPONENT');
    });

    it('coordinates concurrent duplicate assignments: exactly one 201 and one 409', async () => {
      const emp = await createTestEmployee('EMP-CONCURR-ADD');
      const comp = await createCatalogComponent(`Hazard Pay ${Date.now()}`);

      const basicRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '25000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });

      const currentVer = basicRes.body.employeeVersion;

      // Send two simultaneous assign requests
      const [r1, r2] = await Promise.all([
        request(app.getHttpServer())
          .post(`/api/employees/${emp.id}/components`)
          .set('Origin', testClientOrigin)
          .set('X-Salary-Client', 'web')
          .set('Cookie', authCookie)
          .send({ componentId: comp.id, amount: '5000.00', expectedVersion: currentVer }),
        request(app.getHttpServer())
          .post(`/api/employees/${emp.id}/components`)
          .set('Origin', testClientOrigin)
          .set('X-Salary-Client', 'web')
          .set('Cookie', authCookie)
          .send({ componentId: comp.id, amount: '5000.00', expectedVersion: currentVer }),
      ]);

      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Exactly one active row in database
      const activeCount = await prisma.employeeSalaryComponent.count({
        where: { employeeId: emp.id, componentId: comp.id, isActive: true },
      });
      expect(activeCount).toBe(1);
    });

    it('handles same-amount update as no-op and updates amount with history retention', async () => {
      const emp = await createTestEmployee('EMP-HIST');
      const comp = await createCatalogComponent(`Rice Subsidy ${Date.now()}`);

      const basicRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '18000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });

      const assignRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '2000.00',
          expectedVersion: basicRes.body.employeeVersion,
        });
      expect(assignRes.status).toBe(201);
      const firstAssignId = assignRes.body.item.id;
      const verAfterAssign = assignRes.body.employeeVersion;

      // 1. Same-amount no-op
      const noOpRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/components/${comp.id}`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '2000.00',
          expectedCurrentId: firstAssignId,
          expectedVersion: verAfterAssign,
        });
      expect(noOpRes.status).toBe(200);
      expect(noOpRes.body.item.id).toBe(firstAssignId);
      expect(noOpRes.body.employeeVersion).toBe(verAfterAssign);

      // Verify no extra history row was created
      const countAfterNoOp = await prisma.employeeSalaryComponent.count({
        where: { employeeId: emp.id, componentId: comp.id },
      });
      expect(countAfterNoOp).toBe(1);

      // 2. Meaningful amount update (from 2000 to 2500)
      const updateRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/components/${comp.id}`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '2500.00',
          expectedCurrentId: firstAssignId,
          expectedVersion: verAfterAssign,
        });
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.item.amount).toBe('2500.00');
      expect(updateRes.body.item.id).not.toBe(firstAssignId);
      expect(updateRes.body.employeeVersion).toBe(verAfterAssign + 1);

      // Check history: 2 records (1 retired, 1 active)
      const historyRes = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/components/history`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);

      expect(historyRes.status).toBe(200);
      expect(historyRes.body.total).toBe(2);
      expect(historyRes.body.items[0].amount).toBe('2500.00');
      expect(historyRes.body.items[0].isActive).toBe(true);
      expect(historyRes.body.items[1].amount).toBe('2000.00');
      expect(historyRes.body.items[1].isActive).toBe(false);
      expect(historyRes.body.items[1].endedAt).not.toBeNull();
    });

    it('removes component retaining historical record and permits subsequent reassignment', async () => {
      const emp = await createTestEmployee('EMP-REASSIGN');
      const comp = await createCatalogComponent(`Laundry Allowance ${Date.now()}`);

      const basicRes = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '30000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });

      const assignRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '1200.00',
          expectedVersion: basicRes.body.employeeVersion,
        });

      const activeId = assignRes.body.item.id;
      const verAfterAssign = assignRes.body.employeeVersion;

      // Remove component
      const removeRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components/${comp.id}/remove`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          expectedCurrentId: activeId,
          expectedVersion: verAfterAssign,
        });
      expect(removeRes.status).toBe(200);
      expect(removeRes.body.success).toBe(true);

      // Active components list is now 0
      const activeListRes = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);
      expect(activeListRes.body.total).toBe(0);

      // Reassign same component after removal (creates new active row)
      const reassignRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '1500.00',
          expectedVersion: removeRes.body.employeeVersion,
        });
      expect(reassignRes.status).toBe(201);
      expect(reassignRes.body.item.amount).toBe('1500.00');

      // History has both the removed historical row and the new active row
      const histRes = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/components/history`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);
      expect(histRes.body.total).toBe(2);
      expect(histRes.body.items[0].isActive).toBe(true);
      expect(histRes.body.items[1].isActive).toBe(false);
    });
  });

  describe('Total Salary Rates & Walkthrough Fixture Verification', () => {
    it('verifies exact total rate calculation: 20,000 basic + 5,000 allowance -> 25,000 total; then 25,000 basic -> 30,000 total', async () => {
      const emp = await createTestEmployee('EMP-RATES-WALK');
      const comp = await createCatalogComponent(`Housing Allowance ${Date.now()}`);

      // 1. Assign Basic Salary 20,000.00
      const b1 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '20000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });
      expect(b1.status).toBe(200);

      // Summary with only basic: total rates equal basic rates
      const s1 = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/salary-summary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);

      expect(s1.status).toBe(200);
      expect(s1.body.basicSalary).toBe('20000.00');
      expect(s1.body.totalMonthlyCompensation).toBe('20000.00');
      expect(s1.body.rates.basic.annual).toBe('240000.00');
      expect(s1.body.rates.basic.daily).toBe('764.33');
      expect(s1.body.rates.basic.hourly).toBe('95.54');
      expect(s1.body.rates.basic.minute).toBe('1.59');

      // 2. Add Component Allowance: 5,000.00 -> Total Monthly = 25,000.00
      const c1 = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '5000.00',
          expectedVersion: b1.body.employeeVersion,
        });
      expect(c1.status).toBe(201);

      // Check summary: total rates correspond to 25,000.00
      const s2 = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/salary-summary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);

      expect(s2.status).toBe(200);
      expect(s2.body.basicSalary).toBe('20000.00');
      expect(s2.body.totalMonthlyCompensation).toBe('25000.00');
      expect(s2.body.components.length).toBe(1);
      expect(s2.body.components[0].amount).toBe('5000.00');

      // 25,000 total rates:
      // Annual: 300,000.00
      // Daily: 300,000 / 314 = 955.41
      // Hourly: 300,000 / (314 * 8) = 119.43
      // Minute: 300,000 / (314 * 8 * 60) = 1.99
      expect(s2.body.rates.total.monthly).toBe('25000.00');
      expect(s2.body.rates.total.annual).toBe('300000.00');
      expect(s2.body.rates.total.daily).toBe('955.41');
      expect(s2.body.rates.total.hourly).toBe('119.43');
      expect(s2.body.rates.total.minute).toBe('1.99');

      // Basic rates remain based on 20,000.00
      expect(s2.body.rates.basic.monthly).toBe('20000.00');
      expect(s2.body.rates.basic.daily).toBe('764.33');

      // 3. Update basic salary to 25,000.00 -> Total Monthly = 30,000.00
      const b2 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '25000.00',
          expectedCurrentId: b1.body.current.id,
          expectedVersion: c1.body.employeeVersion,
        });
      expect(b2.status).toBe(200);

      // Check summary: total rates correspond to 30,000.00
      const s3 = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/salary-summary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);

      expect(s3.status).toBe(200);
      expect(s3.body.basicSalary).toBe('25000.00');
      expect(s3.body.totalMonthlyCompensation).toBe('30000.00');

      // 30,000 total rates:
      // Annual: 360,000.00
      // Daily: 360,000 / 314 = 1146.50
      // Hourly: 360,000 / (314 * 8) = 143.31
      // Minute: 360,000 / (314 * 8 * 60) = 2.39
      expect(s3.body.rates.total.monthly).toBe('30000.00');
      expect(s3.body.rates.total.annual).toBe('360000.00');
      expect(s3.body.rates.total.daily).toBe('1146.50');
      expect(s3.body.rates.total.hourly).toBe('143.31');
      expect(s3.body.rates.total.minute).toBe('2.39');
    });

    it('dynamic rename of shared definition reflects immediately on employee component records without altering amounts', async () => {
      const emp = await createTestEmployee('EMP-RENAME-LINK');
      const comp = await createCatalogComponent(`Original Allowance Name ${Date.now()}`);

      const b1 = await request(app.getHttpServer())
        .put(`/api/employees/${emp.id}/basic-salary`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          amount: '15000.00',
          expectedCurrentId: null,
          expectedVersion: emp.version,
        });

      const assignRes = await request(app.getHttpServer())
        .post(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          componentId: comp.id,
          amount: '3500.00',
          expectedVersion: b1.body.employeeVersion,
        });
      expect(assignRes.status).toBe(201);
      expect(assignRes.body.item.name).toBe(comp.name);

      // Rename shared component in catalog
      const newName = `Renamed Allowance Definition ${Date.now()}`;
      const renameRes = await request(app.getHttpServer())
        .patch(`/api/salary-components/${comp.id}`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie)
        .send({
          name: newName,
          expectedVersion: comp.version,
        });
      expect(renameRes.status).toBe(200);

      // Query employee components: dynamically joined name is updated, amount unchanged
      const compListRes = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/components`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);
      expect(compListRes.status).toBe(200);
      expect(compListRes.body.items[0].name).toBe(newName);
      expect(compListRes.body.items[0].amount).toBe('3500.00');

      // History also reflects dynamic joined name
      const compHistRes = await request(app.getHttpServer())
        .get(`/api/employees/${emp.id}/components/history`)
        .set('Origin', testClientOrigin)
        .set('X-Salary-Client', 'web')
        .set('Cookie', authCookie);
      expect(compHistRes.status).toBe(200);
      expect(compHistRes.body.items[0].name).toBe(newName);
      expect(compHistRes.body.items[0].amount).toBe('3500.00');
    });
  });
});
