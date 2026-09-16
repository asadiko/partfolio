// Browser smoke test against the built site: every route renders in three viewports without
// console errors or horizontal overflow, and each interactive island does its one job.
import { chromium } from 'playwright';

const base = process.env.BASE_URL ?? 'http://preview:8080';
const shots = process.env.SHOTS_DIR ?? '/shots';
const routes = [
  '/',
  '/work',
  '/work/batched-pipeline',
  '/work/grounded-answers',
  '/work/long-running-streams',
  '/work/escrow-ledger',
  '/journey',
  '/about',
  '/contact',
];
const viewports = {
  desktop: { viewport: { width: 1280, height: 900 } },
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true },
  dark: { viewport: { width: 1280, height: 900 }, colorScheme: 'dark' },
};

const problems = [];
const fail = (message) => problems.push(message);
const browser = await chromium.launch();

const watch = (page, tag) => {
  page.on(
    'console',
    (m) => m.type() === 'error' && fail(`[${tag}] console ${page.url()}: ${m.text()}`),
  );
  page.on('pageerror', (e) => fail(`[${tag}] pageerror ${page.url()}: ${e.message}`));
  page.on('requestfailed', (r) => fail(`[${tag}] request failed ${r.url()}`));
};

for (const [name, options] of Object.entries(viewports)) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  watch(page, name);
  for (const route of routes) {
    const response = await page.goto(base + route, { waitUntil: 'networkidle' });
    if (response?.status() !== 200) fail(`[${name}] ${route} -> ${response?.status()}`);
    if ((await page.locator('h1').count()) === 0) fail(`[${name}] ${route} has no h1`);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    if (overflow) fail(`[${name}] ${route} scrolls horizontally`);
    const file = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
    await page.screenshot({ path: `${shots}/${name}-${file}.png`, fullPage: name !== 'mobile' });
  }
  await context.close();
}

const context = await browser.newContext(viewports.desktop);
const page = await context.newPage();
watch(page, 'interact');

await page.goto(`${base}/work/batched-pipeline`, { waitUntil: 'networkidle' });
await page.getByRole('radio', { name: /Batched/ }).click();
await page.waitForTimeout(1000);
if ((await page.getByText(/less than naive/).count()) === 0)
  fail('pipeline: batched deltas missing');
await page.getByRole('button', { name: /Citation check/ }).click();
if ((await page.getByRole('heading', { name: 'Citation check + retry' }).count()) === 0)
  fail('pipeline: stage panel missing');

await page.goto(`${base}/work/grounded-answers`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Which HTTP methods are safe/ }).click();
await page.waitForTimeout(8000);
if ((await page.getByText(/stripped — cites/).count()) === 0) fail('grounding: nothing stripped');
await page.getByRole('radio', { name: /Grounding check off/ }).click();
await page.waitForTimeout(6000);
if ((await page.getByText(/unsupported and shown anyway/).count()) === 0)
  fail('grounding: check-off summary missing');
await page.getByLabel('Question').fill('is delete idempotent');
await page.getByRole('button', { name: 'Ask' }).click();
if ((await page.getByRole('button', { name: /Is DELETE idempotent/, pressed: true }).count()) === 0)
  fail('grounding: free-text question did not match');

await page.goto(`${base}/work/long-running-streams`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Provider outage' }).click();
await page.waitForTimeout(16000);
if ((await page.getByText(/complete ·/).count()) === 0) fail('playground: scenario did not finish');
await page.getByRole('button', { name: /LLM gateway/ }).click();
if ((await page.getByRole('heading', { name: 'LLM gateway' }).count()) === 0)
  fail('playground: node card missing');

await page.goto(`${base}/work/escrow-ledger`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Next →' }).click();
await page.getByRole('button', { name: 'Next →' }).click();
if ((await page.getByText('step 3/7').count()) === 0) fail('escrow: step counter wrong');

await page.goto(`${base}/journey`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Junction 2024/ }).click();
await page.keyboard.press('ArrowDown');
const current = await page.locator('[aria-current="step"]').textContent();
if (!current?.includes('Olber')) fail(`journey: arrow key landed on "${current?.slice(0, 40)}"`);

await page.goto(`${base}/about`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Toggle colour theme' }).click();
if ((await page.evaluate(() => document.documentElement.dataset.theme)) !== 'dark')
  fail('theme toggle did not switch to dark');

// AsadOS: room → boot → desktop → apps → terminal → shutdown
await page.goto(`${base}/`, { waitUntil: 'networkidle' });
// Software WebGL in headless Chromium compiles the scene slowly; real GPUs take well under a second.
await page.getByRole('button', { name: 'Turn on' }).waitFor({ timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${shots}/os-room.png` });
await page.getByRole('button', { name: 'Turn on' }).click();
await page.waitForTimeout(2200);
await page.screenshot({ path: `${shots}/os-boot.png` });
await page.getByRole('dialog', { name: 'Read Me' }).waitFor({ timeout: 30000 });
await page.getByRole('button', { name: 'Open Pipeline Explorer' }).click();
await page.getByRole('dialog', { name: 'Pipeline Explorer' }).waitFor();
await page.getByRole('tab', { name: 'Read me' }).click();
if ((await page.getByRole('heading', { name: 'The problem' }).count()) === 0)
  fail('os: read-me tab has no prose');
await page.getByRole('tab', { name: 'Demo' }).click();
await page.getByRole('button', { name: 'Open Terminal' }).click();
await page.getByLabel('Command').fill('open grounding');
await page.keyboard.press('Enter');
await page.getByRole('dialog', { name: 'Grounding' }).waitFor();
await page.screenshot({ path: `${shots}/os-desktop.png` });
await page.getByRole('menuitem', { name: 'Special' }).dispatchEvent('pointerdown');
await page.getByRole('menuitem', { name: 'Shut Down' }).click();
await page.getByRole('button', { name: 'Turn on' }).waitFor({ timeout: 30000 });
await context.close();

const reduced = await browser.newContext({ ...viewports.desktop, reducedMotion: 'reduce' });
const quiet = await reduced.newPage();
await quiet.goto(`${base}/work/long-running-streams`, { waitUntil: 'networkidle' });
await quiet.getByRole('button', { name: 'Client cancels' }).click();
await quiet.waitForTimeout(300);
if ((await quiet.getByText(/complete ·/).count()) === 0)
  fail('reduced motion: scenario not instant');
await reduced.close();

await browser.close();
console.log(problems.length ? `PROBLEMS\n${problems.join('\n')}` : 'ALL CHECKS PASSED');
process.exit(problems.length ? 1 : 0);
