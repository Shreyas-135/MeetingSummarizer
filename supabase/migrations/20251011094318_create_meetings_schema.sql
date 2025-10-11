/*
  # Meeting Summarizer Schema

  1. New Tables
    - `meetings`
      - `id` (uuid, primary key) - Unique identifier for each meeting
      - `title` (text) - Meeting title
      - `audio_url` (text) - URL to the stored audio file in Supabase Storage
      - `transcript` (text) - Full transcription of the meeting
      - `summary` (text) - AI-generated summary of key points
      - `action_items` (jsonb) - Array of action items extracted from the meeting
      - `key_decisions` (jsonb) - Array of key decisions made in the meeting
      - `status` (text) - Processing status: 'uploading', 'processing', 'completed', 'failed'
      - `created_at` (timestamptz) - Timestamp when meeting was created
      - `updated_at` (timestamptz) - Timestamp when meeting was last updated
      - `user_id` (uuid) - Reference to the user who created the meeting

  2. Storage
    - Create storage bucket for audio files

  3. Security
    - Enable RLS on `meetings` table
    - Add policies for authenticated users to manage their own meetings
    - Configure storage policies for audio file access
*/

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'Untitled Meeting',
  audio_url text,
  transcript text,
  summary text,
  action_items jsonb DEFAULT '[]'::jsonb,
  key_decisions jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'uploading',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Policies for meetings table
CREATE POLICY "Users can view their own meetings"
  ON meetings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meetings"
  ON meetings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meetings"
  ON meetings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meetings"
  ON meetings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create storage bucket for meeting audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-audio', 'meeting-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for audio files
CREATE POLICY "Users can upload their own audio files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_created_at ON meetings(created_at DESC);