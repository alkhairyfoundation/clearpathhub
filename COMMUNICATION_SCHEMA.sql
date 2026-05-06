-- ClearPath Edu Hub - Communication Hub Schema Enhancement
-- Run this in your Supabase SQL Editor to add communication capabilities

-- ===== COMMUNICATION TABLES =====

-- Messages (for direct communication between users)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Message attachments
CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    in_app_notifications BOOLEAN DEFAULT true,
    announcement_emails BOOLEAN DEFAULT true,
    message_emails BOOLEAN DEFAULT true,
    attendance_alerts BOOLEAN DEFAULT true,
    grade_alerts BOOLEAN DEFAULT true,
    behavior_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Notifications (system-generated alerts)
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id), -- Can be null for system notifications
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('announcement', 'message', 'attendance', 'grade', 'behavior', 'system')),
    related_id UUID, -- ID of related entity (announcement, message, etc.)
    related_type TEXT, -- Type of related entity
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Communication groups (for class/teacher/student/parent groups)
CREATE TABLE communication_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    group_type TEXT NOT NULL CHECK (group_type IN ('class', 'subject', 'team', 'club', 'custom')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Group members
CREATE TABLE communication_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES communication_groups(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('member', 'moderator', 'admin')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(group_id, profile_id)
);

-- Group messages
CREATE TABLE group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES communication_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_urls TEXT[], -- Array of file URLs
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ===== INDEXES FOR PERFORMANCE =====

CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_unread ON messages(recipient_id) WHERE is_read = false;
CREATE INDEX idx_message_attachments ON message_attachments(message_id);
CREATE INDEX idx_notification_preferences ON notification_preferences(profile_id);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id) WHERE is_read = false;
CREATE INDEX idx_communication_groups ON communication_groups(created_by);
CREATE INDEX idx_group_members ON communication_group_members(group_id);
CREATE INDEX idx_group_messages ON group_messages(group_id);

-- ===== ROW LEVEL SECURITY =====

-- Enable RLS and set up policies for new tables
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can send messages" ON messages 
    FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can view their messages" ON messages 
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can update their messages" ON messages 
    FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their messages" ON messages 
    FOR DELETE USING (auth.uid() = sender_id);

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view attachments for their messages" ON message_attachments 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messages m 
            WHERE m.id = message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
        )
    );

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notification preferences" ON notification_preferences 
    FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update their notification preferences" ON notification_preferences 
    FOR UPDATE USING (auth.uid() = profile_id);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notifications" ON notifications 
    FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can mark notifications as read" ON notifications 
    FOR UPDATE USING (auth.uid() = recipient_id);

ALTER TABLE communication_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view groups they belong to" ON communication_groups 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM communication_group_members cgm 
            WHERE cgm.group_id = id AND cgm.profile_id = auth.uid()
        )
    );
CREATE POLICY "Users can create groups" ON communication_groups 
    FOR INSERT WITH CHECK (auth.uid() = created_by);

ALTER TABLE communication_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view group memberships" ON communication_group_members 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM communication_groups cg 
            WHERE cg.id = group_id AND 
            EXISTS (
                SELECT 1 FROM communication_group_members cgm2 
                WHERE cgm2.group_id = cg.id AND cgm2.profile_id = auth.uid()
            )
        )
    );
CREATE POLICY "Users can join groups" ON communication_group_members 
    FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "Group admins and moderators can manage members" ON communication_group_members 
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM communication_groups cg 
            JOIN communication_group_members cgm ON cg.id = cgm.group_id
            WHERE cg.id = group_id AND 
            cgm.profile_id = auth.uid() AND 
            cgm.role IN ('admin', 'moderator')
        )
    );

ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can send messages to groups they belong to" ON group_messages 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM communication_group_members cgm 
            WHERE cgm.group_id = group_id AND cgm.profile_id = auth.uid()
        )
    );
CREATE POLICY "Users can view group messages" ON group_messages 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM communication_group_members cgm 
            WHERE cgm.group_id = group_id AND cgm.profile_id = auth.uid()
        )
    );
CREATE POLICY "Users can update their group messages" ON group_messages 
    FOR UPDATE USING (auth.uid() = sender_id);
CREATE POLICY "Users can delete their group messages" ON group_messages 
    FOR DELETE USING (auth.uid() = sender_id);

-- ===== SEED DATA =====

-- Insert default notification preferences for existing profiles
DO $$
BEGIN
    INSERT INTO notification_preferences (profile_id, email_notifications, push_notifications, in_app_notifications)
    SELECT id, true, true, true FROM profiles WHERE id NOT IN (SELECT profile_id FROM notification_preferences);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;