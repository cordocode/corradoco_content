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
  const [selectedPieces, setSelectedPieces] = useState<Set<string>>(new Set());
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

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
    setPieces([]); // Clear previous pieces
    setSelectedPieces(new Set()); // Clear selections
    
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
        // Auto-select all new pieces
        setSelectedPieces(new Set(data.map((p: ContentPiece) => p.id)));
      }
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
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

  const toggleSelection = (pieceId: string) => {
    setSelectedPieces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pieceId)) {
        newSet.delete(pieceId);
      } else {
        newSet.add(pieceId);
      }
      return newSet;
    });
  };

  const toggleExpansion = (pieceId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pieceId)) {
        newSet.delete(pieceId);
      } else {
        newSet.add(pieceId);
      }
      return newSet;
    });
  };

  const handleAddSelectedToQueue = async () => {
    if (selectedPieces.size === 0) {
      alert('Please select at least one piece to add to queue');
      return;
    }

    const selectedIds = Array.from(selectedPieces);
    
    try {
      await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds: selectedIds }),
      });
      alert(`Added ${selectedIds.length} items to queue!`);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error adding to queue:', error);
      alert('Failed to add to queue. Please try again.');
    }
  };

  const handleAddSingleToQueue = async (pieceId: string) => {
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

  const selectAll = () => {
    setSelectedPieces(new Set(pieces.map(p => p.id)));
  };

  const selectNone = () => {
    setSelectedPieces(new Set());
  };

  if (!idea) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            ← Back to Dashboard
          </button>
          {pieces.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {selectedPieces.size} of {pieces.length} selected
              </span>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:underline"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="text-sm text-blue-600 hover:underline"
              >
                Select None
              </button>
            </div>
          )}
        </div>

        {/* Original Idea */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Original Idea</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{idea.content}</p>
        </div>

        {/* Generation Controls */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">
                LinkedIn Posts
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={linkedinCount}
                  onChange={(e) => setLinkedinCount(Number(e.target.value))}
                  className="flex-1"
                  disabled={generating}
                />
                <span className="w-8 text-center font-semibold text-lg">{linkedinCount}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Blog Posts
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="2"
                  value={blogCount}
                  onChange={(e) => setBlogCount(Number(e.target.value))}
                  className="flex-1"
                  disabled={generating}
                />
                <span className="w-8 text-center font-semibold text-lg">{blogCount}</span>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-gray-600 mb-2">
                Total: {linkedinCount + blogCount}/5
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || linkedinCount + blogCount === 0 || linkedinCount + blogCount > 5}
                className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Generating...
                  </span>
                ) : 'Generate Content'}
              </button>
            </div>
          </div>
        </div>

        {/* Generated Content */}
        {pieces.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {pieces.map((piece) => (
                <div 
                  key={piece.id} 
                  className={`bg-white rounded-lg shadow transition-all ${
                    selectedPieces.has(piece.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPieces.has(piece.id)}
                          onChange={() => toggleSelection(piece.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          piece.type === 'blog' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {piece.type === 'blog' ? 'Blog Post' : 'LinkedIn Post'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRegenerate(piece.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Regenerate
                        </button>
                        <button
                          onClick={() => handleAddSingleToQueue(piece.id)}
                          className="text-sm text-green-600 hover:text-green-800 font-medium"
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
                        placeholder="Enter blog title..."
                        className="w-full mb-3 p-2 border rounded-lg font-semibold"
                      />
                    )}

                    {editingId === piece.id ? (
                      <div>
                        <textarea
                          value={piece.content}
                          onChange={(e) => handleContentUpdate(piece.id, e.target.value, piece.title || undefined)}
                          onBlur={() => setEditingId(null)}
                          className="w-full h-48 p-3 border rounded-lg resize-y"
                          autoFocus
                        />
                        <div className="mt-2 text-right">
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Done Editing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div
                          onClick={() => setEditingId(piece.id)}
                          className="cursor-pointer p-3 border rounded-lg hover:bg-gray-50 min-h-[120px] whitespace-pre-wrap"
                        >
                          {expandedCards.has(piece.id) 
                            ? piece.content
                            : `${piece.content.substring(0, 300)}${piece.content.length > 300 ? '...' : ''}`}
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {piece.content.split(' ').length} words • {piece.content.length} characters
                          </span>
                          {piece.content.length > 300 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpansion(piece.id);
                              }}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {expandedCards.has(piece.id) ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-0 bg-white border-t shadow-lg p-4 -mx-8">
              <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {selectedPieces.size > 0 
                    ? `${selectedPieces.size} item${selectedPieces.size === 1 ? '' : 's'} selected`
                    : 'Select items to add to queue'}
                </div>
                <button
                  onClick={handleAddSelectedToQueue}
                  disabled={selectedPieces.size === 0}
                  className="px-8 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  Add Selected to Queue ({selectedPieces.size})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}