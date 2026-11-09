<template>
  <v-app>
    <!-- 修正 hydration mismatch 警告 -->
    <ClientOnly>
      <AppHeader />
    </ClientOnly>

    <v-main>
      <v-container class="py-6">
        <slot />
      </v-container>
    </v-main>
  </v-app>
</template>
