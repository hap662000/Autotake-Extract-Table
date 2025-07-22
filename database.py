import sqlite3
import json
from datetime import datetime

def init_db():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            project_id TEXT PRIMARY KEY,
            filename TEXT,
            upload_date TEXT,
            results TEXT
        )
    """)
    conn.commit()
    conn.close()

def add_project(project_id: str, filename: str, results: dict):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO projects (project_id, filename, upload_date, results) VALUES (?, ?, ?, ?)",
        (project_id, filename, datetime.now().isoformat(), json.dumps(results))
    )
    conn.commit()
    conn.close()

def get_projects():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("SELECT project_id, filename, upload_date FROM projects ORDER BY upload_date DESC")
    projects = [{"project_id": row[0], "filename": row[1], "upload_date": row[2]} for row in cursor.fetchall()]
    conn.close()
    return projects

def get_project_results(project_id: str):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("SELECT results FROM projects WHERE project_id = ?", (project_id,))
    result = cursor.fetchone()
    conn.close()
    return json.loads(result[0]) if result else None

def delete_project(project_id: str) -> bool:
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM projects WHERE project_id = ?", (project_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0