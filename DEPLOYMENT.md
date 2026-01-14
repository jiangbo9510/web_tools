# Nginx 配置部署指南

本指南将帮助您完成 Web Tools 项目的 Nginx 配置和 HTTPS 部署。

## 📋 前置要求

- 已有服务器并安装 Nginx
- 已有域名并配置好 DNS 解析
- 已购买或准备申请 SSL 证书

## 🔧 配置步骤

### 1. 修改配置文件中的路径

打开 `nginx.conf`，替换以下内容：

#### 域名（3处）
```nginx
# 将 yourdomain.com 替换为您的实际域名
server_name yourdomain.com pic.yourdomain.com copy.yourdomain.com;
```

#### SSL 证书路径（3处）
```nginx
# 替换为您的证书文件实际路径
ssl_certificate /etc/nginx/ssl/yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/yourdomain.com/privkey.pem;
ssl_trusted_certificate /etc/nginx/ssl/yourdomain.com/chain.pem;
```

#### 前端静态资源路径（1处）
```nginx
# 替换为您的项目实际路径
root /var/www/web_tools/frontend/dist;
```

#### 后端服务地址（1处，可选）
```nginx
# 如果后端不在 127.0.0.1:8080，请修改
proxy_pass http://127.0.0.1:8080/;
```

### 2. SSL 证书获取（二选一）

#### 方案 A：使用 Let's Encrypt（免费，推荐）

```bash
# 安装 certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 自动申请证书（会自动修改 Nginx 配置）
sudo certbot --nginx -d yourdomain.com -d pic.yourdomain.com -d copy.yourdomain.com

# 或手动申请证书
sudo certbot certonly --webroot -w /var/www/certbot \
  -d yourdomain.com \
  -d pic.yourdomain.com \
  -d copy.yourdomain.com

# 证书路径通常为：
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
# /etc/letsencrypt/live/yourdomain.com/chain.pem
```

**Let's Encrypt 自动续期**
```bash
# 测试续期
sudo certbot renew --dry-run

# 添加定时任务（每天检查一次）
sudo crontab -e
# 添加以下行
0 3 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

#### 方案 B：使用购买的 SSL 证书

1. 从证书提供商下载证书文件
2. 创建证书目录并上传文件：

```bash
# 创建证书目录
sudo mkdir -p /etc/nginx/ssl/yourdomain.com

# 上传证书文件到服务器
# fullchain.pem - 完整证书链
# privkey.pem - 私钥
# chain.pem - 中间证书（可选）

# 设置正确的权限
sudo chmod 644 /etc/nginx/ssl/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/nginx/ssl/yourdomain.com/privkey.pem
```

### 3. 部署前端项目

```bash
# 创建项目目录
sudo mkdir -p /var/www/web_tools/frontend

# 上传构建后的 dist 目录到服务器
# 方法 1: 使用 rsync
rsync -avz --delete frontend/dist/ user@your-server:/var/www/web_tools/frontend/dist/

# 方法 2: 使用 scp
scp -r frontend/dist/* user@your-server:/var/www/web_tools/frontend/dist/

# 方法 3: 在服务器上直接构建
cd /var/www/web_tools/frontend
npm install --legacy-peer-deps
npm run build

# 设置正确的权限
sudo chown -R www-data:www-data /var/www/web_tools
sudo chmod -R 755 /var/www/web_tools
```

### 4. 配置 Nginx

```bash
# 备份原配置
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# 复制新配置（方法 1：替换主配置）
sudo cp nginx.conf /etc/nginx/nginx.conf

# 或者（方法 2：使用 sites-available，推荐）
sudo cp nginx.conf /etc/nginx/sites-available/web_tools
sudo ln -s /etc/nginx/sites-available/web_tools /etc/nginx/sites-enabled/

# 如果使用方法 2，记得删除默认配置
sudo rm /etc/nginx/sites-enabled/default

# 创建日志目录
sudo mkdir -p /var/log/nginx

# 测试配置文件语法
sudo nginx -t

# 如果测试通过，重新加载 Nginx
sudo systemctl reload nginx

# 或者重启 Nginx
sudo systemctl restart nginx
```

### 5. 启动后端服务

```bash
# 进入后端目录
cd /var/www/web_tools/backend

# 构建 Go 程序
go build -o web_tools_backend main.go

# 使用 systemd 管理后端服务（推荐）
sudo nano /etc/systemd/system/web_tools_backend.service
```

创建 systemd 服务文件：

```ini
[Unit]
Description=Web Tools Backend Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/web_tools/backend
ExecStart=/var/www/web_tools/backend/web_tools_backend
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start web_tools_backend

# 设置开机自启
sudo systemctl enable web_tools_backend

# 查看服务状态
sudo systemctl status web_tools_backend
```

### 6. DNS 配置

在您的域名服务商处添加以下 DNS 记录：

| 类型 | 主机记录 | 记录值 | TTL |
|------|---------|--------|-----|
| A    | @       | 服务器IP | 600 |
| A    | pic     | 服务器IP | 600 |
| A    | copy    | 服务器IP | 600 |

或者使用 CNAME（如果主域名已有 A 记录）：

| 类型  | 主机记录 | 记录值 | TTL |
|-------|---------|--------|-----|
| CNAME | pic     | yourdomain.com | 600 |
| CNAME | copy    | yourdomain.com | 600 |

### 7. 防火墙配置

```bash
# 允许 HTTP 和 HTTPS 流量
sudo ufw allow 'Nginx Full'

# 或者手动开放端口
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 查看防火墙状态
sudo ufw status
```

## 🧪 测试部署

### 1. 测试 HTTPS 访问

```bash
# 测试主域名
curl -I https://yourdomain.com

# 测试子域名
curl -I https://pic.yourdomain.com
curl -I https://copy.yourdomain.com

# 测试 HTTP 重定向
curl -I http://yourdomain.com
# 应该返回 301 重定向到 HTTPS
```

### 2. 测试 WebSocket 连接

在浏览器控制台测试：

```javascript
// 测试 WebSocket 连接
const ws = new WebSocket('wss://yourdomain.com/api/ws');
ws.onopen = () => console.log('WebSocket 连接成功');
ws.onerror = (error) => console.error('WebSocket 错误:', error);
```

### 3. 检查 SSL 配置

使用 SSL Labs 测试：
```
https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com
```

## 🔍 故障排查

### Nginx 无法启动

```bash
# 查看详细错误信息
sudo nginx -t
sudo journalctl -xe
sudo tail -f /var/log/nginx/error.log
```

### SSL 证书错误

```bash
# 检查证书文件是否存在
ls -la /etc/nginx/ssl/yourdomain.com/
ls -la /etc/letsencrypt/live/yourdomain.com/

# 检查证书有效期
sudo openssl x509 -in /etc/nginx/ssl/yourdomain.com/fullchain.pem -text -noout | grep "Not After"

# 验证证书和私钥匹配
sudo openssl x509 -noout -modulus -in /etc/nginx/ssl/yourdomain.com/fullchain.pem | openssl md5
sudo openssl rsa -noout -modulus -in /etc/nginx/ssl/yourdomain.com/privkey.pem | openssl md5
# 两个 MD5 值应该相同
```

### WebSocket 连接失败

```bash
# 检查后端服务是否运行
sudo systemctl status web_tools_backend
sudo netstat -tlnp | grep 8080

# 检查 Nginx 代理日志
sudo tail -f /var/log/nginx/web_tools_access.log
sudo tail -f /var/log/nginx/web_tools_error.log
```

### 静态资源 404

```bash
# 检查文件路径和权限
ls -la /var/www/web_tools/frontend/dist/
sudo chown -R www-data:www-data /var/www/web_tools
sudo chmod -R 755 /var/www/web_tools
```

## 📊 监控和维护

### 日志管理

```bash
# 查看访问日志
sudo tail -f /var/log/nginx/web_tools_access.log

# 查看错误日志
sudo tail -f /var/log/nginx/web_tools_error.log

# 日志轮转配置
sudo nano /etc/logrotate.d/nginx
```

### 性能监控

```bash
# 查看 Nginx 状态
sudo systemctl status nginx

# 查看活动连接数
sudo netstat -an | grep :443 | wc -l

# 查看后端服务资源占用
sudo ps aux | grep web_tools_backend
```

## 🔄 更新部署

```bash
# 1. 更新前端
cd /var/www/web_tools/frontend
git pull  # 或者上传新文件
npm install --legacy-peer-deps
npm run build

# 2. 更新后端
cd /var/www/web_tools/backend
git pull  # 或者上传新文件
go build -o web_tools_backend main.go
sudo systemctl restart web_tools_backend

# 3. 重新加载 Nginx（如果配置有变化）
sudo nginx -t
sudo systemctl reload nginx
```

## 📞 常用命令速查

```bash
# Nginx 操作
sudo systemctl start nginx      # 启动
sudo systemctl stop nginx       # 停止
sudo systemctl restart nginx    # 重启
sudo systemctl reload nginx     # 重新加载配置
sudo systemctl status nginx     # 查看状态
sudo nginx -t                   # 测试配置

# 后端服务操作
sudo systemctl start web_tools_backend
sudo systemctl stop web_tools_backend
sudo systemctl restart web_tools_backend
sudo systemctl status web_tools_backend

# Let's Encrypt 证书
sudo certbot renew             # 续期证书
sudo certbot certificates      # 查看证书信息
```

## ✅ 验收清单

部署完成后，请确认以下各项：

- [ ] HTTPS 访问正常（主域名 + 2个子域名）
- [ ] HTTP 自动重定向到 HTTPS
- [ ] SSL 证书有效且评分 A+
- [ ] 图片切分工具功能正常
- [ ] 云剪贴板 WebSocket 连接成功
- [ ] 语言切换功能正常
- [ ] 所有页面 SEO meta 标签正确
- [ ] 静态资源缓存生效
- [ ] 后端服务稳定运行
- [ ] 日志记录正常
- [ ] 自动续期配置（Let's Encrypt）

---

**祝部署顺利！** 如遇问题，请检查日志文件或参考故障排查章节。
