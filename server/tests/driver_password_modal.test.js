const assert = require('assert');
const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('../app');
const connectDB = require('../config/db');
const User = require('../models/User');
const Driver = require('../models/Driver');

let server;
let baseUrl;

const startServer = async () => {
  await connectDB();
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      console.log(`🧪 Test Server running at ${baseUrl}`);
      resolve();
    });
  });
};

const stopServer = () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
};

const runPasswordModalTests = async () => {
  try {
    console.log('\n======================================================');
    console.log('FLEETHUB 2.0 - DRIVER PASSWORD SETUP MODAL TEST SUITE');
    console.log('======================================================\n');

    await startServer();

    // 1. Authenticate Admin to create test driver
    console.log('>>> Setup: Authenticating Admin...');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@fleethub.com',
        password: 'admin123',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginData.token;
    console.log('✔ Admin authenticated successfully.');

    // 2. Admin creates a new Driver with temporary password
    console.log('\n>>> Step 1: Admin creates Driver with temporary credentials...');
    const uniqueId = Date.now().toString().slice(-6);
    const testDriverEmail = `rahul.driver.${uniqueId}@fleethub.com`;
    const testDriverPhone = `98${uniqueId.padStart(8, '7')}`.slice(0, 10);
    const testDriverLicense = `MH12-${uniqueId}-DL`;

    const createDriverRes = await fetch(`${baseUrl}/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Rahul Patil',
        email: testDriverEmail,
        phone: testDriverPhone,
        licenseNumber: testDriverLicense,
        licenseExpiryDate: '2028-12-31',
        address: 'Kothrud, Pune',
      }),
    });
    const createDriverData = await createDriverRes.json();
    assert.strictEqual(createDriverRes.status, 201, `Create driver failed: ${JSON.stringify(createDriverData)}`);
    const tempPassword = createDriverData.data.temporaryPassword;
    const newDriverId = createDriverData.data.driver.id || createDriverData.data.driver._id;
    const newUserId = createDriverData.data.driver.userId;

    assert.ok(tempPassword, 'Temporary password must be returned');
    console.log(`✔ Step 1 Passed: Driver created. Email: ${testDriverEmail}, Temp Password: ${tempPassword}`);

    // 3. Driver logs in with temporary password (User story: opens FleetHub on mobile/device)
    console.log('\n>>> Step 2: Driver logs in with temporary password...');
    const driverLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDriverEmail,
        password: tempPassword,
      }),
    });
    const driverLoginData = await driverLoginRes.json();
    assert.strictEqual(driverLoginRes.status, 200);
    assert.strictEqual(driverLoginData.user.role, 'DRIVER');
    assert.strictEqual(driverLoginData.user.mustChangePassword, true, 'mustChangePassword must be TRUE on first login');
    const driverToken = driverLoginData.token;
    console.log('✔ Step 2 Passed: Driver login successful. Flag mustChangePassword = true (triggers Modal display).');

    // 4. Test Error Case: Driver enters wrong current temporary password
    console.log('\n>>> Step 3: Test wrong current temporary password...');
    const wrongCurrentRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'IncorrectOldPassword123!',
        newPassword: 'MyStrongNewPassword@2026',
        confirmPassword: 'MyStrongNewPassword@2026',
      }),
    });
    const wrongCurrentData = await wrongCurrentRes.json();
    assert.strictEqual(wrongCurrentRes.status, 400);
    assert.strictEqual(wrongCurrentData.success, false);
    assert.strictEqual(wrongCurrentData.message, 'Current password is incorrect.');
    console.log('✔ Step 3 Passed: Wrong current password correctly rejected with 400 Bad Request.');

    // 5. Test Error Case: New password and Confirm password mismatch
    console.log('\n>>> Step 4: Test password confirmation mismatch...');
    const mismatchRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: 'MyStrongNewPassword@2026',
        confirmPassword: 'DifferentConfirmPassword@2026',
      }),
    });
    const mismatchData = await mismatchRes.json();
    assert.strictEqual(mismatchRes.status, 400);
    assert.strictEqual(mismatchData.success, false);
    console.log('✔ Step 4 Passed: Password mismatch correctly rejected with 400 Bad Request.');

    // 6. Test Error Case: New password is weak (less than 8 chars, missing symbols)
    console.log('\n>>> Step 5: Test weak / invalid new password...');
    const weakPassRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: 'weak',
        confirmPassword: 'weak',
      }),
    });
    const weakPassData = await weakPassRes.json();
    assert.strictEqual(weakPassRes.status, 400);
    assert.strictEqual(weakPassData.success, false);
    console.log('✔ Step 5 Passed: Weak password rejected with 400 Bad Request.');

    // 7. Test Error Case: New password is the same as the temporary password
    console.log('\n>>> Step 6: Test new password identical to temporary password...');
    const samePassRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: tempPassword,
        confirmPassword: tempPassword,
      }),
    });
    const samePassData = await samePassRes.json();
    assert.strictEqual(samePassRes.status, 400);
    assert.strictEqual(samePassData.success, false);
    console.log('✔ Step 6 Passed: Identical new password rejected with 400 Bad Request.');

    // 8. Test Success: Valid password change
    console.log('\n>>> Step 7: Test successful password change...');
    const validNewPassword = 'RahulPermanent@2026';
    const changeSuccessRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: validNewPassword,
        confirmPassword: validNewPassword,
      }),
    });
    const changeSuccessData = await changeSuccessRes.json();
    assert.strictEqual(changeSuccessRes.status, 200);
    assert.strictEqual(changeSuccessData.success, true);
    assert.strictEqual(changeSuccessData.data.mustChangePassword, false, 'mustChangePassword must become false');
    console.log('✔ Step 7 Passed: Password successfully changed. mustChangePassword is now false.');

    // 9. Verify database state
    console.log('\n>>> Step 8: Verify persistence in MongoDB...');
    const userInDb = await User.findById(newUserId);
    assert.strictEqual(userInDb.mustChangePassword, false, 'Database must record mustChangePassword = false');
    console.log('✔ Step 8 Passed: MongoDB record updated: mustChangePassword is false.');

    // 10. Verify /auth/me returns mustChangePassword: false (browser refresh check)
    console.log('\n>>> Step 9: Verify /auth/me session on browser refresh...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const meData = await meRes.json();
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meData.data.mustChangePassword, false, 'Session must return mustChangePassword = false');
    console.log('✔ Step 9 Passed: /auth/me returns mustChangePassword = false. Modal will not reappear on refresh.');

    // 11. Verify old temporary password can no longer be used to log in
    console.log('\n>>> Step 10: Verify old temporary password is now invalid...');
    const oldLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDriverEmail,
        password: tempPassword,
      }),
    });
    assert.strictEqual(oldLoginRes.status, 401, 'Old temporary password must be rejected');
    console.log('✔ Step 10 Passed: Old temporary password rejected with 401 Unauthorized.');

    // 12. Verify new password allows successful login
    console.log('\n>>> Step 11: Verify login with new permanent password...');
    const newLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDriverEmail,
        password: validNewPassword,
      }),
    });
    const newLoginData = await newLoginRes.json();
    assert.strictEqual(newLoginRes.status, 200);
    assert.strictEqual(newLoginData.user.mustChangePassword, false);
    assert.ok(newLoginData.token);
    console.log('✔ Step 11 Passed: Driver successfully logged in with new permanent password.');

    console.log('\n======================================================');
    console.log('🎉 ALL 11 DRIVER PASSWORD SETUP MODAL TESTS PASSED!');
    console.log('======================================================\n');

    await stopServer();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    await stopServer();
    process.exit(1);
  }
};

runPasswordModalTests();
