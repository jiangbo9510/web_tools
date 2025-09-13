# 部署说明

## 项目结构

```
web-tools/
├── frontend/                 # 前端静态文件（Cloudflare Pages）
│   ├── index.html           # 主页面
│   ├── style.css            # 主页面样式
│   ├── script.js            # 主页面脚本
│   ├── config.json          # 前端配置
│   ├── websocket-protocol.json # WebSocket协议文档
│   ├── wrangler.toml        # Cloudflare Pages配置
│   ├── _redirects           # 重定向规则
│   ├── pic/                 # 图片切分工具
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── copy/                # 跨端加密复制工具
│       ├── index.html
│       ├── style.css
│       └── script.js
├── backend/                 # 后端服务（独立部署）
│   ├── main.go              # 后端主程序
│   ├── go.mod               # Go模块文件
│   ├── config.json          # 后端配置
│   └── websocket-protocol.json # 协议文档
└── start-backend.sh         # 后端启动脚本
```

## 前端部署（Cloudflare Pages）

### 1. 准备文件
确保 `frontend/` 目录包含所有必要文件：
- `index.html` - 主页面
- `style.css` - 样式文件
- `script.js` - 脚本文件
- `config.json` - 配置文件
- `wrangler.toml` - Cloudflare配置
- `_redirects` - 重定向规则

### 2. 配置WebSocket地址
编辑 `frontend/config.json`：
```json
{
  "websocket": {
    "url": "wss://your-backend-domain.com/ws",
    "fallbackUrl": "ws://localhost:8080/ws"
  }
}
```

### 3. 部署到Cloudflare Pages
```bash
# 安装Wrangler CLI
npm install -g wrangler

# 登录Cloudflare
wrangler login

# 部署到Pages
wrangler pages deploy frontend/
```

### 4. 自定义域名（可选）
在Cloudflare Pages控制台中设置自定义域名。

## 后端部署

### 1. 本地开发
```bash
# 启动后端服务
./start-backend.sh
```

### 2. 服务器部署
```bash
# 编译后端
cd backend
go build -o web-tools-backend main.go

# 运行后端
./web-tools-backend
```

### 3. Docker部署
创建 `backend/Dockerfile`：
```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download
RUN go build -o web-tools-backend main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/web-tools-backend .
COPY --from=builder /app/config.json .
COPY --from=builder /app/websocket-protocol.json .
EXPOSE 8080
CMD ["./web-tools-backend"]
```

构建和运行：
```bash
cd backend
docker build -t web-tools-backend .
docker run -p 8080:8080 web-tools-backend
```

### 4. 云服务器部署
推荐使用以下平台：
- **Railway**: 简单易用，支持Go
- **Heroku**: 成熟平台，支持Go
- **DigitalOcean App Platform**: 性价比高
- **AWS EC2**: 完全控制
- **Google Cloud Run**: 无服务器

## 配置说明

### 前端配置 (frontend/config.json)
```json
{
  "websocket": {
    "url": "wss://your-backend-domain.com/ws",
    "fallbackUrl": "ws://localhost:8080/ws",
    "reconnectInterval": 3000,
    "maxReconnectAttempts": 5
  },
  "api": {
    "baseUrl": "https://your-backend-domain.com",
    "fallbackUrl": "http://localhost:8080"
  },
  "features": {
    "enableEncryption": true,
    "enableReconnect": true,
    "enableLogging": false
  }
}
```

### 后端配置 (backend/config.json)
```json
{
  "server": {
    "port": ":8080",
    "host": "0.0.0.0"
  },
  "websocket": {
    "path": "/ws",
    "maxConnections": 1000,
    "readBufferSize": 1024,
    "writeBufferSize": 1024
  },
  "cors": {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "POST", "OPTIONS"],
    "allowedHeaders": ["Content-Type", "Authorization"]
  },
  "logging": {
    "level": "info",
    "enableConsole": true,
    "enableFile": false
  }
}
```

## 环境变量

### 后端环境变量
- `PORT`: 服务器端口（默认8080）
- `HOST`: 服务器地址（默认0.0.0.0）
- `LOG_LEVEL`: 日志级别（默认info）

### 前端环境变量
- `VITE_WS_URL`: WebSocket地址
- `VITE_API_URL`: API地址

## 监控和维护

### 健康检查
- 后端健康检查: `GET /health`
- API信息: `GET /api/info`
- 协议文档: `GET /api/protocol`

### 日志监控
后端支持结构化日志，可以集成到日志收集系统：
- ELK Stack
- Grafana + Loki
- CloudWatch
- Datadog

### 性能优化
1. **前端优化**:
   - 启用Gzip压缩
   - 使用CDN加速
   - 图片优化
   - 代码分割

2. **后端优化**:
   - 连接池管理
   - 内存优化
   - 并发控制
   - 缓存策略

## 故障排除

### 常见问题
1. **WebSocket连接失败**: 检查CORS配置和防火墙设置
2. **静态资源加载失败**: 检查Cloudflare Pages配置
3. **跨域问题**: 确保后端CORS配置正确

### 调试工具
- 浏览器开发者工具
- WebSocket测试工具
- 网络抓包工具
- 日志分析工具

## 安全考虑

1. **HTTPS/WSS**: 生产环境必须使用加密连接
2. **CORS配置**: 限制允许的源域名
3. **速率限制**: 防止滥用
4. **输入验证**: 验证所有输入数据
5. **错误处理**: 避免泄露敏感信息
