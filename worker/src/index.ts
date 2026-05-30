import 'dotenv/config';
import { Worker } from 'bullmq';
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
