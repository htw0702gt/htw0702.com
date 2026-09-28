# htw0702aov 搬移後的手動設定

GitHub 主分支包含公開頁面、122 筆對戰的靜態備份、完整資料編輯頁 `/admin` 及伺服器登入驗證。密碼和資料庫連線不保存在 GitHub。

目前正式網站使用 Cloudflare Worker `htw0702-com`；`wrangler.pages.jsonc` 是另備的 Pages 設定。請選擇現有 Worker 專案，不要建立同名的 Pages 專案或變更網域。

1. 在 Cloudflare 確認現有 Worker 綁定的 D1 資料庫名稱為 `DB`。先備份該 D1。執行 `migrations/0002_aov_login.sql`：在 D1 的 Console 貼上該檔 SQL 執行即可。若 `migrations/0001.sql` 尚未建立 `sessions` 和 `sync_state`，先執行 0001。
2. 在自己的 Mac 終端機、此 GitHub 專案目錄執行 `node scripts/hash-aov-password.mjs`，依提示輸入目前 `admin.moohsia.com` 的密碼。不要將原密碼或輸出的雜湊貼到 GitHub、聊天或公開變數。
3. 在現有 Cloudflare Worker `htw0702-com` 的 **Settings → Variables and Secrets** 新增 **Secret** `AOV_ADMIN_PASSWORD_HASH`，值填上剛產生的完整 `pbkdf2-sha256$...`。Secret 必須套用到服務 `htw0702-com` 的正式環境。帳號固定為 `htw0702`。
4. 讓 Cloudflare 從 GitHub `htw0702tw/htw0702.com` 的 `main` 分支部署最新版。若採用手動部署，需先確認該 Worker 的 `DB` 綁定、其他既有變數和路由沒有被覆蓋，再部署。不要把 D1 ID、密碼或 Token 加進 GitHub。
5. 檢查 `https://htw0702.com/api/aov` 的 `matches` 數量至少為 122，開啟 `https://htw0702.com/games/aov/htw0702aov` 核對圖表與逐場資料；在 `https://htw0702.com/admin` 用原帳密登入，修改一筆測試資料後儲存，再檢查公開頁面。如果任何步驟失敗，保留原有部署並回報錯誤畫面，不要刪除 D1。

`/tw/admin` 是網站原有的 Apple 登入管理頁；新的傳說對決後台只在 `/admin`。兩者登入流程互不影響。對戰資料儲存在既有 D1 `sync_state`，靜態備份會在讀取時補回舊版 D1 缺少的對戰。
