-- Migration 081: Create Broadcasts and Notifications System
-- Complete rewrite to fix foreign key issues

-- Drop existing tables if they exist (start fresh)
DROP TABLE IF EXISTS broadcast_notifications CASCADE;
DROP TABLE IF EXISTS broadcasts CASCADE;

-- Create broadcasts table (NO foreign keys inline)
CREATE TABLE broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  recipient_role TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create broadcast_notifications table (NO foreign keys inline)
CREATE TABLE broadcast_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  school_id TEXT NOT NULL,
  recipient_email TEXT,
  recipient_name TEXT,
  recipient_role TEXT,
  message TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_broadcasts_school_id ON broadcasts(school_id);
CREATE INDEX idx_broadcasts_sender_id ON broadcasts(sender_id);
CREATE INDEX idx_broadcasts_created_at ON broadcasts(created_at DESC);

CREATE INDEX idx_broadcast_notifications_user_id ON broadcast_notifications(user_id);
CREATE INDEX idx_broadcast_notifications_school_id ON broadcast_notifications(school_id);
CREATE INDEX idx_broadcast_notifications_read ON broadcast_notifications(read);
CREATE INDEX idx_broadcast_notifications_created_at ON broadcast_notifications(created_at DESC);
CREATE INDEX idx_broadcast_notifications_broadcast_id ON broadcast_notifications(broadcast_id);

-- Add comment for documentation
COMMENT ON TABLE broadcasts IS 'Stores broadcast messages sent by school admins to staff';
COMMENT ON TABLE broadcast_notifications IS 'Stores individual notifications for each staff member who received a broadcast';
