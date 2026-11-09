<script setup lang="ts">
const menuStore = useMenuStore()
await callOnce('products', () => menuStore.fetchProducts())

const keyword = ref('')
const categories = ref<string[]>([])
const vegOnly = ref(false)
const spicyOnly = ref(false)
const maxPrice = ref(30)
const sort = ref<'default' | 'price-asc' | 'price-desc'>('default')

const sortOptions = [
  { title: '預設排序', value: 'default' },
  { title: '價格：低到高', value: 'price-asc' },
  { title: '價格：高到低', value: 'price-desc' },
]

const allCategories = computed(() => [...new Set(menuStore.products.map(p => p.category))])

const filtered = computed(() => {
  let list = menuStore.products
  if (sort.value === 'price-asc') list = list.sort((a, b) => a.price - b.price)
  if (sort.value === 'price-desc') list = list.sort((a, b) => b.price - a.price)

  return list.filter(p =>
    (!categories.value.length || categories.value.includes(p.category))
    && (!vegOnly.value || p.is_veg)
    && (!spicyOnly.value || p.is_spicy)
    && p.price <= maxPrice.value,
  )
})

function onSearch() {
  menuStore.fetchProducts(keyword.value)
}

useSeoMeta({ title: '找餐點 - FoodHub' })
</script>

<template>
  <v-row>
    <v-col cols="12" md="3">
      <v-card variant="outlined" class="pa-4">
        <h2 class="text-subtitle-1 font-weight-bold mb-2">FILTER</h2>

        <v-text-field
          v-model="keyword"
          label="搜尋餐點"
          density="compact"
          append-inner-icon="mdi-magnify"
          @keyup.enter="onSearch"
          @click:append-inner="onSearch"
        />

        <div class="text-caption mb-1">分類</div>
        <v-chip-group v-model="categories" multiple column>
          <v-chip v-for="c in allCategories" :key="c" :value="c" filter size="small">{{ c }}</v-chip>
        </v-chip-group>

        <v-checkbox v-model="vegOnly" label="只看素食" density="compact" hide-details />
        <v-checkbox v-model="spicyOnly" label="只看辣的" density="compact" hide-details />

        <div class="text-caption mt-4">價格上限：${{ maxPrice }}</div>
        <v-slider v-model="maxPrice" :min="1" :max="30" :step="1" color="primary" hide-details />
      </v-card>
    </v-col>

    <v-col cols="12" md="9">
      <div class="d-flex align-center mb-4">
        <span class="text-body-2">共 {{ filtered.length }} 項</span>
        <v-spacer />
        <v-select v-model="sort" :items="sortOptions" density="compact" hide-details style="max-width: 200px" />
      </div>

      <v-alert v-if="menuStore.error" type="error" class="mb-4">{{ menuStore.error }}</v-alert>
      <v-progress-linear v-if="menuStore.loading" indeterminate color="primary" class="mb-4" />

      <v-row>
        <v-col v-for="p in filtered" :key="p.id" cols="12" sm="6" lg="4">
          <ProductCard :product="p" />
        </v-col>
      </v-row>

      <div v-if="!menuStore.loading && !filtered.length" class="text-center text-medium-emphasis pa-8">
        沒有符合條件的餐點
      </div>
    </v-col>
  </v-row>
</template>
