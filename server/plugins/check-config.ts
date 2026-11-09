// 啟動時檢查必要設定：沒有 JWT secret 就不啟動，而不是帶著空字串或弱密鑰上線
export default defineNitroPlugin(() => {
  if (!useRuntimeConfig().jwtSecret) {
    throw new Error('[foodhub] 未設定 NUXT_JWT_SECRET，拒絕啟動。請設定一組隨機的長字串（例如 `openssl rand -hex 32`）。')
  }
})
