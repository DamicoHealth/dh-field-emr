-- ==========================================
-- DH Field EMR — Supabase Schema v2
-- Run this in your Supabase SQL Editor
-- ==========================================

-- Records table
CREATE TABLE IF NOT EXISTS records (
  id UUID PRIMARY KEY,
  device_id TEXT,
  site TEXT,
  date TEXT,
  mrn TEXT,
  given_name TEXT,
  family_name TEXT,
  name TEXT,
  sex TEXT,
  dob TEXT,
  phone TEXT,
  pregnant TEXT,
  breastfeeding TEXT,
  temp TEXT,
  bp TEXT,
  weight TEXT,
  allergies TEXT,
  current_meds TEXT,
  pmh TEXT,
  chief_concern TEXT,
  labs JSONB DEFAULT '{}'::jsonb,
  lab_comments TEXT,
  urinalysis JSONB DEFAULT '{}'::jsonb,
  blood_glucose TEXT,
  diagnosis TEXT,
  medications JSONB DEFAULT '[]'::jsonb,
  treatment_notes TEXT,
  treatment TEXT,
  procedures JSONB DEFAULT '[]'::jsonb,
  referral_type TEXT,
  provider TEXT,
  notes TEXT,
  age_estimated BOOLEAN DEFAULT false,
  saved_at TIMESTAMPTZ,
  sync_version INTEGER DEFAULT 1,
  deleted BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_records_date ON records (date);
CREATE INDEX IF NOT EXISTS idx_records_site ON records (site);
CREATE INDEX IF NOT EXISTS idx_records_deleted ON records (deleted);
CREATE INDEX IF NOT EXISTS idx_records_device_id ON records (device_id);
CREATE INDEX IF NOT EXISTS idx_records_saved_at ON records (saved_at);

-- Devices table
CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  org_name TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Config table
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE records ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Records: full access via anon key
CREATE POLICY "anon_read_records" ON records FOR SELECT USING (true);
CREATE POLICY "anon_insert_records" ON records FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_records" ON records FOR UPDATE USING (true);

-- Devices: full access via anon key
CREATE POLICY "anon_read_devices" ON devices FOR SELECT USING (true);
CREATE POLICY "anon_insert_devices" ON devices FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_devices" ON devices FOR UPDATE USING (true);

-- Config: full access via anon key
CREATE POLICY "anon_read_config" ON config FOR SELECT USING (true);
CREATE POLICY "anon_write_config" ON config FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_config" ON config FOR UPDATE USING (true);
