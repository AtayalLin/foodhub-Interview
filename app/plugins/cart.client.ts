// 等 hydration 完成後才載入購物車：
// server 與瀏覽器的第一次畫面都是空購物車（一致，不會 hydration mismatch），接手後再更新成實際內容。
// 未登入讀 localStorage 的訪客購物車；已登入以 server 為準（見 stores/cart.ts 的 restore）。
export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    const cart = useCartStore()
    cart.restore()

    // 切回分頁時重新向 server 取得：其他裝置可能改過購物車（未登入或還有寫入未完成時會略過）
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') cart.refreshFromServer()
    })
  })
})
