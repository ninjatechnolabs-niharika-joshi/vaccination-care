import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import routes from './routes';
import { config } from './config/config';
import { prisma, connectDatabase } from './config/database';
import { validateEnv } from './utils/validateEnv';
import { validateSecurityConfig } from './utils/securityChecks';
import fs from 'fs';
// Load environment variables
dotenv.config();

// Validate environment variables on startup
validateEnv();

// Validate security configuration
validateSecurityConfig();

const app: Application = express();
const PORT = config.port || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors(config.cors)); // CORS configuration
app.use(compression()); // Gzip compression - reduces response size by 70-80%
// app.use(pinoHttp({ logger, autoLogging: config.env !== 'test' })); // Pino HTTP logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files (uploaded images/documents)
// Serve static files (uploaded images/documents)
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(uploadsDir));
// Health check endpoint
// app.get('', (req, res) => {
//   const healthCheck = {
//     status: 'ok',
//     timestamp: new Date().toISOString(),
//     version: '1.0.0',
//     uptime: process.uptime(),
//     environment: config.env,
//   };

//   res.status(200).json(healthCheck);
// });

// Health check endpoint with database verification
app.get('/', async (req, res) => {
  try {
    // Test database connection with Prisma.$queryRaw
    const startTime = Date.now();
    await prisma.$queryRaw`EXPLAIN ANALYZE SELECT 1 as result`;
    const responseTime = Date.now() - startTime;

    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        responseTime: `${responseTime}ms`,
        message: 'Database connection is healthy',
      }
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    const healthCheck = {
      status: 'error',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };

    return res.status(503).json(healthCheck);
  }
});

// API Routes
app.use('/api/v1', routes);

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server with database connection
const startServer = async () => {
  try {
    console.log('Starting Vaxicare Application...');
    // console.log({ env: config.env }, 'Environment');

    // Connect to database
    await connectDatabase();

    // Start Express server
    app.listen(PORT, () => {
      // console.log('Server started successfully!');
      console.log(`Server running on: http://localhost:${PORT}`);
      console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    console.error(error, 'Failed to start server');
    process.exit(1);
  }
};

// Start the application
startServer();

export default app;
