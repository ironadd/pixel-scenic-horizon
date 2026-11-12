@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================================
echo   山海晴岚 · 像素风景线 —— 一键发布至 GitHub Pages
echo ============================================================
echo.

where gh >nul 2>&1
if errorlevel 1 (
  echo [错误] 未检测到 GitHub CLI ^(gh^)，请确认已安装 GitHub CLI。
  pause
  exit /b 1
)

echo [1/4] 检查 GitHub 登录授权状态...
gh auth status >nul 2>&1
if errorlevel 1 (
  echo 当前 GitHub 登录令牌已过期或未授权，正在打开浏览器进行重新授权...
  gh auth login -h github.com -p https -w
  if errorlevel 1 (
    echo [错误] GitHub 授权未完成，已取消发布。
    pause
    exit /b 1
  )
)

echo [2/4] 创建并推送远程仓库 ironadd/pixel-scenic-horizon ...
gh repo view ironadd/pixel-scenic-horizon >nul 2>&1
if errorlevel 1 (
  gh repo create ironadd/pixel-scenic-horizon --public --source=. --remote=origin --push --description "山海晴岚 · Three.js 像素方块绝美风景线 (68万体素 / 跨海石拱铁道 / 像素海洋与四时天象)"
) else (
  git remote remove origin >nul 2>&1
  git remote add origin https://github.com/ironadd/pixel-scenic-horizon.git
  git push -u origin main
)

if errorlevel 1 (
  echo [错误] 推送代码至 GitHub 失败，请检查网络连接后重试。
  pause
  exit /b 1
)

echo [3/4] 开启 GitHub Pages ^(GitHub Actions 自动构建部署^)...
gh api -X POST repos/ironadd/pixel-scenic-horizon/pages -f build_type=workflow >nul 2>&1
gh api -X PUT repos/ironadd/pixel-scenic-horizon/pages -f build_type=workflow >nul 2>&1
gh workflow run "Deploy to GitHub Pages" --repo ironadd/pixel-scenic-horizon >nul 2>&1

echo [4/4] 发布完成！
echo ============================================================
echo   GitHub 仓库地址:
echo   https://github.com/ironadd/pixel-scenic-horizon
echo.
echo   GitHub Pages 在线预览地址 ^(Actions 构建约需 45 秒生效^):
echo   https://ironadd.github.io/pixel-scenic-horizon/
echo ============================================================
echo.
start "" "https://github.com/ironadd/pixel-scenic-horizon/actions"
pause
