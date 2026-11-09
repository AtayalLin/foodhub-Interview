<template>
  <v-app>
    <!-- 修正 hydration mismatch 警告 -->
    <!-- ↑ 更正：原本用 <ClientOnly> 包住 Header 只是把警告藏起來（根本原因是購物車在 hydration 前就讀 localStorage，
         Header 的購物車數字和 SSR 不一致），代價是 SSR 的 HTML 沒有 Header、載入時版面跳動。
         根本原因已在購物車修正（hydration 完成後才讀 localStorage，見 plugins/cart.client.ts），Header 恢復由 SSR 輸出。 -->
    <AppHeader />

    <v-main>
      <v-container class="py-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
