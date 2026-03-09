-- Replace global project-name uniqueness with per-user uniqueness.
-- This allows different users to create projects with the same name.

ALTER TABLE projects
DROP CONSTRAINT IF EXISTS projects_name_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_user_id_name_unique
ON projects (user_id, name);
