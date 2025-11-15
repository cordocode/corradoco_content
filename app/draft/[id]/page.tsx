'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Idea {
  id: string;
  content: string;
}

interface ContentPiece {
  id: string;
  type: 'blog' | 'linkedin';
  title: string | null;
  content: string;
}

export default function DraftPage() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<Idea | null>(null);
  const [linkedinCount, setLinkedinCount] = useState(1);
  const [blogCount, setBlogCount] = useState(0);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchIdea();
  }, [ideaId]);

  const fetchIdea = async () => {
    try {
      const response = await fetch(`/api/ideas/${ideaId}`);
      if (response.ok) {
        const data = await response.json();
        setIdea(data);
      }
    } catch (error) {
      console.error('Error fetching idea:', error);
    }
  };

  const handleGenerate = async () => {
    if (linkedinCount + blogCount === 0 || linkedinCount + blogCount > 5) return;
    
    setGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideaId,
          linkedinCount,
          blogCount,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPieces(data);
      }
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleContentUpdate = async (pieceId: string, content: string, title?: string) => {
    try {
      await fetch(`/api/content/${pieceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });

      setPieces(prev => prev.map(p => 
        p.id === pieceId ? { ...p, content, title: title || p.title } : p
      ));
    } catch (error) {
      console.error('Error updating content:', error);
    }
  };

  const handleRegenerate = async (pieceId: string) => {
    try {
      const response = await fetch(`/api/content/${pieceId}/regenerate`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setPieces(prev => prev.map(p => 
          p.id === pieceId ? data : p
        ));
      }
    } catch (error) {
      console.error('Error regenerating:', error);
    }
  };

  const handleAddToQueue = async (pieceId: string) => {
    try {
      await fetch('/api/queue/add-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: pieceId }),
      });
      alert('Added to queue!');
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  const handleAddAllToQueue = async () => {
    try {
      await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds: pieces.map(p => p.id) }),
      });
      alert('All added to queue!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  };

  if (!idea) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Original Idea */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Original Idea</h2>
          <p className="text-gray-700">{idea.content}</p>
        </div>

        {/* Generation Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-8">
            <div>
              <label className="block text-sm font-medium mb-2">
                LinkedIn Posts: {linkedinCount}
              </label>
              <input
                type="range"
                min="0"
                max="3"
                value={linkedinCount}
                onChange={(e) => setLinkedinCount(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Blog Posts: {blogCount}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                value={blogCount}
                onChange={(e) => setBlogCount(Number(e.target.value))}
                className="w-32"
              />
            </div>
            <div className="flex-1 text-center">
              <div className="text-sm text-gray-600 mb-2">
                Total: {linkedinCount + blogCount}/5
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || linkedinCount + blogCount === 0 || linkedinCount + blogCount > 5}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                {generating ? 'Generating...' : 'Generate All'}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Content */}
        {pieces.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {pieces.map((piece) => (
              <div key={piece.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    piece.type === 'blog' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {piece.type === 'blog' ? 'Blog' : 'LinkedIn'}
                  </span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleRegenerate(piece.id)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Regenerate
                    </button>
                    <button
                      onClick={() => handleAddToQueue(piece.id)}
                      className="text-sm text-green-600 hover:underline"
                    >
                      Add to Queue
                    </button>
                  </div>
                </div>

                {piece.type === 'blog' && (
                  <input
                    type="text"
                    value={piece.title || ''}
                    onChange={(e) => handleContentUpdate(piece.id, piece.content, e.target.value)}
                    placeholder="Blog title"
                    className="w-full mb-3 p-2 border rounded"
                  />
                )}

                {editingId === piece.id ? (
                  <textarea
                    value={piece.content}
                    onChange={(e) => handleContentUpdate(piece.id, e.target.value, piece.title || undefined)}
                    onBlur={() => setEditingId(null)}
                    className="w-full h-40 p-2 border rounded"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setEditingId(piece.id)}
                    className="cursor-pointer p-2 border rounded hover:bg-gray-50 min-h-[100px]"
                  >
                    {piece.content.substring(0, 300)}...
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  {piece.content.split(' ').length} words
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Actions */}
        {pieces.length > 0 && (
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-2 border rounded hover:bg-gray-50"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleAddAllToQueue}
              className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add All to Queue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}