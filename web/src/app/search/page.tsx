'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface SearchResult {
  id: string;
  video_id: string;
  frame_number: number;
  video_timestamp_seconds: number;
  storage_key: string;
  analysis: string;
  score: number;
  filename: string;
  camera_name: string | null;
  imageUrl: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q);
    }
  }, []);

  const doSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, count: 24 }),
      });
      const data = await res.json() as { results: SearchResult[] };
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
    doSearch(query);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Search Footage</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='e.g. "person in red jacket", "silver car near entrance"'
            className="flex-1 bg-gray-900 border border-gray-700 rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-lg"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded font-medium transition-colors"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="inline-block w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p>Searching with AI...</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">No results found</p>
          <p className="text-sm mt-1">Try different search terms or upload more footage</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div>
          <p className="text-gray-400 text-sm mb-4">{results.length} result{results.length !== 1 ? 's' : ''}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/video/${result.video_id}?frame=${result.frame_number}`}
                className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-blue-600 transition-colors group"
              >
                <div className="relative aspect-video bg-gray-800">
                  <img
                    src={result.imageUrl}
                    alt={`Frame ${result.frame_number}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                    {Math.round(result.score * 100)}%
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-white text-xs font-medium truncate">{result.filename}</p>
                  {result.camera_name && (
                    <p className="text-gray-500 text-xs">{result.camera_name}</p>
                  )}
                  <p className="text-gray-500 text-xs">@ {formatTime(result.video_timestamp_seconds)}</p>
                  <p className="text-gray-400 text-xs mt-2 line-clamp-2">{result.analysis?.slice(0, 150)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!searched && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-lg">Enter a search query to find footage</p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {['person in red jacket', 'silver car', 'someone carrying a box', 'suspicious activity'].map((q) => (
              <button
                key={q}
                onClick={() => { setQuery(q); doSearch(q); }}
                className="text-gray-500 hover:text-blue-400 border border-gray-700 hover:border-blue-600 px-3 py-1 rounded-full text-sm transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
      <SearchContent />
    </Suspense>
  );
}
