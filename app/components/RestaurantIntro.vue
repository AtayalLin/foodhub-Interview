<script setup lang="ts">
defineProps<{ intro: string }>()
</script>

<template>
  <!-- 已 sanitize，可安全使用 v-html -->
  <div class="restaurant-intro text-body-2" v-html="sanitize(intro)" />
</template>

<style scoped>
.restaurant-intro :deep(p) {
  margin-bottom: 4px;
}
</style>
