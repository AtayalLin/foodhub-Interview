# AGENTS.md

給 AI 開發工具（Claude Code、Codex、Cursor 等）的專案說明。開始任何修改前先讀完本文件。回覆使用繁體中文。

## 專案

FoodHub 美食外送：Nuxt 4 全端（頁面在 `app/`，API 在 `server/api/`），Nitro + SQLite（Node 內建 `node:sqlite`）+ Pinia + Vuetify + TypeScript。Node.js ≥ 22.21 或 ≥ 24.11。

- 審查紀錄：`CODE_REVIEW.md`；購物車合併設計：`DESIGN.md`。改到相關程式前先讀對應段落。
- 預設帳號：`amy@foodhub.test`、`bob@foodhub.test`，密碼 `password123`。

## 指令

```bash
npm run dev                 # 開發（不需 .env）
npm test                    # Vitest：API、安全、併發（test/e2e、test/unit）
npm run test:browser        # Playwright：瀏覽器、SSR、hydration（test/browser）
npx playwright test --ui    # UI 模式
docker compose up --build   # 需先 cp .env.example .env

# 型別檢查（不需安裝，npx 臨時執行）
npx --package=vue-tsc --package=typescript vue-tsc -b --noEmit                    # app/、server/
npx --package=vue-tsc --package=typescript vue-tsc -p test/tsconfig.json --noEmit # test/
```

- 測試會先 build 正式版，再用**暫存 SQLite** 啟動 server，不會動到 `.data/foodhub.db`。
- 只改測試時加 `TEST_SKIP_BUILD=1` / `PW_SKIP_BUILD=1`；UI 模式開著時用 `PW_PORT=3101`。
- Windows：執行 Playwright 時**不要把輸出 pipe 給 `head`**，提前關閉輸出會讓 Playwright 中斷，留下佔用 port 3100 的 server。請把輸出導到檔案再 grep。
- Windows：repo 一律使用 LF。用腳本（例如 Python）改寫檔案時要以二進位或 `newline='\n'` 寫入，否則會變成 CRLF，整份檔案在 diff 裡都會顯示為修改。用 `git ls-files --eol` 確認。

## 工作方式

1. **先寫會失敗的測試**證明問題或描述新行為 → 實作 → 同一個測試轉為通過。
2. **範圍控制**：每個改動都要能對應到一個需求或問題。不順手加驗證、不預先寫「之後會用到」的程式、不做無關的重構或優化。完成後用 `git diff` 檢查範圍。
3. **在既有架構內修改**：沿用現有的檔案位置與 Nuxt 慣例（`server/utils/`、`server/plugins/`、`app/plugins/*.client.ts` 由 Nuxt 自動載入）。
4. **錯誤或過時的註解保留原文**，在下一行接 `↑ 更正：…` 說明實際情況。
5. **commit 小而獨立**，訊息採 Conventional Commits（`fix(scope): …`、`feat`、`test`、`docs`、`chore`），內文說明「原本的問題、後果、怎麼修」。
6. 驗證要有證據：實際請求、測試結果、瀏覽器畫面。驗證「沒有警告」這類測試時，要先故意製造問題，確認測試抓得到。

## 不能破壞的規則

| 規則 | 位置 / 原因 |
|---|---|
| 使用者身分只能來自 `getSessionUser(event)`，不能採用 body 或 query 的 `userId` | CODE_REVIEW C3–C5 |
| 價格、品名一律以資料庫為準；前端送的價格只用來比對，不一致時回 `409 PRICE_CHANGED` | `server/api/orders.post.ts`、C6 |
| 扣庫存用條件式 `UPDATE … WHERE stock >= ?`；讀和寫之間不能有 `await` | H2 |
| 多步驟寫入包在 `BEGIN IMMEDIATE … COMMIT`，失敗 rollback 並把錯誤拋出，不能回假的 `{ ok: true }` | H3 |
| JWT 密鑰在 private `runtimeConfig.jwtSecret`（`NUXT_JWT_SECRET`），絕不能放 `public` | C1 |
| 會在 SSR 執行到的程式不可用 module 層級的可變狀態，共用狀態用 `useState` 或 Pinia | C7 |
| 店家 HTML（`intro`）在 API 輸出時以 `sanitizeIntro()` 白名單清理 | H1 |
| 購物車：已登入時 server 為準；localStorage 只放訪客購物車；hydration 完成後才讀（`app/plugins/cart.client.ts`） | H4、DESIGN.md |
| 共用商業規則放 `server/utils/order-rules.ts`（`MAX_QTY_PER_ITEM`、`maxQtyFor`、`roundMoney`） | — |
| `server/db/seed.ts` 裡 Spice Route 的惡意 HTML 是測試案例，**刻意保留** | H1 |
| 不改 schema（新增欄位或資料表前先討論） | — |

## 新功能的檢查清單

- [ ] 需求與範圍說清楚，必要時先寫簡短設計
- [ ] 先寫失敗的測試（API → `test/e2e`，畫面 → `test/browser`）
- [ ] 實作只動必要的檔案
- [ ] `npm test` 與 `npm run test:browser` 全部通過
- [ ] `git diff` 範圍檢查
- [ ] 如果啟動方式或 API 有變動，更新 README / 文件
