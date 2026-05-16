import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';
import { getPresignedUrl } from '@/lib/r2';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { query, count = 20 } = await req.json() as { query: string; count?: number };

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const embedding = await generateEmbedding(query);
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await pool.query(
      `SELECT f.id, f.video_id, f.frame_number, f.video_timestamp_seconds,
              f.storage_key, f.analysis,
              1 - (f.embedding <=> $1::vector) AS score,
              v.filename, v.camera_id,
              c.name as camera_name
       FROM frames f
       JOIN videos v ON f.video_id = v.id
       LEFT JOIN cameras c ON v.camera_id = c.id
       WHERE f.embedding IS NOT NULL
       ORDER BY f.embedding <=> $1::vector
       LIMIT $2`,
      [embeddingStr, count]
    );

    const rows = await Promise.all(
      result.rows.map(async (row) => ({
        ...row,
        imageUrl: await getPresignedUrl(row.storage_key),
      }))
    );

    await pool.query(
      'INSERT INTO search_queries (query, result_count) VALUES ($1, $2)',
      [query, rows.length]
    );

    return NextResponse.json({ results: rows });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
