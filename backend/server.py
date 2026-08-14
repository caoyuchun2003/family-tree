#!/usr/bin/env python3
"""Small dependency-free family archive API for the first server deployment."""

import json
import os
import sqlite3
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

DATA_DIR = Path(os.environ.get("DATA_DIR", "/data/genealogy"))
DB_PATH = Path(os.environ.get("DB_PATH", DATA_DIR / "family.db"))
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "")
PORT = int(os.environ.get("PORT", "18091"))

DEMO_PEOPLE = [
    ("p1", "曹氏先祖", 1, "本房", "男", "约 1890 — 1962", "山东平度", "已确认", "家谱根节点，资料来源为现存手写家谱。", "[]"),
    ("p2", "曹守仁", 2, "本房", "男", "1916 — 1988", "山东平度", "已确认", "第二世，家中长子。", '["p1"]'),
    ("p3", "曹守义", 2, "东支", "男", "1920 — 1996", "山东平度", "待确认", "姓名与原图字迹仍需家人核对。", '["p1"]'),
    ("p4", "曹明远", 3, "本房", "男", "1942 — 2015", "青岛", "已确认", "第三世。", '["p2"]'),
    ("p5", "曹明德", 3, "本房", "男", "1948 — 现在", "青岛", "已确认", "第三世。", '["p2"]'),
    ("p6", "曹明礼", 3, "东支", "男", "1951 — 现在", "济南", "待确认", "待补充出生信息。", '["p3"]'),
    ("p7", "曹致远", 4, "本房", "男", "1972 — 现在", "北京", "已确认", "第四世。", '["p4"]'),
    ("p8", "曹致和", 4, "本房", "男", "1977 — 现在", "青岛", "已确认", "第四世。", '["p4"]'),
    ("p9", "曹安然", 4, "本房", "女", "1981 — 现在", "上海", "已确认", "第四世。", '["p5"]'),
    ("p10", "曹嘉树", 5, "本房", "男", "2003 — 现在", "北京", "待确认", "第五世，照片资料待上传。", '["p7"]'),
    ("p11", "曹知行", 5, "本房", "男", "2008 — 现在", "青岛", "已确认", "第五世。", '["p8"]'),
    ("p12", "曹语桐", 5, "本房", "女", "2010 — 现在", "上海", "已确认", "第五世。", '["p9"]'),
]


def connect_db():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute(
        """CREATE TABLE IF NOT EXISTS people (
            id TEXT PRIMARY KEY, name TEXT NOT NULL, generation INTEGER NOT NULL,
            branch TEXT NOT NULL, gender TEXT NOT NULL, years TEXT NOT NULL,
            location TEXT NOT NULL, status TEXT NOT NULL, note TEXT NOT NULL,
            parent_ids TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    if connection.execute("SELECT COUNT(*) FROM people").fetchone()[0] == 0:
        connection.executemany("INSERT INTO people (id,name,generation,branch,gender,years,location,status,note,parent_ids) VALUES (?,?,?,?,?,?,?,?,?,?)", DEMO_PEOPLE)
        connection.commit()
    return connection


def row_to_person(row):
    person = dict(row)
    person["parentIds"] = json.loads(person.pop("parent_ids"))
    person.pop("created_at", None)
    return person


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        return

    def _send(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", os.environ.get("CORS_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Internal-Key")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        return not INTERNAL_API_KEY or self.headers.get("X-Internal-Key") == INTERNAL_API_KEY

    def do_OPTIONS(self):
        self._send({"ok": True})

    def do_GET(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path == "/health":
            self._send({"ok": True, "service": "family-tree-api"})
            return
        if path == "/people":
            if not self._authorized():
                self._send({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
                return
            with connect_db() as connection:
                people = [row_to_person(row) for row in connection.execute("SELECT * FROM people ORDER BY generation, id")]
            self._send(people)
            return
        self._send({"error": "not_found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self):
        path = urlparse(self.path).path.rstrip("/")
        if path != "/people":
            self._send({"error": "not_found"}, HTTPStatus.NOT_FOUND)
            return
        if not self._authorized():
            self._send({"error": "unauthorized"}, HTTPStatus.UNAUTHORIZED)
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size > 256_000:
                raise ValueError("payload_too_large")
            person = json.loads(self.rfile.read(size))
            required = ["id", "name", "generation", "branch", "gender", "years", "location", "status", "note"]
            if any(not person.get(key) for key in required):
                raise ValueError("missing_field")
            with connect_db() as connection:
                connection.execute("INSERT INTO people (id,name,generation,branch,gender,years,location,status,note,parent_ids) VALUES (?,?,?,?,?,?,?,?,?,?)", (person["id"], person["name"], int(person["generation"]), person["branch"], person["gender"], person["years"], person["location"], person["status"], person["note"], json.dumps(person.get("parentIds", []), ensure_ascii=False)))
                connection.commit()
            self._send(person, HTTPStatus.CREATED)
        except (ValueError, json.JSONDecodeError, sqlite3.IntegrityError) as error:
            self._send({"error": str(error) or "invalid_request"}, HTTPStatus.BAD_REQUEST)


if __name__ == "__main__":
    connect_db().close()
    print(f"family-tree-api listening on :{PORT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
