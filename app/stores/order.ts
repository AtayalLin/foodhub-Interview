interface PlaceOrderResponse {
  ok: boolean
  orderId?: number
}

interface OrderErrorData {
  code?: 'PRICE_CHANGED' | 'OUT_OF_STOCK'
  items?: { productId: number, unitPrice: number }[]
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    submitting: false,
    error: null as string | null,
  }),

  actions: {
    async placeOrder() {
      const auth = useAuthStore()
      const cart = useCartStore()
      if (!auth.user) {
        cart.drawer = false
        return navigateTo({ path: '/login', query: { redirect: useRoute().fullPath } })
      }

      this.submitting = true
      this.error = null
      try {
        const res = await $fetch<PlaceOrderResponse>('/api/orders', {
          method: 'POST',
          body: {
            items: cart.items.map(i => ({
              productId: i.productId,
              name: i.name,
              qty: i.qty,
              unitPrice: i.unitPrice,
            })),
            total: cart.total,
          },
        })

        if (res.ok) {
          cart.clear()
          cart.drawer = false
          await navigateTo({ path: '/orders/success', query: res.orderId ? { id: res.orderId } : {} })
        }
      } catch (e) {
        // 下單失敗時保留購物車，顯示 server 回傳的原因
        const err = e as { data?: { message?: string, data?: OrderErrorData } }
        const data = err.data?.data
        if (data?.code === 'PRICE_CHANGED' && data.items) {
          cart.updatePrices(data.items)
          this.error = '部分商品價格已更新，請確認金額後再次結帳'
        } else {
          this.error = err.data?.message ?? '下單失敗，請稍後再試'
        }
      } finally {
        this.submitting = false
      }
    },
  },
})
