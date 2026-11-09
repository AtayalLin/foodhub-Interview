interface PlaceOrderResponse {
  ok: boolean
  orderId?: number
}

export const useOrderStore = defineStore('order', {
  state: () => ({
    submitting: false,
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
      try {
        const res = await $fetch<PlaceOrderResponse>('/api/orders', {
          method: 'POST',
          body: {
            userId: auth.user.id,
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
      } finally {
        this.submitting = false
      }
    },
  },
})
