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
    public: {
      // 放 public 才能在 server 和 client 都讀到
      jwtSecret: 'foodhub-dev-secret-2024',
    },
  },

  app: {
    head: {
      title: 'FoodHub 美食外送',
      htmlAttrs: { lang: 'zh-Hant' },
    },
  },
})
