#!/bin/bash

# Web Tools 启动脚本

echo "启动 Web Tools 服务..."

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "错误: 未找到Go，请先安装Go 1.21或更高版本"
    exit 1
fi

# 检查Python是否安装（用于前端服务器）
if ! command -v python3 &> /dev/null; then
    echo "警告: 未找到Python3，将无法启动前端服务器"
fi

# 进入后端目录
cd backend

# 检查go.mod是否存在
if [ ! -f "go.mod" ]; then
    echo "错误: 未找到go.mod文件"
    exit 1
fi

# 下载依赖
echo "下载Go依赖..."
go mod tidy

# 启动后端服务（后台运行）
echo "启动后端服务在端口8080..."
go run main.go &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 检查后端是否启动成功
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "错误: 后端服务启动失败"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "后端服务启动成功！"

# 回到根目录
cd ..

# 启动前端服务器
echo "启动前端服务器在端口3000..."
if command -v python3 &> /dev/null; then
    cd frontend
    python3 -m http.server 3000 &
    FRONTEND_PID=$!
    echo "前端服务器启动成功！"
    echo ""
    echo "服务访问地址:"
    echo "  前端页面: http://localhost:3000"
    echo "  复制工具: http://localhost:3000/copy/"
    echo "  连接测试: http://localhost:3000/test-connection.html"
    echo "  后端API: http://localhost:8080/health"
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
    wait
else
    echo "前端服务器启动失败，请手动启动前端服务器"
    echo "在frontend目录下运行: python3 -m http.server 3000"
    echo ""
    echo "按 Ctrl+C 停止后端服务"
    wait $BACKEND_PID
fi
