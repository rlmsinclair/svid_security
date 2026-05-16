import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getPresignedUrl } from '@/lib/r2';

export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const videoRes = await pool.query(
      `SELECT v.*, c.name as camera_name
       FROM videos v
       LEFT JOIN cameras c ON v.camera_id = c.id
       WHERE v.id = $1`,
      [id]
    );

    if (videoRes.rows.length === 0) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const framesRes = await pool.query(
      `SELECT id, frame_number, video_timestamp_seconds, storage_key, analysis, analyzed_at
       FROM frames
       WHERE video_id = $1
       ORDER BY frame_number`,
      [id]
    );

    const frames = await Promise.all(
      framesRes.rows.map(async (frame) => ({
        ...frame,
        imageUrl: await getPresignedUrl(frame.storage_key),
      }))
    );

    return NextResponse.json({ video: videoRes.rows[0], frames });
  } catch (err) {
    console.error('Video fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch video' }, { status: 500 });
  }
}
