# 百度云服务器 API

这是家谱网站第一版的轻量 API，使用 Python 标准库和 SQLite，不需要额外的 Python 依赖。适合先部署到当前百度云测试机；后续数据量和协作规模上来后，再迁移 PostgreSQL。

## 本地启动

```bash
python3 backend/server.py
curl http://127.0.0.1:18091/health
curl http://127.0.0.1:18091/people
```

## 服务器部署

项目目录建议：`/opt/apps/family-tree`。数据库和家谱文件目录：`/opt/apps/family-tree/data/`。

```bash
podman-compose up -d --build
podman exec family-tree-api python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:18091/health").read())'
```

目前 API 公开读取 `/people`，新增操作可以通过 `INTERNAL_API_KEY` 保护。正式接入百度云函数后，前端只连接云函数，云函数再带 `X-Internal-Key` 调用服务器 API。
