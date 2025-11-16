#!/bin/bash

# 发布脚本 - 将 dev 分支合并到 main 并推送
# 使用方法: bash release.sh

set -e  # 遇到错误立即退出

echo "======================================"
echo "SmartAPI 发布流程"
echo "======================================"

# 1. 检查当前是否有未提交的修改
echo ""
echo "[1/6] 检查工作区状态..."
if [[ -n $(git status -s) ]]; then
    echo "❌ 错误：工作区有未提交的修改"
    echo "请先提交或储藏您的修改："
    echo "  git add ."
    echo "  git commit -m \"你的提交信息\""
    exit 1
fi
echo "✓ 工作区干净"

# 2. 切换到 dev 分支并拉取最新代码
echo ""
echo "[2/6] 更新 dev 分支..."
git checkout dev
git pull origin dev
echo "✓ dev 分支已更新"

# 3. 切换到 main 分支并拉取最新代码
echo ""
echo "[3/6] 更新 main 分支..."
git checkout main
git pull origin main
echo "✓ main 分支已更新"

# 4. 合并 dev 到 main
echo ""
echo "[4/6] 合并 dev 到 main..."
if git merge dev --no-edit; then
    echo "✓ 合并成功"
else
    echo "❌ 合并失败，请手动解决冲突后再继续"
    echo "解决冲突后执行："
    echo "  git add ."
    echo "  git commit"
    echo "  git push origin main"
    exit 1
fi

# 5. 推送到远程仓库
echo ""
echo "[5/6] 推送到 GitHub..."
git push origin main
echo "✓ main 分支已推送到远程仓库"

# 6. 切换回 dev 分支
echo ""
echo "[6/6] 切换回 dev 分支..."
git checkout dev
echo "✓ 已切换回 dev 分支"

echo ""
echo "======================================"
echo "✅ 发布完成！"
echo ""
echo "接下来可以执行部署："
echo "  bash deploy.sh"
echo "======================================"
