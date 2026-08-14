# 谱源 · 曹氏小石口家谱

可部署到 GitHub Pages 的家谱数字化管理前端。当前数据以“山西省朔州市应县南河种镇小石口村”为祖源线索，只有地点被记录，具体始迁祖、姓名、字辈和世系必须以家谱原件、墓碑、户口簿或家人核对为准，不使用虚构人物填充。

## 本地运行

```bash
npm install
npm run dev
```

## 构建 GitHub Pages

如果仓库名为 `family-tree`，构建时设置：

```bash
VITE_BASE_PATH=/family-tree/ npm run build
```

构建产物在 `dist/`。项目已包含 `.github/workflows/deploy.yml`，推送到 GitHub 后可在仓库 Settings → Pages → GitHub Actions 选择发布。

## 百度云函数接口约定

设置 `VITE_API_BASE_URL` 后，前端请求：

- `GET /people`：返回人物数组
- `POST /people`：新增人物，返回保存后的人物

后续可扩展 `/relationships`、`/materials`、`/review` 和 `/upload-url`。服务器上的数据库和上传文件不应直接暴露给浏览器。

百度云 CFC 部署辅助脚本为 `deploy/cfc-admin.mjs`，只从本机 `~/.bce/credentials` 读取凭证；凭证不会进入仓库。它会创建/复用 `FamilyTreeApiFunction` 并配置 `/api/{proxy+}` HTTP 触发器。

## 当前原型包含

- 家谱关系图谱与世代标识
- 人物详情侧栏
- 成员搜索和成员管理列表
- 新增成员（无 API 时保存到浏览器 localStorage）
- 资料库和审核中心入口
- GitHub Pages 静态发布配置

## 百度云服务器 API

服务器部署文件在 `backend/`、`docker-compose.yml` 和 `deploy/`。默认使用服务器本地 SQLite 文件，数据目录为 `/opt/apps/family-tree/data/`。

```bash
bash deploy/deploy-api-baidu.sh
```

部署后，先在服务器上验证：`podman exec family-tree-api python -c 'import urllib.request; print(urllib.request.urlopen("http://127.0.0.1:18091/health").read())'`。API 默认只在 Podman 内网运行，不直接暴露公网；等百度云函数的内部密钥配置好后，再把 `deploy/family-tree.nginx.conf` 中的 location 合并到现有 Nginx server 块并 reload。
