#!/bin/bash

# 遇到错误立即停止脚本 (非常重要，防止构建失败却删除了线上代码)
set -e

# 定义变量
FRONTEND_DIR="./frontend"
BACKEND_DIR="./backend"
TARGET_DIR="/var/www/dist"
NGINX_CONF="/etc/nginx/nginx.conf"

# 检查是否以 root 权限运行 (因为需要操作 /var/www 和 nginx 进程)
if [ "$EUID" -ne 0 ]; then
  echo "❌ 请使用 sudo 运行此脚本"
  exit 1
fi

echo "🚀 [1/6] 开始构建前端项目..."
# 进入前端目录
cd "$FRONTEND_DIR"

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm 命令"
    exit 1
fi

# 执行构建
npm run build

# 检查 dist 目录是否生成
if [ ! -d "dist" ]; then
    echo "❌ 错误: 构建完成后未发现 dist 目录"
    exit 1
fi

echo "📦 [2/6] 部署文件到 $TARGET_DIR ..."
# 确保目标父目录存在
mkdir -p /var/www

# 删除旧的 dist 目录 (如果存在)
rm -rf "$TARGET_DIR"

# 将新的 dist 目录移动/复制过去
# 注意：这里使用 cp -r 复制，保留源文件以便排查问题
cp -r dist "$TARGET_DIR"

echo "👤 [3/6] 修改文件权限为 nginx ..."
# 修改所有者
chown -R nginx:nginx "$TARGET_DIR"

echo "🔧 [4/6] 启动后端服务..."
# 返回项目根目录
cd ..

# 进入后端目录
cd "$BACKEND_DIR"

# 检查 go 是否安装
if ! command -v go &> /dev/null; then
    echo "⚠️  警告: 未找到 go 命令，跳过后端服务启动"
else
    # 停止旧的后端进程
    pkill -f "go run main.go" || true
    pkill -f "./backend" || true

    # 编译并启动后端服务 (后台运行)
    echo "   编译后端服务..."
    go build -o backend main.go

    echo "   启动后端服务..."
    nohup ./backend > /var/log/backend.log 2>&1 &

    # 等待后端服务启动
    sleep 2

    # 检查后端是否启动成功
    if pgrep -f "./backend" > /dev/null; then
        echo "   ✅ 后端服务启动成功 (PID: $(pgrep -f "./backend"))"
    else
        echo "   ⚠️  后端服务可能启动失败，请查看 /var/log/backend.log"
    fi
fi

echo "🔄 [5/6] 重启 Nginx ..."
# 返回项目根目录
cd ..

# 杀掉旧进程
# 使用 || true 防止如果 nginx 本来没启动导致脚本报错退出
pkill nginx || true

# 等待 1 秒确保端口释放
sleep 1

# 启动新进程
nginx -c "$NGINX_CONF"

echo "✅ [6/6] 部署完成！"
echo ""
echo "📊 服务状态:"
echo "   - 前端: https://web-tools.work"
echo "   - 图片切分: https://pic.web-tools.work"
echo "   - 云剪贴板: https://copy.web-tools.work"
echo "   - 后端日志: /var/log/backend.log"
echo ""
