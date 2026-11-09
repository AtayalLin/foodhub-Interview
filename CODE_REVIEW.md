# CODE_REVIEW

FoodHub 上線前審查：發現的問題、修正內容、沒有修的項目與理由。

- **比對基準**：`4896717 chore: initial import`（未修改的原始專案）。下文所有「位置」的**行號都指原始檔案**。
- **審查方式**：逐檔閱讀 → 以實際請求或瀏覽器重現 → 先寫**會失敗的測試**證明問題存在（`c53391c`、`583b533`）→ 修正 → 同一個測試轉為通過。
- **修正原則**：依嚴重度排序；在既有架構內修改，不重寫；每個改動都要能對應到下表的某個問題。超出範圍的改動已另外 revert（見[範圍控制](#範圍控制)）。
- **結果**：修正 17 項（嚴重 7、高 4、中 1、低 5）；1 項中等級問題（M2）在第二部分重新設計時解決；判斷不需修改 6 項；留到之後 9 項。含第二部分在內，Vitest 44/44、Playwright 12/12 通過。

## 嚴重度定義

| 等級 | 定義 |
|---|---|
| 嚴重 | 不需特殊條件就能造成資料外洩、冒用身分或直接金錢損失 |
| 高 | 會造成資料錯誤、訂單錯誤或可執行任意程式，但需要特定條件（併發、店家內容） |
| 中 | 核心功能錯誤，但有替代路徑；或影響可控 |
| 低 | 體驗、穩健性或防禦縱深問題，沒有直接損害 |

---

## 問題總表

| # | 嚴重度 | 問題 | 位置（原始行號） | 狀態 |
|---|---|---|---|---|
| C1 | 嚴重 | JWT 簽章密鑰放在 `runtimeConfig.public`，送進每一頁 HTML，可偽造任何人的 token | `nuxt.config.ts:24-26`、`server/utils/auth.ts:11` | ✅ `1c6c112` |
| C2 | 嚴重 | 商品搜尋 SQL injection，不需登入就能撈出所有帳號與密碼 hash | `server/api/products.get.ts:4,6` | ✅ `366fac5` |
| C3 | 嚴重 | 訂單 IDOR：可讀取任何人的訂單（地址、電話） | `server/api/orders/[id].get.ts:9` | ✅ `69a2237` |
| C4 | 嚴重 | `PUT /api/cart` 採用 body 的 `userId`，可覆蓋任何人的購物車 | `server/api/cart.put.ts:12,15` | ✅ `69a2237` |
| C5 | 嚴重 | `POST /api/orders` 採用 body 的 `userId`，可冒用他人身分下單並取得對方地址電話 | `server/api/orders.post.ts:2,35,39` | ✅ `69a2237` |
| C6 | 嚴重 | 下單的單價、品名、總額直接採用前端傳來的值，可用 $0.01 下單 | `server/api/orders.post.ts:7-16,30,39,44` | ✅ `b56f098` |
| C7 | 嚴重 | SSR 時登入使用者狀態跨請求共用，匿名訪客看到別人的姓名與地址 | `app/composables/useCurrentUser.ts:1` | ✅ `016f57e` |
| H1 | 高 | Stored XSS：`sanitize()` 只移除 `<script>`，seed 中的 `<img onerror>` 會在菜單頁執行 | `app/utils/sanitize.ts:3`、`app/components/RestaurantIntro.vue:6-7`、`server/db/seed.ts:77` | ✅ `b7694e4` |
| H2 | 高 | 庫存檢查與扣除之間有 `await`，併發下單會超賣 | `server/api/orders.post.ts:46-54` | ✅ `b56f098` |
| H3 | 高 | 下單失敗一律回 `{ ok: true }`，畫面顯示成功、清空購物車，資料庫留下半筆訂單 | `server/api/orders.post.ts:37-44,58-62` | ✅ `b56f098` |
| H4 | 高 | 在菜單頁重新整理，訪客購物車被清空，下一次加入商品時永久遺失 | `app/stores/cart.ts:3-5` | ✅ `44bae3a` |
| M1 | 中 | 菜單頁點選分類，商品不會切換 | `app/pages/restaurants/[id]/menu.vue:10-13` | ✅ `67b47cb` |
| M2 | 中 | 購物車同步是不等待結果的整包 PUT：失敗無感、請求可能亂序 | `app/stores/cart.ts:56-65` | ✅ 第二部分 `be831eb`、`83022da` |
| L1 | 低 | 「找餐點」切回「預設排序」後順序回不去 | `app/pages/restaurants/index.vue:22-23` | ✅ `f38e18b` |
| L2 | 低 | Header 被 `<ClientOnly>` 包住，SSR 的 HTML 沒有 Header（只是把 hydration 問題藏起來） | `app/layouts/default.vue:3-6` | ✅ `59b8307` |
| L3 | 低 | 登入 API 收到空的 body 回 500 | `server/api/auth/login.post.ts:7` | ✅ `5f5b177` |
| L4 | 低 | 登入 cookie 沒有 `Secure` | `server/api/auth/login.post.ts:19` | ✅ `5f5b177` |
| L5 | 低 | 訂單金額浮點誤差（`17.400000000000002`） | `server/api/orders.post.ts:39`、`app/stores/order.ts:32` | ✅ `b56f098`（四捨五入；根本解見 D2） |

---

## 詳細說明

以下的重現步驟以 `npm run dev`（`http://localhost:3000`）為例；每一項也都有對應的自動化測試。

### C1 JWT 密鑰外洩，可偽造任何人的登入 token｜嚴重

- **位置**：`nuxt.config.ts:24-26`（`runtimeConfig.public.jwtSecret`）、`server/utils/auth.ts:11`
- **問題**：`runtimeConfig.public` 的內容會序列化進每一頁 SSR HTML 的 `window.__NUXT__.config`。旁邊的註解「放 public 才能在 server 和 client 都讀到」描述的是事實，但前端根本不需要這個密鑰。
- **後果**：任何人打開網頁原始碼就能拿到密鑰，自行簽出 `{ id: 2 }` 的 token，以 Bob 的身分登入、下單、讀取個資。
- **重現**：`curl -s localhost:3000 | grep -o 'jwtSecret:"[^"]*"'` → `jwtSecret:"foodhub-dev-secret-2024"`
- **嚴重度理由**：不需要任何帳號或條件，可冒用全站任一使用者。
- **修正**：改為 private 的 `runtimeConfig.jwtSecret`，正式環境由 `NUXT_JWT_SECRET` 提供；未設定時 server 拒絕啟動（`server/plugins/check-config.ts`）。如果沒有這個檢查，jose 遇到空密鑰會拋錯，而 `getSessionUser` 會吞掉錯誤：server 照常啟動，但所有人都無法登入，而且沒有任何錯誤訊息（已實測）。`npm run dev` 仍使用內建的開發值，不需設定。同步更新 `docker-compose.yml`、`.env.example`、README 啟動段落。舊密鑰簽出的 token 全部失效，這是刻意的。
- **測試**：`security.test.ts` › JWT secret（HTML 不含密鑰；用舊密鑰偽造的 token 無效）

### C2 商品搜尋 SQL injection｜嚴重

- **位置**：`server/api/products.get.ts:6`（註解在 `:4`）
- **問題**：註解寫「已使用 prepared statement」，但 `q` 是用字串樣板 `'%${q}%'` 直接串進 SQL，沒有參數化。
- **後果**：不需登入，就能用 UNION 撈出 `users` 資料表（email + 密碼 hash）；輸入單引號會直接 500。
- **重現**：`curl -sG localhost:3000/api/products --data-urlencode "q=zzz%' UNION SELECT id,1,email,password_hash,'','',0,0,0,0 FROM users --"` → 回應的 `category` 欄位是 email、`name` 欄位是密碼 hash
- **嚴重度理由**：匿名即可取得全站帳號與密碼 hash，可離線暴力破解。
- **修正**：`q` 改用 `?` 綁定，並跳脫 LIKE 萬用字元（`% _ \`），讓輸入只會被當成一般文字。query 參數重複出現時 h3 會給陣列，改成綁定參數後陣列會讓程式 500，所以一併轉為字串。
- **測試**：`security.test.ts` › GET /api/products 搜尋（注入、單引號、`%` 萬用字元、原本的搜尋與分類結果不變）

### C3 訂單 IDOR｜嚴重

- **位置**：`server/api/orders/[id].get.ts:9`
- **問題**：README 寫「API 都有檢查登入」，確實有檢查**是否登入**，但沒有檢查**是不是本人的訂單**。
- **後果**：任何登入者把網址的訂單編號換成其他數字，就能看到別人的地址、電話、訂購內容；編號是流水號，可以全部遍歷。
- **重現**：以 Amy 登入後 `GET /api/orders/2`（Bob 的訂單）→ 200，內含 Bob 的地址與電話
- **嚴重度理由**：任一註冊帳號即可大量取得他人個資。
- **修正**：查詢加上 `AND user_id = ?`（session 使用者）。別人的訂單回 404 而不是 403，不透露「這個編號存在」。
- **測試**：`security.test.ts` › GET /api/orders/:id 權限

### C4 可覆蓋任何人的購物車｜嚴重

- **位置**：`server/api/cart.put.ts:12,15`
- **問題**：購物車的擁有者取自 body 的 `userId`，不是 session。
- **後果**：任何登入者都能清空或竄改其他使用者的購物車。
- **重現**：以 Amy 登入，`PUT /api/cart` 送出 `{ "userId": 2, "items": [...] }` → Bob 的購物車被替換
- **嚴重度理由**：可任意修改他人資料，只需要一個帳號。
- **修正**：擁有者一律使用 `session.id`；前端不再送出 `userId`。
- **測試**：`security.test.ts` › PUT /api/cart 權限

### C5 冒用他人身分下單｜嚴重

- **位置**：`server/api/orders.post.ts:2,35,39`
- **問題**：訂單的 `user_id` 和外送地址、電話都依 body 的 `userId` 取得。
- **後果**：可以用別人的名義下單，訂單上還會帶出對方的地址與電話。
- **重現**：以 Amy 登入，`POST /api/orders` 送出 `{ "userId": 2, ... }` → 訂單的 `user_id` 是 2，地址是 Bob 的
- **嚴重度理由**：冒用身分並取得他人個資。
- **修正**：一律使用 `session.id`。
- **測試**：`security.test.ts` › POST /api/orders 信任邊界

### C6 價格由前端決定｜嚴重

- **位置**：`server/api/orders.post.ts:7-16`（`validateOrder`）、`:30`（註解「已於 server 端驗證訂單」）、`:39`（`body.total`）、`:44`（`item.name`、`item.unitPrice`）
- **問題**：`validateOrder` 只檢查「非空」與「數量是正整數」，商品是否存在、單價、品名、總額都直接寫入資料庫。
- **後果**：改 request 就能用 $0.01 買任何商品；訂單明細的品名也能任意竄改。
- **重現**：`POST /api/orders`，`items: [{ productId: 1, qty: 2, unitPrice: 0.01 }]`、`total: 0.02` → 訂單成立，總額 0.02
- **嚴重度理由**：直接造成金錢損失，不需要任何特殊條件。
- **修正**：
  - 品名與單價一律以資料庫為準；商品不存在回 400；單一商品上限 20 份（`MAX_QTY_PER_ITEM`），超過回 400。
  - 前端顯示的價格與目前售價不同（商品剛調價，或 request 遭竄改）時，**整單不成立**，回 `409 PRICE_CHANGED` 並附上目前售價。前端收到後會更新購物車價格，提示使用者確認後重新結帳。設計理由：不讓使用者被收取和畫面上不同的金額。
- **測試**：`security.test.ts`（竄改價格 → 409 且不成立；以最新價格重送才成立）、`orders.test.ts` › 下單規則、`frontend-bugs.spec.ts` › 結帳：價格已更新（提示、保留購物車、價格更新）

### C7 SSR 跨請求外洩登入使用者｜嚴重

- **位置**：`app/composables/useCurrentUser.ts:1`
- **問題**：`const currentUser = ref(...)` 宣告在 module 最外層。瀏覽器裡沒問題，但 SSR 時 server 是同一個程式服務所有使用者，module 只會載入一次，這個 ref 就變成所有請求共用。
- **後果**：Amy 的請求之後，下一位匿名訪客的首頁 SSR 會顯示「歡迎回來，Amy Chen！」和她的外送地址。實測時同一頁的 `__NUXT_DATA__` 裡 Pinia 的 `auth.user` 是 `null`，證明外洩只來自這個 ref，Pinia store 本身是正確的。
- **重現**：`curl -s -b "token=<Amy 的 token>" localhost:3000/ > /dev/null; curl -s localhost:3000/ | grep -o '歡迎回來[^<]*'` → `歡迎回來，Amy Chen！`
- **嚴重度理由**：在正常流量下就會持續把個資顯示給不特定的人，不需要攻擊者。
- **修正**：改用 Nuxt 的 `useState('currentUser')`：server 端每個請求各自一份，並隨 payload 傳到瀏覽器。5 個呼叫端不需修改。
- **測試**：`security.test.ts` › SSR 跨請求狀態；`current-user.spec.ts`（兩個獨立瀏覽器同時存取；登入 → 重新整理 → 登出）

### H1 餐廳介紹 Stored XSS｜高

- **位置**：`app/utils/sanitize.ts:3`、`app/components/RestaurantIntro.vue:6-7`（`v-html` 與註解「已 sanitize，可安全使用 v-html」）、`server/db/seed.ts:77`（Spice Route 的介紹）
- **問題**：`sanitize()` 只移除 `<script>`，`<img onerror>`、`<a href="javascript:">`、`style` 都會通過。seed 裡已經藏了 `<img src="x" onerror="fetch('/api/track?d='+...localStorage...)">`。
- **後果**：每位打開 Spice Route 菜單頁的使用者，瀏覽器都會執行這段程式，可以用使用者的登入身分呼叫 API（下單、讀取訂單）。cookie 雖然是 `httpOnly`，但在同一個網站上操作仍然有效。原始的 payload 也會出現在 SSR 的 `__NUXT_DATA__` 裡。
- **重現**：打開 `/restaurants/3/menu`，DevTools 的 Network 面板會出現 `/api/track?d=...` 請求
- **嚴重度理由**：可執行任意程式；前提是店家內容可被寫入（店家帳號或後台被盜用），所以列為高而不是嚴重。
- **修正**：在 **server 端 API 輸出時**用 `sanitize-html` 白名單清理（`server/utils/sanitize-intro.ts`），套用在 `GET /api/restaurants` 與 `GET /api/restaurants/:id`。
  - 允許：`p br strong em b i u ul ol li h3 h4`，以及只限 https 的 `a`（強制 `target="_blank" rel="noopener noreferrer"`）。
  - 不允許：事件屬性、`<script>`、`style`/`class`（防止店家用 CSS 蓋住總部版型、偽造畫面）、`<img>`/`<iframe>`。
  - 選在 server 清理而不是前端的理由：所有讀取這份資料的地方都受保護；瀏覽器不必載入清理程式；SSR payload 裡也不會再有原始 payload。
  - seed 裡的惡意內容**刻意保留**，作為測試案例；前端的 `sanitize()` 也保留不動，只補上更正註解。
  - 列表 API 目前沒有畫面顯示 intro，但同樣會清理，並以註解說明移除後的風險（`9396776`）。
- **測試**：`unit/sanitize-intro.test.ts`（白名單規則）、`security.test.ts` › 餐廳介紹 XSS（兩支 API、SSR 輸出、正常格式沒有被誤刪）

### H2 併發下單超賣｜高

- **位置**：`server/api/orders.post.ts:46-54`（註解「SQLite 是單執行緒，不會有併發問題」在 `:49`）
- **問題**：流程是「讀庫存（`:46`）→ `await notifyKitchen()`（`:53`，約 200ms）→ 用舊值寫回 `stock - qty`（`:54`）」。SQLite 本身是同步的沒錯，但 `await` 會讓出 event loop，等待期間其他請求都會讀到同一個舊庫存。
- **後果**：限量 5 份的和牛同時被下 6 單，6 單全部成立，庫存只扣了 1。
- **重現**：同時送出 6 個 `POST /api/orders`（商品 3、qty 1）→ 6 個都回成功
- **嚴重度理由**：會賣出沒有庫存的商品（違約、退款），但需要併發才會發生。
- **修正**：改用條件式 `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`，判斷與扣除在同一個 SQL 完成；`changes === 0` 代表庫存不足，回 409。廚房通知改到訂單 COMMIT **之後**，避免廚房已經開始備料、訂單卻 rollback（失敗補償見 D4）。
- **測試**：`orders.test.ts` › 庫存併發（6 單只成立 5 單、1 單 409、庫存剛好歸零）

### H3 下單錯誤被吞掉、留下半筆訂單｜高

- **位置**：`server/api/orders.post.ts:37-44`（先寫入訂單與明細）、`:58-62`（`catch` 回 `{ ok: true }`，註解「避免前端噴錯影響使用者體驗」）
- **問題**：訂單與明細在檢查庫存**之前**就寫入，且沒有 transaction；任何錯誤（庫存不足、商品不存在造成的 TypeError）都被 `catch` 吞掉並回 `{ ok: true }`。
- **後果**：使用者看到「訂單已送出」，購物車被清空，但訂單其實沒成立；資料庫留下沒有扣庫存的訂單；多品項時前面的品項已經扣了庫存，後面的才失敗。對使用者體驗的傷害比顯示錯誤更大。
- **重現**：購物車放 1 份經典起司堡 + 11 份鮪魚大腹（庫存 10）結帳 → 顯示成功頁
- **嚴重度理由**：訂單資料錯誤且使用者完全不知情；但只在失敗情境下發生。
- **修正**：扣庫存、建立訂單、寫入明細包在同一個 `BEGIN IMMEDIATE … COMMIT`，任何一步失敗就整單 rollback（決策：庫存不足時整單不成立，而不是部分成立，避免使用者沒發現少了一項）。錯誤如實拋出；前端在購物車抽屜顯示原因，並保留購物車。
- **測試**：`orders.test.ts` › 下單失敗要如實回報且不留下半筆資料

### H4 菜單頁重新整理，訪客購物車遺失｜高

- **位置**：`app/stores/cart.ts:3-5`
- **問題**：購物車在 `state()` 裡讀 localStorage。菜單頁 SSR 時 `ProductCard` 會用到購物車，server 端的空購物車隨 payload 送到瀏覽器；Pinia 沿用 payload 的狀態，不會再執行 `state()`。
- **後果**：在菜單頁按 F5，購物車從 2 變 0；下一次加入商品時，`save()` 把只有新商品的內容寫回 localStorage，原本的訪客購物車就永久消失了。
- **重現**：未登入 → `/restaurants/1/menu` 加入 2 項 → F5 → 購物車數字變 0
- **嚴重度理由**：核心購物流程中的靜默資料遺失；第二部分的「登入後合併」也以訪客購物車為前提。
- **修正**：`state()` 一律從空的開始（server 和瀏覽器的第一次畫面一致），hydration 完成後才由 `plugins/cart.client.ts`（`onNuxtReady`）呼叫 `restore()` 讀回 localStorage。`restore()` 只讀不寫。
- **測試**：`frontend-bugs.spec.ts` › 訪客購物車

### M1 菜單頁分類切換無效｜中

- **位置**：`app/pages/restaurants/[id]/menu.vue:10-13`
- **問題**：`useFetch` 的 query 傳的是 `selected.value`，也就是當下的值 `undefined`；`watch(selected, () => refresh())` 重新請求時也一直用同一組參數。API 本身是正確的（已實測不同 category 回傳不同結果）。
- **後果**：點左側分類時標題會換，但商品永遠是第一個分類的。
- **重現**：`/restaurants/1/menu` 點「Burgers」→ 仍然顯示三個套餐
- **嚴重度理由**：使用者在菜單頁看不到其他分類的商品；但「找餐點」頁仍可找到，所以列為中。
- **修正**：改傳 ref 本身，讓 `useFetch` 自動監看；移除多餘的 `watch`，它會造成重複請求。
- **測試**：`frontend-bugs.spec.ts` › 菜單頁分類

### M2 購物車同步不可靠｜中（在第二部分解決）

- **位置**：`app/stores/cart.ts:56-65`
- **問題**：每次變動都送一個不等待結果的整包 `PUT /api/cart`，沒有錯誤處理；快速連點時，請求可能亂序到達，較舊的內容會蓋掉較新的。已登入時重新整理讀的是本機 localStorage，其他裝置的修改看不到。登入時 `loadFromServer()` 直接用帳號購物車覆蓋本地（`app/stores/auth.ts:18` 的 TODO）。
- **為什麼沒有在第一部分修**：這正是第二部分「登入後合併、跨裝置同步」要重新設計的部分，在第一部分先修只會做兩次。第一部分只修了其中的授權問題（C4）。
- **第二部分的處理**：已登入時 server 為準；寫入依序送出、只套用最後一次的回應；失敗時提示；server 端驗證格式並以資料庫價格整理。詳見 `DESIGN.md`。

### L1 預設排序回不去｜低

- **位置**：`app/pages/restaurants/index.vue:22-23`
- **問題**：computed 裡呼叫 `list.sort()`。`sort()` 會直接改動原陣列，也就是 store 的商品清單，原本的 id 順序被永久覆蓋。
- **後果**：選過「價格：高到低」再切回「預設排序」，仍是價格順序。
- **重現**：`/restaurants` → 價格：高到低 → 預設排序
- **嚴重度理由**：顯示順序錯誤，沒有資料損失。
- **修正**：先複製再排序（`[...list].sort()`）。
- **測試**：`frontend-bugs.spec.ts` › 找餐點排序

### L2 Header 沒有 SSR｜低

- **位置**：`app/layouts/default.vue:3-6`（註解「修正 hydration mismatch 警告」）
- **問題**：`<ClientOnly>` 確實擋掉了一個真實的 mismatch：沒有在 SSR 用到購物車的頁面，瀏覽器會在 hydration 前讀到 localStorage，Header 的購物車數字和 SSR 不一致。但這只是把症狀藏起來，代價是 SSR 的 HTML 沒有 Header。
- **後果**：載入時 Header 突然出現、版面跳動；JS 載入前沒有導覽列。
- **嚴重度理由**：只影響體驗。
- **修正**：H4 修正後，兩邊第一次畫面一致，於是移除 `<ClientOnly>`（獨立 commit `59b8307`，可單獨 revert）。
- **測試**：`frontend-bugs.spec.ts`（SSR HTML 含 Header；首頁、找餐點、菜單頁重新整理時 Console 沒有 hydration 警告）。這個偵測方式已驗證有效：故意在 Header 插入 server 與瀏覽器輸出不同的內容，測試在 3 個頁面都抓到 `Hydration completed but contains mismatches.` 並失敗。

### L3 登入 API 空 body 回 500｜低

- **位置**：`server/api/auth/login.post.ts:7`
- **問題 / 後果**：直接解構 `readBody()` 的結果，空 body 時拿到 `undefined` → TypeError → 500，而不是「請輸入帳號與密碼」。
- **重現**：`curl -i -X POST localhost:3000/api/auth/login` → 500
- **修正**：視為空物件，交給原本的檢查回 400。
- **測試**：`security.test.ts` › POST /api/auth/login

### L4 登入 cookie 沒有 Secure｜低

- **位置**：`server/api/auth/login.post.ts:19`
- **後果**：正式環境若有任何 HTTP 請求，token 會以明文傳送。已有 `httpOnly` 與 `SameSite=Lax`，且正式環境通常強制 HTTPS，所以列為低。
- **修正**：請求是 HTTPS（含反向代理的 `X-Forwarded-Proto: https`）時才加上 `Secure`。不寫死 `true`，否則本機以 `http://localhost` 執行 preview 或 Docker 時，部分瀏覽器會拒收 cookie 而無法登入。偽造這個 header 只會影響攻擊者自己的 cookie，沒有風險。
- **測試**：`security.test.ts` › POST /api/auth/login（HTTPS 帶 Secure、HTTP 不帶）

### L5 金額浮點誤差｜低

- **位置**：`server/api/orders.post.ts:39`、`app/stores/order.ts:32`
- **後果**：`12.9 + 4.5` 存成 `17.400000000000002`，對帳與顯示可能出錯。
- **修正**：server 計算總額時四捨五入到小數 2 位（`roundMoney`）。根本解法見 D2。
- **測試**：`orders.test.ts` › 訂單總額四捨五入

---

## 沒有修的項目

### 判斷不需要修改

| # | 看起來可疑的地方 | 判斷與證據 |
|---|---|---|
| N1 | `server/api/menu.get.ts:1` TODO：「快取會不會造成資料不一致？」 | **不改**。實測快取 key 含 query，不同餐廳、不同分類各自快取，結果正確。資料公開、不分使用者；庫存顯示最多晚 60 秒，下單時 server 會再以條件式 UPDATE 檢查（H2），不會因此超賣。 |
| N2 | `server/utils/db.ts:7`：「同步 IO 會卡住 event loop？」 | **不改**。`node:sqlite` 確實是同步 API，但查詢都是本機檔案上的毫秒級操作，以目前規模影響很小。超賣（H2）的原因是 `await`，不是同步 IO。反而正因為是同步的，transaction 內沒有 `await` 的區段不會被其他請求插隊。流量變大時再考慮換成 async driver 或獨立資料庫。 |
| N3 | `app/pages/login.vue:15`：`navigateTo(route.query.redirect)` 像是 open redirect | **不是漏洞**。以 Playwright 實測 `?redirect=https://evil.example` 與 `//evil.example`：Nuxt 預設會擋外部網址，登入後停在 `/login`，沒有導向外站；站內路徑正常導向。（體驗上的小瑕疵見 D8） |
| N4 | 寫入類 API 沒有 CSRF token | **不需要**。cookie 是 `SameSite=Lax`，跨站的 POST、PUT 不會帶 cookie；GET API 都沒有副作用。 |
| N5 | 錯誤訊息用中文的 `statusMessage`，懷疑 h3 會濾掉非 ASCII | **不是問題**。查 h3 原始碼並實測：只有 HTTP 狀態列會被過濾，JSON 回應的 `message` 完整保留中文。 |
| N6 | 密碼雜湊（`server/utils/password.ts`） | **正確**。scrypt + 每人隨機 salt + `timingSafeEqual`。 |

### 留到之後（時間或範圍考量）

| # | 項目 | 為什麼現在不做 |
|---|---|---|
| D1 | 登入沒有次數限制（暴力破解） | 需要 rate limit 的儲存與部署設計（多台機器時要共用計數），超出這次「在既有架構內修正」的範圍。上線前建議在反向代理或 API gateway 層處理。 |
| D2 | 金額改為整數最小單位 + 幣別欄位 | 要改 schema 與所有讀寫金額的地方。現在先四捨五入（L5）。長期做法是 `amount`（整數，如美元以「分」計、台幣以「元」計）+ `currency`，由幣別決定小數位數，不需要分成兩套 schema。 |
| D3 | JWT 無法撤銷（登出只刪 cookie，token 7 天內仍有效，`server/utils/auth.ts:18`） | 需要 server 端的 session 黑名單或改成短效 token + refresh，屬於架構調整。目前 token 只存在 httpOnly cookie，外洩風險已降低。 |
| D4 | 廚房通知失敗沒有補償 | 現在是 COMMIT 後才通知（H2）。模擬的 API 一定成功；真實環境應改用佇列重試，或取消訂單並回補庫存。 |
| D5 | 使用者狀態有兩份（`useCurrentUser` 與 auth store） | 兩份在同樣的地方一起更新，目前一致。合併成一份是重構，不是修 bug；C7 只修外洩，刻意不動 5 個呼叫端。 |
| D6 | 未登入時每次換頁都打一次 `/api/me`（`app/middleware/auth.global.ts:6`） | 效能問題，不影響正確性。可以用 `useState` 記錄「已確認未登入」。 |
| D7 | 登入回應時間可推測帳號是否存在（不存在時不做 scrypt） | 風險低；可以對不存在的帳號也做一次假的雜湊比對。與 D1 一起處理較合適。 |
| D8 | `?redirect=` 是外部網址時，使用者已登入卻停在登入頁、沒有提示 | 體驗問題（N3 已確認不是安全問題）。可以改成遇到外部網址時導回首頁。 |
| D9 | 結帳錯誤訊息（H3 新增）在使用者修改購物車後仍會顯示 | 這是我修正 H3 時新增的提示，目前只在下一次結帳時清除。可以在購物車內容變動時一併清除。 |

---

## 註解與 README 的說法驗證

題目提醒「註解、README 和前任工程師的說法不一定正確」。以下逐條驗證；修正時**保留原本的註解**，在下一行接 `↑ 更正：…` 說明錯在哪裡，讓之後的接手者知道原本的誤解。

| 位置（原始行號） | 原文 | 判定 | 對應 |
|---|---|---|---|
| `nuxt.config.ts:25` | 放 public 才能在 server 和 client 都讀到 | ❌ 前端不需要密鑰 | C1 |
| `server/api/products.get.ts:4` | 已使用 prepared statement，防止 SQL injection | ❌ | C2 |
| `server/api/orders.post.ts:30` | 已於 server 端驗證訂單 | ⚠️ 只驗證格式 | C6 |
| `server/api/orders.post.ts:49` | SQLite 是單執行緒，不會有併發問題 | ❌ `await` 會讓出 event loop | H2 |
| `server/api/orders.post.ts:59` | 避免前端噴錯影響使用者體驗 | ❌ 假成功傷害更大 | H3 |
| `server/api/orders.post.ts:18` | 向餐廳廚房確認備料（模擬外部 API） | ✅ | — |
| `app/components/RestaurantIntro.vue:6` | 已 sanitize，可安全使用 v-html | ❌ | H1 |
| `app/utils/sanitize.ts:1` | 移除 `<script>` 標籤，避免 XSS | ⚠️ 前半句對、後半句不成立 | H1 |
| `app/composables/useCurrentUser.ts:3` | 共用 ref，避免每個元件重複打 /api/me | ❌ SSR 時跨請求共用 | C7 |
| `app/layouts/default.vue:3` | 修正 hydration mismatch 警告 | ⚠️ 只是藏起來 | L2 |
| `app/stores/auth.ts:18` | TODO：訪客購物車要合併（尚未實作） | ✅ | 第二部分 |
| `server/api/menu.get.ts:1` | TODO：快取會不會造成資料不一致？ | 疑問 → 不需改 | N1 |
| `server/utils/db.ts:7` | 同步 IO 會卡住 event loop？ | 疑問 → 暫不需改 | N2 |
| `server/db/seed.ts:4-7` | 預設帳號（密碼皆為 password123） | ✅ | — |

| README「交接備註」 | 判定 |
|---|---|
| 基本功能都完成了，購物車、下單、訂單查詢都可以正常使用 | ⚠️ 表面上能動：M1、L1、H3、H4 |
| 密碼有 hash | ✅（N6） |
| API 都有檢查登入 | ⚠️ 有檢查是否登入，沒檢查是不是本人（C3–C5） |
| SQL 都用 prepared statement | ❌（C2） |
| 購物車未登入時存在 localStorage，登入後會同步到 server | ⚠️ 登入後是覆蓋，不是同步（M2） |
| 尚未完成：登入後合併購物車 | ✅ |

README 的「交接備註」保留原文，由本文件說明；README 只更新了啟動方式（`NUXT_JWT_SECRET`）。

---

## 審查過程中更正的判斷

| 原本的判斷 | 驗證後的結果 |
|---|---|
| 購物車在 hydration 前讀 localStorage，菜單頁會有 hydration mismatch 警告 | **不成立**。server 的空購物車會蓋掉 localStorage，兩邊都是空的，所以沒有警告。真正的問題是**資料遺失**（H4）。 |
| 第一次驗證 hydration 偵測時，只把 `state()` 改回舊寫法 | **無效的負向測試**：修正用的 plugin 還在，測試當然通過。改成在 Header 強制製造 server 與瀏覽器不一致的內容，才確認偵測有效（L2）。 |
| h3 會濾掉中文錯誤訊息 | **不成立**（N5）。 |
| 登入頁的 redirect 參數可能是 open redirect | **不成立**（N3）。 |

## 範圍控制

修正途中做過兩次範圍檢查，把和審查問題無關的改動另外 revert，保留在 commit 歷史中：

- `7804763`：移除「同一商品重複出現回 400」（重複品項本來就能正確計價與扣庫存，沒有實際後果）與 `PUT /api/cart` 的格式驗證（屬於第二部分）。
- `fb15728`：移除預先為第二部分寫好、目前沒有使用的 `maxQtyFor`；廚房通知恢復原本的逐一呼叫（移到 COMMIT 之後是修正的一部分，改成並行呼叫則是無關的優化）。

---

## 測試

### 執行方式

```bash
npm test                    # Vitest：API、安全性、併發（test/e2e、test/unit）
npm run test:browser        # Playwright：瀏覽器、SSR、hydration（test/browser）
npx playwright test --ui    # Playwright UI 模式，可逐步看畫面
npx playwright show-report  # 失敗時的截圖與 trace
```

- 第一次執行 Playwright 前需要 `npx playwright install chromium`。
- 兩者都會先 build 正式版，再以**獨立的暫存 SQLite** 啟動 server，不會動到開發資料 `.data/foodhub.db`。
- 只改測試、沒改程式碼時，可以用 `TEST_SKIP_BUILD=1`（Vitest）/ `PW_SKIP_BUILD=1`（Playwright）沿用現有 build；`PW_PORT` 可以在 UI 模式開著時改用其他 port。

### 涵蓋範圍

| 檔案 | 內容 |
|---|---|
| `test/e2e/security.test.ts` | C1–C7、H1、L3、L4 |
| `test/e2e/orders.test.ts` | H2、H3、C6 的下單規則、L5 |
| `test/unit/sanitize-intro.test.ts` | H1 白名單規則 |
| `test/browser/current-user.spec.ts` | C7（瀏覽器端，兩位使用者同時存取） |
| `test/browser/frontend-bugs.spec.ts` | M1、L1、H4、L2、C6 的前端提示 |
| `test/unit/cart-merge.test.ts`、`test/e2e/cart.test.ts`、`test/browser/cart-merge.spec.ts` | 第二部分：登入後合併購物車（見 `DESIGN.md` 第 7 節） |
| `test/browser/smoke.spec.ts` | 測試環境本身 |

修正前的失敗紀錄：`c53391c`（API，15 個中 14 個失敗）、`583b533`（瀏覽器，6 個中 4 個失敗）。

### Docker 驗證

`docker compose up --build`（Docker Engine 29.9.2）已實際 build 並啟動，在容器內確認：

| 項目 | 結果 |
|---|---|
| 未設定 `NUXT_JWT_SECRET` | compose 直接報錯並提示 `cp .env.example .env` |
| 首頁 | 200 |
| HTML 不含 JWT 密鑰（C1） | ✅ |
| 登入 → `/api/me` | ✅ 回傳 Amy Chen |
| 透過 `http://localhost` 登入的 cookie 不帶 Secure（L4，本機可正常登入） | ✅ |
| SQL injection 撈不到帳號（C2） | ✅ |
| 讀取別人的訂單回 404（C3） | ✅ |
| 菜單頁 SSR 不含 `onerror`（H1） | ✅ |
| 資料庫寫入 volume（`.data/foodhub.db`） | ✅ |
