const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const pages = [
    { url: 'http://localhost:3000/login', name: 'login-page' },
    { url: 'http://localhost:3000/signup', name: 'signup-page' },
    { url: 'http://localhost:3000/forgot-password', name: 'forgot-password-page' },
    { url: 'http://localhost:3000/dashboard', name: 'dashboard-page' },
    { url: 'http://localhost:3000/settings', name: 'settings-page' },
    { url: 'http://localhost:3000/users', name: 'users-page' },
    { url: 'http://localhost:3000/teams', name: 'teams-page' },
    { url: 'http://localhost:3000/roles', name: 'roles-page' },
  ];

  for (const p of pages) {
    try {
      console.log(`Taking screenshot of ${p.url}...`);
      await page.goto(p.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(r => setTimeout(r, 1000)); // Wait for animations
      const screenshotPath = path.join(SCREENSHOTS_DIR, `${p.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });
      console.log(`Saved: ${screenshotPath}`);
    } catch (error) {
      console.error(`Error taking screenshot of ${p.url}:`, error.message);
    }
  }

  await browser.close();
  console.log('Done taking screenshots!');
}

takeScreenshots().catch(console.error);
