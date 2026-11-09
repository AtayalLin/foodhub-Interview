export default defineNuxtRouteMiddleware(async () => {
  const auth = useAuthStore()
  if (auth.user) return

  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
  const me = await $fetch<User | null>('/api/me', { headers })
  if (me) {
    auth.user = me
    useCurrentUser().value = me
  }
})
