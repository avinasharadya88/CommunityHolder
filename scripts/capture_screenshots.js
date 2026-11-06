const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clickButtonWithText(page, text) {
  const clicked = await page.evaluate((btnText) => {
    const btns = Array.from(document.querySelectorAll('button'));
    const target = btns.find(b => b.textContent && b.textContent.toLowerCase().includes(btnText.toLowerCase()));
    if (target) {
      target.click();
      return true;
    }
    return false;
  }, text);
  return clicked;
}

async function capture() {
  console.log('Launching Chrome for screenshot capture...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,920']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 920, deviceScaleFactor: 2 });

  // 1. Initial State: Clear session
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(800);

  // Screen 1: Resident Phone Auth Login Screen
  console.log('Capturing Screen 1: Resident Phone Auth Login...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01_resident_phone_login.png') });

  // Click Send 6-Digit OTP
  console.log('Clicking Send 6-Digit OTP...');
  await clickButtonWithText(page, 'Send 6-Digit OTP');
  await wait(800);

  // Screen 2: OTP Verification Screen
  console.log('Capturing Screen 2: OTP Verification Screen...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02_resident_otp_entry.png') });

  // Click Verify & Unlock Pass
  console.log('Clicking Verify & Unlock Pass...');
  await clickButtonWithText(page, 'Verify & Unlock Pass');
  await wait(1200);

  // Screen 3: Approved Resident Dashboard
  console.log('Capturing Screen 3: Approved Resident Dashboard...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03_resident_dashboard.png') });

  // Trigger Simulate Gate Call
  console.log('Clicking Simulate Gate Call...');
  await clickButtonWithText(page, 'Simulate Gate Call');
  await wait(800);

  // Screen 4: Live Gate Intercom Radar
  console.log('Capturing Screen 4: Live Gate Intercom Radar Alert...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04_resident_gate_radar.png') });

  // Dismiss gate call
  await clickButtonWithText(page, 'Leave at Gate');
  await wait(500);

  // Open Pre-Approve Guest Pass Modal
  console.log('Opening Pre-Approve Guest Pass Modal...');
  await page.evaluate(() => {
    const divs = Array.from(document.querySelectorAll('div, button'));
    const target = divs.find(d => d.textContent && d.textContent.includes('Pre-Approve Guest'));
    if (target) target.click();
  });
  await wait(600);

  // Screen 5: Pre-Approve Guest Pass Modal
  console.log('Capturing Screen 5: Pre-Approve Guest Pass Modal...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05_resident_guest_pass_modal.png') });

  // Enter guest name and generate pass
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="Karan Malhotra"]');
    if (input) {
      input.value = 'Vikram Sharma';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await wait(300);
  await clickButtonWithText(page, 'Generate 6-Digit Pass');
  await wait(800);

  // Screen 5b: Generated Pass with PIN & QR Code
  console.log('Capturing Screen 5b: Generated Guest Pass & QR Code...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05b_resident_pass_generated.png') });

  // Close modal if open
  await page.keyboard.press('Escape');
  await wait(400);

  // --- Persona 2: New Resident Applicant (Pending KYC) ---
  console.log('Logging out to capture New Resident Registration flow...');
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await wait(800);

  // Enter phone 9988776655
  await page.evaluate(() => {
    const input = document.querySelector('input[type="tel"]');
    if (input) {
      input.value = '9988776655';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await wait(300);
  await clickButtonWithText(page, 'Send 6-Digit OTP');
  await wait(800);
  await clickButtonWithText(page, 'Verify & Unlock Pass');
  await wait(1200);

  // Screen 6: New Resident KYC Onboarding Vault
  console.log('Capturing Screen 6: New Resident KYC Registration Vault...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06_new_resident_kyc_vault.png') });

  // Submit KYC Registration
  console.log('Submitting KYC documents...');
  await clickButtonWithText(page, 'Submit Documents For Manual Approval');
  await wait(1200);

  // Screen 7: API Gateway Confinement Guard
  console.log('Capturing Screen 7: API Gateway Confinement Guard Banner...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07_kyc_confinement_guard.png') });

  // --- Persona 3: Guard Tablet Console ---
  console.log('Switching to Guard Tablet Console...');
  await clickButtonWithText(page, 'Guard Tablet');
  await wait(1000);

  // Screen 8: Guard Tablet - PIN Barrier Validator
  console.log('Capturing Screen 8: Guard Tablet - PIN Barrier Validator...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08_guard_pin_validator.png') });

  // Enter 6-digit PIN on numpad: 8, 4, 9, 2, 0, 1
  console.log('Typing PIN on numpad...');
  await page.evaluate(() => {
    const pin = '849201';
    for (const char of pin) {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent && b.textContent.trim() === char);
      if (btn) btn.click();
    }
  });
  await wait(400);

  // Screen 8b: PIN Entered with Lift Barrier button ready
  console.log('Capturing Screen 8b: Guard Tablet - PIN Entered on Numpad...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08b_guard_pin_entered.png') });

  // Click Walk-in Check-in Tab
  console.log('Clicking Walk-In Check-In Tab...');
  await clickButtonWithText(page, 'Walk-In Check-In');
  await wait(800);

  // Screen 9: Guard Tablet - Walk-in Check-in
  console.log('Capturing Screen 9: Guard Tablet - Walk-in Check-in Form...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09_guard_walkin_checkin.png') });

  // Click Active & Overstay Tab
  console.log('Clicking Active & Overstay Tab...');
  await clickButtonWithText(page, 'Active & Overstay');
  await wait(800);

  // Screen 10: Guard Tablet - Active Visitors & Overstay
  console.log('Capturing Screen 10: Guard Tablet - Active Occupancy & Crimson Overstay...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10_guard_active_overstay.png') });

  // Click Parcels & Deliveries Tab
  console.log('Clicking Parcels & Deliveries Tab...');
  await clickButtonWithText(page, 'Parcels & Deliveries');
  await wait(800);

  // Screen 11: Guard Tablet - Parcel Custody Bay
  console.log('Capturing Screen 11: Guard Tablet - Parcel Custody Bay...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11_guard_parcel_bay.png') });

  // --- Persona 4: Admin ERP & Facility Manager Workspace ---
  console.log('Switching to Admin ERP...');
  await clickButtonWithText(page, 'Admin ERP');
  await wait(1200);

  // Screen 12: Admin ERP - Split-Screen KYC Review Queue & Watermarked Documents
  console.log('Capturing Screen 12: Admin ERP - KYC Review Queue & Watermark...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12_admin_kyc_queue.png') });

  // Click General Ledger Tab
  console.log('Clicking General Ledger Tab...');
  await clickButtonWithText(page, 'Double-Entry Ledger');
  await wait(800);

  // Screen 13: Admin ERP - Double-Entry General Ledger
  console.log('Capturing Screen 13: Admin ERP - Double-Entry General Ledger...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '13_admin_general_ledger.png') });

  // Click Monthly Billing & VAN Tab
  console.log('Clicking Monthly Billing & VAN Tab...');
  await clickButtonWithText(page, 'Monthly Billing & VAN');
  await wait(800);

  // Screen 14: Admin ERP - Monthly Billing & VAN Webhook Simulation
  console.log('Capturing Screen 14: Admin ERP - Monthly Billing & VAN Webhook...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '14_admin_billing_van.png') });

  // Click DPDPA 2023 Purge Worker Tab
  console.log('Clicking DPDPA Purge Tab...');
  await clickButtonWithText(page, 'DPDPA 2023 Purge Worker');
  await wait(800);

  // Screen 15: Admin ERP - DPDPA 2023 Visitor Retention Purge
  console.log('Capturing Screen 15: Admin ERP - DPDPA 2023 Purge Worker...');
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '15_admin_dpdpa_purge.png') });

  // --- Persona 5: Native Mobile Device Views (390 x 844) ---
  console.log('Opening Mobile Viewport for Native Smartphone Captures...');
  const mobilePage = await browser.newPage();
  await mobilePage.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload({ waitUntil: 'networkidle0' });
  await wait(800);

  // Screen 16: Mobile Native Phone Auth
  console.log('Capturing Screen 16: Mobile Native Phone Auth Viewport...');
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '16_mobile_native_login.png') });

  // Login on Mobile Viewport
  await clickButtonWithText(mobilePage, 'Send 6-Digit OTP');
  await wait(800);
  await clickButtonWithText(mobilePage, 'Verify & Unlock Pass');
  await wait(1200);

  // Screen 17: Mobile Native Approved Resident Super App Dashboard
  console.log('Capturing Screen 17: Mobile Native Resident Super App Dashboard...');
  await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, '17_mobile_native_dashboard.png') });

  await browser.close();
  console.log('=== All screenshots captured successfully! ===');
  console.log('Output directory:', SCREENSHOT_DIR);
}

capture().catch(err => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
