@echo off
cd /d "%~dp0"
echo 正在启动本地预览服务器...
echo 请在浏览器打开: http://localhost:8000
echo 按 Ctrl+C 关闭服务器
where python >nul 2>nul
if not errorlevel 1 (
  python -m http.server 8000
  goto :eof
)
where npx >nul 2>nul
if not errorlevel 1 (
  npx --yes http-server -p 8000
  goto :eof
)
echo [错误] 未检测到 Python 或 Node.js，无法启动本地服务器。
echo 请安装 Python (https://www.python.org/downloads/) 后重试。
pause
