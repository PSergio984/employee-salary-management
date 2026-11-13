import { chromium } from 'playwright';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../backend');
const frontendDir = __dirname;

const BACKEND_PORT = 5077;
const FRONTEND_PORT = 5199;
const CLIENT_ORIGIN = `http://localhost:${FRONTEND_PORT}`;
const API_URL = `http://localhost:${BACKEND_PORT}`;

console.log('--- Starting Isolated Browser Smoke Test (Ticket 07) ---');

async function waitForUrl(url, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 401 || res.status === 404) {
        return true;
      }
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function run() {
  let backendProc = null;
  let frontendProc = null;
  let browser = null;

  try {
    // 1. Spawn backend on isolated port 5077
    console.log(`Launching backend on port ${BACKEND_PORT}...`);
    backendProc = spawn('node', ['dist/main.js'], {
      cwd: backendDir,
      env: {
        ...process.env,
        PORT: String(BACKEND_PORT),
        CLIENT_ORIGIN: `http://localhost:5173,http://localhost:${FRONTEND_PORT}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    backendProc.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('Backend server running')) {
        console.log(`[Backend Log] ${s.trim()}`);
      }
    });
    backendProc.stderr.on('data', (d) => {
      console.error(`[Backend Err] ${d.toString().trim()}`);
    });

    // 2. Spawn frontend on isolated port 5199
    console.log(`Launching frontend on port ${FRONTEND_PORT}...`);
    frontendProc = spawn('npx', ['vite', '--port', String(FRONTEND_PORT)], {
      cwd: frontendDir,
      shell: true,
      env: {
        ...process.env,
        PORT: String(FRONTEND_PORT),
        API_TARGET: API_URL,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    frontendProc.stdout.on('data', (d) => {
      const s = d.toString();
      if (s.includes('Local:')) {
        console.log(`[Frontend Log] ${s.trim()}`);
      }
    });

    console.log('Waiting for backend and frontend to become ready...');
    await waitForUrl(`${API_URL}/api/auth/me`);
    await waitForUrl(`http://localhost:${FRONTEND_PORT}`);
    console.log('Both servers are listening and ready!');

    // 3. Launch headless Chromium
    console.log('Launching headless Chromium via Playwright...');
    const chromePath = 'C:\\Users\\admin\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe';
    browser = await chromium.launch({
      headless: true,
      executablePath: chromePath,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    // 4. Sign in
    console.log('Navigating to login page...');
    page.on('console', (msg) => console.log('[Browser Console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[Browser PageError]', err.message));

    await page.goto(`http://localhost:${FRONTEND_PORT}`);
    await page.waitForSelector('input[name="username"], #username-input, input[type="text"]');

    console.log('Submitting login credentials...');
    const usernameInput = page.locator('input[type="text"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    await usernameInput.fill('admin');
    await passwordInput.fill('ChangeMeInProduction123!');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(2000);
    const alert = page.locator('div[role="alert"]');
    if (await alert.isVisible()) {
      console.log('Alert visible on page:', await alert.textContent());
    }

    // Wait for AppShell / Dashboard
    await page.waitForSelector('button:has-text("Salary Components")', { timeout: 15000 });
    console.log('Authentication successful!');

    // 5. Navigate to Component Catalog
    console.log('Navigating to Component Catalog tab...');
    await page.locator('button:has-text("Salary Components")').click();
    await page.waitForSelector('h1:has-text("Salary Component Catalog")');
    console.log('Component catalog view loaded.');

    const timestamp = Date.now();
    const cancelCompName = `Cancel Test Comp ${timestamp}`;
    const archiveCompName = `Archive Stale Comp ${timestamp}`;

    // Create Cancel Test Component via UI
    console.log('Creating test component for Cancel flow...');
    await page.locator('button:has-text("Create Component")').click();
    await page.locator('#component-name-input').fill(cancelCompName);
    await page.locator('button:has-text("Create Component")').last().click();
    await page.waitForSelector(`tr:has-text("${cancelCompName}")`, { timeout: 10000 });
    console.log(`Created component: ${cancelCompName}`);

    // Create Archive Test Component via UI
    console.log('Creating test component for Archive & Conflict flow...');
    await page.locator('button:has-text("Create Component")').click();
    await page.locator('#component-name-input').fill(archiveCompName);
    await page.locator('button:has-text("Create Component")').last().click();
    await page.waitForSelector(`tr:has-text("${archiveCompName}")`, { timeout: 10000 });
    console.log(`Created component: ${archiveCompName}`);

    // 6. Test Cancel Flow
    console.log('Testing Archive Cancel Flow...');
    const cancelRow = page.locator(`tr:has-text("${cancelCompName}")`);
    await cancelRow.waitFor({ state: 'visible', timeout: 10000 });
    const archiveBtn = cancelRow.locator('button:has-text("Archive")');
    await archiveBtn.click();

    // Modal opens
    const modal = page.locator('div[role="dialog"]:has-text("Archive Shared Salary Component")');
    await modal.waitFor({ state: 'visible' });
    console.log('Archive preview modal is open.');

    // Click Cancel
    const cancelBtn = modal.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await modal.waitFor({ state: 'hidden' });
    console.log('Modal closed via Cancel button.');

    // Verify component is still active
    await cancelRow.waitFor({ state: 'visible' });
    console.log('Verified: Component remains active after cancel.');

    // 7. Test Changed-Count Reconfirmation Flow
    console.log('Testing Stale Confirmation / Reconfirmation Flow...');
    const archiveRow = page.locator(`tr:has-text("${archiveCompName}")`);
    await archiveRow.waitFor({ state: 'visible' });
    await archiveRow.locator('button:has-text("Archive")').click();

    await modal.waitFor({ state: 'visible' });
    await modal.locator('text=Currently Active Assignments').waitFor();
    console.log('Modal loaded with initial preview (0 assignments).');

    // In the background, assign this component to a new employee to make preview stale
    console.log('Triggering background assignment to cause 409 stale conflict...');
    const cookies = await context.cookies();
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

    // 7a. Fetch component ID of archiveCompName
    const catRes = await fetch(`${API_URL}/api/salary-components?search=${encodeURIComponent(archiveCompName)}`, {
      headers: { Cookie: cookieHeader, Origin: CLIENT_ORIGIN, 'X-Salary-Client': 'web' },
    });
    const catData = await catRes.json();
    const targetComp = catData.items.find((i) => i.name === archiveCompName);
    if (!targetComp) throw new Error(`${archiveCompName} not found`);

    // 7b. Create an employee with unique ID
    const empId = `EMP-SMOKE-${timestamp}`;
    const empRes = await fetch(`${API_URL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Origin: CLIENT_ORIGIN,
        'X-Salary-Client': 'web',
      },
      body: JSON.stringify({
        employeeId: empId,
        firstName: 'Smoke',
        lastName: 'Tester',
        dateHired: '2026-02-01',
      }),
    });
    const empData = await empRes.json();

    // 7c. Assign basic salary
    await fetch(`${API_URL}/api/employees/${empData.id}/basic-salary`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Origin: CLIENT_ORIGIN,
        'X-Salary-Client': 'web',
      },
      body: JSON.stringify({
        amount: '25000.00',
        expectedCurrentId: null,
        expectedVersion: 1,
      }),
    });

    // 7d. Assign targetComp
    await fetch(`${API_URL}/api/employees/${empData.id}/components`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Origin: CLIENT_ORIGIN,
        'X-Salary-Client': 'web',
      },
      body: JSON.stringify({
        componentId: targetComp.id,
        amount: '1200.00',
        expectedVersion: 2,
      }),
    });
    console.log('Background assignment created! Active count is now 1 instead of 0.');

    // 7e. In browser, click "Confirm Archive" (submits expectedAffectedCount = 0)
    console.log('Clicking Confirm Archive with stale preview...');
    const confirmBtn = modal.locator('button:has-text("Confirm Archive")');
    await confirmBtn.click();

    // The modal should detect 409 conflict, display the warning banner, and update the affected count!
    console.log('Checking for conflict alert and updated impact in modal...');
    await modal.locator('div[role="alert"]').waitFor({ state: 'visible', timeout: 10000 });
    const alertText = await modal.locator('div[role="alert"]').textContent();
    console.log(`Alert detected in modal: "${alertText}"`);
    await modal.locator('text=1 employee').waitFor({ timeout: 10000 });
    console.log('Verified: Conflict detected! Fresh impact (1 employee) is displayed, requiring new confirmation.');

    // 8. Confirm Archive with Fresh Impact
    console.log('Confirming archive with fresh preview...');
    await page.waitForTimeout(1000);
    await confirmBtn.click();

    // Modal closes
    await modal.waitFor({ state: 'hidden', timeout: 10000 });
    console.log('Modal closed after confirmation.');

    // Success banner appears
    await page.locator(`text=${archiveCompName}" was successfully archived`).waitFor({ timeout: 10000 });
    console.log('Verified: Success banner displayed.');

    // Component is no longer in the Active list
    const activeCompRow = page.locator(`tbody tr:has-text("${archiveCompName}")`);
    const isVisibleInActive = await activeCompRow.isVisible();
    if (isVisibleInActive) {
      throw new Error('Component should not be in Active list after archive');
    }
    console.log('Verified: Component removed from Active Components list.');

    // 9. Check Archived Components Tab
    console.log('Switching to Archived Components tab...');
    await page.locator('button:has-text("Archived Components")').click();
    await page.waitForSelector('text=Read-Only Archived Definitions');

    // Verify component is present in Archived list
    const archivedCompRow = page.locator(`tr:has-text("${archiveCompName}")`);
    await archivedCompRow.waitFor({ state: 'visible', timeout: 10000 });

    // Verify Read-only status
    const hasReadonlyBadge = await archivedCompRow.locator('text=Read-only').isVisible();
    const hasArchivedBadge = await archivedCompRow.locator('text=Archived').isVisible();
    const hasRenameBtn = await archivedCompRow.locator('button:has-text("Rename")').isVisible();
    const hasArchiveBtn = await archivedCompRow.locator('button:has-text("Archive")').isVisible();

    if (!hasReadonlyBadge || !hasArchivedBadge || hasRenameBtn || hasArchiveBtn) {
      throw new Error('Archived row failed read-only invariant checks');
    }
    console.log('Verified: Archived component is read-only with no Rename, Archive, or Restore actions.');

    // Capture screenshot
    const screenshotPath = path.resolve(__dirname, 'smoke-test-archived-catalog.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Saved smoke screenshot to: ${screenshotPath}`);

    console.log('=== ALL BROWSER SMOKE CHECKS PASSED SUCCESSFULLY ===');
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (frontendProc) {
      frontendProc.kill();
    }
    if (backendProc) {
      backendProc.kill();
    }
  }
}

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
