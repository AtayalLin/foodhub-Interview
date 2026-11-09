// 購物車與 server 的分工見 DESIGN.md：已登入時 server 為準；localStorage 只放「訪客購物車」。
const GUEST_CART_KEY = 'cart'

interface CartChange {
  productId: number
  name: string | null
  reason: 'removed' | 'qty_capped' | 'price_updated'
  qty?: number
}
interface CartResponse {
  items: CartItem[]
  changes: CartChange[]
}

// 寫入佇列：讓 PUT 依序送出（前一個完成才送下一個），避免舊的內容晚到、蓋掉新的。
// 只有瀏覽器端的使用者操作會呼叫 save()，SSR 不會執行到，所以放在 module 層級不會有跨請求共用的問題。
let writeQueue: Promise<void> = Promise.resolve()
let writeSeq = 0

function readGuestCart(): CartItem[] {
  return JSON.parse(localStorage.getItem(GUEST_CART_KEY) ?? '[]')
}

function describeChanges(changes: CartChange[]) {
  const parts = changes.map((c) => {
    if (c.reason === 'removed') return `${c.name ?? '部分商品'} 已下架或售完，已移除`
    if (c.reason === 'qty_capped') return `${c.name} 數量已調整為 ${c.qty}`
    return `${c.name} 價格已更新`
  })
  return `購物車已依最新商品資料調整：${parts.join('；')}`
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    notice: null as string | null, // server 調整購物車（數量上限、下架、價格）或同步失敗時的提示
    pendingWrites: 0, // 進行中的寫入（含合併）數量；> 0 時不從 server 重新取得，避免蓋掉剛做的修改
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

    /**
     * 頁面載入、hydration 完成後呼叫（見 plugins/cart.client.ts）：
     * 未登入 → 讀回 localStorage 的訪客購物車；已登入 → 以 server 為準（本機若還有訪客購物車，先合併）。
     */
    async restore() {
      if (useAuthStore().user) await this.syncAfterLogin()
      else this.items = readGuestCart()
    },

    /**
     * 登入後（或已登入狀態下載入頁面時）與 server 同步：本機有訪客購物車就合併，否則直接載入帳號購物車。
     * 合併失敗時保留訪客購物車，下次載入頁面時會再合併；合併是冪等的，重試不會累加。
     * 不會拋出錯誤，避免登入成功卻因為購物車同步失敗而顯示登入失敗。
     */
    async syncAfterLogin() {
      const guest = readGuestCart()
      if (guest.length) {
        this.pendingWrites++
        try {
          const res = await $fetch<CartResponse>('/api/cart/merge', {
            method: 'POST',
            body: { items: guest.map(({ productId, qty, unitPrice }) => ({ productId, qty, unitPrice })) },
          })
          localStorage.removeItem(GUEST_CART_KEY)
          this.applyServerCart(res)
          return
        } catch {
          // 保留 localStorage 的訪客購物車，下面先顯示帳號購物車
        } finally {
          this.pendingWrites--
        }
      }
      try {
        await this.loadFromServer()
      } catch {
        this.notice = '購物車載入失敗，請重新整理頁面'
      }
    },

    // 原本載入後會呼叫 save()，把同樣的內容再 PUT 回 server 並寫進 localStorage；server 已是準的，不需要回寫
    async loadFromServer() {
      this.items = await $fetch<CartItem[]>('/api/cart')
    },

    /** 切回分頁時呼叫：其他裝置可能改過購物車。未登入、或還有寫入未完成時略過，避免舊資料蓋掉剛做的修改 */
    async refreshFromServer() {
      if (!useAuthStore().user || this.pendingWrites > 0) return
      const seq = writeSeq
      const items = await $fetch<CartItem[]>('/api/cart').catch(() => null)
      if (items && this.pendingWrites === 0 && seq === writeSeq) this.items = items
    },

    /** 以 server 整理後的結果為準；有調整時顯示提示 */
    applyServerCart(res: CartResponse) {
      this.items = res.items
      if (res.changes.length) this.notice = describeChanges(res.changes)
    },

    save() {
      const auth = useAuthStore()
      if (!auth.user) {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(this.items))
        return
      }

      // 已登入：server 為準，不寫 localStorage。先更新畫面（樂觀更新），再依序寫入 server。
      // 身分由 server 從 cookie 判斷，不需（也不應）由前端傳 userId；單價只用來讓 server 判斷是否已調價
      const body = { items: this.items.map(i => ({ productId: i.productId, qty: i.qty, unitPrice: i.unitPrice })) }
      const seq = ++writeSeq
      this.pendingWrites++
      writeQueue = writeQueue.then(async () => {
        try {
          const res = await $fetch<CartResponse>('/api/cart', { method: 'PUT', body })
          // 只套用最後一次寫入的回應；之後若還有修改，畫面上的內容才是最新的
          if (seq === writeSeq) this.applyServerCart(res)
        } catch (e) {
          this.handleWriteError(e)
        } finally {
          this.pendingWrites--
        }
      })
    },

    handleWriteError(e: unknown) {
      if ((e as { status?: number }).status === 401) {
        // 登入已逾時：切換為未登入，目前的購物車改存成訪客購物車；重新登入時會走合併流程
        const auth = useAuthStore()
        auth.user = null
        useCurrentUser().value = null
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(this.items))
        this.notice = '登入已逾時，購物車已保留在這台裝置，重新登入後會自動合併'
      } else {
        // 整份寫入的設計下，下一次修改會送出完整內容，自然修復
        this.notice = '購物車同步失敗，下次修改時會再次儲存'
      }
    },
  },
})
