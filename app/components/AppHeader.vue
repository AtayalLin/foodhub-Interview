<script setup lang="ts">
const auth = useAuthStore()
const cart = useCartStore()

async function onLogout() {
  await auth.logout()
  await navigateTo('/')
}
</script>

<template>
  <v-app-bar flat border>
    <NuxtLink to="/" class="logo ml-4">🍽️ FoodHub</NuxtLink>
    <v-btn to="/" variant="text" class="ml-4 d-none d-sm-flex">首頁</v-btn>
    <v-btn to="/restaurants" variant="text" class="d-none d-sm-flex">找餐點</v-btn>
    <v-spacer />

    <template v-if="auth.user">
      <span class="text-body-2 mr-2 d-none d-sm-inline">{{ auth.user.name }}</span>
      <v-btn variant="text" @click="onLogout">登出</v-btn>
    </template>
    <v-btn v-else to="/login" variant="text">登入</v-btn>

    <v-btn icon class="mr-2" aria-label="購物車" @click="cart.drawer = true">
      <v-badge :content="cart.count" :model-value="cart.count > 0" color="primary">
        <v-icon icon="mdi-cart-outline" />
      </v-badge>
    </v-btn>
  </v-app-bar>

  <CartDrawer />
</template>

<style scoped>
.logo {
  font-size: 20px;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
</style>
