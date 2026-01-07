const puppeteer = require('puppeteer');

async function testLogin() {
  console.log('Starting login test...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Enable console logging from the page
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });

  // Capture network failures
  page.on('requestfailed', request => {
    console.log('Request Failed:', request.url(), request.failure().errorText);
  });

  try {
    // Navigate to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle0', timeout: 30000 });
    console.log('   ✓ Login page loaded\n');

    // Fill in email
    console.log('2. Entering email...');
    await page.type('input[type="email"]', 'jitendra@nirmitee.io');
    console.log('   ✓ Email entered\n');

    // Fill in password
    console.log('3. Entering password...');
    await page.type('input[type="password"]', 'nilkamal0_Y');
    console.log('   ✓ Password entered\n');

    // Click sign in button
    console.log('4. Clicking Sign In...');
    await Promise.all([
      page.click('button[type="submit"]'),
      new Promise(r => setTimeout(r, 5000)), // Wait for response
    ]);

    // Check current URL
    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // Take screenshot of result
    await page.screenshot({ path: 'docs/screenshots/login-test-result.png' });
    console.log('   ✓ Screenshot saved to docs/screenshots/login-test-result.png\n');

    // Check if we landed on dashboard (successful login)
    if (currentUrl.includes('/dashboard') || currentUrl.includes('/login') === false) {
      console.log('✅ LOGIN SUCCESSFUL! Redirected to:', currentUrl);
    } else {
      console.log('❌ LOGIN FAILED - Still on login page');
      // Check for error messages
      const errorText = await page.evaluate(() => {
        const alert = document.querySelector('[role="alert"]');
        return alert ? alert.textContent : null;
      });
      if (errorText) {
        console.log('   Error message:', errorText);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testLogin();
