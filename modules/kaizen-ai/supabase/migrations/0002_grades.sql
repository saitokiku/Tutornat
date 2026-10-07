-- 0002_grades.sql — full gradebook + GPA
-- Additive migration: extends courses + homework_items with grade fields.
-- Student-facing grade data rides the existing local→cloud sync (lib/cloud.js);
-- GPA and current grade are computed client-side (lib/grades.js). Grade-trend
-- snapshots live in profiles.app_meta.gradeHistory (like masteryHistory).
-- Safe to re-run (IF NOT EXISTS on every column).

-- Courses: weighting scheme, credits, target, and letter scale.
alter table courses
  add column if not exists grade_categories jsonb not null default '[]'::jsonb, -- [{id,name,weight}] weight = percent
  add column if not exists credits numeric not null default 1,
  add column if not exists target_grade text,                                   -- e.g. 'A'
  add column if not exists grade_scale jsonb;                                   -- [{letter,min}] or null (defaults applied client-side)

-- Homework items ARE the gradebook line-items: give them scores.
alter table homework_items
  add column if not exists category text,          -- matches a course grade-category name
  add column if not exists points_earned numeric,
  add column if not exists points_possible numeric,
  add column if not exists graded boolean not null default false,
  add column if not exists graded_at timestamptz;

-- Speeds the gradebook's per-course graded-item lookups.
create index if not exists homework_items_graded_idx
  on homework_items (user_id, course_id) where graded;
