<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import TodoWidget from '../components/TodoWidget.vue';
import TodoCarousel from '../components/TodoCarousel.vue';
import PomodoroWidget from '../components/PomodoroWidget.vue';
import ActivityHeatmap from '../components/ActivityHeatmap.vue';

const greeting = ref('');
const timeStr = ref('');
let timeInterval;

const updateTime = () => {
  const now = new Date();
  timeStr.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const hour = now.getHours();
  if (hour < 12) greeting.value = '早上好 (Good Morning)';
  else if (hour < 18) greeting.value = '下午好 (Good Afternoon)';
  else greeting.value = '晚上好 (Good Evening)';
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
    <!-- Hero Banner Area -->
    <div class="shrink-0 p-6 md:p-8 bg-white border border-zinc-200 rounded-xl shadow-sm flex items-center justify-between">
      <div>
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 mb-1.5 font-sans">{{ timeStr }}</h1>
        <p class="text-sm font-medium text-zinc-500 flex items-center gap-2">
          <span class="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          {{ greeting }} · 个人超级工作台控制中心
        </p>
      </div>
      <div class="hidden md:flex items-center gap-2">
        <span class="bg-zinc-100 text-zinc-700 text-xs font-medium px-3 py-1.5 rounded-lg border border-zinc-200">
          Sidebar Fixed Mode
        </span>
        <span class="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-100">
          v4.0 Super Station
        </span>
      </div>
    </div>

    <!-- Main Content Split -->
    <div class="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0">
      <!-- Main Work Area (Left Column) -->
      <div class="col-span-1 xl:col-span-8 flex flex-col gap-6 overflow-y-auto pr-1">
        <!-- Heatmap -->
        <ActivityHeatmap class="shrink-0" />

        <!-- Todos -->
        <div class="flex-1 min-h-[380px]">
          <TodoWidget class="h-full" />
        </div>
      </div>
      
      <!-- Side Widgets (Right Column) -->
      <div class="col-span-1 xl:col-span-4 flex flex-col gap-6 overflow-y-auto pr-1">
        <!-- Pomodoro Focus Timer -->
        <PomodoroWidget class="shrink-0" />

        <!-- Todo Carousel -->
        <div class="flex-1 min-h-[320px]">
          <TodoCarousel class="h-full" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
