<script setup lang="ts">
const cart = useCartStore()
const order = useOrderStore()
const currentUser = useCurrentUser()
</script>

<template>
  <v-navigation-drawer v-model="cart.drawer" location="right" temporary width="360">
    <div class="pa-4 d-flex align-center">
      <h2 class="text-h6">購物車</h2>
      <v-spacer />
      <v-btn icon="mdi-close" variant="text" size="small" @click="cart.drawer = false" />
    </div>
    <v-divider />

    <div v-if="!cart.items.length" class="pa-8 text-center text-medium-emphasis">
      購物車是空的
    </div>

    <v-list v-else>
      <v-list-item v-for="item in cart.items" :key="item.productId">
        <template #prepend>
          <span class="text-h5 mr-3">{{ item.emoji }}</span>
        </template>
        <v-list-item-title>{{ item.name }}</v-list-item-title>
        <v-list-item-subtitle>${{ item.unitPrice }} × {{ item.qty }}</v-list-item-subtitle>
        <template #append>
          <v-btn icon="mdi-minus" size="x-small" variant="tonal" @click="cart.decrease(item.productId)" />
          <v-btn icon="mdi-delete-outline" size="x-small" variant="text" class="ml-1" @click="cart.remove(item.productId)" />
        </template>
      </v-list-item>
    </v-list>

    <template v-if="cart.items.length" #append>
      <div class="pa-4">
        <div v-if="currentUser" class="text-caption text-medium-emphasis mb-2">
          外送至：{{ currentUser.address }}
        </div>
        <div class="d-flex mb-3">
          <span>小計</span>
          <v-spacer />
          <strong>${{ cart.total.toFixed(2) }}</strong>
        </div>
        <v-btn block color="primary" size="large" :loading="order.submitting" @click="order.placeOrder()">
          結帳
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>
