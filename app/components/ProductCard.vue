<script setup lang="ts">
const props = defineProps<{ product: Product }>()

const cart = useCartStore()
const qty = computed(() => cart.qtyOf(props.product.id))
</script>

<template>
  <v-card class="product-card h-100 d-flex flex-column" variant="outlined">
    <div class="product-emoji">{{ product.emoji }}</div>
    <v-card-item>
      <v-card-title class="text-subtitle-1 font-weight-bold">{{ product.name }}</v-card-title>
      <v-card-subtitle>{{ product.description }}</v-card-subtitle>
    </v-card-item>
    <v-card-text class="pb-0">
      <v-chip v-if="product.is_veg" size="x-small" color="green" class="mr-1">素食</v-chip>
      <v-chip v-if="product.is_spicy" size="x-small" color="red" class="mr-1">辣</v-chip>
      <v-chip v-if="product.stock !== null" size="x-small" color="orange">限量供應</v-chip>
    </v-card-text>
    <v-spacer />
    <v-card-actions>
      <span class="text-h6 font-weight-bold text-primary ml-2">${{ product.price }}</span>
      <v-spacer />
      <template v-if="qty > 0">
        <v-btn icon="mdi-minus" size="small" variant="tonal" @click="cart.decrease(product.id)" />
        <span class="mx-2">{{ qty }}</span>
      </template>
      <v-btn icon="mdi-plus" size="small" color="primary" @click="cart.add(product)" />
    </v-card-actions>
  </v-card>
</template>

<style scoped>
.product-emoji {
  font-size: 56px;
  text-align: center;
  padding: 16px 0 0;
}
</style>
