export const useCartStore = defineStore('cart', {
  state: () => ({
    // 一律從空的開始，localStorage 改由 restore() 在 hydration 完成後讀入（見 plugins/cart.client.ts）。
    // 原本在這裡直接讀 localStorage：但頁面若在 SSR 時用到購物車（例如菜單頁的 ProductCard），
    // server 端的空購物車會隨 payload 送到瀏覽器，Pinia 沿用該狀態、不再執行這段，
    // 重新整理後購物車變成 0，下一次 save() 還會把空內容寫回 localStorage → 訪客購物車永久遺失。
    items: [] as CartItem[],
    drawer: false,
  }),

  getters: {
    count: state => state.items.reduce((n, item) => n + item.qty, 0),
    total: state => state.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0),
    qtyOf: state => (productId: number) => state.items.find(i => i.productId === productId)?.qty ?? 0,
  },

  actions: {
    add(product: Product) {
      const existing = this.items.find(i => i.productId === product.id)
      if (existing) {
        existing.qty++
      } else {
        this.items.push({
          productId: product.id,
          restaurantId: product.restaurant_id,
          name: product.name,
          emoji: product.emoji,
          unitPrice: product.price,
          qty: 1,
        })
      }
      this.save()
    },

    decrease(productId: number) {
      const existing = this.items.find(i => i.productId === productId)
      if (!existing) return
      existing.qty--
      if (existing.qty <= 0) this.remove(productId)
      else this.save()
    },

    remove(productId: number) {
      this.items = this.items.filter(i => i.productId !== productId)
      this.save()
    },

    clear() {
      this.items = []
      this.save()
    },

    /** 下單時 server 回報價格已更新：把購物車的單價換成目前售價，讓使用者看到新金額後再結帳 */
    updatePrices(latest: { productId: number, unitPrice: number }[]) {
      for (const { productId, unitPrice } of latest) {
        const item = this.items.find(i => i.productId === productId)
        if (item) item.unitPrice = unitPrice
      }
      this.save()
    },

    /** 從 localStorage 讀回購物車（只在瀏覽器、hydration 完成後呼叫；只讀不寫，不觸發 save） */
    restore() {
      this.items = JSON.parse(localStorage.getItem('cart') ?? '[]')
    },

    async loadFromServer() {
      this.items = await $fetch<CartItem[]>('/api/cart')
      this.save()
    },

    save() {
      localStorage.setItem('cart', JSON.stringify(this.items))
      const auth = useAuthStore()
      if (auth.user) {
        $fetch('/api/cart', {
          method: 'PUT',
          body: { items: this.items }, // 身分由 server 從 cookie 判斷，不需（也不應）由前端傳 userId
        })
      }
    },
  },
})
