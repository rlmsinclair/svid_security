import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM cameras ORDER BY name');
    return NextResponse.json({ cameras: result.rows });
  } catch (err) {
    console.error('Cameras fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch cameras' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, location } = await req.json() as { name: string; location?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Camera name is required' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO cameras (name, location) VALUES ($1, $2) RETURNING *',
      [name.trim(), location?.trim() || null]
    );

    return NextResponse.json({ camera: result.rows[0] }, { status: 201 });
  } catch (err) {
    console.error('Camera create error:', err);
    return NextResponse.json({ error: 'Failed to create camera' }, { status: 500 });
  }
}
