import IORedis from 'ioredis';
import { Queue } from 'bullmq';

const globalConn = global as typeof global & { _redis?: IORedis };

if (!globalConn._redis) {
  globalConn._redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null, family: 0 });
}

export const connection = globalConn._redis;

export const videoQueue = new Queue('process-video', { connection });
