import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Global Salary Component Archive Integration E2E (Ticket 07)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testClientOrigin = 'http://localhost:5173';
  const testAdminUser = 'admin_global_archive_tester';
  const testAdminPass = 'GlobalArchivePass2026!';
  let authCookie: string;

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
              PORT: 5058,
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

    // Clean test slate in foreign key order
    await prisma.employeeSalaryComponent.deleteMany({});
    await prisma.basicSalaryAssignment.deleteMany({});
    await prisma.employee.deleteMany({});
    await prisma.salaryComponent.deleteMany({});

    // Setup authenticated session
    let admin = await prisma.adminUser.findUnique({
      where: { username: testAdminUser },
    });
    if (!admin) {
      const passwordHash = await bcrypt.hash(testAdminPass, 10);
      admin = await prisma.adminUser.create({
        data: {
          username: testAdminUser,
          passwordHash,
        },
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
    authCookie = (cookies as string[])[0].split(';')[0];
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  const authed = (req: request.Test) =>
    req
      .set('Cookie', authCookie)
      .set('Origin', testClientOrigin)
      .set('X-Salary-Client', 'web');

  describe('1. Preview and Confirmation Contract (Acceptance Criteria 1)', () => {
    it('returns backend-derived affected count, name, and current version for preview', async () => {
      // Create component
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'Hazard Pay Allowance',
      });
      expect(compRes.status).toBe(201);
      const compId = compRes.body.id;

      // Create two employees with basic salary
      const emp1 = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-001',
        firstName: 'Juan',
        lastName: 'Dela Cruz',
        dateHired: '2026-01-15',
      });
      const emp2 = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-002',
        firstName: 'Maria',
        lastName: 'Santos',
        dateHired: '2026-02-01',
      });

      await authed(request(app.getHttpServer()).put(`/api/employees/${emp1.body.id}/basic-salary`)).send({
        amount: '20000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${emp2.body.id}/basic-salary`)).send({
        amount: '30000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });

      // Initially 0 affected employees
      const impact0 = await authed(
        request(app.getHttpServer()).get(`/api/salary-components/${compId}/archive-impact`),
      );
      expect(impact0.status).toBe(200);
      expect(impact0.body).toEqual({
        id: compId,
        name: 'Hazard Pay Allowance',
        version: 1,
        isActive: true,
        affectedEmployeeCount: 0,
      });

      // Assign to emp1 and emp2
      const assign1 = await authed(
        request(app.getHttpServer()).post(`/api/employees/${emp1.body.id}/components`),
      ).send({
        componentId: compId,
        amount: '3500.00',
        expectedVersion: 2,
      });
      expect(assign1.status).toBe(201);

      const assign2 = await authed(
        request(app.getHttpServer()).post(`/api/employees/${emp2.body.id}/components`),
      ).send({
        componentId: compId,
        amount: '4000.00',
        expectedVersion: 2,
      });
      expect(assign2.status).toBe(201);

      // Now preview reflects 2 affected employees
      const impact2 = await authed(
        request(app.getHttpServer()).get(`/api/salary-components/${compId}/archive-impact`),
      );
      expect(impact2.status).toBe(200);
      expect(impact2.body.affectedEmployeeCount).toBe(2);
      expect(impact2.body.version).toBe(1);
    });

    it('returns 404 for nonexistent component archive impact preview', async () => {
      const res = await authed(
        request(app.getHttpServer()).get('/api/salary-components/999999/archive-impact'),
      );
      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('2. Stale Confirmation Rollback & Conflict Protection (Acceptance Criteria 2)', () => {
    it('rejects stale expectedVersion with 409 and does not alter database state', async () => {
      // Create component
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'Project Allowance',
      });
      const compId = compRes.body.id;

      // Attempt archive with wrong version
      const staleRes = await authed(
        request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`),
      ).send({
        expectedVersion: 99,
        expectedAffectedCount: 0,
      });

      expect(staleRes.status).toBe(409);
      expect(staleRes.body.error?.code).toBe('STALE_ARCHIVE_PREVIEW');
      expect(staleRes.body.error?.currentVersion).toBe(1);

      // Confirm component is still active in database
      const checkComp = await prisma.salaryComponent.findUnique({ where: { id: compId } });
      expect(checkComp?.isActive).toBe(true);
      expect(checkComp?.version).toBe(1);
    });

    it('rejects stale expectedAffectedCount with 409 when count changes before execution', async () => {
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'Shift Differential',
      });
      const compId = compRes.body.id;

      // Assign to emp
      const emp = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-STALE',
        firstName: 'Stale',
        lastName: 'Tester',
        dateHired: '2026-03-01',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${emp.body.id}/basic-salary`)).send({
        amount: '25000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });
      await authed(request(app.getHttpServer()).post(`/api/employees/${emp.body.id}/components`)).send({
        componentId: compId,
        amount: '1500.00',
        expectedVersion: 2,
      });

      // Submit archive with expectedAffectedCount = 0 (stale confirmation)
      const res = await authed(
        request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`),
      ).send({
        expectedVersion: 1,
        expectedAffectedCount: 0,
      });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe('STALE_ARCHIVE_PREVIEW');
      expect(res.body.error?.currentAffectedCount).toBe(1);

      // Verify no changes were committed
      const assignment = await prisma.employeeSalaryComponent.findFirst({
        where: { componentId: compId, employeeId: emp.body.id },
      });
      expect(assignment?.isActive).toBe(true);
      expect(assignment?.endedAt).toBeNull();
    });
  });

  describe('3. Atomic Archival across Active & Archived Employees with Retained History (Acceptance Criteria 3)', () => {
    it('atomically deactivates current assignments including archived employees and preserves history/amounts', async () => {
      // 1. Create component
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'Atomic Communications Allowance',
      });
      const compId = compRes.body.id;

      // 2. Create Active Employee A
      const empA = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-ACTA',
        firstName: 'Active',
        lastName: 'EmployeeA',
        dateHired: '2026-01-10',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${empA.body.id}/basic-salary`)).send({
        amount: '20000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });

      // Assign initial 1000.00, then update to 1500.00 to generate historical record
      const assignA1 = await authed(
        request(app.getHttpServer()).post(`/api/employees/${empA.body.id}/components`),
      ).send({
        componentId: compId,
        amount: '1000.00',
        expectedVersion: 2,
      });
      const assignA2 = await authed(
        request(app.getHttpServer()).put(`/api/employees/${empA.body.id}/components/${compId}`),
      ).send({
        amount: '1500.00',
        expectedCurrentId: assignA1.body.item.id,
        expectedVersion: 3,
      });
      expect(assignA2.status).toBe(200);

      // 3. Create Employee B and archive Employee B while having an active assignment
      const empB = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-ARCHB',
        firstName: 'Archived',
        lastName: 'EmployeeB',
        dateHired: '2026-01-12',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${empB.body.id}/basic-salary`)).send({
        amount: '22000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });
      const assignB = await authed(
        request(app.getHttpServer()).post(`/api/employees/${empB.body.id}/components`),
      ).send({
        componentId: compId,
        amount: '2000.00',
        expectedVersion: 2,
      });
      expect(assignB.status).toBe(201);

      // Archive Employee B
      const archiveEmpB = await authed(
        request(app.getHttpServer()).post(`/api/employees/${empB.body.id}/archive`),
      ).send({
        expectedVersion: 3,
      });
      expect(archiveEmpB.status).toBe(200);
      expect(archiveEmpB.body.isActive).toBe(false);

      // Verify preview counts 2 active assignments (empA current row + empB current row)
      const impact = await authed(
        request(app.getHttpServer()).get(`/api/salary-components/${compId}/archive-impact`),
      );
      expect(impact.status).toBe(200);
      expect(impact.body.affectedEmployeeCount).toBe(2);

      // 4. Archive component atomically
      const archiveRes = await authed(
        request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`),
      ).send({
        expectedVersion: 1,
        expectedAffectedCount: 2,
      });

      expect(archiveRes.status).toBe(200);
      expect(archiveRes.body).toEqual({
        id: compId,
        name: 'Atomic Communications Allowance',
        isActive: false,
        version: 2,
        deactivatedAssignmentsCount: 2,
      });

      // 5. Database invariants verification
      // A. Definition is inactive with incremented version
      const dbComp = await prisma.salaryComponent.findUnique({ where: { id: compId } });
      expect(dbComp?.isActive).toBe(false);
      expect(dbComp?.version).toBe(2);

      // B. All assignments for this component are now inactive
      const allCompAssignments = await prisma.employeeSalaryComponent.findMany({
        where: { componentId: compId },
        orderBy: [{ id: 'asc' }],
      });
      // There were 3 rows total: empA (historical 1000), empA (current 1500), empB (current 2000)
      expect(allCompAssignments.length).toBe(3);

      // Row 1 (already-historical): amount 1000.00 must remain unchanged and endedAt preserved
      expect(Number(allCompAssignments[0].amount)).toBe(1000.00);
      expect(allCompAssignments[0].isActive).toBe(false);

      // Row 2 (previously active empA): deactivated by archive, amount 1500.00 preserved
      expect(Number(allCompAssignments[1].amount)).toBe(1500.00);
      expect(allCompAssignments[1].isActive).toBe(false);
      expect(allCompAssignments[1].endedAt).not.toBeNull();

      // Row 3 (previously active on archived empB): deactivated by archive, amount 2000.00 preserved
      expect(Number(allCompAssignments[2].amount)).toBe(2000.00);
      expect(allCompAssignments[2].isActive).toBe(false);
      expect(allCompAssignments[2].endedAt).not.toBeNull();
    });
  });

  describe('4. Rate Recalculation & Summary Invariants (Acceptance Criteria 4)', () => {
    it('immediately excludes archived component from salary summary total compensation and rates', async () => {
      // Create component
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'Meal Subsidy Allowance',
      });
      const compId = compRes.body.id;

      // Create employee: Basic 20,000.00 + Component 5,000.00 -> Total 25,000.00
      const emp = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-RATES',
        firstName: 'Rate',
        lastName: 'Recalc',
        dateHired: '2026-02-14',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${emp.body.id}/basic-salary`)).send({
        amount: '20000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });
      await authed(request(app.getHttpServer()).post(`/api/employees/${emp.body.id}/components`)).send({
        componentId: compId,
        amount: '5000.00',
        expectedVersion: 2,
      });

      // Verify pre-archive summary has 25,000.00 total
      const preSummary = await authed(
        request(app.getHttpServer()).get(`/api/employees/${emp.body.id}/salary-summary`),
      );
      expect(preSummary.status).toBe(200);
      expect(preSummary.body.basicSalary).toBe('20000.00');
      expect(preSummary.body.totalMonthlyCompensation).toBe('25000.00');
      expect(preSummary.body.components.length).toBe(1);
      expect(preSummary.body.rates.total.monthly).toBe('25000.00');
      expect(preSummary.body.rates.total.annual).toBe('300000.00');
      expect(preSummary.body.rates.total.daily).toBe('955.41');
      expect(preSummary.body.rates.total.hourly).toBe('119.43');
      expect(preSummary.body.rates.total.minute).toBe('1.99');

      // Archive component definition
      const archiveRes = await authed(
        request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`),
      ).send({
        expectedVersion: 1,
        expectedAffectedCount: 1,
      });
      expect(archiveRes.status).toBe(200);

      // Post-archive summary: total compensation must fall back to basic salary (20,000.00)
      const postSummary = await authed(
        request(app.getHttpServer()).get(`/api/employees/${emp.body.id}/salary-summary`),
      );
      expect(postSummary.status).toBe(200);
      expect(postSummary.body.basicSalary).toBe('20000.00');
      expect(postSummary.body.totalMonthlyCompensation).toBe('20000.00');
      expect(postSummary.body.components).toEqual([]);
      expect(postSummary.body.rates.total.monthly).toBe('20000.00');
      expect(postSummary.body.rates.total.annual).toBe('240000.00');
      expect(postSummary.body.rates.total.daily).toBe('764.33');
      expect(postSummary.body.rates.total.hourly).toBe('95.54');
      expect(postSummary.body.rates.total.minute).toBe('1.59');

      // Employee active components list returns empty
      const compsList = await authed(
        request(app.getHttpServer()).get(`/api/employees/${emp.body.id}/components`),
      );
      expect(compsList.status).toBe(200);
      expect(compsList.body.items).toEqual([]);
    });
  });

  describe('5. Read-Only Archived Catalog & Unassignability (Acceptance Criteria 5)', () => {
    it('rejects assigning, modifying, or renaming an archived component', async () => {
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'ReadOnly Archived Component',
      });
      const compId = compRes.body.id;

      // Archive it
      await authed(request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`)).send({
        expectedVersion: 1,
        expectedAffectedCount: 0,
      });

      // 1. Attempt rename should fail with 409
      const renameRes = await authed(
        request(app.getHttpServer()).patch(`/api/salary-components/${compId}`),
      ).send({
        name: 'Renamed Archived Component',
        expectedVersion: 2,
      });
      expect(renameRes.status).toBe(409);
      expect(renameRes.body.error?.code).toBe('COMPONENT_ARCHIVED');

      // 2. Attempt assigning to employee should fail with 400
      const emp = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-UNASSIGN',
        firstName: 'Unassign',
        lastName: 'Tester',
        dateHired: '2026-03-01',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${emp.body.id}/basic-salary`)).send({
        amount: '20000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });

      const assignRes = await authed(
        request(app.getHttpServer()).post(`/api/employees/${emp.body.id}/components`),
      ).send({
        componentId: compId,
        amount: '1000.00',
        expectedVersion: 2,
      });
      expect(assignRes.status).toBe(400);
      expect(assignRes.body.error?.code).toBe('COMPONENT_ARCHIVED');

      // 3. Attempt to archive again returns 409
      const reArchiveRes = await authed(
        request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`),
      ).send({
        expectedVersion: 2,
        expectedAffectedCount: 0,
      });
      expect(reArchiveRes.status).toBe(409);
      expect(reArchiveRes.body.error?.code).toBe('COMPONENT_ALREADY_ARCHIVED');
    });

    it('lists components filtered by status (active vs archived) with pagination', async () => {
      const activeList = await authed(
        request(app.getHttpServer()).get('/api/salary-components?status=active&pageSize=50'),
      );
      expect(activeList.status).toBe(200);
      expect(activeList.body.items.every((i: { isActive: boolean }) => i.isActive === true)).toBe(true);

      const archivedList = await authed(
        request(app.getHttpServer()).get('/api/salary-components?status=archived&pageSize=50'),
      );
      expect(archivedList.status).toBe(200);
      expect(archivedList.body.items.length).toBeGreaterThan(0);
      expect(archivedList.body.items.every((i: { isActive: boolean }) => i.isActive === false)).toBe(true);
    });
  });

  describe('6. Normalized Name Reuse & Historical Disambiguation (Acceptance Criteria 6)', () => {
    it('allows reusing archived normalized name as a new distinct ID, preserving historical links on old ID', async () => {
      const reusableName = 'Transportation Allowance';

      // 1. Create first definition
      const comp1Res = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: reusableName,
      });
      expect(comp1Res.status).toBe(201);
      const comp1Id = comp1Res.body.id;

      // Create employee and assign comp1
      const emp = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-REUSE',
        firstName: 'Elena',
        lastName: 'Reyes',
        dateHired: '2026-01-20',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${emp.body.id}/basic-salary`)).send({
        amount: '28000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });
      const assign1 = await authed(
        request(app.getHttpServer()).post(`/api/employees/${emp.body.id}/components`),
      ).send({
        componentId: comp1Id,
        amount: '2500.00',
        expectedVersion: 2,
      });
      expect(assign1.status).toBe(201);

      // 2. Archive comp1
      const archiveRes = await authed(
        request(app.getHttpServer()).post(`/api/salary-components/${comp1Id}/archive`),
      ).send({
        expectedVersion: 1,
        expectedAffectedCount: 1,
      });
      expect(archiveRes.status).toBe(200);

      // 3. Create NEW definition reusing the SAME name
      const comp2Res = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: '   Transportation   Allowance   ', // test trimming/collapsing
      });
      expect(comp2Res.status).toBe(201);
      const comp2Id = comp2Res.body.id;
      expect(comp2Id).not.toBe(comp1Id);
      expect(comp2Res.body.isActive).toBe(true);

      // 4. Assign new comp2 to the same employee
      // Employee version is now 3 (create=1, basic=2, comp1=3)
      const empData = await authed(request(app.getHttpServer()).get(`/api/employees/${emp.body.id}`));
      const assign2 = await authed(
        request(app.getHttpServer()).post(`/api/employees/${emp.body.id}/components`),
      ).send({
        componentId: comp2Id,
        amount: '3000.00',
        expectedVersion: empData.body.version,
      });
      expect(assign2.status).toBe(201);

      // 5. Inspect component assignment history for employee
      const historyRes = await authed(
        request(app.getHttpServer()).get(`/api/employees/${emp.body.id}/components/history`),
      );
      expect(historyRes.status).toBe(200);
      expect(historyRes.body.items.length).toBe(2);

      // Most recent assignment is comp2 (active definition, active assignment)
      const itemComp2 = historyRes.body.items.find((i: { componentId: number }) => i.componentId === comp2Id);
      expect(itemComp2).toBeDefined();
      expect(itemComp2.name).toBe(reusableName);
      expect(itemComp2.amount).toBe('3000.00');
      expect(itemComp2.isActive).toBe(true);
      expect(itemComp2.componentIsActive).toBe(true);

      // Historical assignment remains linked to comp1 (archived definition, ended assignment)
      const itemComp1 = historyRes.body.items.find((i: { componentId: number }) => i.componentId === comp1Id);
      expect(itemComp1).toBeDefined();
      expect(itemComp1.name).toBe(reusableName);
      expect(itemComp1.amount).toBe('2500.00');
      expect(itemComp1.isActive).toBe(false);
      expect(itemComp1.componentIsActive).toBe(false);
      expect(itemComp1.endedAt).not.toBeNull();
    });
  });

  describe('7. Concurrency & Race Condition Invariants (Acceptance Criteria 4)', () => {
    it('coordinates concurrent assignment and archive via definition lock: no active assignment escapes against archived definition', async () => {
      // Create component
      const compRes = await authed(request(app.getHttpServer()).post('/api/salary-components')).send({
        name: 'Race Tested Component',
      });
      const compId = compRes.body.id;

      // Create employee
      const emp = await authed(request(app.getHttpServer()).post('/api/employees')).send({
        employeeId: 'EMP-T7-RACE',
        firstName: 'Race',
        lastName: 'Condition',
        dateHired: '2026-03-10',
      });
      await authed(request(app.getHttpServer()).put(`/api/employees/${emp.body.id}/basic-salary`)).send({
        amount: '30000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      });

      // Fire concurrent requests:
      // Req A: Archive component (expecting 0 affected)
      // Req B: Assign component to employee (amount 1000.00)
      const [archivePromise, assignPromise] = await Promise.allSettled([
        authed(request(app.getHttpServer()).post(`/api/salary-components/${compId}/archive`)).send({
          expectedVersion: 1,
          expectedAffectedCount: 0,
        }),
        authed(request(app.getHttpServer()).post(`/api/employees/${emp.body.id}/components`)).send({
          componentId: compId,
          amount: '1000.00',
          expectedVersion: 2,
        }),
      ]);

      expect(archivePromise.status).toBe('fulfilled');
      expect(assignPromise.status).toBe('fulfilled');

      const archiveResult = (archivePromise as PromiseFulfilledResult<request.Response>).value;
      const assignResult = (assignPromise as PromiseFulfilledResult<request.Response>).value;

      // Verification of atomic outcome:
      // Either Archive won lock first -> Archive 200, Assign 400 (component archived)
      // Or Assign won lock first -> Assign 201, Archive 409 (stale affected count conflict)
      if (archiveResult.status === 200) {
        expect(assignResult.status).toBe(400);
        expect(assignResult.body.error?.code).toBe('COMPONENT_ARCHIVED');
      } else {
        expect(archiveResult.status).toBe(409);
        expect(archiveResult.body.error?.code).toBe('STALE_ARCHIVE_PREVIEW');
        expect(assignResult.status).toBe(201);
      }

      // Check final state invariant: there can NEVER be an active assignment against an archived definition!
      const finalComp = await prisma.salaryComponent.findUnique({ where: { id: compId } });
      const activeAssignments = await prisma.employeeSalaryComponent.findMany({
        where: { componentId: compId, isActive: true },
      });

      if (!finalComp?.isActive) {
        // If definition is archived, active assignments MUST be 0!
        expect(activeAssignments.length).toBe(0);
      }
    });
  });
});
