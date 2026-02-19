Build the real-time admin dashboard for monitoring conversations.

File: components/admin/LiveConversations.tsx

Requirements:

1. Subscribe to Supabase real-time changes on conversations table
2. Display conversations in reverse chronological order
3. For each conversation show:

   - Session ID (truncated)
   - Status badge (color-coded: active=gray, passed=green, failed=red)
   - All messages with role indicators
   - Scoring metadata (if present) displayed clearly
   - Timestamps

4. Auto-refresh when new messages arrive
5. Click to expand/collapse conversation details
6. Filter by status (all/active/passed/failed)

Visual requirements:

- Black background, white text (matches brand)
- Minimal, clean layout
- Scores displayed as progress bars or numeric values
- Update animations should be subtle

Bonus:

- Add a stats summary at top: total conversations, pass rate, average scores
- Export to CSV functionality
- Search by session ID or email (if profile linked)

The admin should feel like watching conversations happen live, not refreshing a static list.
