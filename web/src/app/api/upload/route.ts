import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import pool from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';
import { videoQueue } from '@/lib/queue';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const cameraId = formData.get('cameraId') as string | null;
    const frameInterval = parseInt((formData.get('frameInterval') as string) || '30', 10);

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const videoId = uuidv4();
    const storageKey = `videos/${videoId}/${file.name}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadToR2(storageKey, buffer, file.type || 'video/mp4');

    await pool.query(
      `INSERT INTO videos (id, camera_id, filename, storage_key, frame_interval_seconds, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [videoId, cameraId || null, file.name, storageKey, frameInterval]
    );

    await videoQueue.add('process-video', { videoId }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
    });

    return NextResponse.json({ videoId, status: 'pending' });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
