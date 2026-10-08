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

// Body parser with explicit production safety limits (L-08)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

// Canonical API v1 router
const apiV1 = express.Router();

// Health check endpoint
apiV1.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'FleetHub Food Delivery Fleet Management API',
    timestamp: new Date(),
  });
});

// Canonical route mounts
apiV1.use('/auth', authRoutes);
apiV1.use('/admins', adminRoutes);
apiV1.use('/audit-logs', auditRoutes);
apiV1.use('/clients', clientRoutes);
apiV1.use('/branches', branchRoutes);
apiV1.use('/vehicles', vehicleRoutes);
apiV1.use('/drivers', driverRoutes);
apiV1.use('/driver', driverRoutes);
apiV1.use('/deliveries', deliveryRoutes);
apiV1.use('/maintenance', maintenanceRoutes);
apiV1.use('/reports', reportRoutes);
apiV1.use('/notifications', notificationRoutes);

// Authoritative API mount
app.use('/api/v1', apiV1);

// Backward compatibility alias: route legacy /api requests to canonical apiV1 router
app.use('/api', apiV1);

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
