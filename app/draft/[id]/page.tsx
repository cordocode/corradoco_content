'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '../../components/Button';
import styles from './draft.module.css';

interface Idea {
  id: string;
  content: string;
  status: string;
}

interface ContentPiece {
  id: string;
  idea_id: string;
  type: 'blog' | 'linkedin';
  title: string | null;
  content: string;
  status: string;
}

export default function DraftPage() {
  const params = useParams();
  const router = useRouter();
  const ideaId = params.id as string;

  const [idea, setIdea] = useState<Idea | null>(null);
  const [pieces, setPieces] = useState<ContentPiece[]>([]);
  const [linkedinCount, setLinkedinCount] = useState(1);
  const [blogCount, setBlogCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000); // Check for new content every 3s
    return () => clearInterval(interval);
  }, [ideaId]);

  const loadData = async () => {
    try {
      // Load idea
      const ideaRes = await fetch(`/api/ideas/${ideaId}`);
      if (ideaRes.ok) {
        const ideaData = await ideaRes.json();
        setIdea(ideaData);
        
        // Stop polling if status is 'drafted'
        if (ideaData.status === 'drafted') {
          setGenerating(false);
        }
      }

      // Load existing content pieces
      const piecesRes = await fetch(`/api/ideas/${ideaId}/content`);
      if (piecesRes.ok) {
        const piecesData = await piecesRes.json();
        setPieces(piecesData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ideaId, 
          linkedinCount, 
          blogCount 
        }),
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = async (id: string, content: string, title?: string) => {
    try {
      await fetch(`/api/content/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      });
      loadData();
    } catch (error) {
      console.error('Edit error:', error);
    }
  };

  const handleRegenerate = async (id: string) => {
    try {
      const response = await fetch(`/api/content/${id}/regenerate`, {
        method: 'POST',
      });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Regenerate error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this piece?')) return;
    try {
      await fetch(`/api/ideas/${ideaId}/content`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadData();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleAddToQueue = async (contentId: string) => {
    try {
      await fetch('/api/queue/add-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId }),
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Queue error:', error);
    }
  };

  const handleAddAllToQueue = async () => {
    try {
      const contentIds = pieces.map(p => p.id);
      await fetch('/api/queue/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentIds }),
      });
      router.push('/dashboard');
    } catch (error) {
      console.error('Queue error:', error);
    }
  };

  if (!idea) {
    return (
      <div className={styles.loading}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Draft Content</h1>
        <Button variant="secondary" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </header>

      {/* Original Idea */}
      <div className={styles.ideaSection}>
        <h3>Original Idea</h3>
        <p>{idea.content}</p>
      </div>

      {/* Generation Controls */}
      {pieces.length === 0 && (
        <div className={styles.controls}>
          <div className={styles.sliders}>
            <div className={styles.slider}>
              <label>LinkedIn Posts: {linkedinCount}</label>
              <input
                type="range"
                min="0"
                max="3"
                value={linkedinCount}
                onChange={(e) => setLinkedinCount(Number(e.target.value))}
                disabled={generating}
              />
            </div>
            <div className={styles.slider}>
              <label>Blog Posts: {blogCount}</label>
              <input
                type="range"
                min="0"
                max="2"
                value={blogCount}
                onChange={(e) => setBlogCount(Number(e.target.value))}
                disabled={generating}
              />
            </div>
          </div>
          <Button 
            onClick={handleGenerate}
            disabled={generating || (linkedinCount + blogCount === 0)}
          >
            {generating ? 'Generating...' : 'Generate Content'}
          </Button>
        </div>
      )}

      {/* Generated Content */}
      {pieces.length > 0 && (
        <>
          <div className={styles.piecesGrid}>
            {pieces.map((piece) => (
              <div key={piece.id} className={styles.pieceCard}>
                <div className={styles.pieceHeader}>
                  <span className={styles.badge}>{piece.type}</span>
                  <Button 
                    size="small" 
                    variant="danger"
                    onClick={() => handleDelete(piece.id)}
                  >
                    Delete
                  </Button>
                </div>

                {piece.type === 'blog' && (
                  <input
                    type="text"
                    value={piece.title || ''}
                    onChange={(e) => handleEdit(piece.id, piece.content, e.target.value)}
                    className={styles.titleInput}
                    placeholder="Blog Title"
                  />
                )}

                <textarea
                  value={piece.content}
                  onChange={(e) => handleEdit(piece.id, e.target.value, piece.title || undefined)}
                  className={styles.contentInput}
                  rows={10}
                />

                <div className={styles.pieceActions}>
                  <Button 
                    size="small"
                    onClick={() => handleRegenerate(piece.id)}
                  >
                    Regenerate
                  </Button>
                  <Button 
                    size="small"
                    variant="secondary"
                    onClick={() => handleAddToQueue(piece.id)}
                  >
                    Add to Queue
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.bottomActions}>
            <Button onClick={handleAddAllToQueue}>
              Add All to Queue
            </Button>
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </>
      )}
    </div>
  );
}