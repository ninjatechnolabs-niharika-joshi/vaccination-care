import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client with connection management for Supabase PgBouncer
class DatabaseClient {
  private static instance: PrismaClient;

  private constructor() { }

  public static getInstance(): PrismaClient {
    if (!DatabaseClient.instance) {
      console.log('[DB] Initializing Prisma Client... (PostgreSQL)');

      DatabaseClient.instance = new PrismaClient({
        // log: process.env.NODE_ENV === 'development'
        //   ? ['query', 'info', 'warn', 'error']
        //   : ['error'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,

          },


        },
        log: [{ emit: 'stdout', level: 'query' },
        ],
      });

      console.log('[DB] Prisma Client initialized successfully');

      // Graceful shutdown handlers
      const shutdown = async () => {
        console.log('[DB] Disconnecting from database...');
        await DatabaseClient.instance.$disconnect();
        console.log('[DB] Database disconnected successfully');
      };

      process.on('beforeExit', shutdown);
      process.on('SIGINT', async () => {
        await shutdown();
        process.exit(0);
      });
      process.on('SIGTERM', async () => {
        await shutdown();
        process.exit(0);
      });
    }

    return DatabaseClient.instance;
  }
}

// Initialize Prisma Client
export const prisma = DatabaseClient.getInstance();
// prisma.$on('query', (e) => {
//   console.log('Query:', e.query);
//   console.log('Params:', e.params);
//   console.log('Duration:', e.duration, 'ms');
// });

// Test database connection with retry logic for Supabase PgBouncer
export const connectDatabase = async (retries = 3): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[DB] Testing database connection (attempt ${attempt}/${retries})...`);
      await prisma.$connect();
      console.log('[DB] Database connected successfully!', process.env.DATABASE_URL);
      return;
    } catch (error) {
      console.error(`[DB] Database connection attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};


/*
// Reconnect helper for stale connections
export const ensureConnection = async (): Promise<void> => {
  try {
    // Simple query to check if connection is alive
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    console.log('[DB] Reconnecting to database...');
    await prisma.$disconnect();
    await prisma.$connect();
  }
};
*/