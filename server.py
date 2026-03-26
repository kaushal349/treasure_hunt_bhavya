import http.server
import json
import os
import urllib.parse
import time

PORT = int(os.environ.get('PORT', 8000))
DATA_DIR = "data"

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/save':
            length = int(self.headers['Content-Length'])
            data = json.loads(self.rfile.read(length))
            
            if not os.path.exists(DATA_DIR):
                os.makedirs(DATA_DIR)
                
            # Use timestamp to make entries unique (multiple participations per team allowed)
            timestamp = int(time.time())
            filename = f"team_{data['teamId']}_{timestamp}.json"
            filepath = os.path.join(DATA_DIR, filename)
            
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode())
        else:
            self.send_error(404)

    def do_GET(self):
        if self.path == '/api/teams':
            teams = []
            if os.path.exists(DATA_DIR):
                for f in os.listdir(DATA_DIR):
                    if f.endswith('.json'):
                        with open(os.path.join(DATA_DIR, f), 'r') as file:
                            # Load data and append filename so we can delete it later
                            team_data = json.load(file)
                            team_data['_filename'] = f # internal use for delete
                            teams.append(team_data)
            
            # Sort teams by their filename (which includes timestamp) to see recent first
            teams.sort(key=lambda x: x.get('_filename', ''), reverse=True)
                        
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(teams).encode())
        else:
            super().do_GET()

    def do_DELETE(self):
        if self.path.startswith('/api/delete/'):
            # The path will be /api/delete/team_id_timestamp.json
            filename = urllib.parse.unquote(self.path.split('/')[-1])
            filepath = os.path.join(DATA_DIR, filename)
            
            if os.path.exists(filepath):
                os.remove(filepath)
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
        # CORS support for local testing
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

# Create Server
httpd = http.server.HTTPServer(("", PORT), MyHandler)
print(f"Server started on port {PORT}")
httpd.serve_forever()
