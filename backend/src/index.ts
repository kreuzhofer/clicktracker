import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import Database from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database connection
const db = Database.getInstance();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
      body: req.body,
      query: req.query,
      headers: req.headers.authorization ? 'Bearer [REDACTED]' : 'No auth'
    });
    next();
  });
}

// Health check endpoint with database check
app.get('/health', async (req, res) => {
  try {
    const dbHealthy = await db.healthCheck();
    res.json({ 
      status: dbHealthy ? 'OK' : 'DEGRADED',
      database: dbHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'ERROR',
      database: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Campaign Click Tracker API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      campaigns: '/api/campaigns',
      analytics: '/api/analytics',
      conversions: '/api/conversions'
    }
  });
});

// API routes
app.use('/api', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await db.close();
  process.exit(0);
});

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;