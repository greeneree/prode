CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  client text,
  tag text DEFAULT 'operation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE requirements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  raw_input text,
  result_html text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE ia_docs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text,
  tree_data jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =========================================
-- M4: 대시보드 칸반 태스크
-- Supabase SQL Editor에서 아래 SQL을 실행하세요
-- =========================================

CREATE TABLE tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'todo',  -- 'todo' | 'in_progress' | 'done'
  due_date date,
  source text DEFAULT 'manual', -- 'manual' | 'auto' (요건에서 자동생성)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS 비활성화 (개발 편의)
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- =========================================
-- M4: 화면 디스크립션 (Vision 분석 결과)
-- =========================================

CREATE TABLE screen_descs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  ia_node_id text,
  ia_node_label text,
  image_base64 text,
  result_json jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE screen_descs DISABLE ROW LEVEL SECURITY;

-- =========================================
-- M5: 프로젝트 Summary 메모
-- =========================================

CREATE TABLE project_notes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  memo text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE project_notes DISABLE ROW LEVEL SECURITY;

-- =========================================
-- M5: 활동 타임라인 로그
-- =========================================

CREATE TABLE activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  action text NOT NULL,
  detail text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- =========================================
-- 계정별 프로젝트 분리
-- =========================================

ALTER TABLE projects ADD COLUMN owner text DEFAULT 'master';

-- =========================================
-- IA 버전 관리
-- =========================================

CREATE TABLE ia_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  title text,
  tree_data jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ia_versions DISABLE ROW LEVEL SECURITY;
