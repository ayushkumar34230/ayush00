#!/usr/bin/env python3
"""
Simple, zero-dependency local development server for "My Art Gallery".
Runs using Python 3 standard library.
"""

import http.server
import socketserver
import os
import sys
import webbrowser

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class GalleryHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS and disable aggressive caching during local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run_server():
    os.chdir(DIRECTORY)
    port = PORT
    server_address = ('', port)

    # Try binding to port, find next available if in use
    for attempt in range(10):
        try:
            httpd = socketserver.TCPServer(server_address, GalleryHTTPRequestHandler)
            break
        except OSError:
            port += 1
            server_address = ('', port)

    print("=" * 60)
    print("🎨  MY ART GALLERY - LOCAL DEVELOPMENT SERVER")
    print("=" * 60)
    print(f"📁 Serving folder: {DIRECTORY}")
    print(f"🌐 Server running at: http://localhost:{port}")
    print(f"💻 Press Ctrl + C to stop the server anytime.")
    print("=" * 60)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Server stopped.")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
