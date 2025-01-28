# -*- coding:utf-8 -*-
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import webbrowser
import threading
from sys import argv
from os.path import realpath
from os import chdir
from time import sleep

RUN_IN_BROWSER = False

PATHS = {}
_wdir = '.'
command_line = (len(argv) > 1)
if command_line:
    _wdir = realpath(argv[1].strip('"'))
    chdir(_wdir)

for path in Path(_wdir).glob("**/*"):
    name = str(path.resolve())
    PATHS[name.lower()] = name

MAIN_IP = "127.0.0.1"
MAIN_PORT = 8000
BROWSER_PATH = 'c:/Program Files/Mozilla Firefox/firefox.exe -private "%s"'
#BROWSER_PATH = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe \"%s\" --incognito'

print(f"Running server from: {_wdir} at http://{MAIN_IP}:{MAIN_PORT}")

class DualStackServer(ThreadingHTTPServer):
    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception:
            pass
        return super().server_bind()

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = super().translate_path(path)
        return PATHS.get(path.lower(), path)


def main(server_class=DualStackServer, handler_class=Handler):
    server = DualStackServer((MAIN_IP, MAIN_PORT), Handler)
    thread = threading.Thread(target = server.serve_forever)
    thread.daemon = True
    thread.start()
    sleep(.5)
    if RUN_IN_BROWSER:
        webbrowser.get(BROWSER_PATH).open_new_tab( f"http://{MAIN_IP}:{MAIN_PORT}")
    try:
        while 1: sleep(1)
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == '__main__':
    main()

