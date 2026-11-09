<script setup lang="ts">
const currentUser = useCurrentUser()
const { data: restaurants, status } = await useFetch<Restaurant[]>('/api/restaurants')

useSeoMeta({ title: 'FoodHub 美食外送 - 首頁' })
</script>

<template>
  <section class="hero rounded-lg pa-8 mb-8">
    <h1 class="text-h4 font-weight-bold mb-2">
      <template v-if="currentUser">歡迎回來，{{ currentUser.name }}！</template>
      <template v-else>今天想吃什麼？</template>
    </h1>
    <p v-if="currentUser" class="text-body-1">外送至：{{ currentUser.address }}</p>
    <p v-else class="text-body-1">精選在地餐廳，最快 20 分鐘送達。</p>
    <v-btn to="/restaurants" color="primary" class="mt-4">找餐點</v-btn>
  </section>

  <h2 class="text-h5 font-weight-bold mb-4">熱門餐廳</h2>

  <v-progress-linear v-if="status === 'pending'" indeterminate color="primary" />

  <v-row>
    <v-col v-for="r in restaurants" :key="r.id" cols="12" sm="6" md="3">
      <v-card :to="`/restaurants/${r.id}/menu`" variant="outlined" class="h-100">
        <div class="restaurant-emoji">{{ r.emoji }}</div>
        <v-card-item>
          <v-card-title>{{ r.name }}</v-card-title>
          <v-card-subtitle>{{ r.cuisine }} · ⭐ {{ r.rating }} · {{ r.delivery_minutes }} 分鐘</v-card-subtitle>
        </v-card-item>
      </v-card>
    </v-col>
  </v-row>
</template>

<style scoped>
.hero {
  background: linear-gradient(120deg, #fff4e6, #ffe8cc);
}
.restaurant-emoji {
  font-size: 64px;
  text-align: center;
  padding-top: 16px;
}
</style>
