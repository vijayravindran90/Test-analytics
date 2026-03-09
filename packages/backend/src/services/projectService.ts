import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

interface Project {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  userId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectService {
  async createProject(name: string, description?: string, owner?: string, userId?: string): Promise<Project> {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO projects (id, name, description, owner, user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, name, description, owner, userId || null]
    );

    return this.mapProject(result.rows[0]);
  }

  async getProject(projectId: string, userId?: string): Promise<Project | null> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND ($2::uuid IS NULL OR user_id = $2::uuid)',
      [projectId, userId || null]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapProject(result.rows[0]);
  }

  async getProjectByName(name: string, userId?: string): Promise<Project | null> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE name = $1 AND ($2::uuid IS NULL OR user_id = $2::uuid)',
      [name, userId || null]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapProject(result.rows[0]);
  }

  async getAllProjects(userId?: string): Promise<Project[]> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE ($1::uuid IS NULL OR user_id = $1::uuid) ORDER BY updated_at DESC',
      [userId || null]
    );

    return result.rows.map(row => this.mapProject(row));
  }

  async updateProject(
    projectId: string,
    updates: { name?: string; description?: string; owner?: string },
    userId?: string
  ): Promise<Project> {
    const allowedFields = ['name', 'description', 'owner'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) {
      const project = await this.getProject(projectId, userId);
      if (!project) throw new Error('Project not found');
      return project;
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field as keyof typeof updates]);

    const result = await pool.query(
      `UPDATE projects SET ${setClause}, updated_at = NOW()
       WHERE id = $${fields.length + 1}
       AND ($${fields.length + 2}::uuid IS NULL OR user_id = $${fields.length + 2}::uuid)
       RETURNING *`,
      [...values, projectId, userId || null]
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return this.mapProject(result.rows[0]);
  }

  async deleteProject(projectId: string, userId?: string): Promise<void> {
    await pool.query(
      `DELETE FROM projects
       WHERE id = $1
       AND ($2::uuid IS NULL OR user_id = $2::uuid)`,
      [projectId, userId || null]
    );
  }

  private mapProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner: row.owner,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProjectService();
