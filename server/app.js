const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const errorHandler = require('./middleware/errorHandler');

// Route files
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const auditRoutes = require('./routes/auditRoutes');
const clientRoutes = require('./routes/clientRoutes');
const branchRoutes = require('./routes/branchRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const driverRoutes = require('./routes/driverRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Disable caching for all API endpoints to guarantee live database synchronization
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Dev logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'FleetHub Food Delivery Fleet Management API',
    timestamp: new Date(),
  });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'FleetHub Food Delivery Fleet Management API',
    timestamp: new Date(),
  });
});

// Mount routers at both /api/v1 and /api for full path compatibility
const mountRoute = (path, router) => {
  app.use(`/api/v1/${path}`, router);
  app.use(`/api/${path}`, router);
};

mountRoute('auth', authRoutes);
mountRoute('admins', adminRoutes);
mountRoute('audit-logs', auditRoutes);
mountRoute('clients', clientRoutes);
mountRoute('branches', branchRoutes);
mountRoute('vehicles', vehicleRoutes);
mountRoute('drivers', driverRoutes);
mountRoute('driver', driverRoutes);
mountRoute('deliveries', deliveryRoutes);
mountRoute('maintenance', maintenanceRoutes);
mountRoute('reports', reportRoutes);
mountRoute('notifications', notificationRoutes);

// Catch 404 routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
