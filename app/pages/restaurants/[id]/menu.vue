<script setup lang="ts">
const route = useRoute()
const id = Number(route.params.id)

const { data: restaurant } = await useFetch<Restaurant>(`/api/restaurants/${id}`)

const tab = ref('order')
const selected = ref<string>()

const { data: menu, status, refresh } = await useFetch('/api/menu', {
  query: { restaurantId: id, category: selected.value },
})
watch(selected, () => refresh())

const activeCategory = computed(() => selected.value ?? menu.value?.categories[0])

useSeoMeta({ title: () => `${restaurant.value?.name ?? '餐廳'} - FoodHub` })
</script>

<template>
  <div v-if="restaurant">
    <section class="d-flex align-center mb-4">
      <span class="text-h2 mr-4">{{ restaurant.emoji }}</span>
      <div>
        <h1 class="text-h4 font-weight-bold">{{ restaurant.name }}</h1>
        <div class="text-medium-emphasis">
          {{ restaurant.cuisine }} · ⭐ {{ restaurant.rating }} · {{ restaurant.delivery_minutes }} 分鐘
        </div>
        <RestaurantIntro :intro="restaurant.intro" class="mt-2" />
      </div>
    </section>

    <v-tabs v-model="tab" color="primary" class="mb-4">
      <v-tab value="order">Order Online</v-tab>
      <v-tab value="reviews">Reviews</v-tab>
    </v-tabs>

    <v-window v-model="tab">
      <v-window-item value="order">
        <v-row>
          <v-col cols="12" md="3">
            <v-list nav density="compact" class="border rounded">
              <v-list-item
                v-for="c in menu?.categories"
                :key="c"
                :title="c"
                :active="c === activeCategory"
                color="primary"
                @click="selected = c"
              />
            </v-list>
          </v-col>

          <v-col cols="12" md="9">
            <h2 class="text-h6 mb-4">{{ activeCategory }}</h2>
            <v-progress-linear v-if="status === 'pending'" indeterminate color="primary" class="mb-4" />
            <v-row>
              <v-col v-for="p in menu?.products" :key="p.id" cols="12" sm="6" lg="4">
                <ProductCard :product="p" />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-window-item>

      <v-window-item value="reviews">
        <div class="text-medium-emphasis pa-8 text-center">尚無評論</div>
      </v-window-item>
    </v-window>
  </div>
</template>
