const currentUser = ref<User | null>(null)

// 共用 ref，避免每個元件重複打 /api/me
export const useCurrentUser = () => currentUser
