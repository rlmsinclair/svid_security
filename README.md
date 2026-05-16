# SVID Security

AI-powered CCTV footage search platform. Upload security camera recordings and search across them using natural language — "person in red jacket", "silver car near entrance", "someone carrying a box".

## Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Next.js Web   │────▶│  PostgreSQL  │     │  Cloudflare R2  │
│  (Railway)      │     │  + pgvector  │     │  (Video/Frames) │
│                 │     │  (Railway)   │     └────────┬────────┘
│  - Dashboard    │     └──────────────┘              │
│  - Upload       │              ▲                    │
│  - Search       │              │                    │
│  - Video viewer │     ┌────────┴─────┐              │
└────────┬────────┘     │  BullMQ      │◀─────────────┘
         │              │  Worker      │
         │ enqueue      │  (Railway)   │
         └─────────────▶│              │
                        │  - ffmpeg    │
                        │  - Gemini    │
                        │  - OpenAI    │
                        └──────────────┘
                               ▲
                        ┌──────┴──────┐
                        │    Redis    │
                        │  (Railway)  │
                        └─────────────┘
```

## How It Works

1. **Upload**: Video files are uploaded via the web UI and stored in Cloudflare R2
2. **Extract**: The worker downloads each video and extracts frames at configurable intervals (default: every 30 seconds) using ffmpeg
3. **Analyze**: Each frame is sent to Google Gemini 2.5 Flash Lite for detailed vision analysis
4. **Embed**: The analysis text is embedded using OpenAI text-embedding-3-small (1536 dimensions) and stored in PostgreSQL with pgvector
5. **Search**: Natural language queries are embedded and compared against frame embeddings using cosine similarity

## Setup

### Prerequisites

- Docker & Docker Compose
- Cloudflare R2 bucket
- OpenAI API key
- Google Gemini API key

### Local Development

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in your API keys and R2 credentials in `.env`
4. Start all services:
   ```bash
   docker compose up --build
   ```
5. Open http://localhost:3000

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `R2_ACCOUNT_ID` | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_BUCKET_NAME` | R2 bucket name (e.g. `svid-frames`) |
| `OPENAI_API_KEY` | OpenAI API key (for embeddings) |
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key (for vision analysis) |

## Railway Deployment

1. Create a new Railway project
2. Add services:
   - **PostgreSQL** plugin (enable the pgvector extension via the query console: `CREATE EXTENSION vector;`)
   - **Redis** plugin
   - **Web service** pointing to `/web` directory with `Dockerfile`
   - **Worker service** pointing to `/worker` directory with `Dockerfile`
3. Set environment variables on both web and worker services
4. Deploy

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/videos` | List all videos |
| `GET` | `/api/videos/:id` | Get video + frames |
| `POST` | `/api/upload` | Upload a video (multipart/form-data: `file`, `cameraId?`, `frameInterval?`) |
| `POST` | `/api/search` | Search footage (JSON: `{ query, count? }`) |
| `GET` | `/api/cameras` | List cameras |
| `POST` | `/api/cameras` | Create camera (JSON: `{ name, location? }`) |

### Search Request Example

```bash
curl -X POST https://your-domain.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "person in red jacket near entrance", "count": 10}'
```

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Node.js, BullMQ job queue
- **Database**: PostgreSQL 16 + pgvector
- **Storage**: Cloudflare R2 (S3-compatible)
- **Vision AI**: Google Gemini 2.5 Flash Lite
- **Embeddings**: OpenAI text-embedding-3-small
- **Frame extraction**: ffmpeg via fluent-ffmpeg
- **Deployment**: Railway
