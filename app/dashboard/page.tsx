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
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchData();
    fetchLinkedInStatus();
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

  const fetchLinkedInStatus = async () => {
    try {
      const response = await fetch('/api/settings/linkedin');
      if (response.ok) {
        const data = await response.json();
        setLinkedinEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error fetching LinkedIn status:', error);
    }
  };

  const toggleLinkedIn = async () => {
    try {
      const response = await fetch('/api/settings/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !linkedinEnabled }),
      });

      if (response.ok) {
        setLinkedinEnabled(!linkedinEnabled);
      }
    } catch (error) {
      console.error('Error toggling LinkedIn:', error);
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

  const handleDeleteFromQueue = async (id: string, type: 'blog' | 'linkedin') => {
    if (!confirm('Remove this item from the queue?')) return;

    try {
      const response = await fetch(`/api/queue/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting from queue:', error);
    }
  };

  const handleRetryFailed = async (id: string) => {
    try {
      const response = await fetch(`/api/content/${id}/retry`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error retrying:', error);
    }
  };

  const toggleCardExpansion = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getQueueDayLabel = (position: number, type: 'blog' | 'linkedin', isPaused: boolean = false) => {
    if (type === 'blog') {
      const weeks = Math.floor((position - 1) / 1);
      const label = weeks === 0 ? 'Monday' : `Monday (in ${weeks + 1} weeks)`;
      return label;
    } else {
      const days = ['Tuesday', 'Thursday', 'Saturday'];
      const weekNum = Math.floor((position - 1) / 3);
      const dayIndex = (position - 1) % 3;
      const label = weekNum === 0 ? days[dayIndex] : `${days[dayIndex]} (week ${weekNum + 1})`;
      return isPaused ? `${label} - PAUSED` : label;
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
                    {expandedCards.has(idea.id) 
                      ? idea.content 
                      : `${idea.content.substring(0, 150)}${idea.content.length > 150 ? '...' : ''}`}
                  </p>
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => handleDraft(idea.id)}
                      className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                    >
                      Draft It
                    </button>
                    {idea.content.length > 150 && (
                      <button
                        onClick={() => toggleCardExpansion(idea.id)}
                        className="text-blue-500 text-sm hover:underline"
                      >
                        {expandedCards.has(idea.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* LinkedIn Queue */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">LinkedIn Queue</h2>
              <label className="flex items-center space-x-2">
                <span className="text-sm font-medium">Enable Posting</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={linkedinEnabled}
                    onChange={toggleLinkedIn}
                    className="sr-only"
                  />
                  <div 
                    onClick={toggleLinkedIn}
                    className={`block w-12 h-6 rounded-full cursor-pointer transition-colors ${
                      linkedinEnabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                      linkedinEnabled ? 'transform translate-x-6' : ''
                    }`} />
                  </div>
                </div>
              </label>
            </div>
            
            {!linkedinEnabled && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded mb-3 text-sm">
                ⚠️ LinkedIn posting is paused. Items will remain in queue.
              </div>
            )}
            
            <div className="space-y-3">
              {linkedinQueue.map((item) => (
                <div 
                  key={item.id} 
                  className={`border rounded p-3 ${
                    item.status === 'failed' ? 'border-red-500' : 
                    !linkedinEnabled ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-sm font-semibold text-gray-500">
                      {getQueueDayLabel(item.queue_position!, 'linkedin', !linkedinEnabled)} - Position {item.queue_position}
                    </div>
                    <button
                      onClick={() => handleDeleteFromQueue(item.id, 'linkedin')}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Remove from queue"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-sm mb-2">
                    {expandedCards.has(item.id)
                      ? item.content
                      : `${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}`}
                  </p>
                  <div className="flex justify-between">
                    {item.status === 'failed' && (
                      <button 
                        onClick={() => handleRetryFailed(item.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        Retry
                      </button>
                    )}
                    {item.content.length > 150 && (
                      <button
                        onClick={() => toggleCardExpansion(item.id)}
                        className="text-blue-500 text-xs hover:underline ml-auto"
                      >
                        {expandedCards.has(item.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
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
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-sm font-semibold text-gray-500">
                      {getQueueDayLabel(item.queue_position!, 'blog')} - Position {item.queue_position}
                    </div>
                    <button
                      onClick={() => handleDeleteFromQueue(item.id, 'blog')}
                      className="text-red-500 hover:text-red-700 text-sm"
                      title="Remove from queue"
                    >
                      ×
                    </button>
                  </div>
                  {item.title && (
                    <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  )}
                  <p className="text-sm mb-2">
                    {expandedCards.has(item.id)
                      ? item.content
                      : `${item.content.substring(0, 150)}${item.content.length > 150 ? '...' : ''}`}
                  </p>
                  <div className="flex justify-between">
                    {item.status === 'failed' && (
                      <button 
                        onClick={() => handleRetryFailed(item.id)}
                        className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                      >
                        Retry
                      </button>
                    )}
                    {item.content.length > 150 && (
                      <button
                        onClick={() => toggleCardExpansion(item.id)}
                        className="text-blue-500 text-xs hover:underline ml-auto"
                      >
                        {expandedCards.has(item.id) ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}