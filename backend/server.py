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

SEED_PEOPLE = [
    ("cao-xiangzhong", "曹祥中", 2, "祥中房·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名来自第三张放大图，上游世系待家人复核。", "[]"),
    ("cao-qishan", "曹祺善", 3, "祥中房·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名及与曹祥中的连线来自第三张放大图，待家人复核。", '["cao-xiangzhong"]'),
    ("cao-tongxiu", "曹同休", 0, "手绘图主线", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名与曹建列的上方连线来自第二张放大图，字形和父子关系待家人复核。", "[]"),
    ("cao-jianlie", "曹建列", 1, "手绘图主线", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名与曹立中的父子连线来自手绘世系图，年代、籍贯和是否为小石口始迁祖待家人核对。", '["cao-tongxiu"]'),
    ("cao-lizhong", "曹立中", 2, "立中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "手绘图中位于曹建列下方的主节点。", '["cao-jianlie"]'),
    ("cao-yushan", "曹裕善", 3, "立中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。", '["cao-lizhong"]'),
    ("cao-haoshan", "曹好善", 3, "立中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。", '["cao-lizhong"]'),
    ("cao-wangshan", "曹王善", 3, "立中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。", '["cao-lizhong"]'),
    ("cao-bingshan", "曹秉善", 3, "立中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹立中的分支关系来自手绘世系图，字形及生平信息待家人核对。", '["cao-lizhong"]'),
    ("cao-baozhong", "曹宝中", 2, "建列房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "第二张放大图中位于曹建列下方的主节点，字形和连线待家人复核。", '["cao-jianlie"]'),
    ("cao-fushan", "曹福善", 3, "宝中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。", '["cao-baozhong"]'),
    ("cao-wanshan", "曹万善", 3, "宝中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。", '["cao-baozhong"]'),
    ("cao-rongshan", "曹荣善", 3, "宝中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。", '["cao-baozhong"]'),
    ("cao-lianshan", "曹连善", 3, "宝中房", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和与曹宝中的分支关系来自第二张放大图，字形待家人复核。", '["cao-baozhong"]'),
    ("cao-jiuzhong", "曹九重", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第一张放大图，字形及归属房支待家人复核。", '["cao-yushan"]'),
    ("cao-jiuxu-shu", "曹九续", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第一张放大图，字形及归属房支待家人复核。", '["cao-yushan"]'),
    ("cao-jiugong", "曹九工", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第一张放大图，字形及归属房支待家人复核。", '["cao-haoshan"]'),
    ("cao-jiuguan", "曹九官", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第一张放大图，字形及归属房支待家人复核。", '["cao-wangshan"]'),
    ("cao-jiuyin", "曹九银", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第一张放大图，字形及归属房支待家人复核。", '["cao-wangshan"]'),
    ("cao-jiucheng", "曹九城", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第一张放大图，字形及归属房支待家人复核。", '["cao-wangshan"]'),
    ("cao-jiujiang", "曹九江", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-bingshan"]'),
    ("cao-jiuxu", "曹九旭", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-bingshan"]'),
    ("cao-jiuzhou", "曹九州", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-fushan"]'),
    ("cao-jiushuai", "曹九帅", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-fushan"]'),
    ("cao-jiuda", "曹九达", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-fushan"]'),
    ("cao-jiuguo", "曹九国", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-wanshan"]'),
    ("cao-jiuju", "曹九居", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-wanshan"]'),
    ("cao-jiuceng", "曹九曾", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-rongshan"]'),
    ("cao-jiuquan", "曹九全", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-rongshan"]'),
    ("cao-jiuyou", "曹九有", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-lianshan"]'),
    ("cao-jiuwu", "曹九梧", 4, "九字辈·待核", "男", "待考", "山西省朔州市应县南河种镇小石口村", "待确认", "姓名和父子连线来自第二、三张放大图，字形及归属房支待家人复核。", '["cao-lianshan"]'),
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
        connection.executemany("INSERT INTO people (id,name,generation,branch,gender,years,location,status,note,parent_ids) VALUES (?,?,?,?,?,?,?,?,?,?)", SEED_PEOPLE)
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
