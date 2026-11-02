import { Router, Request, Response } from 'express';
import { isDatabaseConnected, supportsReplicaSetTransactions } from '../../infrastructure/database.js';
import { isRedisConnected } from '../../infrastructure/redis.js';
import { ApiResponse } from '../../shared/types/api.types.js';

export interface HealthResponseData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  dependencies: {
    database: {
      status: 'connected' | 'disconnected';
      replicaSetTransactions: boolean;
    };
    cache: {
      status: 'connected' | 'disconnected';
    };
  };
}

const router = Router();

router.get('/health', (_req: Request, res: Response): void => {
  const dbConnected = isDatabaseConnected();
  const redisConnected = isRedisConnected();
  const transactionsSupported = supportsReplicaSetTransactions();

  // MongoDB is a critical dependency; if down, system is unhealthy
  // Redis operates in degraded mode if down (Section 10)
  const isHealthy = dbConnected;
  const status: HealthResponseData['status'] = !isHealthy
    ? 'unhealthy'
    : redisConnected
    ? 'healthy'
    : 'degraded';

  const responseData: HealthResponseData = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env['NODE_ENV'] || 'development',
    version: '1.0.0',
    dependencies: {
      database: {
        status: dbConnected ? 'connected' : 'disconnected',
        replicaSetTransactions: transactionsSupported,
      },
      cache: {
        status: redisConnected ? 'connected' : 'disconnected',
      },
    },
  };

  const envelope: ApiResponse<HealthResponseData> = {
    success: true,
    data: responseData,
  };

  const statusCode = isHealthy ? 200 : 503;
  res.status(statusCode).json(envelope);
});

export const healthRoutes = router;

