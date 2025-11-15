'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Idea {
  id: string;
  content: string;
  source_email: string | null;
  status: string;
  created_at: string;
}

interface ContentPiece {
  id: string;
  idea_id: string;
  type: 'blog' | 'linkedin';
  title: string | null;
  content: string;
  status: string;
  queue_position: number | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [linkedinQueue, setLinkedinQueue] = useState<ContentPiece[]>([]);
  const [blogQueue, setBlogQueue] = useState<ContentPiece[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [ideasRes, queueRes] = await Promise.all([
        fetch('/api/ideas'),
        fetch('/api/queue')
      ]);

      if (ideasRes.ok) {
        const ideasData = await ideasRes.json();
        setIdeas(ideasData);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setLinkedinQueue(queueData.linkedin);
        setBlogQueue(queueData.blog);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDraft = (ideaId: string) => {
    router.push(`/draft/${ideaId}`);
  };

  const handleAddIdea = async () => {
    const content = prompt('Enter your idea:');
    if (!content) return;

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  };

  const getQueueDayLabel = (position: number, type: 'blog' | 'linkedin') => {
    if (type === 'blog') {
      const weeks = Math.floor((position - 1) / 1);
      return weeks === 0 ? 'Monday' : `Monday (in ${weeks + 1} weeks)`;
    } else {
      const days = ['Tuesday', 'Thursday', 'Saturday'];
      const weekNum = Math.floor((position - 1) / 3);
      const dayIndex = (position - 1) % 3;
      return weekNum === 0 ? days[dayIndex] : `${days[dayIndex]} (week ${weekNum + 1})`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Content Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Ideas Column */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Ideas</h2>
              <button
                onClick={handleAddIdea}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Idea
              </button>
            </div>
            <div className="space-y-3">
              {ideas.map((idea) => (
                <div key={idea.id} className="border rounded p-3">
                  <p className="text-sm text-gray-600 mb-2">
                    {idea.content.substring(0, 150)}...
                  </p>
                  <button
                    onClick={() => handleDraft(idea.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Draft It
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* LinkedIn Queue */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">LinkedIn Queue</h2>
            <div className="space-y-3">
              {linkedinQueue.map((item) => (
                <div 
                  key={item.id} 
                  className={`border rounded p-3 ${item.status === 'failed' ? 'border-red-500' : ''}`}
                >
                  <div className="text-sm font-semibold text-gray-500 mb-1">
                    {getQueueDayLabel(item.queue_position!, 'linkedin')} - Position {item.queue_position}
                  </div>
                  <p className="text-sm mb-2">
                    {item.content.substring(0, 150)}...
                  </p>
                  {item.status === 'failed' && (
                    <button className="px-2 py-1 bg-red-500 text-white rounded text-xs">
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Blog Queue */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold mb-4">Blog Queue</h2>
            <div className="space-y-3">
              {blogQueue.map((item) => (
                <div 
                  key={item.id} 
                  className={`border rounded p-3 ${item.status === 'failed' ? 'border-red-500' : ''}`}
                >
                  <div className="text-sm font-semibold text-gray-500 mb-1">
                    {getQueueDayLabel(item.queue_position!, 'blog')} - Position {item.queue_position}
                  </div>
                  {item.title && (
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  )}
                  <p className="text-sm mb-2">
                    {item.content.substring(0, 150)}...
                  </p>
                  {item.status === 'failed' && (
                    <button className="px-2 py-1 bg-red-500 text-white rounded text-xs">
                      Retry
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}