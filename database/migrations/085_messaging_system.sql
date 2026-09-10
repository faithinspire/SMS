-- ============================================================================
-- Migration 085: Messaging System
-- Creates tables for user-to-user messaging/direct communication
-- ============================================================================

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT,
  message_text TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_message CHECK (sender_id != recipient_id)
);

-- Create index for quick lookups
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_school_id ON messages(school_id);
CREATE INDEX idx_messages_read ON messages(read);

-- Create message threads table (for group messages/conversations)
CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_name TEXT NOT NULL,
  description TEXT,
  is_group BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create thread participants table
CREATE TABLE IF NOT EXISTS thread_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, user_id)
);

-- Create thread messages table
CREATE TABLE IF NOT EXISTS thread_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  file_path TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for thread messages
CREATE INDEX idx_thread_messages_thread_id ON thread_messages(thread_id);
CREATE INDEX idx_thread_messages_sender_id ON thread_messages(sender_id);

-- ============================================================================
-- Test Data (Optional)
-- ============================================================================

-- Add dummy messages for testing (if needed)
-- Note: This would need actual user IDs from auth.users table

-- ============================================================================
-- Done
-- ============================================================================
