'use client';

import { useState, useEffect, useRef, DragEvent } from 'react';
import Link from 'next/link';

interface Camera {
  id: string;
  name: string;
  location?: string;
}

interface FileUploadState {
  file: File;
  status: 'pending' | 'uploading' | 'done' | 'error';
  videoId?: string;
  error?: string;
}

export default function UploadPage() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState('');
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [frameInterval, setFrameInterval] = useState(30);
  const [uploading, setUploading] = useState(false);
  const [allDone, setAllDone] = useState(false);
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

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid = Array.from(incoming).filter((f) => f.type.startsWith('video/'));
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.file.name));
      const newEntries = valid
        .filter((f) => !existingNames.has(f.name))
        .map((f) => ({ file: f, status: 'pending' as const }));
      return [...prev, ...newEntries];
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
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
    if (files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      setFiles((prev) =>
        prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f)
      );

      const formData = new FormData();
      formData.append('file', files[i].file);
      if (cameraId) formData.append('cameraId', cameraId);
      formData.append('frameInterval', String(frameInterval));

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json() as { videoId: string; error?: string };
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setFiles((prev) =>
          prev.map((f, idx) => idx === i ? { ...f, status: 'done', videoId: data.videoId } : f)
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: String(err) } : f)
        );
      }
    }

    setUploading(false);
    setAllDone(true);
  };

  const reset = () => {
    setFiles([]);
    setAllDone(false);
  };

  const doneFiles = files.filter((f) => f.status === 'done');
  const errorFiles = files.filter((f) => f.status === 'error');

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-2">Upload Videos</h1>
      <p className="text-gray-400 mb-8">Upload CCTV footage to index and make it searchable</p>

      {allDone ? (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
          <h2 className="text-green-300 font-semibold text-lg">
            {doneFiles.length} video{doneFiles.length !== 1 ? 's' : ''} queued for processing
          </h2>
          {errorFiles.length > 0 && (
            <p className="text-red-400 text-sm mt-1">{errorFiles.length} failed</p>
          )}
          <div className="mt-4 space-y-1">
            {doneFiles.map((f) => (
              <div key={f.videoId} className="flex items-center justify-between text-sm">
                <span className="text-gray-400 truncate">{f.file.name}</span>
                <Link href={`/video/${f.videoId}`} className="text-blue-400 hover:text-blue-300 ml-4 shrink-0">
                  View →
                </Link>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-5">
            <Link href="/" className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors">
              Dashboard
            </Link>
            <button
              onClick={reset}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
            >
              Upload More
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
            <label className="block text-sm font-medium text-gray-300 mb-2">Video Files</label>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                dragging ? 'border-blue-500 bg-blue-950/20' : 'border-gray-700 hover:border-gray-600'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-gray-400">Drag & drop videos here, or click to select</p>
              <p className="text-gray-600 text-sm mt-1">MP4, MOV, AVI — multiple files supported</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-3 space-y-2">
                {files.map((f, i) => (
                  <li key={f.file.name} className="flex items-center gap-3 bg-gray-800 rounded px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{f.file.name}</p>
                      <p className="text-gray-500 text-xs">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    <div className="shrink-0">
                      {f.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="text-gray-600 hover:text-gray-400 text-xs"
                        >
                          ✕
                        </button>
                      )}
                      {f.status === 'uploading' && (
                        <span className="text-blue-400 text-xs animate-pulse">Uploading…</span>
                      )}
                      {f.status === 'done' && (
                        <span className="text-green-400 text-xs">Done</span>
                      )}
                      {f.status === 'error' && (
                        <span className="text-red-400 text-xs">Failed</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
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

          <button
            type="submit"
            disabled={files.length === 0 || uploading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-3 rounded font-medium transition-colors"
          >
            {uploading
              ? `Uploading ${files.filter((f) => f.status === 'done').length + 1} of ${files.length}…`
              : `Upload ${files.length > 0 ? `${files.length} ` : ''}Video${files.length !== 1 ? 's' : ''}`}
          </button>
        </form>
      )}
    </div>
  );
}
