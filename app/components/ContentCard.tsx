'use client';

import { useState } from 'react';
import styles from './Card.module.css';
import Button from './Button';

interface ContentCardProps {
  id: string;
  type: 'blog' | 'linkedin' | 'idea';
  title?: string | null;
  content: string;
  status?: string;
  queuePosition?: number | null;
  onDelete?: (id: string) => void;
  onAction?: (id: string, action: string) => void;
  onDrag?: (id: string) => void;
  isDraggable?: boolean;
  dayLabel?: string;
  isGenerating?: boolean;
}

export default function ContentCard({
  id,
  type,
  title,
  content,
  status,
  queuePosition,
  onDelete,
  onAction,
  onDrag,
  isDraggable = true,
  dayLabel,
  isGenerating = false
}: ContentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const truncatedContent = content.length > 150 
    ? `${content.substring(0, 150)}...` 
    : content;

  const handleDragStart = (e: React.DragEvent) => {
    if (!isDraggable) return;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    if (onDrag) onDrag(id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`${styles.card} ${isDragging ? styles.dragging : ''} ${expanded ? styles.expanded : ''}`}
      draggable={isDraggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {onDelete && (
        <button
          onClick={() => onDelete(id)}
          className={styles.deleteButton}
          aria-label="Delete"
        >
          ×
        </button>
      )}

      <div className={styles.header}>
        <div>
          {dayLabel && queuePosition && (
            <div className={styles.meta}>
              {dayLabel} - Position {queuePosition}
            </div>
          )}
          {type !== 'idea' && (
            <span className={`${styles.badge} ${styles[type]}`}>
              {type}
            </span>
          )}
          {isGenerating && (
            <span className={`${styles.statusIndicator} ${styles.generating}`}>
              Generating...
            </span>
          )}
          {status === 'failed' && (
            <span className={`${styles.statusIndicator} ${styles.failed}`}>
              Failed
            </span>
          )}
        </div>
      </div>

      {title && <h4 className={styles.title}>{title}</h4>}

      <div className={`${styles.content} ${expanded ? styles.expanded : ''}`}>
        {expanded ? content : truncatedContent}
      </div>

      <div className={styles.footer}>
        <div className={styles.actions}>
          {type === 'idea' && (
            <Button
              size="small"
              onClick={() => onAction?.(id, 'draft')}
            >
              Draft It
            </Button>
          )}
          {status === 'failed' && (
            <Button
              size="small"
              variant="danger"
              onClick={() => onAction?.(id, 'retry')}
            >
              Retry
            </Button>
          )}
        </div>
        {content.length > 150 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a1a1a',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}