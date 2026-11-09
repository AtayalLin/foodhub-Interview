# FoodHub 美食外送

美食外送平台的前台，包含餐廳列表、菜單、餐點篩選、購物車與下單。

前後端都在這個 Nuxt 專案裡：頁面在 `app/`，API 在 `server/api/`，資料存在 SQLite。

## 技術棧

- Nuxt 4 + Nitro
- Pinia
- Vuetify
- SQLite（Node 內建 `node:sqlite`，不需要另外安裝資料庫）

## 啟動

需要 Node.js 22.21+ 或 24.11+。

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

或使用 Docker：

```bash
docker compose up --build
```

第一次啟動會自動建立 `.data/foodhub.db` 並寫入範例資料。想重置資料，刪除 `.data/` 後重新啟動即可。

## 測試帳號

| Email | 密碼 |
|-------|------|
| amy@foodhub.test | password123 |
| bob@foodhub.test | password123 |

## 專案結構

```
app/
  pages/            首頁、找餐點（篩選）、菜單、登入、訂單
  components/       ProductCard、CartDrawer、AppHeader ...
  stores/           auth、cart、menu、order
  composables/
  middleware/
server/
  api/              REST API
  db/seed.ts        資料表與範例資料
  utils/            db、auth
shared/types/       前後端共用型別
```

## 交接備註

- 基本功能都完成了，購物車、下單、訂單查詢都可以正常使用
- 安全性方面：密碼有 hash、API 都有檢查登入、SQL 都用 prepared statement
- 購物車未登入時存在 localStorage，登入後會同步到 server
- **尚未完成**：登入後合併購物車（目前登入後會直接以帳號的購物車為主，見 `app/stores/auth.ts` 的 TODO）
