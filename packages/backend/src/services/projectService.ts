import pool from '../db';
import { v4 as uuidv4 } from 'uuid';

interface Project {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ProjectService {
  async createProject(name: string, description?: string, owner?: string): Promise<Project> {
    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO projects (id, name, description, owner)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, name, description, owner]
    );

    return this.mapProject(result.rows[0]);
  }

  async getProject(projectId: string): Promise<Project | null> {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [projectId]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapProject(result.rows[0]);
  }

  async getProjectByName(name: string): Promise<Project | null> {
    const result = await pool.query('SELECT * FROM projects WHERE name = $1', [name]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapProject(result.rows[0]);
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await pool.query(
      'SELECT * FROM projects ORDER BY updated_at DESC'
    );

    return result.rows.map(row => this.mapProject(row));
  }

  async updateProject(
    projectId: string,
    updates: { name?: string; description?: string; owner?: string }
  ): Promise<Project> {
    const allowedFields = ['name', 'description', 'owner'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) {
      const project = await this.getProject(projectId);
      if (!project) throw new Error('Project not found');
      return project;
    }

    const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
    const values = fields.map(field => updates[field as keyof typeof updates]);
    values.push(projectId);

    const result = await pool.query(
      `UPDATE projects SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    return this.mapProject(result.rows[0]);
  }

  async deleteProject(projectId: string): Promise<void> {
    await pool.query('DELETE FROM projects WHERE id = $1', [projectId]);
  }

  private mapProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      owner: row.owner,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export default new ProjectService();
