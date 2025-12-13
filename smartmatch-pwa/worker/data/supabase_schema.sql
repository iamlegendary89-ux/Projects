-- Onyx Persistence Schema

create table if not exists onyx_sessions (
  session_id uuid primary key,
  created_at timestamptz default now(),
  mindprint_mu float[],
  mindprint_sigma float[],
  archetype_prob float[],
  final_recommendation varchar(255),
  client_metadata jsonb
);

create table if not exists onyx_feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references onyx_sessions(session_id),
  phone_id varchar(255),
  rating int check (rating >= 1 and rating <= 5),
  regret boolean default false,
  notes text,
  created_at timestamptz default now()
);

create table if not exists onyx_calibration_snapshots (
  id serial primary key,
  created_at timestamptz default now(),
  weights_version varchar(50),
  weights_config jsonb,
  metrics jsonb
);

-- Index for analytics
create index idx_onyx_feedback_created_at on onyx_feedback(created_at);
