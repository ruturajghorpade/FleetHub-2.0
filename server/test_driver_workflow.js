const assert = require('assert');
const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, './.env') });
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');
const Driver = require('./models/Driver');
const Delivery = require('./models/Delivery');
const Vehicle = require('./models/Vehicle');
const Client = require('./models/Client');
const Branch = require('./models/Branch');

let server;
let baseUrl;

const startServer = async () => {
  await connectDB();
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      console.log(`🧪 Test Server running at ${baseUrl}`);
      resolve();
    });
  });
};

const stopServer = async () => {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
};

const runDriverWorkflowTests = async () => {
  await startServer();

  try {
    console.log('\n======================================================');
    console.log('FLEETHUB 2.0 - DRIVER COMPLETE WORKFLOW TESTS (1 - 12)');
    console.log('======================================================\n');

    // 0. Login as Admin
    console.log('>>> Setup: Authenticating Admin & Domino\'s Client...');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fleethub.com', password: 'admin123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200);
    const adminToken = adminLoginData.token;
    console.log('✔ Admin authenticated successfully.');

    const clientLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dominos@fleethub.com', password: 'client123' }),
    });
    const clientLoginData = await clientLoginRes.json();
    assert.strictEqual(clientLoginRes.status, 200);
    const clientToken = clientLoginData.token;
    const clientId = clientLoginData.user.clientId;
    console.log('✔ Client authenticated successfully.');

    const branch = await Branch.findOne({ clientId });
    assert.ok(branch, 'Branch exists for client');
    const branchId = branch._id;

    // ======================================================
    // TEST 1: Admin creates Driver
    // Expected: User created. Driver created. role = DRIVER. Account = ACTIVE. Temporary password returned.
    // ======================================================
    console.log('\n>>> TEST 1: Admin creates Driver account...');
    const testDriverEmail = `test.driver.${Date.now()}@fleethub.com`;
    const testDriverPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testDriverLicense = `DL-MH12-${Math.floor(10000 + Math.random() * 90000)}`;

    const createDriverRes = await fetch(`${baseUrl}/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Suresh Patil',
        email: testDriverEmail,
        phone: testDriverPhone,
        licenseNumber: testDriverLicense,
        licenseExpiryDate: '2028-12-31',
        address: 'Kothrud, Pune, Maharashtra',
        branchId,
        clientId,
      }),
    });

    const createDriverData = await createDriverRes.json();
    assert.strictEqual(createDriverRes.status, 201, `Create driver status should be 201: ${JSON.stringify(createDriverData)}`);
    assert.strictEqual(createDriverData.success, true);
    assert.ok(createDriverData.data.temporaryPassword, 'Temporary password must be returned to Admin');
    const tempPassword = createDriverData.data.temporaryPassword;
    const newDriverId = createDriverData.data.driver.id || createDriverData.data.driver._id;
    const newUserId = createDriverData.data.driver.userId;

    // Verify User and Driver in Database
    const userInDb = await User.findById(newUserId);
    assert.ok(userInDb, 'User must exist in DB');
    assert.strictEqual(userInDb.role, 'DRIVER', 'User role must be strictly forced to DRIVER');
    assert.strictEqual(userInDb.status, 'ACTIVE', 'User status must be ACTIVE');
    assert.strictEqual(userInDb.mustChangePassword, true, 'Driver must be flagged to change password');

    const driverInDb = await Driver.findById(newDriverId);
    assert.ok(driverInDb, 'Driver profile must exist in DB');
    assert.strictEqual(driverInDb.licenseNumber, testDriverLicense);
    assert.strictEqual(driverInDb.userId.toString(), userInDb._id.toString());
    console.log(`✔ TEST 1 PASSED: Driver & User created. role=DRIVER, status=ACTIVE, tempPassword=${tempPassword}`);

    // Verify non-admins (e.g. Client) CANNOT create driver
    const clientCreateDriverRes = await fetch(`${baseUrl}/drivers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        name: 'Hacker Driver',
        email: 'hacker@fleethub.com',
        phone: '9811122233',
        licenseNumber: 'DL-HACK-999',
      }),
    });
    assert.strictEqual(clientCreateDriverRes.status, 403, 'Client must get 403 when attempting to create a driver');
    console.log('✔ Non-admin restriction verified: Client receives 403 Forbidden.');

    // ======================================================
    // TEST 2: Driver logs in from another device/browser
    // Expected: Successful login. Redirect / Role = DRIVER.
    // ======================================================
    console.log('\n>>> TEST 2: Driver logs in with temporary password...');
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
    assert.strictEqual(driverLoginData.success, true);
    assert.strictEqual(driverLoginData.user.role, 'DRIVER');
    assert.strictEqual(driverLoginData.user.mustChangePassword, true);
    assert.ok(driverLoginData.token);
    assert.strictEqual(driverLoginData.user.driverId.toString(), newDriverId.toString());
    const driverToken = driverLoginData.token;
    console.log('✔ TEST 2 PASSED: Driver logged in successfully. Received JWT with role=DRIVER and driverId.');

    // ======================================================
    // TEST 3: Driver logs in with wrong password
    // Expected: Login rejected.
    // ======================================================
    console.log('\n>>> TEST 3: Driver attempts login with wrong password...');
    const wrongPassRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDriverEmail,
        password: 'wrong_password_123',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    assert.strictEqual(wrongPassRes.status, 401);
    assert.strictEqual(wrongPassData.success, false);
    console.log('✔ TEST 3 PASSED: Wrong password rejected with 401 Unauthorized.');

    // ======================================================
    // TEST 4: Inactive Driver attempts login
    // Expected: Login rejected.
    // ======================================================
    console.log('\n>>> TEST 4: Inactive Driver attempts login...');
    // Deactivate driver via Admin API
    const deactivateRes = await fetch(`${baseUrl}/drivers/${newDriverId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'INACTIVE' }),
    });
    assert.strictEqual(deactivateRes.status, 200);

    const inactiveLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDriverEmail,
        password: tempPassword,
      }),
    });
    const inactiveLoginData = await inactiveLoginRes.json();
    assert.strictEqual(inactiveLoginRes.status, 403);
    assert.ok(inactiveLoginData.message.includes('inactive'));
    console.log(`✔ TEST 4 PASSED: Inactive driver login rejected with 403: "${inactiveLoginData.message}".`);

    // Reactivate driver
    await fetch(`${baseUrl}/drivers/${newDriverId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'ACTIVE' }),
    });
    console.log('✔ Driver reactivated to ACTIVE.');

    // ======================================================
    // Setup for Delivery Tests:
    // Create delivery via Client and assign to this driver via Admin
    // ======================================================
    console.log('\n>>> Setup: Client creates a delivery request...');
    const createDeliveryRes = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${clientToken}`,
      },
      body: JSON.stringify({
        customerName: 'Rahul Deshmukh',
        customerPhone: '9876543210',
        deliveryAddress: 'Flat 502, Green Acre, Kothrud, Pune',
        orderItems: '2x Cheese Burst Pizza, 1x Choco Lava Cake',
        amount: 750,
        branchId,
      }),
    });
    const createDeliveryData = await createDeliveryRes.json();
    assert.strictEqual(createDeliveryRes.status, 201);
    const deliveryId = createDeliveryData.data._id;
    console.log(`✔ Delivery created: ${createDeliveryData.data.orderId} (Status: ${createDeliveryData.data.status})`);

    // Find available vehicle
    const vehicle = await Vehicle.findOne({ status: 'AVAILABLE' });
    assert.ok(vehicle, 'Available vehicle exists');

    console.log('>>> Setup: Admin assigns Driver and Vehicle...');
    const assignRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        driverId: newDriverId,
        vehicleId: vehicle._id,
      }),
    });
    const assignData = await assignRes.json();
    assert.strictEqual(assignRes.status, 200);
    assert.strictEqual(assignData.data.status, 'DRIVER_ASSIGNED');
    console.log(`✔ Delivery assigned. Status: ${assignData.data.status}`);

    // ======================================================
    // TEST 5: Driver sees assigned delivery
    // Expected: Only their delivery is visible.
    // ======================================================
    console.log('\n>>> TEST 5: Driver views their deliveries...');
    const driverDeliveriesRes = await fetch(`${baseUrl}/driver/deliveries`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const driverDeliveriesData = await driverDeliveriesRes.json();
    assert.strictEqual(driverDeliveriesRes.status, 200);
    assert.strictEqual(driverDeliveriesData.success, true);
    assert.ok(driverDeliveriesData.data.some((d) => d._id.toString() === deliveryId.toString()));
    console.log(`✔ TEST 5 PASSED: Driver sees their assigned delivery (${driverDeliveriesData.count} deliveries found).`);

    // ======================================================
    // TEST 6: Driver tries to access another Driver's delivery
    // Expected: 403 Forbidden.
    // ======================================================
    console.log('\n>>> TEST 6: Driver attempts to access another driver\'s delivery...');
    // Create another delivery assigned to driver1 (Rahul Sharma)
    const otherDriver = await Driver.findOne({ _id: { $ne: newDriverId } });
    assert.ok(otherDriver, 'Other driver exists in seed');

    const otherDelivery = await Delivery.create({
      clientId,
      branchId,
      customerName: 'Secret VIP Customer',
      customerPhone: '9899887766',
      deliveryAddress: 'Confidential Address',
      amount: 1200,
      driverId: otherDriver._id,
      status: 'DRIVER_ASSIGNED',
    });

    const unauthorizedAccessRes = await fetch(`${baseUrl}/deliveries/${otherDelivery._id}`, {
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.strictEqual(unauthorizedAccessRes.status, 403, 'Driver must get 403 for another driver\'s delivery');
    console.log('✔ TEST 6 PASSED: Driver received 403 Forbidden when accessing another driver\'s delivery.');

    // ======================================================
    // TEST 8: Driver rejects assignment (testing reject before accept)
    // Expected: Delivery returns to dispatcher workflow (WAITING_FOR_DRIVER), driver is released.
    // ======================================================
    console.log('\n>>> TEST 8: Driver rejects assigned delivery...');
    const rejectRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        reason: 'Too Far',
      }),
    });
    const rejectData = await rejectRes.json();
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectData.data.status, 'WAITING_FOR_DRIVER');

    // Verify driver was released to AVAILABLE
    const releasedDriver = await Driver.findById(newDriverId);
    assert.strictEqual(releasedDriver.status, 'AVAILABLE');
    console.log(`✔ TEST 8 PASSED: Delivery rejected with reason "Too Far". Status reverted to ${rejectData.data.status}. Driver released to ${releasedDriver.status}.`);

    // Re-assign delivery for subsequent tests
    console.log('>>> Setup: Re-assigning delivery to Driver...');
    await fetch(`${baseUrl}/deliveries/${deliveryId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        driverId: newDriverId,
        vehicleId: vehicle._id,
      }),
    });

    // ======================================================
    // TEST 7: Driver accepts assignment
    // Expected: Delivery -> ACCEPTED. Driver -> BUSY.
    // ======================================================
    console.log('\n>>> TEST 7: Driver accepts assignment...');
    const acceptRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    const acceptData = await acceptRes.json();
    assert.strictEqual(acceptRes.status, 200);
    assert.strictEqual(acceptData.data.status, 'ACCEPTED');

    const busyDriver = await Driver.findById(newDriverId);
    assert.strictEqual(busyDriver.status, 'BUSY');
    console.log(`✔ TEST 7 PASSED: Delivery is ${acceptData.data.status}. Driver status is ${busyDriver.status}.`);

    // ======================================================
    // TEST 10: Driver tries invalid status transition
    // Expected: Backend rejects request (e.g. ACCEPTED directly to DELIVERED).
    // ======================================================
    console.log('\n>>> TEST 10: Driver tries invalid status transition (ACCEPTED -> DELIVERED)...');
    const invalidJumpRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    const invalidJumpData = await invalidJumpRes.json();
    assert.strictEqual(invalidJumpRes.status, 400);
    console.log(`✔ TEST 10 PASSED: Invalid transition rejected with 400: "${invalidJumpData.message}".`);

    // ======================================================
    // TEST 9: Driver updates status along sequential pipeline
    // Expected: ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED.
    // ======================================================
    console.log('\n>>> TEST 9: Driver progresses sequential delivery pipeline...');
    // Step 1: PICKED_UP
    const pickedUpRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });
    assert.strictEqual(pickedUpRes.status, 200);
    console.log('  1. Status moved to PICKED_UP.');

    // Step 2: OUT_FOR_DELIVERY
    const outRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
    });
    assert.strictEqual(outRes.status, 200);
    console.log('  2. Status moved to OUT_FOR_DELIVERY.');

    // Step 3: DELIVERED
    const deliveredRes = await fetch(`${baseUrl}/deliveries/${deliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    assert.strictEqual(deliveredRes.status, 200);
    console.log('  3. Status moved to DELIVERED.');

    // Verify driver released back to AVAILABLE
    const finalDriver = await Driver.findById(newDriverId);
    assert.strictEqual(finalDriver.status, 'AVAILABLE');
    console.log(`✔ TEST 9 PASSED: Delivery completed. Driver released back to ${finalDriver.status}.`);

    // ======================================================
    // TEST 11: Driver Password Change & Logout
    // ======================================================
    console.log('\n>>> TEST 11: Driver change-password & logout...');
    const changePassRes = await fetch(`${baseUrl}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${driverToken}`,
      },
      body: JSON.stringify({
        currentPassword: tempPassword,
        newPassword: 'MyNewSecurePass@2026',
        confirmPassword: 'MyNewSecurePass@2026',
      }),
    });
    const changePassData = await changePassRes.json();
    assert.strictEqual(changePassRes.status, 200);
    assert.strictEqual(changePassData.data.mustChangePassword, false);
    console.log('✔ Password changed successfully. mustChangePassword is now false.');

    // Logout
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${driverToken}` },
    });
    assert.strictEqual(logoutRes.status, 200);
    console.log('✔ Driver logged out successfully.');

    // Test login with new password
    const newPassLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testDriverEmail,
        password: 'MyNewSecurePass@2026',
      }),
    });
    assert.strictEqual(newPassLoginRes.status, 200);
    console.log('✔ TEST 11 PASSED: Driver successfully signed in with newly set password!');

    // ======================================================
    // TEST 12: Driver Availability Management API
    // ======================================================
    console.log('\n>>> TEST 12: Driver Availability management...');
    const newLoginToken = (await newPassLoginRes.json()).token;
    const availRes = await fetch(`${baseUrl}/driver/availability`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newLoginToken}`,
      },
      body: JSON.stringify({ status: 'ON_BREAK' }),
    });
    const availData = await availRes.json();
    assert.strictEqual(availRes.status, 200);
    assert.strictEqual(availData.data.status, 'ON_BREAK');
    console.log(`✔ TEST 12 PASSED: Driver updated availability to ${availData.data.status}.`);

    console.log('\n======================================================');
    console.log('🎉 ALL 12 DRIVER WORKFLOW TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
  } finally {
    await stopServer();
    process.exit(0);
  }
};

runDriverWorkflowTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  if (server) server.close();
  process.exit(1);
});
