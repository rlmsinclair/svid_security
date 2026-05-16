CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE cameras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  duration_seconds INTEGER,
  frame_interval_seconds INTEGER DEFAULT 30,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  frame_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE frames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL,
  video_timestamp_seconds FLOAT NOT NULL,
  storage_key TEXT NOT NULL,
  analysis TEXT,
  embedding vector(1536),
  analyzed_at TIMESTAMPTZ,
  embedded_at TIMESTAMPTZ,
  UNIQUE (video_id, frame_number)
);

CREATE INDEX frames_embedding_idx ON frames
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
