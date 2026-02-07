@echo off
echo 正在启动剪映草稿导入工具...
echo.

echo 1. 安装依赖包...
call npm install

echo.
echo 2. 启动后端服务...
start "后端服务" cmd /k "npm run server"

echo.
echo 3. 等待3秒后启动前端应用...
timeout /t 3 /nobreak >nul

echo.
echo 4. 启动前端应用...
start "前端应用" cmd /k "npm run dev"

echo.
echo 启动完成！
echo 后端服务: http://localhost:3001
echo 前端应用: 将在Electron中打开
echo.
echo 请确保已配置微信公众号信息
pause


