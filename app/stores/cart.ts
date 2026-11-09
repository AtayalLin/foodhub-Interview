export const useCartStore = defineStore('cart', {
  state: () => ({
    items: (typeof window !== 'undefined'
      ? JSON.parse(localStorage.getItem('cart') ?? '[]')
      : []) as CartItem[],
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
          body: { userId: auth.user.id, items: this.items },
        })
      }
    },
  },
})
