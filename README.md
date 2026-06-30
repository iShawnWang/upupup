# upupup

一个轻量的网站 / API 可用性监控面板，灵感来自 [check-cx](https://github.com/BingZi-233/check-cx) 的前端设计风格。配置全在 `.env`，本地一键启动，无需任何云服务。

---

## 功能需求

### 核心功能

- 定时检测 `.env` 中配置的网站和 API 接口，记录可用性与延迟
- 支持**关键字匹配**：响应体包含指定字符串才判定为 `up`，否则为 `down`
- 支持纯可达性检测（不配置关键字时，仅判断 HTTP 状态码）
- Dashboard 展示每个监控目标的当前状态、延迟、24h 在线率、90 天历史格子
- 历史数据自动清理，保留天数可配置

### 不在范围内

- 告警通知（不需要）
- 后台管理 UI（配置全在 `.env`，不需要）
- 用户登录 / 权限系统
- AI 功能

---

## 技术设计

### 技术栈

| 层 | 选型 | 理由 |
|---|---|---|
| 框架 | Next.js 14 App Router | 前后端一体，SSR + API Routes |
| 数据库 | SQLite（`better-sqlite3`） | 零依赖，单文件，本地部署最简 |
| 定时任务 | `node-cron` | 进程内常驻，无需平台 Cron |
| UI | shadcn/ui + Tailwind | 组件齐全，风格与 check-cx 接近 |
| 部署 | PM2 | 本地 / VPS 进程守护 |

不使用 ORM（Drizzle / Prisma），直接用 `better-sqlite3` 裸写 SQL。项目只有一张核心表，操作不超过 5 条 SQL，ORM 是额外复杂度。

### 架构概览

```
.env (MONITORS 配置)
      │
      ▼
instrumentation.ts          ← Next.js 服务启动时执行一次
      │
      └─► lib/cron.ts        ← node-cron，每 N 秒触发
                │
                └─► lib/checker.ts   ← fetch + 超时 + 关键字匹配
                          │
                          ▼
                    SQLite check_history
                          │
                          ▼
              app/api/dashboard/route.ts  ← 数据聚合
                          │
                          ▼
                    app/page.tsx + components/
                    （Dashboard 前端，每 30s 轮询）
```

### 目录结构

```
monitor-cx/
├── instrumentation.ts          # 服务启动钩子，挂载 cron
├── lib/
│   ├── config.ts               # 解析 .env MONITORS，类型化导出
│   ├── db.ts                   # better-sqlite3 连接 + 建表
│   ├── cron.ts                 # node-cron 定时调度
│   └── checker.ts              # 单次检测逻辑
├── app/
│   ├── page.tsx                # Dashboard 首页（SSR 首屏）
│   └── api/
│       └── dashboard/
│           └── route.ts        # GET /api/dashboard，聚合数据
├── components/
│   ├── status-card.tsx         # 单个监控目标卡片
│   ├── history-grid.tsx        # 90 天历史格子
│   └── dashboard-view.tsx      # 客户端轮询容器
├── data/                       # SQLite 文件目录（gitignore）
│   └── monitor.db
├── .env
├── ecosystem.config.js         # PM2 配置
└── next.config.ts
```

### 数据库

只有一张表：

```sql
CREATE TABLE IF NOT EXISTS check_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT NOT NULL,        -- 来自 .env 的 monitor.name
  url          TEXT NOT NULL,
  status       TEXT NOT NULL,        -- 'up' | 'down'
  latency_ms   INTEGER,              -- 首字节响应时间，ms
  status_code  INTEGER,              -- HTTP 状态码
  keyword_ok   INTEGER,              -- 1=匹配 0=未匹配 NULL=未配置关键字
  error        TEXT,                 -- 异常信息（超时、网络错误等）
  checked_at   TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_name_time
  ON check_history(name, checked_at DESC);
```

历史清理：cron 每次运行时顺带执行：

```sql
DELETE FROM check_history
WHERE checked_at < datetime('now', '-' || ? || ' days');
```

### .env 配置说明

```env
# 监控目标，JSON 数组
# 必填字段：name, url
# 可选字段：method（默认 GET）、keyword、expectedStatus（默认 200）、timeout（默认 10000ms）
MONITORS='[
  {
    "name": "博客",
    "url": "https://example.com",
    "keyword": "Welcome"
  },
  {
    "name": "API 健康检查",
    "url": "https://api.example.com/health",
    "keyword": "ok",
    "expectedStatus": 200
  },
  {
    "name": "纯可达性",
    "url": "https://service.example.com"
  }
]'

# 检测间隔（秒），最小 30
CHECK_INTERVAL_SECONDS=60

# 历史保留天数
HISTORY_RETENTION_DAYS=90

# SQLite 文件路径
DB_PATH=./data/monitor.db
```

### 检测逻辑（lib/checker.ts）

单次检测流程：

1. 用 `AbortController` 设超时（`timeout` ms）
2. 发起 `fetch(url, { method, signal })`
3. 记录首字节响应时间（`latency_ms`）
4. 判断 `status_code` 是否等于 `expectedStatus`
5. 如果配置了 `keyword`，读取响应体文本，检查是否 `includes(keyword)`
6. 综合判定 `status`：`'up'` 或 `'down'`
7. 写入 `check_history`

超时和网络错误均记为 `status='down'`，`error` 字段记录具体原因。

### Dashboard 数据接口

`GET /api/dashboard`

返回结构：

```ts
{
  monitors: [
    {
      name: string
      url: string
      status: 'up' | 'down'        // 最近一次检测结果
      latency_ms: number | null
      uptime_24h: number            // 0-100，百分比
      uptime_7d: number
      last_checked: string          // ISO 时间
      history: {                    // 最近 90 天，每天一个格子
        date: string                // YYYY-MM-DD
        uptime: number              // 当天 up 比例 0-100
      }[]
    }
  ],
  updated_at: string
}
```

前端 `dashboard-view.tsx` 每 30 秒轮询一次此接口，结合 ETag 避免无效渲染。

### 定时任务（lib/cron.ts）

```ts
// 伪代码示意
cron.schedule(`*/${CHECK_INTERVAL_SECONDS}s`, async () => {
  const monitors = getMonitorsFromEnv()
  await Promise.allSettled(monitors.map(check))
  cleanOldHistory()
})
```

并发数不做限制（monitor 数量预计不超过 20 个），`Promise.allSettled` 保证单个失败不影响其他。

---

## 本地开发

```bash
# 安装依赖
pnpm install

# 复制配置
cp .env.example .env
# 编辑 .env，填入你的监控目标

# 启动开发服务
pnpm dev
```

访问 `http://localhost:3000`。

开发模式下 `instrumentation.ts` 同样会执行，cron 正常启动。可在终端看到每次检测的日志输出。

---

## 生产部署（PM2）

### 1. 部署到其他电脑的完整步骤

```bash
# 在目标电脑上操作
# 1. 克隆或复制项目代码到目标电脑
git clone <你的仓库地址>
# 或者直接复制整个项目文件夹

# 2. 进入项目目录
cd upupup

# 3. 安装依赖
pnpm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的监控目标配置
nano .env

# 5. 构建项目
pnpm build

# 6. 使用 PM2 启动服务
pm2 start ecosystem.config.js

# 7. 查看服务状态
pm2 status

# 8. 查看日志
pm2 logs upupup

# 9. 设置开机自启
pm2 save
pm2 startup
# 按照提示执行输出的命令
```

### 2. PM2 常用命令

```bash
# 启动服务
pm2 start ecosystem.config.js

# 停止服务
pm2 stop upupup

# 重启服务
pm2 restart upupup

# 删除服务
pm2 delete upupup

# 查看日志
pm2 logs upupup

# 实时查看日志
pm2 logs upupup --lines 100 --follow

# 查看状态
pm2 status

# 清空日志
pm2 flush
```

### 3. ecosystem.config.js 配置说明

```js
module.exports = {
  apps: [{
    name: 'upupup',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOST: '0.0.0.0'  // 允许所有 IP 访问
    }
  }]
}
```

### 4. 数据备份与迁移

SQLite 数据库文件在 `./data/monitor.db`，备份直接复制该文件即可。

```bash
# 备份数据库
cp ./data/monitor.db ./data/monitor.db.backup

# 恢复数据库
cp ./data/monitor.db.backup ./data/monitor.db
```

---

## Docker 部署

### 使用 docker-compose 部署（推荐）

```bash
# 复制配置文件
cp .env.example .env
# 编辑 .env，填入你的监控目标

# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 使用 docker 命令部署

```bash
# 构建镜像
docker build -t upupup .

# 运行容器
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

## 开发计划

| 阶段 | 内容 | 预计时间 |
|---|---|---|
| Day 1 | 项目初始化、shadcn/ui、db.ts 建表、config.ts 解析 .env | 1 天 |
| Day 2 | checker.ts 检测逻辑、cron.ts 调度、instrumentation.ts 挂载 | 1 天 |
| Day 3 | /api/dashboard 数据聚合接口 | 0.5 天 |
| Day 4 | Dashboard UI：状态卡片 + 历史格子 | 1.5 天 |
| Day 5 | PM2 配置、README、收尾测试 | 0.5 天 |

---

## 参考

- UI 设计风格参考：[BingZi-233/check-cx](https://github.com/BingZi-233/check-cx)
- 定时任务方案：Next.js `instrumentation.ts` + `node-cron`
