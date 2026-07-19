
-- Devices currently online per user
CREATE TABLE public.music_cast_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  device_id text NOT NULL,
  device_name text NOT NULL,
  user_agent text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX music_cast_devices_user_idx ON public.music_cast_devices(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_cast_devices TO anon, authenticated;
GRANT ALL ON public.music_cast_devices TO service_role;

ALTER TABLE public.music_cast_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cast devices open" ON public.music_cast_devices FOR ALL USING (true) WITH CHECK (true);

-- Current cast playback state per user
CREATE TABLE public.music_cast_state (
  user_id text PRIMARY KEY,
  target_device_id text,
  controller_device_id text,
  song jsonb,
  playlist jsonb,
  current_index int DEFAULT 0,
  is_playing boolean DEFAULT false,
  position double precision DEFAULT 0,
  volume int DEFAULT 70,
  seek_seq bigint DEFAULT 0,
  command text,
  command_seq bigint DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.music_cast_state TO anon, authenticated;
GRANT ALL ON public.music_cast_state TO service_role;

ALTER TABLE public.music_cast_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cast state open" ON public.music_cast_state FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER TABLE public.music_cast_devices REPLICA IDENTITY FULL;
ALTER TABLE public.music_cast_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_cast_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.music_cast_state;
