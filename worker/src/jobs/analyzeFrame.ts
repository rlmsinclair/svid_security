import { Job } from 'bullmq';
import pool from '../lib/db';
import { downloadFromR2 } from '../lib/r2';
import { analyzeFrame as geminiAnalyze } from '../lib/gemini';
import { generateEmbedding } from '../lib/embeddings';

export async function analyzeFrame(job: Job): Promise<void> {
  const { frameId, videoId } = job.data as { frameId: string; videoId: string };

  const frameRes = await pool.query('SELECT * FROM frames WHERE id = $1', [frameId]);
  const frame = frameRes.rows[0];
  if (!frame) throw new Error(`Frame ${frameId} not found`);

  await job.updateProgress(10);

  const imageBuffer = await downloadFromR2(frame.storage_key);

  await job.updateProgress(30);

  const analysis = await geminiAnalyze(imageBuffer);

  await job.updateProgress(60);

  const embedding = await generateEmbedding(analysis);
  const embeddingStr = `[${embedding.join(',')}]`;

  await pool.query(
    `UPDATE frames
     SET analysis = $1, embedding = $2::vector, analyzed_at = NOW(), embedded_at = NOW()
     WHERE id = $3`,
    [analysis, embeddingStr, frameId]
  );

  await job.updateProgress(90);

  const pendingRes = await pool.query(
    `SELECT COUNT(*) as count FROM frames WHERE video_id = $1 AND embedding IS NULL`,
    [videoId]
  );

  if (parseInt(pendingRes.rows[0].count) === 0) {
    await pool.query(
      "UPDATE videos SET status = 'completed', processed_at = NOW() WHERE id = $1",
      [videoId]
    );
  }

  await job.updateProgress(100);
}
