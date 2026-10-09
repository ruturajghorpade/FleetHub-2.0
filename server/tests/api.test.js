const assert = require('assert');
const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const app = require('../app');
const connectDB = require('../config/db');

let server;
let baseUrl;

const startServer = async () => {
  await connectDB();
  return new Promise((resolve) => {
    // Listen on port 0 to choose any free port for test
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

const runTests = async () => {
  await startServer();
  let adminToken, dominosToken, kfcToken, driverToken;
  let dominosUser, kfcUser;
  let dominosDowntownBranchId;
  let availableVehicleId, availableDriverId;
  let testDeliveryId;

  try {
    console.log('\n--- 1. Testing Health Endpoint ---');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'online');
    console.log('✅ Health check passed');

    console.log('\n--- 2. Testing Authentication ---');
    // Admin login
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@fleethub.com', password: 'admin123' }),
    });
    const adminLoginData = await adminLoginRes.json();
    assert.strictEqual(adminLoginRes.status, 200);
    assert.strictEqual(adminLoginData.success, true);
    assert.ok(adminLoginData.token);
    assert.strictEqual(adminLoginData.user.role, 'ADMIN');
    adminToken = adminLoginData.token;
    console.log('✅ Admin login succeeded');

    // Domino's Client login
    const dominosLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dominos@fleethub.com', password: 'client123' }),
    });
    const dominosLoginData = await dominosLoginRes.json();
    assert.strictEqual(dominosLoginData.user.role, 'CLIENT');
    dominosToken = dominosLoginData.token;
    dominosUser = dominosLoginData.user;
    console.log('✅ Domino\'s Client login succeeded');

    // KFC Client login
    const kfcLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kfc@fleethub.com', password: 'client123' }),
    });
    const kfcLoginData = await kfcLoginRes.json();
    assert.strictEqual(kfcLoginData.user.role, 'CLIENT');
    kfcToken = kfcLoginData.token;
    kfcUser = kfcLoginData.user;
    console.log('✅ KFC Client login succeeded');

    // Driver login
    const driverLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ruturaj@fleethub.com', password: 'Ruturaj@123' }),
    });
    const driverLoginData = await driverLoginRes.json();
    assert.strictEqual(driverLoginData.user.role, 'DRIVER');
    driverToken = driverLoginData.token;
    console.log('✅ Driver login succeeded');

    console.log('\n--- 3. Testing Tenant Isolation ---');
    // Domino's fetching branches should only see Domino's branches
    const domBranchesRes = await fetch(`${baseUrl}/branches`, {
      headers: { Authorization: `Bearer ${dominosToken}` },
    });
    const domBranches = await domBranchesRes.json();
    assert.strictEqual(domBranches.success, true);
    assert.ok(domBranches.data.length >= 2);
    domBranches.data.forEach((b) => {
      const bClientId = (b.clientId._id || b.clientId).toString();
      const userClientId = (dominosUser.clientId._id || dominosUser.clientId).toString();
      assert.strictEqual(bClientId, userClientId);
    });
    dominosDowntownBranchId = domBranches.data[0]._id;
    console.log(`✅ Tenant isolation verified: Domino's only sees its ${domBranches.data.length} branches`);

    // KFC fetching branches should only see KFC branches
    const kfcBranchesRes = await fetch(`${baseUrl}/branches`, {
      headers: { Authorization: `Bearer ${kfcToken}` },
    });
    const kfcBranches = await kfcBranchesRes.json();
    assert.strictEqual(kfcBranches.success, true);
    kfcBranches.data.forEach((b) => {
      const bClientId = (b.clientId._id || b.clientId).toString();
      const userClientId = (kfcUser.clientId._id || kfcUser.clientId).toString();
      assert.strictEqual(bClientId, userClientId);
    });
    console.log(`✅ Tenant isolation verified: KFC only sees its ${kfcBranches.data.length} branches`);

    console.log('\n--- 4. Testing Delivery Creation & MongoDB Persistence ---');
    const newDeliveryPayload = {
      customerName: 'Ruturaj',
      customerPhone: '+917709171686',
      deliveryAddress: 'Pune',
      orderItems: 'Pizza',
      amount: 399,
      branchId: dominosDowntownBranchId,
    };

    const createDeliveryRes = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dominosToken}`,
      },
      body: JSON.stringify(newDeliveryPayload),
    });
    const createDeliveryData = await createDeliveryRes.json();
    assert.strictEqual(createDeliveryRes.status, 201);
    assert.strictEqual(createDeliveryData.success, true);
    assert.strictEqual(createDeliveryData.data.customerName, 'Ruturaj');
    assert.ok(['REQUESTED', 'PENDING'].includes(createDeliveryData.data.status));
    assert.strictEqual(createDeliveryData.data.amount, 399);
    testDeliveryId = createDeliveryData.data._id;
    console.log(`✅ Delivery created with Order ID: ${createDeliveryData.data.orderId}`);

    // Verify persistence via GET
    const fetchDeliveryRes = await fetch(`${baseUrl}/deliveries/${testDeliveryId}`, {
      headers: { Authorization: `Bearer ${dominosToken}` },
    });
    const fetchDeliveryData = await fetchDeliveryRes.json();
    assert.strictEqual(fetchDeliveryRes.status, 200);
    assert.strictEqual(fetchDeliveryData.data.customerName, 'Ruturaj');
    console.log('✅ Delivery persistence verified via direct GET from MongoDB');

    console.log('\n--- 5. Testing Delivery Assignment ---');
    // Get available vehicle & driver via Admin
    const vehRes = await fetch(`${baseUrl}/vehicles?status=AVAILABLE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const vehData = await vehRes.json();
    assert.ok(vehData.data.length > 0);
    availableVehicleId = vehData.data[0]._id;

    const drvRes = await fetch(`${baseUrl}/drivers?status=AVAILABLE`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const drvData = await drvRes.json();
    assert.ok(drvData.data.length > 0);
    availableDriverId = drvData.data[0]._id;

    // Assign (Operations Dispatch by FleetHub Admin)
    const assignRes = await fetch(`${baseUrl}/deliveries/${testDeliveryId}/assign`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        driverId: availableDriverId,
        vehicleId: availableVehicleId,
      }),
    });
    const assignData = await assignRes.json();
    assert.strictEqual(assignRes.status, 200);
    assert.ok(['ASSIGNED', 'DRIVER_ASSIGNED'].includes(assignData.data.status));
    console.log(`✅ Delivery successfully assigned to driver ${assignData.data.driverId.name}`);

    // Check that driver & vehicle status updated to ASSIGNED or BUSY
    const checkDrvRes = await fetch(`${baseUrl}/drivers/${availableDriverId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkDrvData = await checkDrvRes.json();
    assert.ok(['ASSIGNED', 'BUSY'].includes(checkDrvData.data.status));

    const checkVehRes = await fetch(`${baseUrl}/vehicles/${availableVehicleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const checkVehData = await checkVehRes.json();
    assert.ok(['ASSIGNED', 'IN_USE'].includes(checkVehData.data.status));
    console.log('✅ Driver and Vehicle statuses transitioned to ASSIGNED / IN_USE');

    console.log('\n--- 6. Testing Driver Status Updates ---');
    // Driver accepts delivery
    await fetch(`${baseUrl}/deliveries/${testDeliveryId}/accept`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Update to PICKED_UP
    await fetch(`${baseUrl}/deliveries/${testDeliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'PICKED_UP' }),
    });

    // Update to OUT_FOR_DELIVERY
    const outRes = await fetch(`${baseUrl}/deliveries/${testDeliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' }),
    });
    const outData = await outRes.json();
    assert.strictEqual(outRes.status, 200);
    assert.strictEqual(outData.data.status, 'OUT_FOR_DELIVERY');
    console.log('✅ Status updated to OUT_FOR_DELIVERY');

    // Update to DELIVERED
    const delRes = await fetch(`${baseUrl}/deliveries/${testDeliveryId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'DELIVERED' }),
    });
    const delData = await delRes.json();
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delData.data.status, 'DELIVERED');
    console.log('✅ Status updated to DELIVERED');

    // Check that driver & vehicle are released back to AVAILABLE
    const releasedDrv = await (await fetch(`${baseUrl}/drivers/${availableDriverId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();
    assert.strictEqual(releasedDrv.data.status, 'AVAILABLE');

    const releasedVeh = await (await fetch(`${baseUrl}/vehicles/${availableVehicleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();
    assert.strictEqual(releasedVeh.data.status, 'AVAILABLE');
    console.log('✅ Driver & Vehicle freed back to AVAILABLE upon delivery completion');

    console.log('\n--- 7. Testing Delivery Cancellation ---');
    // Create another delivery to test cancellation
    const cancelTargetRes = await fetch(`${baseUrl}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dominosToken}`,
      },
      body: JSON.stringify({
        customerName: 'Test Cancel Customer',
        customerPhone: '+919999999999',
        deliveryAddress: 'Cancel Lane',
        orderItems: 'Cancel Pizza',
        amount: 250,
        branchId: dominosDowntownBranchId,
      }),
    });
    const cancelTargetData = await cancelTargetRes.json();
    const cancelDeliveryId = cancelTargetData.data._id;

    // Cancel without reason should fail
    const failCancel = await fetch(`${baseUrl}/deliveries/${cancelDeliveryId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dominosToken}`,
      },
      body: JSON.stringify({ cancellationReason: '' }),
    });
    assert.strictEqual(failCancel.status, 400);

    // Cancel with valid reason
    const successCancel = await fetch(`${baseUrl}/deliveries/${cancelDeliveryId}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${dominosToken}`,
      },
      body: JSON.stringify({ cancellationReason: 'Customer requested order change' }),
    });
    const successCancelData = await successCancel.json();
    assert.strictEqual(successCancel.status, 200);
    assert.strictEqual(successCancelData.data.status, 'CANCELLED');
    assert.strictEqual(successCancelData.data.cancellationReason, 'Customer requested order change');
    console.log('✅ Delivery cancellation with reason verified');

    console.log('\n--- 8. Testing Vehicle Maintenance Lifecycle ---');
    // Start Maintenance on availableVehicleId
    const maintStartRes = await fetch(`${baseUrl}/maintenance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        vehicleId: availableVehicleId,
        description: 'Tire puncture & chain lubricant',
        cost: 350,
      }),
    });
    const maintStartData = await maintStartRes.json();
    assert.strictEqual(maintStartRes.status, 201);
    const maintId = maintStartData.data._id;

    // Verify vehicle is now in MAINTENANCE status
    const vehInMaint = await (await fetch(`${baseUrl}/vehicles/${availableVehicleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();
    assert.strictEqual(vehInMaint.data.status, 'MAINTENANCE');
    console.log('✅ Vehicle status transitioned to MAINTENANCE');

    // Complete maintenance
    const maintCompRes = await fetch(`${baseUrl}/maintenance/${maintId}/complete`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ cost: 400 }),
    });
    assert.strictEqual(maintCompRes.status, 200);

    // Verify vehicle restored to AVAILABLE
    const vehRestored = await (await fetch(`${baseUrl}/vehicles/${availableVehicleId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    })).json();
    assert.strictEqual(vehRestored.data.status, 'AVAILABLE');
    console.log('✅ Maintenance completed and Vehicle status restored to AVAILABLE');

    console.log('\n--- 9. Testing Dashboard & Reports Analytics ---');
    const dashRes = await fetch(`${baseUrl}/reports/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const dashData = await dashRes.json();
    assert.strictEqual(dashRes.status, 200);
    assert.ok(dashData.data.totalVehicles > 0);
    assert.ok(dashData.data.totalDrivers > 0);
    console.log(`✅ Dashboard stats verified: Total Vehicles=${dashData.data.totalVehicles}, Drivers=${dashData.data.totalDrivers}`);

    console.log('\n=========================================');
    console.log('🎉 ALL BACKEND INTEGRATION TESTS PASSED!');
    console.log('=========================================\n');
    await stopServer();
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite assertion failed:', err);
    await stopServer();
    process.exit(1);
  }
};

runTests();
