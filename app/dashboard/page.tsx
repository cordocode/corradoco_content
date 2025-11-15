'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ContentCard from '../components/ContentCard';
import Button from '../components/Button';
import styles from './dashboard.module.css';

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
  const [blogEnabled, setBlogEnabled] = useState(false);
  const [showNewIdea, setShowNewIdea] = useState(false);
  const [newIdeaContent, setNewIdeaContent] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<string | null>(null);
  const [draggedFromColumn, setDraggedFromColumn] = useState<string | null>(null);
  const newIdeaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
    fetchSettings();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showNewIdea && newIdeaRef.current) {
      newIdeaRef.current.focus();
    }
  }, [showNewIdea]);

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

  const fetchSettings = async () => {
    try {
      const [linkedinRes, blogRes] = await Promise.all([
        fetch('/api/settings/linkedin'),
        fetch('/api/settings/blog')
      ]);

      if (linkedinRes.ok) {
        const data = await linkedinRes.json();
        setLinkedinEnabled(data.enabled);
      }

      if (blogRes.ok) {
        const data = await blogRes.json();
        setBlogEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const toggleLinkedIn = async () => {
    const newState = !linkedinEnabled;
    try {
      const response = await fetch('/api/settings/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });

      if (response.ok) {
        setLinkedinEnabled(newState);
      }
    } catch (error) {
      console.error('Error toggling LinkedIn:', error);
    }
  };

  const toggleBlog = async () => {
    const newState = !blogEnabled;
    try {
      const response = await fetch('/api/settings/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newState }),
      });

      if (response.ok) {
        setBlogEnabled(newState);
      }
    } catch (error) {
      console.error('Error toggling Blog:', error);
    }
  };

  const handleDraft = async (ideaId: string) => {
    await fetch(`/api/ideas/${ideaId}/generating`, { method: 'POST' });
    router.push(`/draft/${ideaId}`);
  };

  const handleAddIdea = async () => {
    if (!newIdeaContent.trim()) return;

    try {
      const response = await fetch('/api/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newIdeaContent }),
      });

      if (response.ok) {
        setNewIdeaContent('');
        setShowNewIdea(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error adding idea:', error);
    }
  };

  const handleDeleteFromQueue = async (id: string) => {
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

  const handleDragStart = (e: React.DragEvent, itemId: string, column: string) => {
    setDraggedItem(itemId);
    setDraggedFromColumn(column);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, itemId: string) => {
    e.preventDefault();
    if (draggedItem && draggedItem !== itemId) {
      setDraggedOverItem(itemId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverItem(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string, column: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId || draggedFromColumn !== column) {
      setDraggedItem(null);
      setDraggedOverItem(null);
      setDraggedFromColumn(null);
      return;
    }

    // Optimistically update UI
    const items = column === 'linkedin' ? linkedinQueue : 
                 column === 'blog' ? blogQueue : ideas;
    
    const draggedIndex = items.findIndex(item => item.id === draggedItem);
    const targetIndex = items.findIndex(item => item.id === targetId);
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newItems = [...items];
      const [removed] = newItems.splice(draggedIndex, 1);
      newItems.splice(targetIndex, 0, removed);
      
      // Update positions
      newItems.forEach((item, index) => {
        if ('queue_position' in item) {
          item.queue_position = index + 1;
        }
      });
      
      if (column === 'linkedin') {
        setLinkedinQueue(newItems as ContentPiece[]);
      } else if (column === 'blog') {
        setBlogQueue(newItems as ContentPiece[]);
      } else {
        setIdeas(newItems as Idea[]);
      }

      // Call API to persist
      if (column === 'linkedin' || column === 'blog') {
        try {
          const targetItem = items.find(item => item.id === targetId);
          if (targetItem && 'queue_position' in targetItem && targetItem.queue_position) {
            await fetch('/api/queue/reorder', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                itemId: draggedItem,
                newPosition: targetItem.queue_position,
                type: column
              }),
            });
          }
        } catch (error) {
          console.error('Error reordering:', error);
          fetchData(); // Revert on error
        }
      }
    }
    
    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedFromColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
    setDraggedFromColumn(null);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Content Dashboard</h1>
      </header>

      <div className={styles.columns}>
        {/* Ideas Column */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>Ideas</h3>
            <Button
              size="small"
              onClick={() => setShowNewIdea(true)}
            >
              Add Idea
            </Button>
          </div>
          
          <div 
            className={styles.cardList}
            onDragOver={handleDragOver}
          >
            {showNewIdea && (
              <div className={styles.newIdeaCard}>
                <textarea
                  ref={newIdeaRef}
                  value={newIdeaContent}
                  onChange={(e) => setNewIdeaContent(e.target.value)}
                  placeholder="Enter your idea..."
                  className={styles.ideaInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.metaKey) {
                      handleAddIdea();
                    }
                    if (e.key === 'Escape') {
                      setShowNewIdea(false);
                      setNewIdeaContent('');
                    }
                  }}
                />
                <div className={styles.ideaActions}>
                  <Button size="small" onClick={handleAddIdea}>
                    Save
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      setShowNewIdea(false);
                      setNewIdeaContent('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className={`${styles.cardWrapper} ${
                  draggedItem === idea.id ? styles.dragging : ''
                } ${
                  draggedOverItem === idea.id ? styles.dragOver : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, idea.id, 'ideas')}
                onDragEnter={(e) => handleDragEnter(e, idea.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idea.id, 'ideas')}
                onDragEnd={handleDragEnd}
              >
                <ContentCard
                  id={idea.id}
                  type="idea"
                  content={idea.content}
                  onAction={(id: string, action: string) => {
                    if (action === 'draft') handleDraft(id);
                  }}
                  isGenerating={idea.status === 'generating'}
                  isDraggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* LinkedIn Queue */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>LinkedIn Queue</h3>
            <div className={styles.toggleContainer}>
              <span className={styles.toggleLabel}>AUTO-POST</span>
              <button
                onClick={toggleLinkedIn}
                className={`${styles.toggle} ${linkedinEnabled ? styles.toggleOn : ''}`}
                aria-checked={linkedinEnabled}
                role="switch"
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>
          
          <div 
            className={`${styles.cardList} ${!linkedinEnabled ? styles.disabled : ''}`}
            onDragOver={handleDragOver}
          >
            {linkedinQueue.map((item) => (
              <div
                key={item.id}
                className={`${styles.cardWrapper} ${
                  draggedItem === item.id ? styles.dragging : ''
                } ${
                  draggedOverItem === item.id ? styles.dragOver : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id, 'linkedin')}
                onDragEnter={(e) => handleDragEnter(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id, 'linkedin')}
                onDragEnd={handleDragEnd}
              >
                <ContentCard
                  id={item.id}
                  type="linkedin"
                  content={item.content}
                  status={item.status}
                  queuePosition={item.queue_position}
                  dayLabel={getQueueDayLabel(item.queue_position!, 'linkedin')}
                  onDelete={handleDeleteFromQueue}
                  onAction={(id: string, action: string) => {
                    if (action === 'retry') handleRetryFailed(id);
                  }}
                  isDraggable={false}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Blog Queue */}
        <div className={styles.column}>
          <div className={styles.columnHeader}>
            <h3>Blog Queue</h3>
            <div className={styles.toggleContainer}>
              <span className={styles.toggleLabel}>AUTO-POST</span>
              <button
                onClick={toggleBlog}
                className={`${styles.toggle} ${blogEnabled ? styles.toggleOn : ''}`}
                aria-checked={blogEnabled}
                role="switch"
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          </div>
          
          <div 
            className={`${styles.cardList} ${!blogEnabled ? styles.disabled : ''}`}
            onDragOver={handleDragOver}
          >
            {blogQueue.map((item) => (
              <div
                key={item.id}
                className={`${styles.cardWrapper} ${
                  draggedItem === item.id ? styles.dragging : ''
                } ${
                  draggedOverItem === item.id ? styles.dragOver : ''
                }`}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id, 'blog')}
                onDragEnter={(e) => handleDragEnter(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id, 'blog')}
                onDragEnd={handleDragEnd}
              >
                <ContentCard
                  id={item.id}
                  type="blog"
                  title={item.title}
                  content={item.content}
                  status={item.status}
                  queuePosition={item.queue_position}
                  dayLabel={getQueueDayLabel(item.queue_position!, 'blog')}
                  onDelete={handleDeleteFromQueue}
                  onAction={(id: string, action: string) => {
                    if (action === 'retry') handleRetryFailed(id);
                  }}
                  isDraggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}