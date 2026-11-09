import { createVuetify } from 'vuetify'

export default defineNuxtPlugin((nuxtApp) => {
  const vuetify = createVuetify({
    ssr: true,
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: { primary: '#E8590C', secondary: '#2B2D42' },
        },
      },
    },
  })
  nuxtApp.vueApp.use(vuetify)
})
