import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT v.*, c.name as camera_name
       FROM videos v
       LEFT JOIN cameras c ON v.camera_id = c.id
       ORDER BY v.created_at DESC
       LIMIT 100`
    );
    return NextResponse.json({ videos: result.rows });
  } catch (err) {
    console.error('Videos fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
  }
}
