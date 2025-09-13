# Web Tools 项目

这是一个包含多个Web工具的集合项目。

## 项目结构

```
web-tools/
├── split_pic_web/          # 图片切分工具前端
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── wrangler.jsonc
├── copy_web/               # 安全文本传输工具前端
│   ├── index.html
│   ├── script.js
│   └── style.css
├── copy_back/              # 安全文本传输工具后端
│   ├── main.go
│   └── go.mod
└── start.sh               # 启动脚本
```

## 功能说明

### 1. 图片切分工具 (/pic)
- 支持1x1到5x5任意网格切分
- 中英双语支持
- ZIP批量下载
- 实时预览

### 2. 安全文本传输工具 (/copy)
- 基于WebSocket的实时通信
- 密钥加密传输
- 多客户端消息转发
- 安全可靠

## 快速开始

### 前置要求
- Go 1.21 或更高版本
- 现代浏览器

### 启动服务

1. 克隆项目到本地
2. 运行启动脚本：
   ```bash
   ./start.sh
   ```

3. 访问应用：
   - 主页面: http://localhost:8080
   - 图片切分工具: http://localhost:8080/pic/
   - 安全文本传输: http://localhost:8080/copy/

### 测试路由

如果遇到路由问题，可以运行测试脚本：
```bash
./test_server.sh
```

或者访问测试页面：
- 路由测试: http://localhost:8080/test

### 手动启动

如果需要手动启动后端服务：

```bash
cd copy_back
go mod tidy
go run main.go
```

## 安全文本传输工具使用说明

### 1. 设置密钥
- 输入密钥（仅限大小写字母和数字）
- 密钥设置后不可编辑，只能全部删除后重新输入
- 密钥会自动生成MD5哈希用于标识连接

### 2. 建立连接
- 设置密钥后自动连接WebSocket服务器
- 连接状态会实时显示
- 支持自动重连

### 3. 发送消息
- 在文本框中输入要传输的内容
- 消息会使用密钥进行AES加密
- 支持Ctrl+Enter快捷键发送

### 4. 接收消息
- 相同密钥的所有客户端会收到加密消息
- 消息会自动解密并显示
- 支持多客户端同时在线

## 技术栈

### 前端
- HTML5 + CSS3 + JavaScript
- CryptoJS (AES加密)
- WebSocket API

### 后端
- Go 1.21
- Gorilla WebSocket
- 并发安全的连接管理

## 安全特性

- 所有消息使用AES加密传输
- 密钥不存储在服务器端
- 基于MD5哈希的客户端分组
- 支持多客户端安全通信

## 开发说明

### 添加新工具
1. 在根目录创建新的前端目录
2. 在`copy_back/main.go`中添加对应的路由
3. 更新README文档

### 自定义端口
修改`copy_back/main.go`中的端口号：
```go
port := ":8080"  // 修改为所需端口
```

## 许可证

MIT License
