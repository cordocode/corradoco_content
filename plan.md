# Content Automation System v2 - Implementation Plan

## System Overview

A three-column dashboard system for content management:
- **Ideas**: Brain dumps from email or manual entry
- **LinkedIn Queue**: Scheduled LinkedIn posts  
- **Blog Queue**: Scheduled blog posts

Key improvement: Direct manipulation interface replacing email-based workflows.

---

## Database Schema (SQL)

```sql
-- Raw ideas from email or manual entry
CREATE TABLE ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content text NOT NULL,
  source_email varchar(255),
  status varchar(20) DEFAULT 'new' CHECK (status IN ('new', 'drafted', 'archived')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Individual content pieces (blog or linkedin)
CREATE TABLE content_pieces (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id uuid REFERENCES ideas(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('blog', 'linkedin')),
  title text, -- NULL for LinkedIn posts
  content text NOT NULL,
  status varchar(20) DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'published', 'failed')),
  queue_position integer, -- NULL if not queued
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Generation sessions linking ideas to their batch of content
CREATE TABLE generation_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  idea_id uuid REFERENCES ideas(id) ON DELETE CASCADE,
  linkedin_count integer DEFAULT 0,
  blog_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- EXISTING TABLE - DO NOT MODIFY
-- blog_posts table already exists and is used by the website
-- Content system will INSERT into this table when publishing blogs
-- Structure: id, title, slug, content, excerpt, published, published_at, created_at, updated_at
```

### Database Indexes

```sql
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_email ON ideas(source_email);
CREATE INDEX idx_content_queue ON content_pieces(type, queue_position) WHERE queue_position IS NOT NULL;
CREATE INDEX idx_content_idea ON content_pieces(idea_id);
CREATE INDEX idx_content_status ON content_pieces(status, created_at);
```

---

## Version Control Strategy

### Regeneration Logic

**Individual Piece Regeneration:**
- Send to Claude: Original idea text + current piece content only
- Prompt: "Given this original idea: [idea], create a new version of this [blog/linkedin] post: [current content]"
- Does NOT need version history

**Full Refresh (All Pieces):**
- Send to Claude: Original idea text + piece count
- Uses same initial generation prompt
- Replaces all existing pieces
- No version tracking needed

**Manual Edits:**
- Direct text editing in UI
- Saves immediately to content_pieces.content
- No Claude API call
- Updates updated_at timestamp

---

## Application Structure

### Frontend Pages

#### `/login`
Simple password modal authentication
```javascript
// Modal with single password input
// Check if password === AUTH_PASSWORD env var (e.g., "12345")
// Set httpOnly session cookie (30 days)
// Redirect to /dashboard
// No signup, no email, no user management
```

#### `/dashboard`
Three-column kanban board with drag-drop

**Ideas Column:**
- List of ideas with "Draft It" button
- Manual "Add Idea" button at top
- Auto-refreshes every 30 seconds for new emails

**LinkedIn Queue:**
- Draggable cards showing:
  - First 150 chars of content
  - "Expand" button for full view
  - Day label ("Tuesday", "Thursday", "Saturday")
  - Position number
  - "Delete" button (shifts queue up)
  - Failed indicator (red border if status='failed')
  - "Retry" button (if failed)

**Blog Queue:**
- Draggable cards showing:
  - Title in bold
  - First 150 chars of content
  - "Expand" button for full view
  - Day label ("Monday")
  - Position number
  - "Delete" button (shifts queue up)
  - Failed indicator (red border if status='failed')
  - "Retry" button (if failed)

#### `/draft/[ideaId]`
Content generation and editing workspace

**Layout:**
- Top: Original idea (read-only)
- Control bar: 
  - LinkedIn slider (0-3 posts)
  - Blog slider (0-2 posts)
  - "Generate All" button (max 5 total pieces)
- Content grid: Generated pieces in cards

**Each Content Card:**
- Type badge (Blog/LinkedIn)
- Editable text area (click to edit, auto-saves on blur)
- Title field (for blogs only, editable)
- "Regenerate This" button
- "Add to Queue" button (individual)
- "Delete" button
- Character/word count

**Bottom Actions:**
- "Add All to Queue" - Moves all pieces to respective queues
- "Regenerate All" - Refreshes entire batch
- "Back to Dashboard" - Returns without saving

---

## API Endpoints

### Core APIs

**`POST /api/auth`**
```javascript
// Body: { password }
// Validates against AUTH_PASSWORD
// Returns session cookie
```

**`GET /api/ideas`**
```javascript
// Returns all ideas with status='new'
// Ordered by created_at DESC
```

**`POST /api/ideas`**
```javascript
// Body: { content, source_email? }
// Creates new idea
// Returns created idea
```

**`POST /api/generate`**
```javascript
// Body: { ideaId, linkedinCount, blogCount }
// Validates: linkedinCount 0-3, blogCount 0-2, total max 5
// Calls Claude with counts and types
// Creates content_pieces records
// Returns array of generated pieces
```

**`PATCH /api/content/[id]`**
```javascript
// Body: { content, title? }
// Updates content_pieces record
// For manual edits (no Claude call)
```

**`POST /api/content/[id]/regenerate`**
```javascript
// Fetches original idea + current piece
// Calls Claude with regeneration prompt
// Updates content_pieces record
// Returns new content
```

**`POST /api/queue/add`**
```javascript
// Body: { contentIds[] }
// Assigns queue positions
// Updates status to 'queued'
// Blog: next available Monday slot
// LinkedIn: next available Tue/Thu/Sat slot
```

**`POST /api/queue/add-single`**
```javascript
// Body: { contentId }
// Adds single piece to queue
// Assigns next available position
```

**`DELETE /api/queue/[id]`**
```javascript
// Removes from queue (sets position=null, status='draft')
// Shifts all higher positions down by 1
// Single transaction for atomicity
```

**`PATCH /api/queue/reorder`**
```javascript
// Body: { contentId, newPosition, type }
// Updates positions for drag-drop
// Maintains gapless sequence
```

**`POST /api/content/[id]/retry`**
```javascript
// For failed content only
// Resets status from 'failed' to 'queued'
// Keeps same queue position
```

### Cron Jobs

**`/api/cron/email-ingest`** (Every 5 minutes)
```javascript
// Check Gmail for emails with "CONTENT" in subject (case-insensitive)
// From: bcorrado33@gmail.com, ben@reliant-pm.com, ben@corradoco.com
// Create ideas records
// Do NOT send replies
```

**`/api/cron/publish-blog`** (Monday 15:00 UTC = 10am EST)
```javascript
// Check for any failed blog posts first
// If any exist with status='failed', exit without publishing
// Get content_pieces WHERE type='blog' AND queue_position=1
// Generate slug from title (kebab-case)
// Check for duplicate slugs, append -2, -3 if needed
// Auto-generate excerpt from first 200 chars
// INSERT into blog_posts (website's table)
// If success: Update status='published', shift queue
// If failure: Update status='failed', leave in position 1
```

**`/api/cron/publish-linkedin`** (Tue/Thu/Sat 14:00 UTC = 9am EST)
```javascript
// Check for any failed LinkedIn posts first
// If any exist with status='failed', exit without publishing
// Get content_pieces WHERE type='linkedin' AND queue_position=1  
// Post via LinkedIn API
// If success: Update status='published', shift queue
// If failure: Update status='failed', leave in position 1
```

---

## Claude Prompts

### Initial Generation Prompt
```
You are a content generation assistant for Ben Corrado. Generate exactly {linkedinCount} LinkedIn posts and {blogCount} blog posts from this idea.

RULES:
- Blogs: 800-1200 words with compelling titles
- LinkedIn: 75-120 words with strong hooks
- Ensure variety in angles and perspectives across all pieces
- Return JSON array with type, title (if blog), and content for each piece

IDEA: {ideaText}

Return ONLY valid JSON array like:
[
  {"type": "linkedin", "content": "..."},
  {"type": "blog", "title": "...", "content": "..."}
]
```

### Individual Regeneration Prompt
```
You are revising content for Ben Corrado. Create a fresh version maintaining the core message but with new structure and approach.

ORIGINAL IDEA: {ideaText}
CURRENT CONTENT: {currentContent}
TYPE: {type}

Generate a completely new version with different hook/angle. Return only the new content text.
```

---

## Queue Display & Time Zone Logic

### Time Zone Handling
```javascript
// Storage: All timestamps in UTC
// Crons: Run at UTC times (configured in vercel.json)
// Display: Convert to browser's local timezone
// Dashboard shows: "Monday 10am" in user's timezone

// Example:
// Cron runs: 15:00 UTC (Monday)
// User in MST sees: "Monday 8am"
// User in EST sees: "Monday 10am"
```

### Position to Day Mapping

**Blog Queue:**
- Position 1 → "Monday" (next Monday)
- Position 2 → "Monday" (week after)
- Position 3+ → "Monday (in {n} weeks)"

**LinkedIn Queue:**
- Position 1 → "Tuesday"
- Position 2 → "Thursday"
- Position 3 → "Saturday"
- Position 4 → "Tuesday (next week)"
- Pattern repeats

---

## Technical Specifications

### Environment Variables
```
AUTH_PASSWORD=12345  # Simple password for login modal

SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=eyJ[...]

ANTHROPIC_API_KEY=sk-ant-[...]

GMAIL_CLIENT_ID=[...].apps.googleusercontent.com
GMAIL_CLIENT_SECRET=[...]
GMAIL_REFRESH_TOKEN=1//[...]

LINKEDIN_ACCESS_TOKEN=[...]

CRON_SECRET=[random-string]
```

### Vercel Configuration
```json
// vercel.json
{
  "functions": {
    "app/api/generate/route.ts": {
      "maxDuration": 59
    },
    "app/api/*/route.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/email-ingest",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/publish-blog",
      "schedule": "0 15 * * 1"
    },
    {
      "path": "/api/cron/publish-linkedin",
      "schedule": "0 14 * * 2,4,6"
    }
  ]
}
```

### Key Libraries
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "@supabase/supabase-js": "^2.39.0",
    "@anthropic-ai/sdk": "^0.27.3",
    "googleapis": "^129.0.0",
    "axios": "^1.6.0",
    "@dnd-kit/sortable": "^8.0.0",
    "iron-session": "^8.0.0"
  }
}
```

---

## Component Structure

### Technical Approach
- **Next.js**: App Router (stable and recommended)
- **Drag-Drop**: Client components with @dnd-kit/sortable
- **Updates**: Optimistic UI (immediate visual, revert on error)
- **State**: Local state for drag, server state for data

### Dashboard Components

**`<IdeaCard>`**
```jsx
// Props: idea, onDraft
// Shows idea.content (truncated)
// "Draft It" button triggers navigation to /draft/[id]
```

**`<ContentCard>`**
```jsx
// Props: content, onExpand, onDelete, onRetry, isDragging
// Shows title (if blog) + preview
// Expand button shows full content inline
// Delete button with confirmation
// Retry button if status='failed'
// Draggable via dnd-kit
```

**`<QueueColumn>`**
```jsx
// Props: title, items, onReorder, queueType
// Droppable container
// Maps queue position to day labels
// Shows warning if any item has status='failed'
// Handles drag-drop events
```

### Draft Components

**`<ContentEditor>`**
```jsx
// Props: content, onSave, onRegenerate, onDelete, onQueue
// Textarea with auto-resize
// Saves on blur (debounced)
// "Regenerate This" button
// "Add to Queue" button (individual)
// "Delete" button
// Title field if type='blog'
```

**`<GenerationControls>`**
```jsx
// Props: onGenerate
// LinkedIn slider (0-3)
// Blog slider (0-2)
// "Generate All" button
// Total count display (max 5)
// Disabled while generating
```

---

## Data Flow Examples

### Email to Queue Flow
1. Email arrives with "CONTENT" in subject
2. Cron job creates idea (status='new')
3. User clicks "Draft It" → navigates to /draft/[id]
4. User sets LinkedIn=2, Blog=1, clicks "Generate All"
5. API calls Claude, creates 3 content_pieces
6. User edits one directly (auto-saves on blur)
7. User clicks "Regenerate This" on another
8. User clicks "Add to Queue" on first piece
9. User clicks "Add All to Queue" for remaining
10. Pieces assigned positions, status='queued'
11. Cron publishes at scheduled UTC times
12. Dashboard shows times in user's timezone

### Failed Publishing Flow
1. Cron attempts to publish position 1
2. API call fails (LinkedIn down, etc.)
3. Content marked status='failed'
4. Future crons check for failed status
5. If failed exists, skip publishing
6. User sees red border on failed card
7. User clicks "Retry" button
8. Status changes back to 'queued'
9. Next cron attempts publish again

### Queue Deletion Flow
1. User clicks "Delete" on queued item at position 2
2. Confirm dialog appears
3. User confirms deletion
4. Single transaction:
   - Set position=null, status='draft'
   - Shift positions: 3→2, 4→3, etc.
5. UI updates immediately (optimistic)
6. If server fails, UI reverts

### Manual Edit Flow
1. User clicks into content text area
2. Types changes
3. On blur: PATCH /api/content/[id]
4. Updates database immediately
5. No Claude API call needed

---

## Migration Checklist

### Keep from v1
- LinkedIn OAuth flow and posting logic
- Gmail polling mechanism
- Basic Claude prompts (modified for count)
- Cron scheduling patterns

### Delete from v1
- All conversation_threads
- content_library table
- content_versions table
- assistant_memory table
- All email reply logic
- Google Sheets integration
- shift_queue_positions function (rewrite in JS)

### New Development Priority
1. Auth + dashboard layout
2. Email ingestion (no replies)
3. Generation with piece count
4. Manual editing in UI
5. Queue drag-drop
6. Publishing crons

---

## Success Criteria

- ✅ Email → Idea in dashboard < 5 minutes
- ✅ Generate 1-5 pieces from single idea
- ✅ Edit text without Claude calls
- ✅ Regenerate individual pieces
- ✅ Drag to reorder queue
- ✅ Auto-publish on schedule
- ✅ Zero email management
- ✅ See all content in one view

---

## Notes & Clarifications

### Key Design Decisions
- **Authentication**: Simple modal with password "12345" - no user accounts
- **Content Types**: Two separate sliders (LinkedIn 0-3, Blog 0-2), NOT toggleable
- **Queue Management**: Can only drag within existing items (no gaps)
- **Failed Publishing**: Pauses entire queue type until resolved
- **Time Zones**: UTC everywhere, display converts to browser timezone
- **Published Content**: Stays in DB with status='published', removed from dashboard

### Blog Publishing Details
- **Slug Generation**: Title → kebab-case ("How to Automate" → "how-to-automate")
- **Duplicate Slugs**: Append -2, -3, etc. if exists
- **Excerpt**: Auto-generate from first 200 characters

### Technical Choices
- **Framework**: Next.js App Router (modern, stable)
- **Drag-Drop**: @dnd-kit with optimistic updates
- **API Timeout**: 59 seconds for generation endpoint
- **Database**: Single Supabase project (shared with website)
- **Crons**: UTC times in Vercel (15:00 UTC = 10am EST)

### What This System Does NOT Have
- No email responses or approval loops
- No version history tracking
- No Google Sheets integration
- No complex user management
- No automatic retries (manual only)