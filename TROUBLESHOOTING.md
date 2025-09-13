# 故障排除指南

## 常见问题及解决方案

### 1. 路由问题 - 找不到 /pic 和 /copy 页面

**问题描述**：
- 访问 http://localhost:8080/pic/ 显示 404 错误
- 访问 http://localhost:8080/copy/ 显示 404 错误

**解决方案**：

1. **检查服务器是否正在运行**：
   ```bash
   # 检查端口是否被占用
   lsof -i :8080
   
   # 或者检查进程
   ps aux | grep "go run main.go"
   ```

2. **重新启动服务器**：
   ```bash
   # 停止当前服务器（如果有的话）
   pkill -f "go run main.go"
   
   # 重新启动
   ./start.sh
   ```

3. **检查文件路径**：
   确保以下文件存在：
   - `split_pic_web/index.html`
   - `copy_web/index.html`
   - `copy_back/main.go`

4. **运行路由测试**：
   ```bash
   # 运行自动测试
   ./test_server.sh
   
   # 或者手动测试
   curl http://localhost:8080/health
   curl http://localhost:8080/pic/
   curl http://localhost:8080/copy/
   ```

### 2. 端口被占用

**问题描述**：
- 服务器启动失败，提示端口 8080 已被占用

**解决方案**：

1. **查找占用端口的进程**：
   ```bash
   lsof -i :8080
   ```

2. **杀死占用端口的进程**：
   ```bash
   # 替换 PID 为实际的进程ID
   kill -9 PID
   ```

3. **或者修改端口**：
   编辑 `copy_back/main.go` 文件，修改端口号：
   ```go
   port := ":8081"  // 改为其他端口
   ```

### 3. 静态文件加载失败

**问题描述**：
- 页面可以访问，但CSS、JS文件加载失败
- 页面样式显示异常

**解决方案**：

1. **检查文件权限**：
   ```bash
   ls -la split_pic_web/
   ls -la copy_web/
   ```

2. **检查文件路径**：
   确保所有静态文件都在正确的目录中

3. **清除浏览器缓存**：
   - 按 Ctrl+F5 强制刷新
   - 或者清除浏览器缓存

### 4. WebSocket 连接失败

**问题描述**：
- 跨端加密复制工具无法连接
- 显示"未连接"状态

**解决方案**：

1. **检查 WebSocket 路由**：
   访问 http://localhost:8080/ws 应该返回 WebSocket 升级错误（这是正常的）

2. **检查防火墙设置**：
   确保端口 8080 没有被防火墙阻止

3. **检查浏览器控制台**：
   打开浏览器开发者工具，查看控制台错误信息

### 5. 编译错误

**问题描述**：
- Go 代码编译失败
- 依赖包下载失败

**解决方案**：

1. **检查 Go 版本**：
   ```bash
   go version
   # 需要 Go 1.21 或更高版本
   ```

2. **更新依赖**：
   ```bash
   cd copy_back
   go mod tidy
   go mod download
   ```

3. **清理模块缓存**：
   ```bash
   go clean -modcache
   go mod download
   ```

### 6. 权限问题

**问题描述**：
- 无法执行启动脚本
- 文件访问被拒绝

**解决方案**：

1. **添加执行权限**：
   ```bash
   chmod +x start.sh
   chmod +x test_server.sh
   ```

2. **检查文件所有者**：
   ```bash
   ls -la *.sh
   ```

## 调试技巧

### 1. 启用详细日志

修改 `copy_back/main.go` 添加详细日志：
```go
log.SetFlags(log.LstdFlags | log.Lshortfile)
```

### 2. 检查网络连接

```bash
# 测试本地连接
telnet localhost 8080

# 测试 HTTP 响应
curl -v http://localhost:8080/
```

### 3. 浏览器调试

1. 打开浏览器开发者工具（F12）
2. 查看 Network 标签页
3. 检查请求和响应状态
4. 查看 Console 标签页的错误信息

### 4. 服务器日志

启动服务器后，查看控制台输出：
```bash
./start.sh
# 观察启动日志和错误信息
```

## 联系支持

如果以上解决方案都无法解决问题，请：

1. 收集错误信息（控制台输出、浏览器错误等）
2. 检查系统环境（操作系统、Go版本、浏览器版本）
3. 提供复现步骤

## 预防措施

1. **定期更新依赖**：
   ```bash
   cd copy_back
   go get -u all
   go mod tidy
   ```

2. **备份重要文件**：
   定期备份项目文件

3. **使用版本控制**：
   使用 Git 管理代码版本

4. **测试环境**：
   在部署前先在测试环境验证功能
