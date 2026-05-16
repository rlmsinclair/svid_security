'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Frame {
  id: string;
  frame_number: number;
  video_timestamp_seconds: number;
  storage_key: string;
  analysis: string | null;
  imageUrl: string;
}

interface Video {
  id: string;
  filename: string;
  status: string;
  frame_count: number;
  camera_name: string | null;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  frame_interval_seconds: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-900 text-yellow-300' },
  processing: { label: 'Processing', class: 'bg-blue-900 text-blue-300 animate-pulse' },
  completed: { label: 'Completed', class: 'bg-green-900 text-green-300' },
  failed: { label: 'Failed', class: 'bg-red-900 text-red-300' },
};

export default function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const highlightFrame = parseInt(searchParams.get('frame') || '0', 10);

  const [video, setVideo] = useState<Video | null>(null);
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(true);
  const selectedFrameRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/videos/${id}`);
      const data = await res.json() as { video: Video; frames: Frame[] };
      setVideo(data.video);
      setFrames(data.frames);

      if (!selectedFrame) {
        const target = highlightFrame
          ? data.frames.find((f) => f.frame_number === highlightFrame)
          : data.frames[0];
        if (target) setSelectedFrame(target);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!video) return;
    if (video.status === 'pending' || video.status === 'processing') {
      const timer = setInterval(fetchData, 5000);
      return () => clearInterval(timer);
    }
  }, [video?.status]);

  useEffect(() => {
    selectedFrameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedFrame]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
        Loading...
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p>Video not found</p>
        <Link href="/" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">← Back to dashboard</Link>
      </div>
    );
  }

  const s = statusConfig[video.status] || statusConfig.pending;

  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Dashboard</Link>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{video.filename}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              {video.camera_name && <span>Camera: {video.camera_name}</span>}
              <span>Frames: {video.frame_count}</span>
              <span>Interval: {video.frame_interval_seconds}s</span>
              <span>Uploaded: {new Date(video.created_at).toLocaleDateString()}</span>
              {video.processed_at && (
                <span>Processed: {new Date(video.processed_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full ${s.class}`}>{s.label}</span>
        </div>

        {video.error_message && (
          <div className="mt-3 bg-red-900/30 border border-red-700 rounded p-3 text-red-300 text-sm">
            Error: {video.error_message}
          </div>
        )}

        {(video.status === 'pending' || video.status === 'processing') && (
          <div className="mt-3 text-gray-500 text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            Processing... refreshing every 5 seconds
          </div>
        )}
      </div>

      {frames.length > 0 && (
        <>
          <div className="overflow-x-auto pb-3 mb-6">
            <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
              {frames.map((frame) => {
                const isSelected = selectedFrame?.id === frame.id;
                const isHighlighted = frame.frame_number === highlightFrame;
                return (
                  <div
                    key={frame.id}
                    ref={isSelected ? selectedFrameRef : null}
                    onClick={() => setSelectedFrame(frame)}
                    className={`flex-shrink-0 cursor-pointer rounded overflow-hidden border-2 transition-colors ${
                      isSelected
                        ? 'border-blue-500'
                        : isHighlighted
                        ? 'border-yellow-500'
                        : 'border-transparent hover:border-gray-600'
                    }`}
                    style={{ width: 120 }}
                  >
                    <img
                      src={frame.imageUrl}
                      alt={`Frame ${frame.frame_number}`}
                      className="w-full aspect-video object-cover"
                    />
                    <div className="bg-gray-900 px-1 py-0.5 text-center text-xs text-gray-500">
                      {formatTime(frame.video_timestamp_seconds)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedFrame && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                <img
                  src={selectedFrame.imageUrl}
                  alt={`Frame ${selectedFrame.frame_number}`}
                  className="w-full object-cover"
                />
                <div className="p-3 text-sm text-gray-400 flex gap-4">
                  <span>Frame #{selectedFrame.frame_number}</span>
                  <span>@ {formatTime(selectedFrame.video_timestamp_seconds)}</span>
                </div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-white font-semibold mb-3">AI Analysis</h3>
                {selectedFrame.analysis ? (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedFrame.analysis}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm">
                    {video.status === 'completed' ? 'No analysis available' : 'Analysis pending...'}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {frames.length === 0 && video.status !== 'failed' && (
        <div className="text-center py-12 text-gray-500">
          <p>No frames extracted yet</p>
          {(video.status === 'pending' || video.status === 'processing') && (
            <p className="text-sm mt-1">Processing in progress...</p>
          )}
        </div>
      )}
    </div>
  );
}
