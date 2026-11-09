<script setup lang="ts">
const route = useRoute()
const { data: order, error } = await useFetch<Order>(`/api/orders/${route.params.id}`)

const statusText: Record<string, string> = {
  pending: '處理中',
  delivered: '已送達',
}

useSeoMeta({ title: () => `訂單 #${route.params.id} - FoodHub` })
</script>

<template>
  <v-alert v-if="error" type="error">無法載入訂單</v-alert>

  <v-card v-else-if="order" max-width="640" class="mx-auto" variant="outlined">
    <v-card-item>
      <v-card-title>訂單 #{{ order.id }}</v-card-title>
      <v-card-subtitle>{{ new Date(order.created_at).toLocaleString('zh-TW') }} · {{ statusText[order.status] ?? order.status }}</v-card-subtitle>
    </v-card-item>
    <v-card-text>
      <div class="mb-4">
        <div>外送地址：{{ order.address }}</div>
        <div>聯絡電話：{{ order.phone }}</div>
      </div>
      <v-table density="compact">
        <thead>
          <tr><th>品項</th><th class="text-right">數量</th><th class="text-right">單價</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in order.items" :key="item.id">
            <td>{{ item.name }}</td>
            <td class="text-right">{{ item.qty }}</td>
            <td class="text-right">${{ item.unit_price }}</td>
          </tr>
        </tbody>
      </v-table>
      <div class="text-right text-h6 mt-4">總計：${{ order.total }}</div>
    </v-card-text>
  </v-card>
</template>
