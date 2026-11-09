// 等 hydration 完成後才把 localStorage 的購物車讀回來：
// server 與瀏覽器的第一次畫面都是空購物車（一致，不會 hydration mismatch），接手後再更新成實際內容。
export default defineNuxtPlugin(() => {
  onNuxtReady(() => {
    useCartStore().restore()
  })
})
