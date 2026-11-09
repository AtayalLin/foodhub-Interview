export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
  }),

  getters: {
    isLoggedIn: state => !!state.user,
  },

  actions: {
    async login(email: string, password: string) {
      this.user = await $fetch<User>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      })
      useCurrentUser().value = this.user

      // TODO: 訪客購物車要跟帳號購物車合併（尚未實作），目前先以帳號的購物車為主
      await useCartStore().loadFromServer()
    },

    async logout() {
      await $fetch('/api/auth/logout', { method: 'POST' })
      this.user = null
      useCurrentUser().value = null
      useCartStore().clear()
    },
  },
})
