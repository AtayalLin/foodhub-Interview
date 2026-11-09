<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  loading.value = true
  error.value = ''
  try {
    await auth.login(email.value, password.value)
    await navigateTo(String(route.query.redirect ?? '/'))
  } catch {
    error.value = '帳號或密碼錯誤'
  } finally {
    loading.value = false
  }
}

useSeoMeta({ title: '登入 - FoodHub' })
</script>

<template>
  <v-card max-width="420" class="mx-auto pa-4" variant="outlined">
    <v-card-title class="text-h5">登入</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="onSubmit">
        <v-text-field v-model="email" label="Email" type="email" autocomplete="username" />
        <v-text-field v-model="password" label="密碼" type="password" autocomplete="current-password" />
        <v-alert v-if="error" type="error" density="compact" class="mb-4">{{ error }}</v-alert>
        <v-btn type="submit" color="primary" block size="large" :loading="loading">登入</v-btn>
      </v-form>
    </v-card-text>
  </v-card>
</template>
