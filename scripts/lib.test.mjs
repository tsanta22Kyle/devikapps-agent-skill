import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { autoScroll, chromium, openPage } from './lib.mjs';

function createMhtmlFixture() {
  const boundary = '----CloneScrollFixtureBoundary';
  const html = '<!doctype html><html><head><title>Scroll fixture</title></head><body style="margin:0"><div style="height:1200px"></div></body></html>';
  const contents = [
    'From: <Saved by Blink>',
    'Snapshot-Content-Location: https://fixture.invalid/',
    'Subject: Scroll fixture',
    'MIME-Version: 1.0',
    'Content-Type: multipart/related;',
    '\ttype="text/html";',
    `\tboundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="utf-8"',
    'Content-Transfer-Encoding: 8bit',
    'Content-Location: https://fixture.invalid/',
    '',
    html,
    `--${boundary}--`,
    '',
  ].join('\r\n');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-scroll-'));
  const file = path.join(dir, 'fixture.mhtml');
  fs.writeFileSync(file, contents, 'utf8');
  return { dir, file };
}

async function startServer(handler) {
  const server = http.createServer(handler);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise(resolve => server.close(resolve)),
  };
}

function pageHtml({ height = 5000, script = '' } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Scroll test</title><script>${script}</script></head><body style="margin:0"><main style="height:${height}px"></main></body></html>`;
}

test('autoScroll_mhtml_finishes_and_restores_top', { timeout: 10000 }, async () => {
  const fixture = createMhtmlFixture();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.goto(pathToFileURL(fixture.file).href, { waitUntil: 'domcontentloaded' });
    const result = await Promise.race([
      autoScroll(page).then(() => 'completed'),
      new Promise(resolve => setTimeout(() => resolve('timeout'), 2500)),
    ]);
    assert.equal(result, 'completed', 'scroll should finish on a sandboxed MHTML page');
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'scroll should restore the page to the top');
  } finally {
    await browser.close();
    fs.rmSync(fixture.dir, { recursive: true, force: true });
  }
});

test('autoScroll_live_page_scrolls_and_restores_top', { timeout: 10000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.setContent(pageHtml());
    await page.evaluate(() => {
      window.__scrollEvents = 0;
      window.addEventListener('scroll', () => window.__scrollEvents++);
    });
    await autoScroll(page);
    assert.ok(await page.evaluate(() => window.__scrollEvents) > 0, 'scroll events should fire');
    assert.equal(await page.evaluate(() => window.scrollY), 0, 'page should return to the top');
  } finally {
    await browser.close();
  }
});

test('autoScroll_limits_distance', { timeout: 15000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.setContent(pageHtml({ height: 50000 }));
    await page.evaluate(() => {
      window.__maxScrollY = 0;
      window.addEventListener('scroll', () => { window.__maxScrollY = Math.max(window.__maxScrollY, window.scrollY); });
    });
    await autoScroll(page);
    const maxY = await page.evaluate(() => window.__maxScrollY);
    assert.ok(maxY > 29000, `expected a full pass near the 30000 px cap, got ${maxY}`);
    assert.ok(maxY <= 30400, `scroll exceeded the 30000 px cap by more than one step: ${maxY}`);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  } finally {
    await browser.close();
  }
});

test('autoScroll_recovers_once_from_navigation', { timeout: 12000 }, async () => {
  const server = await startServer((req, res) => {
    if (req.url === '/redirect-on-scroll') {
      const script = `window.addEventListener('scroll', () => { if (!sessionStorage.getItem('did-scroll-nav')) { sessionStorage.setItem('did-scroll-nav', '1'); location.href = '/after-scroll'; } });`;
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(pageHtml({ script }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(pageHtml());
  });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
    await page.goto(`${server.url}/redirect-on-scroll`, { waitUntil: 'domcontentloaded' });
    await autoScroll(page);
    assert.equal(new URL(page.url()).pathname, '/after-scroll');
    assert.equal(await page.evaluate(() => window.scrollY), 0);
  } finally {
    await browser.close();
    await server.close();
  }
});

test('openPage_honors_noScroll', { timeout: 10000 }, async () => {
  const server = await startServer((_req, res) => {
    const script = `window.__scrollEvents = 0; window.addEventListener('scroll', () => window.__scrollEvents++);`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(pageHtml({ script }));
  });
  const browser = await chromium.launch();
  try {
    const page = await openPage(browser, server.url, 320, 900, { noScroll: true, waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => window.__scrollEvents), 0);
    assert.equal(await page.evaluate(() => window.scrollY), 0);
    await page.context().close();
  } finally {
    await browser.close();
    await server.close();
  }
});

test('openPage_honors_init_and_waitUntil', { timeout: 10000 }, async () => {
  const server = await startServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.flushHeaders();
    setTimeout(() => res.end(pageHtml()), 800);
  });
  const browser = await chromium.launch();
  try {
    const started = performance.now();
    const page = await openPage(browser, server.url, 320, 900, {
      init: () => { window.__cloneInitRan = true; },
      noScroll: true,
      waitUntil: 'commit',
    });
    const elapsed = performance.now() - started;
    assert.ok(elapsed < 400, `waitUntil:commit waited ${elapsed.toFixed(0)} ms for the full response`);
    await page.waitForLoadState('domcontentloaded');
    assert.equal(await page.evaluate(() => window.__cloneInitRan), true);
    await page.context().close();
  } finally {
    await browser.close();
    await server.close();
  }
});
