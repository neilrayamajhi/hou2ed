-- ⚠️ IMPORTANT: Run this SQL in your Supabase Dashboard
-- Go to: https://supabase.com/dashboard/project/rixiofltzptwaiwxhhlf/sql/new
-- Paste this entire file and click "Run"

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.message_threads CASCADE;

-- Create message_threads table
CREATE TABLE public.message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT,
    participant_ids UUID[] NOT NULL,
    listing_id UUID,
    application_id UUID,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    attachment_urls TEXT[],
    read_by UUID[] DEFAULT ARRAY[]::UUID[],
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_message_threads_participants ON public.message_threads USING GIN (participant_ids);
CREATE INDEX idx_message_threads_last_message ON public.message_threads(last_message_at DESC);
CREATE INDEX idx_messages_thread ON public.messages(thread_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their threads" ON public.message_threads;
DROP POLICY IF EXISTS "Users can create threads" ON public.message_threads;
DROP POLICY IF EXISTS "Users can update their threads" ON public.message_threads;
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- Create RLS policies for message_threads
CREATE POLICY "Users can view their threads" ON public.message_threads
    FOR SELECT
    USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can create threads" ON public.message_threads
    FOR INSERT
    WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Users can update their threads" ON public.message_threads
    FOR UPDATE
    USING (auth.uid() = ANY(participant_ids));

-- Create RLS policies for messages
CREATE POLICY "Users can view messages in their threads" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.message_threads
            WHERE id = messages.thread_id
            AND auth.uid() = ANY(participant_ids)
        )
    );

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT
    WITH CHECK (
        auth.uid() = sender_id AND
        EXISTS (
            SELECT 1 FROM public.message_threads
            WHERE id = messages.thread_id
            AND auth.uid() = ANY(participant_ids)
        )
    );

CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE
    USING (auth.uid() = sender_id);

-- Function to update thread's last_message_at
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.message_threads
    SET last_message_at = NEW.created_at
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_thread_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_last_message();

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Grant permissions
GRANT ALL ON public.message_threads TO authenticated;
GRANT ALL ON public.messages TO authenticated;

-- ✅ SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Messaging tables created successfully!';
    RAISE NOTICE '✅ You can now use the messaging feature in your app';
END $$;