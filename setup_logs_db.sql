-- NOVO SCRIPT PARA O SUPABASE SQL EDITOR

-- 1. Criar tabela de logs da API
CREATE TABLE IF NOT EXISTS api_logs (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    group_phone TEXT,
    event_type TEXT NOT NULL, -- Ex: 'RECEIVED_IMAGE', 'RECEIVED_TEXT', 'OFFER_DISCARDED', 'OFFER_PROCESSED', 'ERROR'
    message TEXT NOT NULL,
    metadata JSONB, -- Qualquer dado extra (erro detalhado, json da gpt, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index para buscar logs rapidamente por grupo ou tipo de evento
CREATE INDEX IF NOT EXISTS idx_api_logs_group_phone ON api_logs(group_phone);
CREATE INDEX IF NOT EXISTS idx_api_logs_event_type ON api_logs(event_type);
