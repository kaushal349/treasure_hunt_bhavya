import http.server
import json
import os
import urllib.parse
import time
import sqlite3

PORT = int(os.environ.get('PORT', 8000))
DB_NAME = "treasure_hunt.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()
    # Uniqueness on email and phone to collapse duplicates per user request
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS teams (
            team_id TEXT PRIMARY KEY,
            team_name TEXT,
            email TEXT UNIQUE,
            phone TEXT UNIQUE,
            phase INTEGER,
            total_score INTEGER,
            state_json TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def is_authorized(self):
        # Authenticate endpoints that view or change states
        if self.path == '/api/teams' or self.path.startswith('/api/delete/') or self.path == '/api/admin/export' or self.path == '/api/admin/import':
            key = self.headers.get('X-Admin-Key')
            if key != 'Summer$26':
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
                return False
        return True

    def do_POST(self):
        if self.path == '/api/save':
            length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(length))
            
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            
            try:
                cursor.execute('SELECT team_id FROM teams WHERE email = ? OR phone = ?', (data['email'], data['phone']))
                existing = cursor.fetchone()
                
                if existing:
                    if existing[0] != data['teamId']:
                        self.send_response(409)
                        self.send_header('Content-Type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"success": False, "error": "Duplicate Email/Phone"}).encode())
                        conn.close()
                        return
                    
                    cursor.execute('''
                        UPDATE teams 
                        SET team_name = ?, email = ?, phone = ?, phase = ?, total_score = ?, state_json = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE team_id = ?
                    ''', (data['teamName'], data['email'], data['phone'], data['phase'], data['totalScore'], json.dumps(data), data['teamId']))
                    success = True
                else:
                    cursor.execute('''
                        INSERT INTO teams (team_id, team_name, email, phone, phase, total_score, state_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (data['teamId'], data['teamName'], data['email'], data['phone'], data['phase'], data['totalScore'], json.dumps(data)))
                    success = True
                conn.commit()
            except sqlite3.IntegrityError:
                success = False
            finally:
                if 'conn' in locals() and conn:
                    conn.close()
                
            self.send_response(200 if success else 400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": success}).encode())

        elif self.path == '/api/admin/import':
            if not self.is_authorized():
                return
            length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(length))
            
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            
            try:
                for state in data:
                    cursor.execute('''
                        INSERT OR REPLACE INTO teams (team_id, team_name, email, phone, phase, total_score, state_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (state['teamId'], state['teamName'], state['email'], state['phone'], state['phase'], state['totalScore'], json.dumps(state)))
                conn.commit()
                success = True
            except Exception:
                success = False
            finally:
                conn.close()
                
            self.send_response(200 if success else 400)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": success}).encode())
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/teams':
            if not self.is_authorized():
                return
            teams = []
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('SELECT state_json, team_id FROM teams ORDER BY updated_at DESC')
            for row in cursor.fetchall():
                team_data = json.loads(row[0])
                team_data['_filename'] = row[1] # Map ID to filename key so old app.js frontend delete buttons still work
                teams.append(team_data)
            conn.close()
                        
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(teams).encode())

        elif self.path == '/api/admin/export':
            if not self.is_authorized():
                return
            teams = []
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('SELECT state_json FROM teams')
            for row in cursor.fetchall():
                teams.append(json.loads(row[0]))
            conn.close()
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Disposition', 'attachment; filename=treasure_hunt_backup.json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(teams).encode())
        else:
            super().do_GET()

    def do_DELETE(self):
        if not self.is_authorized():
            return
        if self.path.startswith('/api/delete/'):
            team_id = urllib.parse.unquote(self.path.split('/')[-1])
            
            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM teams WHERE team_id = ?', (team_id,))
            conn.commit()
            changes = conn.total_changes
            conn.close()
            
            if changes > 0:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode())
            else:
                self.send_error(404)
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key')
        self.end_headers()


init_db()
httpd = http.server.HTTPServer(("", PORT), MyHandler)
print(f"Server started on port {PORT}")
httpd.serve_forever()
