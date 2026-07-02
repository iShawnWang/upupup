# upupup

一个轻量的网站 / API 可用性监控面板，配置全在 `.env`，本地一键启动，无需任何云服务。

---

## ✨ 功能特性

### 📊 实时监控面板
- 一目了然的监控概览，显示 Up/Down 统计
- 每个监控卡片显示当前状态、延迟、在线率
- 30秒自动刷新数据

<!-- TODO: 截图：主 Dashboard 概览 -->

### 🎯 智能检测
- HTTP 状态码验证（可自定义期望状态码）
- 关键词匹配检查（响应体包含指定关键词才算成功）
- 支持自定义超时时间
- 失败时记录完整的错误信息（响应体、响应头、请求详情）

<!-- TODO: 截图：监控卡片详情，展示错误信息区域 -->

### 📈 多时间范围历史
- 支持 4 种时间范围：
  - 1小时（分钟级粒度）
  - 12小时（分钟级粒度）
  - 24小时（小时级粒度）
  - 30天（天级粒度）
- 智能聚合：时间段内有任何失败则显示为失败
- Hover 查看详细的历史记录信息

<!-- TODO: 截图：Hover 卡片详情 -->

### 🌙 主题切换
- 支持亮色、暗色、跟随系统三种模式
- 根据时间自动切换（夜间自动暗色）
- 本地保存主题偏好

<!-- TODO: 截图：暗色主题效果 -->

---

## 🚀 快速开始

### 前置要求
- Node.js 18+
- pnpm（或 npm/yarn）

### 1. 克隆/下载项目
```bash
git clone <你的仓库地址>
cd upupup
```

### 2. 安装依赖
```bash
pnpm install
```

### 3. 配置监控目标
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置你的监控目标：
```env
# 监控目标，JSON 数组
MONITORS='[
  {
    "name": "我的网站",
    "url": "https://example.com",
    "keyword": "Welcome"
  },
  {
    "name": "API 健康检查",
    "url": "https://api.example.com/health",
    "method": "GET",
    "expectedStatus": 200,
    "timeout": 30000
  }
]'

# 检测间隔（秒），最小 30
CHECK_INTERVAL_SECONDS=60

# 历史保留天数
HISTORY_RETENTION_DAYS=90

# SQLite 文件路径
DB_PATH=./data/monitor.db
```

### 4. 启动开发服务
```bash
pnpm dev
```

访问 http://localhost:3000 即可查看面板！

---

## ⚙️ 配置参考

### MONITORS 配置项

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| name | string | ✅ | - | 监控目标名称，用于展示 |
| url | string | ✅ | - | 监控的 URL 地址 |
| method | string | ❌ | GET | HTTP 方法（GET/POST/PUT 等） |
| keyword | string | ❌ | - | 响应体需包含的关键词 |
| expectedStatus | number | ❌ | 200 | 期望的 HTTP 状态码 |
| timeout | number | ❌ | 30000 | 超时时间（毫秒） |

### 其他配置项

| 环境变量 | 默认 | 说明 |
|----------|------|------|
| CHECK_INTERVAL_SECONDS | 60 | 检测间隔，最小 30 秒 |
| HISTORY_RETENTION_DAYS | 90 | 历史数据保留天数 |
| DB_PATH | ./data/monitor.db | SQLite 数据库文件路径 |

---

## 📦 部署指南

### 使用 PM2 部署（推荐）

#### 1. 构建项目
```bash
pnpm build
```

#### 2. 启动服务
```bash
pm2 start ecosystem.config.js
```

#### 3. 查看状态和日志
```bash
pm2 status
pm2 logs upupup
```

#### 4. 设置开机自启
```bash
pm2 save
pm2 startup
```

### 使用 Docker 部署

#### 使用 docker-compose
```bash
cp .env.example .env
# 编辑 .env 配置你的监控目标
docker-compose up -d --build
```

#### 使用 docker 命令
```bash
docker build -t upupup .

docker run -d \
  --name upupup \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/.env:/app/.env:ro \
  --restart unless-stopped \
  upupup
```

数据会持久化在 `./data` 目录下。

---

## 🏗️ 技术架构

### 技术栈
- **框架**: Next.js 16 App Router
- **数据库**: SQLite + better-sqlite3
- **定时任务**: node-cron
- **UI**: shadcn/ui + Tailwind CSS
- **主题**: next-themes

### 项目结构
```
upupup/
├── app/
│   ├── api/dashboard/route.ts  # 数据聚合 API
│   ├── page.tsx                # 首页
│   ├── layout.tsx              # 布局（主题支持）
│   └── globals.css
├── components/
│   ├── ui/                     # shadcn/ui 组件
│   ├── dashboard-view.tsx      # Dashboard 主视图
│   ├── status-card.tsx         # 监控卡片
│   ├── history-grid.tsx        # 历史时间轴
│   ├── theme-toggle.tsx        # 主题切换
│   └── theme-provider.tsx
├── lib/
│   ├── checker.ts              # 检测逻辑
│   ├── cron.ts                 # 定时任务
│   ├── db.ts                   # 数据库操作
│   ├── config.ts               # 配置解析
│   └── utils.ts
├── instrumentation.ts          # 服务启动钩子
├── ecosystem.config.js         # PM2 配置
├── docker-compose.yml
├── Dockerfile
└── .env
```

### 数据流程
```
.env 配置
  ↓
instrumentation.ts → cron.ts 启动定时任务
  ↓
checker.ts 执行检测 → 写入 SQLite
  ↓
/api/dashboard/route.ts 聚合数据
  ↓
Dashboard UI (30s 自动刷新)
```

---

## 🙏 致谢

UI 设计风格参考：[BingZi-233/check-cx](https://github.com/BingZi-233/check-cx)

---

## 📝 License

MIT
