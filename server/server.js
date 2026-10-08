require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

// Validate mandatory environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 FleetHub Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`❌ Unhandled Rejection Error: ${err.message}`);
  server.close(() => process.exit(1));
});
