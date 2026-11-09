// 共用 ref，避免每個元件重複打 /api/me
// ↑ 更正：原本把 ref 宣告在 module 最外層。瀏覽器裡沒問題，但 SSR 時 server 是同一個程式服務所有使用者，
//   module 只會載入一次，這個 ref 就變成「所有請求共用」：Amy 的請求設成 Amy 之後，下一位匿名訪客的首頁
//   也會顯示「歡迎回來，Amy Chen」和她的地址。
//   現在改用 Nuxt 的 useState：server 端每個請求各自一份，並隨 SSR payload 傳給瀏覽器，元件間一樣共用同一份。
export const useCurrentUser = () => useState<User | null>('currentUser', () => null)
