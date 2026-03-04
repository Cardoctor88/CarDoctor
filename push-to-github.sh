#!/bin/bash
# GitHub 推送脚本 - 自动完成仓库初始化和推送

echo "=================================="
echo "  汽车维修资源库 - GitHub 推送"
echo "=================================="
echo ""

# 检查是否提供了 GitHub 用户名
if [ -z "$1" ]; then
    echo "用法: ./push-to-github.sh <你的GitHub用户名> [仓库名]"
    echo ""
    echo "示例:"
    echo "  ./push-to-github.sh john"
    echo "  ./push-to-github.sh john auto-repair-hub"
    echo ""
    exit 1
fi

GITHUB_USER=$1
REPO_NAME=${2:-"auto-repair-hub"}

echo "GitHub 用户名: $GITHUB_USER"
echo "仓库名称: $REPO_NAME"
echo ""

# 检查 git 是否安装
if ! command -v git &> /dev/null; then
    echo "❌ 错误: 未安装 Git"
    echo "请先安装 Git: https://git-scm.com/downloads"
    exit 1
fi

echo "✅ Git 已安装"

# 初始化 git 仓库
if [ ! -d ".git" ]; then
    echo ""
    echo "📦 初始化 Git 仓库..."
    git init
    git branch -m main
else
    echo "✅ Git 仓库已存在"
fi

# 添加所有文件
echo ""
echo "📋 添加文件到暂存区..."
git add .

# 提交
echo ""
echo "💾 提交更改..."
git commit -m "Initial commit: 汽车维修资源库 v1.0

- 前端网站（Cloudflare Pages）
- Worker 后端 API
- 54+ 汽车维修资源链接
- 收藏、搜索、预览功能
"

# 添加远程仓库
echo ""
echo "🔗 连接 GitHub 远程仓库..."
git remote remove origin 2>/dev/null
git remote add origin "https://github.com/$GITHUB_USER/$REPO_NAME.git"

# 推送
echo ""
echo "🚀 推送到 GitHub..."
echo "如果提示输入密码，请使用 GitHub Personal Access Token"
echo ""
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================="
    echo "  ✅ 推送成功！"
    echo "=================================="
    echo ""
    echo "仓库地址: https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "下一步:"
    echo "1. 登录 https://dash.cloudflare.com"
    echo "2. 进入 Pages → Create a project"
    echo "3. 选择 Connect to Git → 选择 $REPO_NAME 仓库"
    echo "4. 构建设置:"
    echo "   - Framework preset: None"
    echo "   - Build command: (留空)"
    echo "   - Build output directory: public"
    echo "5. 点击 Save and Deploy"
    echo ""
else
    echo ""
    echo "❌ 推送失败"
    echo ""
    echo "常见问题:"
    echo "1. 检查 GitHub 用户名是否正确"
    echo "2. 确保已在 GitHub 创建空仓库: https://github.com/new"
    echo "3. 检查网络连接"
    echo "4. 验证 GitHub 登录凭据"
    echo ""
    echo "手动创建仓库:"
    echo "  https://github.com/new"
    echo "  Repository name: $REPO_NAME"
    echo "  勾选 'Add a README file' (可选)"
    echo "  点击 Create repository"
    echo ""
fi
