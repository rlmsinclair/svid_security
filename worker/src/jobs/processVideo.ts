import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import pool from '../lib/db';
import { downloadFromR2, uploadToR2 } from '../lib/r2';
import { frameQueue } from '../lib/queue';

export async function processVideo(job: Job): Promise<void> {
  const { videoId } = job.data as { videoId: string };

  const videoRes = await pool.query(
    'SELECT * FROM videos WHERE id = $1',
    [videoId]
  );
  const video = videoRes.rows[0];
  if (!video) throw new Error(`Video ${videoId} not found`);

  await pool.query("UPDATE videos SET status = 'processing' WHERE id = $1", [videoId]);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'svid-'));
  const videoPath = path.join(tmpDir, video.filename);
  const framesDir = path.join(tmpDir, 'frames');
  fs.mkdirSync(framesDir);

  try {
    await job.updateProgress(10);

    const videoBuffer = await downloadFromR2(video.storage_key);
    fs.writeFileSync(videoPath, videoBuffer);

    await job.updateProgress(30);

    const interval = video.frame_interval_seconds || 30;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([`-vf fps=1/${interval}`, '-q:v 2'])
        .output(path.join(framesDir, 'frame-%04d.jpg'))
        .on('end', () => resolve())
        .on('error', reject)
        .run();
    });

    await job.updateProgress(60);

    const frameFiles = fs.readdirSync(framesDir)
      .filter(f => f.endsWith('.jpg'))
      .sort();

    const frameInserts: Array<{ frameId: string; frameNumber: number; storageKey: string }> = [];

    for (let i = 0; i < frameFiles.length; i++) {
      const frameFile = frameFiles[i];
      const frameNumber = i + 1;
      const timestampSeconds = (frameNumber - 1) * interval;
      const storageKey = `frames/${videoId}/${frameNumber}.jpg`;

      const frameBuf = fs.readFileSync(path.join(framesDir, frameFile));
      await uploadToR2(storageKey, frameBuf, 'image/jpeg');

      const insertRes = await pool.query(
        `INSERT INTO frames (video_id, frame_number, video_timestamp_seconds, storage_key)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (video_id, frame_number) DO UPDATE SET storage_key = EXCLUDED.storage_key
         RETURNING id`,
        [videoId, frameNumber, timestampSeconds, storageKey]
      );

      frameInserts.push({ frameId: insertRes.rows[0].id, frameNumber, storageKey });
    }

    await pool.query('UPDATE videos SET frame_count = $1 WHERE id = $2', [frameFiles.length, videoId]);

    await job.updateProgress(80);

    for (const { frameId } of frameInserts) {
      await frameQueue.add('analyze-frame', { frameId, videoId }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    await job.updateProgress(100);

  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
