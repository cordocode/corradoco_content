# Content Automation System - Actual Database Schema
*Generated from live Supabase instance: 2025-11-15*
*Updated: 2025-11-15 - Added 'generating' status*

---

## Table: `ideas`

**Purpose**: Stores raw content ideas from email or manual entry

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | ✗ | gen_random_uuid() | Primary key |
| content | text | ✗ | - | The raw idea text |
| source_email | text | ✓ | NULL | Email address if from email ingest |
| status | text | ✗ | 'new' | Enum: 'new', 'drafted', 'generating' |
| created_at | timestamptz | ✗ | now() | Timestamp of creation |

**Important**: NO `updated_at` column exists on this table!

**Current data**: 7 rows
- 1 with status='new'
- 6 with status='drafted'

---

## Table: `content_pieces`

**Purpose**: Individual LinkedIn posts or blog articles generated from ideas

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | ✗ | gen_random_uuid() | Primary key |
| idea_id | uuid | ✗ | - | Foreign key to ideas table |
| type | text | ✗ | - | Enum: 'linkedin', 'blog' |
| title | text | ✓ | NULL | Blog title (NULL for LinkedIn) |
| content | text | ✗ | - | The actual content text |
| status | text | ✗ | 'draft' | Enum: 'draft', 'queued', 'published', 'failed' |
| queue_position | integer | ✓ | NULL | Position in queue (NULL if not queued) |
| created_at | timestamptz | ✗ | now() | Timestamp of creation |
| updated_at | timestamptz | ✗ | now() | Timestamp of last update |
| published_at | timestamptz | ✓ | NULL | When it was published |
| external_id | text | ✓ | NULL | LinkedIn post ID after publishing |
| error_message | text | ✓ | NULL | Error details if status='failed' |

**Important**: This table DOES have `updated_at`!

**Current data**: 38 rows
- Mixture of LinkedIn (27) and blog (11) posts
- Various statuses including queued, published, draft

---

## Table: `generation_sessions`

**Purpose**: Tracks batch content generation sessions

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | ✗ | gen_random_uuid() | Primary key |
| idea_id | uuid | ✗ | - | Foreign key to ideas table |
| linkedin_count | integer | ✗ | 0 | Number of LinkedIn posts generated |
| blog_count | integer | ✗ | 0 | Number of blog posts generated |
| created_at | timestamptz | ✗ | now() | Timestamp of generation |

**Current data**: 0 rows (table exists but empty)

---

## Table: `blog_posts` (Website Integration)

**Purpose**: Published blog posts for the corradoco.com website

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | ✗ | gen_random_uuid() | Primary key |
| title | text | ✗ | - | Blog post title |
| slug | text | ✗ | - | URL-friendly slug |
| content | text | ✗ | - | Full blog post content (markdown) |
| published | boolean | ✗ | false | Publication status |
| excerpt | text | ✓ | NULL | Short description |
| published_at | timestamptz | ✓ | NULL | Publication timestamp |
| created_at | timestamptz | ✗ | now() | Creation timestamp |
| updated_at | timestamptz | ✗ | now() | Last update timestamp |

**Important**: This table is used by the main website!

**Current data**: 2 rows (both published)

---

## Table: `settings`

**Purpose**: System configuration flags

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| key | text | ✗ | - | Primary key (unique identifier) |
| value | text | ✗ | - | Setting value (stored as string) |
| description | text | ✓ | NULL | Human-readable description |
| created_at | timestamptz | ✗ | now() | Creation timestamp |
| updated_at | timestamptz | ✗ | now() | Last update timestamp |

**Current data**: 2 rows
- `linkedin_posting_enabled` = 'false'
- `blog_posting_enabled` = 'true'

---

## Relationships
```
ideas (1) ──→ (many) content_pieces
  └─ idea_id foreign key

ideas (1) ──→ (many) generation_sessions
  └─ idea_id foreign key
```

---

## Important Implementation Notes

### Ideas Table - NO `updated_at`
The `ideas` table does NOT have an `updated_at` column. All update operations should only modify the `status` field:
```typescript
// ✅ CORRECT
.update({ status: 'generating' })

// ❌ WRONG - will cause errors
.update({ status: 'generating', updated_at: new Date().toISOString() })
```

### Tables WITH `updated_at`
- `content_pieces` - Always update this field ✓
- `blog_posts` - Always update this field ✓
- `settings` - Always update this field ✓

---

## Queue Position Logic

### LinkedIn Queue
- Position 1, 2, 3 = Tuesday, Thursday, Saturday (this week)
- Position 4, 5, 6 = Tuesday, Thursday, Saturday (next week)
- Pattern repeats

### Blog Queue
- Position 1 = Monday (this week)
- Position 2 = Monday (next week)
- Position 3 = Monday (week after)
- etc.

---

## Status Enums

### ideas.status
- `new` - Freshly ingested, not yet drafted
- `generating` - Currently being processed (generation in progress)
- `drafted` - Content pieces generated from this idea

**Note**: Ideas with status 'new', 'generating', or 'drafted' are all visible on the dashboard. This allows users to return to in-progress generations.

### content_pieces.status
- `draft` - Created but not queued
- `queued` - In the publishing queue
- `published` - Successfully published
- `failed` - Publishing attempt failed

---

## Connection Details

- **Supabase URL**: https://dqhrwsdncnreptkgxdxb.supabase.co
- **Service Key**: ✅ Configured and working
- **Total Tables**: 5 (ideas, content_pieces, generation_sessions, blog_posts, settings)

---

## Missing from Original Plan

The `generation_sessions` table exists but is currently unused. All generation tracking happens through:
1. `ideas.status` changing to 'drafted'
2. Multiple `content_pieces` records created with the same `idea_id`

Consider using `generation_sessions` to track:
- Total pieces requested vs created
- Generation timestamps
- Success/failure of batch operations