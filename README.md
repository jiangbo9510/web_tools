# Web Tools - 跨端加密复制工具

基于WebSocket的跨端加密复制工具，支持密钥加密传输，多客户端实时同步。

## 功能特性

- 🔐 AES加密传输
- 🌐 WebSocket实时通信
- 📱 跨端复制支持
- 🔑 密钥管理
- 🔄 自动重连
- 🌍 多语言支持

## 快速开始

### 启动服务
```bash
./start.sh
```

### 访问地址
- 复制工具: http://localhost:3000/copy/
- 后端API: http://localhost:8080/health

## 使用方法

1. 打开复制工具页面
2. 输入密钥（仅限字母和数字）
3. 点击"设置密钥"
4. 等待连接成功
5. 发送和接收加密消息

## 技术栈

- **后端**: Go + Gorilla WebSocket
- **前端**: HTML5 + JavaScript + CryptoJS
- **通信**: WebSocket + JSON
- **加密**: AES-256

## 配置

### 后端配置 (`backend/config.json`)
```json
{
  "server": {
    "port": "8080",
    "host": "0.0.0.0"
  },
  "websocket": {
    "path": "/ws",
    "maxConnections": 1000
  }
}
```

### 前端配置 (`frontend/config.json`)
```json
{
  "copy": {
    "backendDomain": "localhost:8080",
    "websocketPath": "/ws"
  }
}
```

## 停止服务

按 `Ctrl+C` 停止所有服务。