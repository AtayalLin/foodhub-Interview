export default defineEventHandler(() => {
  const restaurants = useDb().prepare('SELECT * FROM restaurants ORDER BY rating DESC').all() as unknown as Restaurant[]
  // 列表也會回傳 intro，同樣清理，避免任何讀取端拿到未清理的 HTML。
  // 註：目前畫面上只有菜單頁（/restaurants/:id/menu）會用 v-html 顯示 intro，列表頁沒有顯示，這行看似多餘，請勿移除。
  //   若移除，這支公開 API 會原樣回傳店家寫入的 HTML（例如 seed 中 Spice Route 的 <img onerror="fetch(...)">）：
  //   1. 首頁 SSR 時會把這些內容帶進頁面的 __NUXT_DATA__，任何人都拿得到惡意 HTML；
  //   2. 將來只要有人在任何元件用 v-html 顯示列表的 intro（例如在首頁卡片加上餐廳簡介），
  //      瀏覽器就會立刻執行 onerror 裡的程式（Stored XSS），可用使用者的登入身分呼叫 API、竊取頁面資料。
  //   清理放在資料「離開 server」的地方，前端不論怎麼顯示都安全。
  return restaurants.map(r => ({ ...r, intro: sanitizeIntro(r.intro) }))
})
