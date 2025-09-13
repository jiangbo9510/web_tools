#!/bin/bash

echo "启动后端服务器..."

# 检查Go是否安装
if ! command -v go &> /dev/null; then
    echo "错误: 未找到Go，请先安装Go"
    exit 1
fi

# 进入后端目录
cd backend

# 下载依赖
echo "下载Go依赖..."
go mod tidy

# 启动服务器
echo "启动服务器..."
go run main.go
