import Link from 'next/link';
import pool from '@/lib/db';

async function getStats() {
  try {
    const [videosRes, framesRes, camerasRes, searchesTodayRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM videos'),
      pool.query('SELECT COUNT(*) FROM frames WHERE embedding IS NOT NULL'),
      pool.query('SELECT COUNT(*) FROM cameras'),
      pool.query("SELECT COUNT(*) FROM search_queries WHERE created_at > NOW() - INTERVAL '24 hours'"),
    ]);
    return {
      totalVideos: parseInt(videosRes.rows[0].count),
      framesIndexed: parseInt(framesRes.rows[0].count),
      totalCameras: parseInt(camerasRes.rows[0].count),
      searchesToday: parseInt(searchesTodayRes.rows[0].count),
    };
  } catch {
    return { totalVideos: 0, framesIndexed: 0, totalCameras: 0, searchesToday: 0 };
  }
}

async function getRecentVideos() {
  try {
    const result = await pool.query(
      `SELECT v.id, v.filename, v.status, v.frame_count, v.created_at, c.name as camera_name
       FROM videos v
       LEFT JOIN cameras c ON v.camera_id = c.id
       ORDER BY v.created_at DESC
       LIMIT 10`
    );
    return result.rows;
  } catch {
    return [];
  }
}

const statusConfig: Record<string, { label: string; class: string }> = {
  pending: { label: 'Pending', class: 'bg-yellow-900 text-yellow-300' },
  processing: { label: 'Processing', class: 'bg-blue-900 text-blue-300 animate-pulse' },
  completed: { label: 'Completed', class: 'bg-green-900 text-green-300' },
  failed: { label: 'Failed', class: 'bg-red-900 text-red-300' },
};

export default async function Dashboard() {
  const [stats, videos] = await Promise.all([getStats(), getRecentVideos()]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Security Operations Dashboard</h1>
        <p className="text-gray-400 mt-1">Monitor and search your CCTV footage with AI</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Videos', value: stats.totalVideos },
          { label: 'Frames Indexed', value: stats.framesIndexed },
          { label: 'Cameras', value: stats.totalCameras },
          { label: 'Searches Today', value: stats.searchesToday },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <p className="text-gray-400 text-sm">{stat.label}</p>
            <p className="text-3xl font-bold text-white mt-1">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Search</h2>
        <form action="/search" method="get" className="flex gap-3">
          <input
            name="q"
            type="text"
            placeholder='e.g. "person in red jacket near entrance"'
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Recent Videos</h2>
          <Link href="/upload" className="text-blue-400 hover:text-blue-300 text-sm">
            + Upload Video
          </Link>
        </div>
        {videos.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>No videos uploaded yet.</p>
            <Link href="/upload" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
              Upload your first video
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-gray-800">
                  <th className="px-6 py-3">Filename</th>
                  <th className="px-6 py-3">Camera</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Frames</th>
                  <th className="px-6 py-3">Uploaded</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {videos.map((video) => {
                  const s = statusConfig[video.status] || statusConfig.pending;
                  return (
                    <tr key={video.id} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-white">{video.filename}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{video.camera_name || '—'}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${s.class}`}>{s.label}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">{video.frame_count}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {new Date(video.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/video/${video.id}`} className="text-blue-400 hover:text-blue-300 text-sm">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
