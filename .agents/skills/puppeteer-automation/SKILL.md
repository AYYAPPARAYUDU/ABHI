---
name: puppeteer-automation
description: >-
  Browser automation and testing using Puppeteer and Chrome DevTools Protocol.
  Use when the user wants to automate browser interactions, take screenshots,
  scrape web content, run E2E tests, or verify ABHI's UI renders correctly.
  Complements the Chrome DevTools plugin with programmatic scripting.
---

# Puppeteer Automation — Browser Scripting Skill

## Overview
Puppeteer provides programmatic control over Chrome/Chromium for browser
automation, testing, and verification. This skill covers writing Puppeteer
scripts for the ABHI project — from E2E testing to visual verification of
the 3D interface.

## When to Activate
- User wants to automate browser interactions
- E2E testing of ABHI's Angular frontend
- Taking screenshots for visual regression testing
- Verifying Three.js canvas renders correctly
- Scraping or interacting with web pages
- Performance profiling of the frontend

## Setup

### Installation (in ABHI project)
```bash
cd frontend
npm install --save-dev puppeteer
```

### Basic Script Template
```typescript
import puppeteer from 'puppeteer';

async function run() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto('http://127.0.0.1:4200/', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Your automation here

  } finally {
    await browser.close();
  }
}

run().catch(console.error);
```

## Common Patterns for ABHI

### Screenshot of 3D Scene
```typescript
// Wait for Three.js canvas to render
await page.waitForSelector('canvas', { timeout: 10000 });

// Wait for initial animation to stabilize
await page.waitForTimeout(2000);

// Take screenshot
await page.screenshot({
  path: 'screenshots/abhi-3d-scene.png',
  fullPage: true
});
```

### Verify Theme Switch
```typescript
// Switch to Amethyst theme
await page.click('[data-testid="theme-toggle"]');
await page.waitForTimeout(500);

// Verify CSS variable changed
const accentColor = await page.evaluate(() =>
  getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim()
);
console.assert(accentColor === '#a855f7', `Expected amethyst, got ${accentColor}`);
```

### Test Voice Input UI
```typescript
// Click voice button
await page.click('[data-testid="voice-input-btn"]');

// Check that listening indicator appears
const isListening = await page.waitForSelector('.listening-indicator', {
  visible: true,
  timeout: 5000
});
console.assert(isListening, 'Listening indicator should be visible');
```

### Performance Trace
```typescript
// Start tracing
await page.tracing.start({ path: 'trace.json', screenshots: true });

// Navigate and interact
await page.goto('http://127.0.0.1:4200/');
await page.waitForTimeout(5000);

// Stop and analyze
await page.tracing.stop();
console.log('Trace saved to trace.json — open in Chrome DevTools Performance tab');
```

### API Integration Test
```typescript
// Test backend endpoint through the UI
await page.goto('http://127.0.0.1:4200/');

// Type a command
await page.type('[data-testid="command-input"]', 'hello abhi');
await page.keyboard.press('Enter');

// Wait for response
const response = await page.waitForSelector('[data-testid="agent-response"]', {
  visible: true,
  timeout: 15000
});

const text = await response.evaluate(el => el.textContent);
console.log('Agent response:', text);
```

### Canvas WebGL Verification
```typescript
// Verify WebGL context is active and rendering
const webglInfo = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return { error: 'No canvas found' };

  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  if (!gl) return { error: 'No WebGL context' };

  return {
    renderer: gl.getParameter(gl.RENDERER),
    vendor: gl.getParameter(gl.VENDOR),
    width: canvas.width,
    height: canvas.height
  };
});
console.log('WebGL Info:', webglInfo);
```

## E2E Test Structure
```
frontend/e2e/
  ├── tests/
  │   ├── home.spec.ts       # Main 3D workspace
  │   ├── theme.spec.ts      # Theme switching
  │   ├── voice.spec.ts      # Voice input
  │   └── agent.spec.ts      # Agent interaction
  ├── helpers/
  │   └── setup.ts           # Browser launch helpers
  └── screenshots/           # Visual regression baseline
```

## Rules
1. **Always close the browser** — Use try/finally to prevent zombie processes
2. **Set explicit timeouts** — Don't rely on defaults, use 10-30s for ABHI
3. **Wait for canvas** — Three.js needs time to initialize, always wait
4. **Use data-testid** — Don't rely on CSS classes for test selectors
5. **Headless by default** — Use `headless: 'new'` unless debugging
6. **Rate-limit screenshots** — Don't screenshot every frame in animations

## Integration with Chrome DevTools Plugin
This skill works alongside the installed **Chrome DevTools** plugin. Use:
- **This skill** for scripted, repeatable automation
- **Chrome DevTools plugin** for interactive debugging sessions

