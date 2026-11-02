import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './shared/logger/logger.js';
import { connectDatabase, disconnectDatabase } from './infrastructure/database.js';
import { connectRedis, disconnectRedis } from './infrastructure/redis.js';

let server: http.Server | null = null;
let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  try {
    logger.info({ nodeEnv: env.NODE_ENV, port: env.PORT }, '[Bootstrap] Starting FitMate AI backend foundation...');

    // 1. Initialize Database
    await connectDatabase();

    // 2. Initialize Redis (degrades gracefully if unavailable)
    await connectRedis();

    // 3. Create Express Application
    const app = createApp();

    // 4. Bind HTTP Server
    server = app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, apiPrefix: env.API_PREFIX }, `[Bootstrap] Server listening on port ${env.PORT}`);
    });

    // 5. Register Process Signal Listeners
    setupGracefulShutdown();
  } catch (err) {
    logger.fatal({ err }, '[Bootstrap] Fatal failure during startup. Terminating process.');
    process.exit(1);
  }
}

function setupGracefulShutdown(): void {
  const handleSignal = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, `[Shutdown] Received ${signal}. Initiating graceful shutdown...`);

    // Give in-flight requests 10 seconds to finish
    const shutdownTimeout = setTimeout(() => {
      logger.error('[Shutdown] Forceful shutdown timeout exceeded. Exiting immediately.');
      process.exit(1);
    }, 10000);
    shutdownTimeout.unref();

    if (server) {
      server.close(async (err) => {
        if (err) {
          logger.error({ err }, '[Shutdown] Error closing HTTP server');
        } else {
          logger.info('[Shutdown] HTTP server closed successfully');
        }

        try {
          await disconnectDatabase();
          await disconnectRedis();
          logger.info('[Shutdown] Infrastructure cleanly disconnected. Goodbye.');
          process.exit(0);
        } catch (cleanupErr) {
          logger.error({ cleanupErr }, '[Shutdown] Error during resource cleanup');
          process.exit(1);
        }
      });
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, '[Process] Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '[Process] Uncaught exception. Initiating emergency shutdown.');
    handleSignal('uncaughtException');
  });
}

// Start application if executed directly
if (process.env['NODE_ENV'] !== 'test') {
  void bootstrap();
}

export { bootstrap };

