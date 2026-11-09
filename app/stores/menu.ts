export const useMenuStore = defineStore('menu', {
  state: () => ({
    products: [] as Product[],
    loading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchProducts(q = '') {
      this.loading = true
      this.error = null
      try {
        this.products = await $fetch<Product[]>('/api/products', { query: { q } })
      } catch {
        this.error = '餐點載入失敗，請稍後再試'
      } finally {
        this.loading = false
      }
    },
  },
})
