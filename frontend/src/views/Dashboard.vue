<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import TodoWidget from '../components/TodoWidget.vue';
import TodoCarousel from '../components/TodoCarousel.vue';

const greeting = ref('');
const timeStr = ref('');
let timeInterval;

const updateTime = () => {
  const now = new Date();
  timeStr.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const hour = now.getHours();
  if (hour < 12) greeting.value = '早上好 (GOOD MORNING)';
  else if (hour < 18) greeting.value = '下午好 (GOOD AFTERNOON)';
  else greeting.value = '晚上好 (GOOD EVENING)';
};

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timeInterval);
});
</script>

<template>
  <div class="h-full flex flex-col gap-6">
    <!-- Geometric Hero Banner Area -->
    <div class="shrink-0 p-8 bg-yellow-300 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative flex items-center justify-between">
      <div class="relative z-10">
        <h1 class="text-5xl md:text-7xl font-black mb-2 text-black tracking-tight font-mono uppercase">{{ timeStr }}</h1>
        <p class="text-base md:text-lg text-black font-bold uppercase bg-white border-2 border-black inline-block px-3 py-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          {{ greeting }} // 几何工作台控制中心
        </p>
      </div>
      <div class="hidden md:flex gap-2 font-black text-4xl">
        <span class="bg-black text-white px-3 py-1 border-2 border-black">GEO</span>
        <span class="bg-[#ff006e] text-white px-3 py-1 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">BOLD</span>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
      
      <!-- Main Work Area -->
      <div class="col-span-1 xl:col-span-8 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <!-- Todos -->
        <div class="flex-1 min-h-[400px]">
          <TodoWidget class="h-full" />
        </div>
      </div>
      
      <!-- Side Widgets -->
      <div class="col-span-1 xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <!-- Todo Carousel -->
        <div class="flex-1 min-h-[400px]">
          <TodoCarousel class="h-full" />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
</style>
