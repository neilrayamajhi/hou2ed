-- Create message_threads table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.message_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT,
    participant_ids UUID[] NOT NULL,
    listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
    application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.messages (
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_message_threads_participants ON public.message_threads USING GIN (participant_ids);
CREATE INDEX IF NOT EXISTS idx_message_threads_listing ON public.message_threads(listing_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_application ON public.message_threads(application_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message ON public.message_threads(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at);

-- Enable Row Level Security
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for message_threads
-- Users can see threads they're participants in
CREATE POLICY "Users can view their threads" ON public.message_threads
    FOR SELECT
    USING (auth.uid() = ANY(participant_ids));

-- Users can create threads they're part of
CREATE POLICY "Users can create threads" ON public.message_threads
    FOR INSERT
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- Users can update threads they're part of
CREATE POLICY "Users can update their threads" ON public.message_threads
    FOR UPDATE
    USING (auth.uid() = ANY(participant_ids))
    WITH CHECK (auth.uid() = ANY(participant_ids));

-- Create RLS policies for messages
-- Users can view messages in threads they're part of
CREATE POLICY "Users can view messages in their threads" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.message_threads
            WHERE id = messages.thread_id
            AND auth.uid() = ANY(participant_ids)
        )
    );

-- Users can send messages to threads they're part of
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

-- Users can update their own messages
CREATE POLICY "Users can update their own messages" ON public.messages
    FOR UPDATE
    USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

-- Function to update thread's last_message_at when a message is sent
CREATE OR REPLACE FUNCTION update_thread_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.message_threads
    SET last_message_at = NEW.created_at
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update last_message_at
DROP TRIGGER IF EXISTS update_thread_last_message_trigger ON public.messages;
CREATE TRIGGER update_thread_last_message_trigger
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_last_message();

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on message_threads
DROP TRIGGER IF EXISTS update_message_threads_updated_at ON public.message_threads;
CREATE TRIGGER update_message_threads_updated_at
    BEFORE UPDATE ON public.message_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Grant necessary permissions
GRANT ALL ON public.message_threads TO authenticated;
GRANT ALL ON public.messages TO authenticated;
GRANT USAGE ON SEQUENCE message_threads_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE messages_id_seq TO authenticated;