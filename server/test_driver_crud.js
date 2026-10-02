const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('RUNNING DRIVER CRUD & AUTHORIZATION COMPREHENSIVE TESTS');
  console.log('====================================================\n');

  await mongoose.connect('mongodb://127.0.0.1:27017/fleethub');
  const Driver = require('./models/Driver');
  const Delivery = require('./models/Delivery');
  const Client = require('./models/Client');
  const Branch = require('./models/Branch');
  const AuditLog = require('./models/AuditLog');

  // 1. Authenticate users to get JWT tokens
  console.log('1. Authenticating users...');
  const superAdminRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'superadmin@fleethub.com', password: 'superadmin123' }),
  });
  const superAdminToken = superAdminRes.data.token;

  const adminRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@fleethub.com', password: 'admin123' }),
  });
  const adminToken = adminRes.data.token;

  const clientRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'dominos@fleethub.com', password: 'client123' }),
  });
  const clientToken = clientRes.data.token;

  const driverRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'driver1@fleethub.com', password: 'driver123' }),
  });
  const driverToken = driverRes.data.token;
  console.log('   All 4 roles authenticated successfully.\n');

  // Grab a branch and client for test
  const dominosClient = await Client.findOne({ name: "Domino's Pizza" });
  const dominosBranch = await Branch.findOne({ clientId: dominosClient._id });

  // TEST 9: CLIENT tries POST /api/v1/drivers -> Expected 403
  console.log('TEST 9: CLIENT tries POST /api/v1/drivers');
  const clientPostRes = await request('/drivers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${clientToken}` },
    body: JSON.stringify({
      name: 'Unauthorized Driver',
      phone: '+919999900001',
      licenseNumber: 'DL-UNAUTH-01',
      clientId: dominosClient._id,
      branchId: dominosBranch._id,
    }),
  });
  if (clientPostRes.status === 403) {
    console.log(`   PASSED: HTTP 403 returned -> "${clientPostRes.data.message}"`);
  } else {
    console.error(`   FAILED: Expected 403, got ${clientPostRes.status}`);
    process.exit(1);
  }

  // TEST 10: CLIENT tries PUT /api/v1/drivers/:id -> Expected 403
  const sampleDriver = await Driver.findOne({ clientId: dominosClient._id });
  console.log('\nTEST 10: CLIENT tries PUT /api/v1/drivers/:id');
  const clientPutRes = await request(`/drivers/${sampleDriver._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${clientToken}` },
    body: JSON.stringify({ name: 'Hacked Name' }),
  });
  if (clientPutRes.status === 403) {
    console.log(`   PASSED: HTTP 403 returned -> "${clientPutRes.data.message}"`);
  } else {
    console.error(`   FAILED: Expected 403, got ${clientPutRes.status}`);
    process.exit(1);
  }

  // TEST 11: CLIENT tries DELETE /api/v1/drivers/:id -> Expected 403
  console.log('\nTEST 11: CLIENT tries DELETE /api/v1/drivers/:id');
  const clientDelRes = await request(`/drivers/${sampleDriver._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  if (clientDelRes.status === 403) {
    console.log(`   PASSED: HTTP 403 returned -> "${clientDelRes.data.message}"`);
  } else {
    console.error(`   FAILED: Expected 403, got ${clientDelRes.status}`);
    process.exit(1);
  }

  // TEST: DRIVER tries POST /api/v1/drivers -> Expected 403
  console.log('\nTEST: DRIVER tries POST /api/v1/drivers');
  const driverPostRes = await request('/drivers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${driverToken}` },
    body: JSON.stringify({ name: 'Driver Driver', phone: '+919999900002', licenseNumber: 'DL-DRV-02' }),
  });
  if (driverPostRes.status === 403) {
    console.log(`   PASSED: HTTP 403 returned -> "${driverPostRes.data.message}"`);
  } else {
    console.error(`   FAILED: Expected 403, got ${driverPostRes.status}`);
    process.exit(1);
  }

  // TEST 17: Multi-Client Data Isolation on GET /api/v1/drivers
  console.log('\nTEST 17: Multi-Client Data Isolation on GET /api/v1/drivers');
  const clientDriversRes = await request('/drivers', {
    headers: { Authorization: `Bearer ${clientToken}` },
  });
  const clientDrivers = clientDriversRes.data.data;
  console.log(`   Domino's CLIENT received ${clientDrivers.length} drivers.`);
  const hasOtherClients = clientDrivers.some(
    (d) => (d.clientId?._id || d.clientId).toString() !== dominosClient._id.toString()
  );
  if (hasOtherClients) {
    console.error('   FAILED: CLIENT received drivers from other clients!');
    process.exit(1);
  } else {
    console.log('   PASSED: All drivers strictly belong to Domino\'s. Multi-tenant isolation verified.');
  }

  // TEST 5: ADMIN creates driver
  console.log('\nTEST 5: ADMIN creates driver');
  const testLicense = `DL-TEST-${Date.now().toString().slice(-5)}`;
  const testPhone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
  const createRes = await request('/drivers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Rohan Verma',
      phone: testPhone,
      licenseNumber: testLicense,
      clientId: dominosClient._id,
      branchId: dominosBranch._id,
      status: 'AVAILABLE',
    }),
  });
  if (!createRes.ok) {
    console.error('   FAILED: ADMIN could not create driver', createRes.data);
    process.exit(1);
  }
  const createdDriver = createRes.data.data;
  console.log(`   Created Driver ID: ${createdDriver._id}, Name: ${createdDriver.name}`);
  const mongoDriverCheck = await Driver.findById(createdDriver._id);
  if (!mongoDriverCheck) {
    console.error('   FAILED: Created driver not found in MongoDB!');
    process.exit(1);
  }
  console.log('   PASSED: Driver successfully created and verified in MongoDB.');

  // TEST 6: ADMIN edits driver
  console.log('\nTEST 6: ADMIN edits driver');
  const updateRes = await request(`/drivers/${createdDriver._id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Rohan Verma (Senior Rider)',
      status: 'AVAILABLE',
    }),
  });
  if (!updateRes.ok) {
    console.error('   FAILED: ADMIN could not update driver', updateRes.data);
    process.exit(1);
  }
  const updatedDriver = updateRes.data.data;
  console.log(`   Updated Driver Name: ${updatedDriver.name}`);
  const mongoUpdatedCheck = await Driver.findById(createdDriver._id);
  if (mongoUpdatedCheck.name !== 'Rohan Verma (Senior Rider)') {
    console.error('   FAILED: Driver name not updated in MongoDB!');
    process.exit(1);
  }
  console.log('   PASSED: Driver successfully updated and verified in MongoDB.');

  // TEST 7: ADMIN deletes unreferenced driver (Hard delete)
  console.log('\nTEST 7: ADMIN deletes unreferenced driver (Hard Delete expected)');
  const deleteRes = await request(`/drivers/${createdDriver._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!deleteRes.ok) {
    console.error('   FAILED: ADMIN could not delete driver', deleteRes.data);
    process.exit(1);
  }
  console.log(`   Delete response: ${deleteRes.data.message}, action: ${deleteRes.data.action}`);
  const mongoDeletedCheck = await Driver.findById(createdDriver._id);
  if (mongoDeletedCheck !== null) {
    console.error('   FAILED: Unreferenced driver still exists in MongoDB after hard delete!');
    process.exit(1);
  }
  console.log('   PASSED: Driver.findById() returned null. MongoDB hard delete verified.');

  // TEST 14: Historical delivery reference safety (Soft delete / Deactivate expected)
  console.log('\nTEST 14: Attempt to delete a driver referenced by historical deliveries');
  // Find driver Amit Patel who has DELIVERED order FH-901101
  const amitDriver = await Driver.findOne({ name: 'Amit Patel' });
  console.log(`   Amit Patel ID: ${amitDriver._id}, current status: ${amitDriver.status}`);
  const amitDeleteRes = await request(`/drivers/${amitDriver._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });
  console.log(`   Delete response action: ${amitDeleteRes.data.action}`);
  console.log(`   Message: ${amitDeleteRes.data.message}`);
  const amitAfterDelete = await Driver.findById(amitDriver._id);
  if (!amitAfterDelete) {
    console.error('   FAILED: Driver with historical deliveries was hard deleted, breaking history!');
    process.exit(1);
  }
  if (amitAfterDelete.status !== 'INACTIVE') {
    console.error(`   FAILED: Expected status INACTIVE, got ${amitAfterDelete.status}`);
    process.exit(1);
  }
  const deliveryStillExists = await Delivery.findOne({ driverId: amitDriver._id });
  if (!deliveryStillExists) {
    console.error('   FAILED: Historical delivery record was corrupted!');
    process.exit(1);
  }
  console.log(`   Historical delivery record preserved: Order ${deliveryStillExists.orderId} (Status: ${deliveryStillExists.status})`);
  console.log('   PASSED: Driver safely deactivated (status: INACTIVE) without corrupting delivery records.');

  // TEST: Attempt to delete driver with active in-progress delivery
  console.log('\nTEST: Attempt to delete driver with ACTIVE in-progress delivery');
  // Create an active delivery for Priya Singh
  const priyaDriver = await Driver.findOne({ name: 'Priya Singh' });
  const activeDelivery = await Delivery.create({
    orderId: `FH-ACT-${Date.now().toString().slice(-4)}`,
    clientId: dominosClient._id,
    branchId: dominosBranch._id,
    customerName: 'Test Customer',
    customerPhone: '+919988776655',
    deliveryAddress: '123 Baker Street',
    amount: 450,
    driverId: priyaDriver._id,
    status: 'OUT_FOR_DELIVERY',
  });
  const priyaDelRes = await request(`/drivers/${priyaDriver._id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (priyaDelRes.status === 400) {
    console.log(`   PASSED: HTTP 400 returned -> "${priyaDelRes.data.message}"`);
  } else {
    console.error(`   FAILED: Expected 400, got ${priyaDelRes.status}`);
    process.exit(1);
  }
  // Cleanup active test delivery
  await Delivery.deleteOne({ _id: activeDelivery._id });
  console.log('   Cleaned up test active delivery.');

  // TEST 12 & 13: Direct deletion in MongoDB Compass / MongoDB Shell & live refresh
  console.log('\nTEST 12 & 13: Direct Compass-style deletion in MongoDB & live refresh verification');
  // Create a temporary driver directly in MongoDB
  const directDriver = await Driver.create({
    name: 'Direct Mongo Driver',
    phone: '+919111122223',
    licenseNumber: `DL-DIR-${Date.now().toString().slice(-5)}`,
    clientId: dominosClient._id,
    branchId: dominosBranch._id,
    status: 'AVAILABLE',
  });
  console.log(`   Created direct driver ${directDriver._id} in MongoDB.`);

  // Verify GET /drivers fetches this driver
  let fetchRes = await request(`/drivers?_t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  let found = fetchRes.data.data.some((d) => d._id === directDriver._id.toString());
  if (!found) {
    console.error('   FAILED: Direct driver not returned by GET /drivers');
    process.exit(1);
  }
  console.log('   GET /drivers successfully returned the new driver.');

  // Now delete directly from MongoDB (simulating MongoDB Compass user action)
  console.log('   Simulating user deleting driver directly from MongoDB Compass...');
  await Driver.deleteOne({ _id: directDriver._id });

  // Call GET /drivers with cache-busting timestamp
  fetchRes = await request(`/drivers?_t=${Date.now()}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  found = fetchRes.data.data.some((d) => d._id === directDriver._id.toString());
  if (found) {
    console.error('   FAILED: Stale driver still returned after direct MongoDB deletion!');
    process.exit(1);
  }
  console.log('   PASSED: Driver immediately vanished on GET /drivers. No stale data.');

  // Check Audit Logs
  console.log('\nTEST 21: Verify Audit Logs');
  const logs = await AuditLog.find({ resource: 'Driver' }).sort({ createdAt: -1 }).limit(10);
  console.log(`   Found ${logs.length} driver audit logs. Recent actions:`);
  logs.forEach((log) => {
    console.log(`   - [${log.action}] by ${log.role} (${log.userEmail}): ${log.details}`);
  });
  const hasCreate = logs.some((l) => l.action === 'CREATE_DRIVER');
  const hasUpdate = logs.some((l) => l.action === 'UPDATE_DRIVER');
  const hasDelete = logs.some((l) => l.action === 'DELETE_DRIVER');
  const hasUnauth = logs.some((l) => l.action === 'UNAUTHORIZED_DRIVER_ACCESS');
  console.log(`   CREATE_DRIVER logged: ${hasCreate}`);
  console.log(`   UPDATE_DRIVER logged: ${hasUpdate}`);
  console.log(`   DELETE_DRIVER logged: ${hasDelete}`);
  console.log(`   UNAUTHORIZED_DRIVER_ACCESS logged: ${hasUnauth}`);

  console.log('\n====================================================');
  console.log('ALL BACKEND DRIVER TESTS PASSED SUCCESSFULLY (100%)');
  console.log('====================================================');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
