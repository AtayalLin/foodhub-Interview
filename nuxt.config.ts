import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: false },

  modules: [
    '@pinia/nuxt',
    (_options, nuxt) => {
      nuxt.hooks.hook('vite:extendConfig', (config) => {
        config.plugins!.push(vuetify({ autoImport: true }))
      })
    },
  ],

  build: { transpile: ['vuetify'] },
  css: ['vuetify/styles', '@mdi/font/css/materialdesignicons.css'],

  vite: {
    vue: { template: { transformAssetUrls } },
  },

  runtimeConfig: {
    // 放 public 才能在 server 和 client 都讀到
    // ↑ 更正：「public 兩邊都讀得到」是事實，但前端根本不需要 JWT 密鑰。public 的內容會序列化進每一頁 HTML
    //   的 window.__NUXT__.config，任何人檢視原始碼就能拿到密鑰、偽造任何使用者的登入 token（CODE_REVIEW C1）。
    //   現在改為只在 server 端使用的 private 設定：
    //   - 正式環境以環境變數 NUXT_JWT_SECRET 提供；未設定時 server 拒絕啟動（見 server/plugins/check-config.ts）。
    //   - 開發模式給一組固定值，讓 `npm run dev` 不需額外設定。
    jwtSecret: process.env.NODE_ENV === 'production' ? '' : 'dev-only-insecure-jwt-secret',
  },

  app: {
    head: {
      title: 'FoodHub 美食外送',
      htmlAttrs: { lang: 'zh-Hant' },
    },
  },
})
