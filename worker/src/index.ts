import 'dotenv/config';
import { Worker } from 'bullmq';

// === REDIS DIAG (temporary) ===
(async () => {
  const dns = await import('dns');
  const net = await import('net');
  const url = process.env.REDIS_URL || '';
  const host = (url.match(/@([^:/?]+)/) || [])[1] || 'redis.railway.internal';
  const port = parseInt((url.match(/:(\d+)/g)?.pop() || ':6379').slice(1), 10);
  console.log(`[diag] REDIS host=${host} port=${port}`);
  for (const fam of [0, 4, 6] as const) {
    try {
      const r = await dns.promises.lookup(host, { family: fam, all: true });
      console.log(`[diag] dns family=${fam}: ${JSON.stringify(r)}`);
    } catch (e: any) {
      console.log(`[diag] dns family=${fam} ERR: ${e.message}`);
    }
  }
  for (const fam of [4, 6] as const) {
    await new Promise<void>((resolve) => {
      const s = net.createConnection({ host, port, family: fam, timeout: 4000 });
      s.once('connect', () => { console.log(`[diag] tcp family=${fam} CONNECTED`); s.destroy(); resolve(); });
      s.once('timeout', () => { console.log(`[diag] tcp family=${fam} TIMEOUT`); s.destroy(); resolve(); });
      s.once('error', (e) => { console.log(`[diag] tcp family=${fam} ERR ${e.message}`); resolve(); });
    });
  }
  console.log('[diag] done');
})();

import { connection } from './lib/queue';
import { processVideo } from './jobs/processVideo';
import { analyzeFrame } from './jobs/analyzeFrame';

const videoWorker = new Worker(
  'process-video',
  async (job) => {
    console.log(`Processing video job ${job.id}: ${job.data.videoId}`);
    await processVideo(job);
    console.log(`Completed video job ${job.id}`);
  },
  { connection, concurrency: 2 }
);

const frameWorker = new Worker(
  'analyze-frame',
  async (job) => {
    console.log(`Analyzing frame job ${job.id}: ${job.data.frameId}`);
    await analyzeFrame(job);
    console.log(`Completed frame job ${job.id}`);
  },
  { connection, concurrency: 1 }
);

videoWorker.on('failed', (job, err) => {
  console.error(`Video job ${job?.id} failed:`, err.message);
  if (job?.data?.videoId) {
    import('./lib/db').then(({ default: pool }) => {
      pool.query(
        "UPDATE videos SET status = 'failed', error_message = $1 WHERE id = $2",
        [err.message, job.data.videoId]
      ).catch(console.error);
    });
  }
});

frameWorker.on('failed', (job, err) => {
  console.error(`Frame job ${job?.id} failed:`, err.message);
});

console.log('SVID Worker started — waiting for jobs');

process.on('SIGTERM', async () => {
  await videoWorker.close();
  await frameWorker.close();
  process.exit(0);
});
