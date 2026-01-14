# Web Tools - 多功能在线工具箱

一个现代化的多功能在线工具箱，包含图片切分工具和云剪贴板两大核心功能。采用 React + TypeScript + Vite 构建，支持多域名部署、SEO 优化和国际化。

## ✨ 核心功能

### 1. 🖼️ 图片切分工具 (ImageSplitter)
- **纯前端实现**：无需上传，本地浏览器极速处理
- **自定义网格**：支持 1x1 到 5x5 任意网格切分
- **实时预览**：切分后即时预览所有切片
- **一键打包**：使用 JSZip 打包所有切片，一键下载

### 2. 📋 云剪贴板 (Clipboard)
- **实时同步**：基于 WebSocket 的跨设备文本同步
- **端到端加密**：使用 AES-256 加密，密钥仅存储在本地
- **房间机制**：MD5(密钥) 作为房间号，相同密钥的设备自动同步
- **自动重连**：网络断开后自动重连

## 🏗️ 技术架构

### 前端技术栈
- **核心框架**：React 19 + TypeScript
- **构建工具**：Vite 7
- **UI 框架**：Tailwind CSS 4
- **图标库**：lucide-react
- **图片处理**：HTML5 Canvas API + JSZip + file-saver
- **加密库**：crypto-js (AES-256)
- **SEO**：react-helmet-async
- **国际化**：react-i18next (支持中英文切换)

### 后端技术栈
- **语言**：Go
- **WebSocket**：gorilla/websocket
- **消息协议**：JSON

## 📁 项目结构

```
web_tools/
├── frontend/               # 前端项目
│   ├── src/
│   │   ├── components/    # 通用组件
│   │   │   ├── SEO.tsx           # SEO 组件
│   │   │   └── LanguageToggle.tsx # 语言切换
│   │   ├── pages/         # 页面组件
│   │   │   ├── Home.tsx          # 主页
│   │   │   ├── ImageSplitter.tsx # 图片切分工具
│   │   │   └── Clipboard.tsx     # 云剪贴板
│   │   ├── locales/       # 国际化资源
│   │   │   ├── zh-CN.json        # 中文翻译
│   │   │   └── en-US.json        # 英文翻译
│   │   ├── i18n.ts        # i18n 配置
│   │   ├── App.tsx        # 多域名路由
│   │   ├── main.tsx       # 入口文件
│   │   └── index.css      # 全局样式
│   ├── dist/              # 构建输出 (生产环境)
│   ├── vite.config.ts     # Vite 配置
│   ├── tailwind.config.js # Tailwind 配置
│   └── package.json
├── backend/               # 后端项目 (Go)
│   ├── main.go           # WebSocket 服务器
│   ├── config.json       # 后端配置
│   └── go.mod
├── nginx.conf.example     # Nginx 配置示例
└── PROJECT_README.md     # 项目文档
```

## 🚀 快速开始

### 前端开发

```bash
cd frontend

# 安装依赖
npm install --legacy-peer-deps

# 开发模式 (http://localhost:5173)
npm run dev

# 生产构建
npm run build

# 预览构建结果
npm run preview
```

### 后端开发

```bash
cd backend

# 运行 Go 服务器 (端口 8080)
go run main.go
```

## 🌐 多域名路由架构

项目通过域名区分不同功能入口：

- **主域名** (`domain.com`) → 展示工具列表 (Home)
- **图片切分** (`pic.domain.com`) → ImageSplitter 工具
- **云剪贴板** (`copy.domain.com`) → Clipboard 工具

路由逻辑在 `App.tsx` 中实现：

```typescript
const hostname = window.location.hostname;

if (hostname.startsWith('pic.')) {
  return <ImageSplitter />;
}

if (hostname.startsWith('copy.')) {
  return <Clipboard />;
}

return <Home />;
```

## 📦 部署指南

### 1. 构建前端

```bash
cd frontend
npm install --legacy-peer-deps
npm run build
# 构建输出在 frontend/dist/
```

### 2. 配置 Nginx

参考 `nginx.conf.example`，关键配置：

```nginx
server {
    listen 80;
    server_name domain.com pic.domain.com copy.domain.com;

    root /path/to/web_tools/frontend/dist;
    index index.html;

    # API 反向代理 (WebSocket 支持)
    location /api/ {
        proxy_pass http://localhost:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. 启动后端

```bash
cd backend
go run main.go
# 监听在 localhost:8080
```

### 4. DNS 配置

在域名服务商处添加 A 记录：

```
domain.com       -> 服务器 IP
pic.domain.com   -> 服务器 IP
copy.domain.com  -> 服务器 IP
```

## 🔐 安全特性

### 图片切分工具
- ✅ 完全本地处理，图片不离开浏览器
- ✅ 无服务器上传，保护隐私

### 云剪贴板
- ✅ AES-256 端到端加密
- ✅ 密钥仅存储在本地浏览器
- ✅ MD5(密钥) 作为房间号，服务器无法解密内容
- ✅ 支持自动重连，保证消息可靠性

## 🌍 国际化 (i18n)

支持中英文切换，配置文件位于：
- `src/locales/zh-CN.json` - 中文翻译
- `src/locales/en-US.json` - 英文翻译

添加新语言：
1. 在 `src/locales/` 下创建新的 JSON 文件
2. 在 `src/i18n.ts` 中导入并注册
3. 更新 `LanguageToggle.tsx` 添加切换选项

## 🔧 开发说明

### 环境变量

开发环境下，Vite 会自动将 `/api` 代理到 `http://localhost:8080`：

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
```

### WebSocket 连接逻辑

```typescript
// 开发环境: ws://localhost:8080/api/ws (通过 Vite proxy)
// 生产环境: wss://your-domain.com/api/ws (通过 Nginx proxy)

const getWebSocketUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = import.meta.env.DEV ? 'localhost:8080' : window.location.host;
  return `${protocol}//${host}/api/ws`;
};
```

## 📝 SEO 优化

每个页面使用 `react-helmet-async` 动态设置 Meta 标签：

```typescript
<SEO
  title="在线图片切分工具 - 免费九宫格切图"
  description="无需上传，本地浏览器极速切分图片为九宫格或自定义网格"
/>
```

## 🎨 样式定制

项目使用 Tailwind CSS 4，支持深色模式：

```typescript
// 示例：响应式 + 深色模式
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
    标题
  </h2>
</div>
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📮 联系方式

如有问题或建议，欢迎通过 Issue 反馈。

---

**构建于 2026 年，使用 ❤️ 和 React**
