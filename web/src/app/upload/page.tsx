'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Camera {
  id: string;
  name: string;
  location?: string;
}

export default function UploadPage() {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [frameInterval, setFrameInterval] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [uploadedVideoId, setUploadedVideoId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showNewCamera, setShowNewCamera] = useState(false);
  const [newCameraName, setNewCameraName] = useState('');
  const [newCameraLocation, setNewCameraLocation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/cameras')
      .then((r) => r.json())
      .then((d) => setCameras(d.cameras || []));
  }, []);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type.startsWith('video/')) setFile(dropped);
  };

  const addCamera = async () => {
    if (!newCameraName.trim()) return;
    const res = await fetch('/api/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCameraName, location: newCameraLocation }),
    });
    const data = await res.json() as { camera: Camera };
    setCameras((prev) => [...prev, data.camera]);
    setCameraId(data.camera.id);
    setShowNewCamera(false);
    setNewCameraName('');
    setNewCameraLocation('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setProgress('Uploading video...');

    const formData = new FormData();
    formData.append('file', file);
    if (cameraId) formData.append('cameraId', cameraId);
    formData.append('frameInterval', String(frameInterval));

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json() as { videoId: string };
      setUploadedVideoId(data.videoId);
      setProgress('Upload complete! Processing started.');
    } catch {
      setProgress('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Upload Video</h1>
      <p className="text-gray-400 mb-8">Upload CCTV footage to index and make it searchable</p>

      {uploadedVideoId ? (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
          <h2 className="text-green-300 font-semibold text-lg">Upload successful!</h2>
          <p className="text-gray-400 mt-1 mb-4">
            Your video is queued for processing. Frames will be extracted and indexed with AI.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/video/${uploadedVideoId}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              View Video Status
            </button>
            <button
              onClick={() => {
                setFile(null);
                setUploading(false);
                setProgress('');
                setUploadedVideoId(null);
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Upload Another
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Camera</label>
            <div className="flex gap-2">
              <select
                value={cameraId}
                onChange={(e) => setCameraId(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">No camera assigned</option>
                {cameras.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCamera(!showNewCamera)}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                + New
              </button>
            </div>
            {showNewCamera && (
              <div className="mt-3 bg-gray-800 border border-gray-700 rounded p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Camera name (e.g. Front Entrance)"
                  value={newCameraName}
                  onChange={(e) => setNewCameraName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Location (optional)"
                  value={newCameraLocation}
                  onChange={(e) => setNewCameraLocation(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addCamera}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                >
                  Add Camera
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Video File</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600'
              } ${file ? 'border-green-600 bg-green-950/20' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <div>
                  <p className="text-green-400 font-medium">{file.name}</p>
                  <p className="text-gray-500 text-sm mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-400">Drag & drop video here, or click to select</p>
                  <p className="text-gray-600 text-sm mt-1">MP4, MOV, AVI supported</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Frame Interval: <span className="text-blue-400">{frameInterval}s</span>
            </label>
            <input
              type="range"
              min={10}
              max={120}
              step={10}
              value={frameInterval}
              onChange={(e) => setFrameInterval(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10s (more frames)</span>
              <span>120s (fewer frames)</span>
            </div>
          </div>

          {progress && (
            <div className="bg-blue-900/30 border border-blue-700 rounded p-3 text-blue-300 text-sm">
              {progress}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded font-medium transition-colors"
          >
            {uploading ? 'Uploading...' : 'Upload & Process Video'}
          </button>
        </form>
      )}
    </div>
  );
}
