```sql
-- Coo App Database Schema
-- Run this in your Supabase SQL Editor to set up the required tables

-- Threads table: stores conversation threads
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'New Thread',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages table: stores individual messages within threads
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meta JSONB DEFAULT '{}'::jsonb
);

-- Blocks table: stores parsed content blocks from messages
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('paragraph', 'list', 'code', 'heading')),
  text TEXT NOT NULL DEFAULT '',
  edited BOOLEAN NOT NULL DEFAULT FALSE,
  selections JSONB DEFAULT '[]'::jsonb,
  prev_text TEXT,
  is_rewritten BOOLEAN NOT NULL DEFAULT FALSE
);

-- Cards table: stores user-curated block collections
CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  anchor_block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  block_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_blocks_thread_id ON blocks(thread_id);
CREATE INDEX IF NOT EXISTS idx_blocks_message_id ON blocks(message_id);
CREATE INDEX IF NOT EXISTS idx_cards_message_id ON cards(message_id);

-- Enable Row Level Security (RLS)
-- Note: For a personal app, you may want to keep RLS disabled or add your own policies
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anonymous users (adjust as needed)
CREATE POLICY "Allow all operations on threads" ON threads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on blocks" ON blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on cards" ON cards FOR ALL USING (true) WITH CHECK (true);
