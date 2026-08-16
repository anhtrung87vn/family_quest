-- 0019_parent_message_audio.sql
-- Add separate audio columns so a single message can carry both photo + audio

alter table parent_messages
  add column if not exists audio_path text,   -- storage path in parent-messages bucket
  add column if not exists audio_mime text;   -- e.g. audio/webm, audio/mp4
