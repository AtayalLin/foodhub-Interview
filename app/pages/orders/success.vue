<script setup lang="ts">
const route = useRoute()
const orderId = computed(() => route.query.id)

useSeoMeta({ title: '訂單已送出 - FoodHub' })
</script>

<template>
  <v-card max-width="480" class="mx-auto pa-8 text-center" variant="outlined">
    <div class="text-h2 mb-4">🎉</div>
    <h1 class="text-h5 font-weight-bold mb-2">訂單已送出！</h1>
    <p class="text-medium-emphasis mb-6">餐廳正在準備您的餐點</p>
    <v-btn v-if="orderId" :to="`/orders/${orderId}`" color="primary" class="mr-2">查看訂單</v-btn>
    <v-btn to="/" variant="outlined">回首頁</v-btn>
  </v-card>
</template>
