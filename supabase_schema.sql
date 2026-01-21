-- Supabase SQL Schema for ProFootball Match Center

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Teams Table
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "homeTeamId" UUID REFERENCES teams(id),
    "awayTeamId" UUID REFERENCES teams(id),
    "homeScore" INTEGER DEFAULT 0,
    "awayScore" INTEGER DEFAULT 0,
    minute INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'NOT_STARTED', -- NOT_STARTED, FIRST_HALF, HALF_TIME, SECOND_HALF, FULL_TIME, CANCELLED
    "startTime" TIMESTAMP WITH TIME ZONE,
    details JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match Events Table
CREATE TABLE IF NOT EXISTS match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "matchId" UUID REFERENCES matches(id),
    type TEXT NOT NULL, -- GOAL, YELLOW_CARD, RED_CARD, FOUL, SHOT, SUBSTITUTION, PERIOD_START, PERIOD_END
    minute INTEGER NOT NULL,
    "teamId" UUID REFERENCES teams(id),
    player TEXT,
    details JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages Table (Optional, as requirement mentions Redis/Socket.io for live chat)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "matchId" UUID REFERENCES matches(id),
    "userId" TEXT NOT NULL,
    message TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);



-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events("matchId");
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON chat_messages("matchId");
