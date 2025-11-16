import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize, { testConnection } from './config/database';
import routes from './routes';
import './models'; // Import all models to register them with Sequelize
import orderTimeoutService from './services/OrderTimeoutService';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development only)
if (process.env.NODE_ENV === 'development') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Mount API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SmartAPI Backend - Content Cube',
    version: '1.0.0',
    features: [
      'User Authentication',
      'Video Extraction (ALAPI)',
      'Workflow Store',
      'Plugin Market'
    ],
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      docs: 'Coming soon...'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Sync database models (development only)
    if (process.env.NODE_ENV === 'development') {
      // Note: Use { alter: true } cautiously - it can modify existing tables
      // For production, use migrations instead
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized');
    }

    // Start listening
    app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 SmartAPI Backend Server Started`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server running on: http://localhost:${PORT}`);
      console.log(`💾 Database: ${process.env.DB_NAME}`);
      console.log('='.repeat(50));

      // 启动订单超时检查服务
      orderTimeoutService.start();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server gracefully...');
  orderTimeoutService.stop();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server gracefully...');
  orderTimeoutService.stop();
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();
