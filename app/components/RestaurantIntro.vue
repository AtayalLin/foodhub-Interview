<script setup lang="ts">
defineProps<{ intro: string }>()
</script>

<template>
  <!-- 已 sanitize，可安全使用 v-html -->
  <!-- ↑ 更正：前端的 sanitize() 只移除 <script>，並不安全。能安全使用 v-html，是因為 API 已在 server 端以白名單清理 intro（server/utils/sanitize-intro.ts）。 -->
  <div class="restaurant-intro text-body-2" v-html="sanitize(intro)" />
</template>

<style scoped>
.restaurant-intro :deep(p) {
  margin-bottom: 4px;
}
</style>
