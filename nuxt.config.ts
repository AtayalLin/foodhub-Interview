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
    // 只在 server 端使用，絕不能放 public（public 會序列化進每一頁的 HTML）。
    // 正式環境以環境變數 NUXT_JWT_SECRET 提供；未設定時 server 拒絕啟動（見 server/plugins/check-config.ts）。
    // 開發模式給一組固定值，讓 `npm run dev` 不需額外設定。
    jwtSecret: process.env.NODE_ENV === 'production' ? '' : 'dev-only-insecure-jwt-secret',
  },

  app: {
    head: {
      title: 'FoodHub 美食外送',
      htmlAttrs: { lang: 'zh-Hant' },
    },
  },
})
