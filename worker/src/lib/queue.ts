import IORedis from 'ioredis';
import { Queue } from 'bullmq';

export const connection = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null });

export const videoQueue = new Queue('process-video', { connection });
export const frameQueue = new Queue('analyze-frame', { connection });
