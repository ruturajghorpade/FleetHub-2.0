require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Client = require('../models/Client');
const Branch = require('../models/Branch');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Delivery = require('../models/Delivery');
const Maintenance = require('../models/Maintenance');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fleethub';
    await mongoose.connect(mongoUri);
    console.log(`📡 Connected to MongoDB for seeding: ${mongoUri}`);

    // Drop entire database to purge all old data and stale collection indexes
    await mongoose.connection.db.dropDatabase();
    console.log('🧹 Purged existing database & old indexes.');

    // 1. Create Admins
    const superAdminUser = await User.create({
      name: 'Central Super Admin',
      email: 'superadmin@fleethub.com',
      phone: '+919999900000',
      password: 'superadmin123',
      role: 'SUPER_ADMIN',
    });

    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@fleethub.com',
      phone: '+919999900001',
      password: 'admin123',
      role: 'ADMIN',
    });
    console.log(`👤 Admins created: ${superAdminUser.email} & ${adminUser.email}`);

    // 2. Create Clients
    const dominos = await Client.create({
      name: "Domino's Pizza",
      email: 'contact@dominos.com',
      phone: '+918001234567',
      address: '742 Evergreen Plaza, Food Street',
      status: 'ACTIVE',
    });

    const kfc = await Client.create({
      name: 'KFC Foods',
      email: 'contact@kfc.com',
      phone: '+918007654321',
      address: '108 Grand Avenue, Commercial Area',
      status: 'ACTIVE',
    });
    console.log(`🏢 Clients created: Domino's Pizza & KFC Foods`);

    const dominosAdmin = await User.create({
      name: "Domino's Operations Manager",
      email: 'dominos@fleethub.com',
      phone: '+919876543210',
      password: 'client123',
      role: 'CLIENT',
      clientId: dominos._id,
    });

    const dominosStaff = await User.create({
      name: "Domino's Shift Operator",
      email: 'dominos.staff@fleethub.com',
      phone: '+919876543211',
      password: 'staff123',
      role: 'CLIENT_USER',
      clientId: dominos._id,
    });

    const dominosDispatcher = await User.create({
      name: "Domino's Head Dispatcher",
      email: 'dispatcher@fleethub.com',
      phone: '+919876543212',
      password: 'dispatch123',
      role: 'DISPATCHER',
      clientId: dominos._id,
    });

    const kfcUser = await User.create({
      name: 'KFC Fleet Coordinator',
      email: 'kfc@fleethub.com',
      phone: '+919876543213',
      password: 'client123',
      role: 'CLIENT',
      clientId: kfc._id,
    });
    console.log(`👤 Client roles seeded: dominos@fleethub.com, dominos.staff@fleethub.com, dispatcher@fleethub.com, kfc@fleethub.com`);

    // 4. Create Branches
    const dominosBranchDowntown = await Branch.create({
      name: "Domino's Downtown Branch",
      clientId: dominos._id,
      address: 'Shop 12, Main Street, Downtown',
      phone: '+919123456780',
      status: 'ACTIVE',
    });

    const dominosBranchWest = await Branch.create({
      name: "Domino's West End Branch",
      clientId: dominos._id,
      address: 'Plot 45, West Ring Road',
      phone: '+919123456781',
      status: 'ACTIVE',
    });

    const kfcBranchCity = await Branch.create({
      name: 'KFC City Center Branch',
      clientId: kfc._id,
      address: 'Mall Plaza, Level 1, City Center',
      phone: '+919123456782',
      status: 'ACTIVE',
    });
    console.log(`📍 Branches created for Domino's and KFC`);

    // 5. Create Vehicles
    const vehicle1 = await Vehicle.create({
      vehicleNumber: 'MH-12-AB-1001',
      vehicleType: 'BIKE',
      model: 'Hero Splendor Plus',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      status: 'AVAILABLE',
    });

    const vehicle2 = await Vehicle.create({
      vehicleNumber: 'MH-12-CD-2002',
      vehicleType: 'SCOOTER',
      model: 'TVS Jupiter 125',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      status: 'AVAILABLE',
    });

    const vehicle3 = await Vehicle.create({
      vehicleNumber: 'MH-12-EF-3003',
      vehicleType: 'CAR',
      model: 'Maruti Suzuki Alto K10',
      clientId: dominos._id,
      branchId: dominosBranchWest._id,
      status: 'AVAILABLE',
    });

    const vehicle4 = await Vehicle.create({
      vehicleNumber: 'MH-12-GH-4004',
      vehicleType: 'VAN',
      model: 'Tata Ace Gold Delivery',
      clientId: kfc._id,
      branchId: kfcBranchCity._id,
      status: 'AVAILABLE',
    });

    const vehicle5 = await Vehicle.create({
      vehicleNumber: 'MH-12-IJ-5005',
      vehicleType: 'SCOOTER',
      model: 'Honda Activa 6G',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      status: 'MAINTENANCE',
    });
    console.log(`🛵 5 Vehicles created`);

    // 6. Create Drivers
    const driver1 = await Driver.create({
      name: 'Rahul Sharma',
      phone: '+919876543210',
      licenseNumber: 'DL-MH12-98765',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      status: 'AVAILABLE',
    });

    const driver2 = await Driver.create({
      name: 'Amit Patel',
      phone: '+919876543211',
      licenseNumber: 'DL-MH12-98766',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      status: 'AVAILABLE',
    });

    const driver3 = await Driver.create({
      name: 'Priya Singh',
      phone: '+919876543212',
      licenseNumber: 'DL-MH12-98767',
      clientId: dominos._id,
      branchId: dominosBranchWest._id,
      status: 'AVAILABLE',
    });

    const driver4 = await Driver.create({
      name: 'Vikram Deshmukh',
      phone: '+919876543213',
      licenseNumber: 'DL-MH12-98768',
      clientId: kfc._id,
      branchId: kfcBranchCity._id,
      status: 'AVAILABLE',
    });

    const driver5 = await Driver.create({
      name: 'Sandeep Shinde',
      phone: '+919876543214',
      licenseNumber: 'DL-MH12-98769',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      status: 'AVAILABLE',
    });
    console.log(`🛵 5 Drivers created`);

    // 7. Create Driver Users for testing Driver login
    const driverUser1 = await User.create({
      name: 'Rahul Sharma',
      email: 'driver1@fleethub.com',
      password: 'driver123',
      role: 'DRIVER',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
    });
    console.log(`👤 Driver user created: driver1@fleethub.com`);

    // 8. Create Sample Deliveries
    const deliveryDelivered = await Delivery.create({
      orderId: 'FH-901101',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      customerName: 'Aarav Mehta',
      customerPhone: '+919822011223',
      deliveryAddress: 'Flat 402, Sunshine Heights, MG Road',
      orderItems: '1x Farmhouse Pizza Large, 1x Garlic Bread',
      amount: 649,
      driverId: driver2._id,
      vehicleId: vehicle2._id,
      status: 'DELIVERED',
    });

    const deliveryPending = await Delivery.create({
      orderId: 'FH-901102',
      clientId: dominos._id,
      branchId: dominosBranchDowntown._id,
      customerName: 'Sneha Kulkarni',
      customerPhone: '+919822011224',
      deliveryAddress: 'B-14, Green Valley Park, Station Road',
      orderItems: '2x Peppy Paneer Regular, 1x Choco Lava',
      amount: 520,
      status: 'PENDING',
    });
    console.log(`📦 Sample deliveries created (Delivered and Pending)`);

    // 9. Create Sample Maintenance
    await Maintenance.create({
      vehicleId: vehicle5._id,
      clientId: dominos._id,
      description: 'Periodic 10,000km engine oil replacement & brake checkup',
      startDate: new Date(),
      status: 'IN_PROGRESS',
      cost: 1200,
    });
    console.log(`🔧 Sample maintenance record created`);

    // 10. Sample Notifications
    await Notification.create({
      clientId: dominos._id,
      title: 'Welcome to FleetHub',
      message: "Domino's Pizza delivery workspace initialized with 2 branches and initial fleet.",
      type: 'SYSTEM',
    });

    await Notification.create({
      clientId: dominos._id,
      title: 'Vehicle in Maintenance',
      message: 'Vehicle MH-12-IJ-5005 scheduled for 10k km service checkup.',
      type: 'MAINTENANCE_STARTED',
    });
    console.log(`🔔 Initial notifications logged.`);

    // 11. Sample Audit Logs
    await AuditLog.create([
      {
        userId: superAdminUser._id,
        userName: superAdminUser.name,
        userEmail: superAdminUser.email,
        role: 'SUPER_ADMIN',
        action: 'System initialized',
        resource: 'Platform',
        details: 'Initial system setup and database seeding completed',
      },
      {
        userId: superAdminUser._id,
        userName: superAdminUser.name,
        userEmail: superAdminUser.email,
        role: 'SUPER_ADMIN',
        action: 'Admin created',
        resource: 'User',
        resourceId: adminUser._id,
        details: `Created admin user: ${adminUser.email}`,
      },
      {
        userId: dominosAdmin._id,
        userName: dominosAdmin.name,
        userEmail: dominosAdmin.email,
        role: 'CLIENT',
        action: 'Delivery created',
        resource: 'Delivery',
        resourceId: deliveryDelivered._id,
        details: `Created delivery ${deliveryDelivered.orderId}`,
      },
    ]);
    console.log(`📋 Initial audit logs recorded.`);

    console.log('\n=========================================');
    console.log('🎉 Database seeding completed successfully!');
    console.log('=========================================');
    console.log('Default Credentials:');
    console.log('  Super Admin:  superadmin@fleethub.com    / superadmin123');
    console.log('  Admin:        admin@fleethub.com         / admin123');
    console.log('  Client Admin: dominos@fleethub.com       / client123');
    console.log('  Client User:  dominos.staff@fleethub.com / staff123');
    console.log('  Dispatcher:   dispatcher@fleethub.com    / dispatch123');
    console.log('  Driver:       driver1@fleethub.com       / driver123');
    console.log('=========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedData();
