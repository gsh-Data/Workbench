<script setup>
import { ref, computed, onMounted } from 'vue';
import { Activity, Flame, TrendingUp } from '@lucide/vue';
import api from '../utils/api';

const todos = ref([]);
const docs = ref([]);
const loading = ref(true);

const hoveredDay = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });

const fetchData = async () => {
  try {
    const [todosRes, docsRes] = await Promise.all([
      api.get('/todos'),
      api.get('/docs')
    ]);
    todos.value = todosRes.data || [];
    docs.value = docsRes.data || [];
  } catch (error) {
    console.error('Failed to load heatmap data:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchData);

// Generate 90 days grid (13 weeks)
const daysGrid = computed(() => {
  const days = [];
  const today = new Date();
  
  // Go back 90 days
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    // Count todos completed or created on dateStr
    const todoCount = todos.value.filter(t => {
      if (t.completedAt && t.completedAt.startsWith(dateStr)) return true;
      if (t.dueDate === dateStr && (t.completed || t.status === 'done')) return true;
      return false;
    }).length;

    // Count docs updated on dateStr
    const docCount = docs.value.filter(doc => {
      return doc.updatedAt && doc.updatedAt.startsWith(dateStr);
    }).length;

    const total = todoCount + docCount;

    days.push({
      dateStr,
      date: d,
      count: total,
      level: total === 0 ? 0 : total === 1 ? 1 : total <= 3 ? 2 : 3
    });
  }
  return days;
});

const totalCompleted = computed(() => {
  return todos.value.filter(t => t.completed || t.status === 'done').length;
});

const activeDaysCount = computed(() => {
  return daysGrid.value.filter(d => d.count > 0).length;
});

const onCellMouseEnter = (e, day) => {
  hoveredDay.value = day;
  const rect = e.currentTarget.getBoundingClientRect();
  tooltipPos.value = {
    x: rect.left + rect.width / 2,
    y: rect.top - 10
  };
};

const onCellMouseLeave = () => {
  hoveredDay.value = null;
};
</script>

<template>
  <div class="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 flex flex-col justify-between font-sans">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Activity class="w-5 h-5 text-blue-600" />
        <h3 class="font-semibold text-base text-zinc-900 tracking-tight">产出热力图 (Activity Heatmap)</h3>
      </div>
      <div class="flex items-center gap-3 text-xs text-zinc-500 font-medium">
        <span class="flex items-center gap-1">
          <TrendingUp class="w-3.5 h-3.5 text-blue-600" /> 活跃: <strong class="text-zinc-900 font-semibold">{{ activeDaysCount }}</strong> 天
        </span>
        <span class="flex items-center gap-1">
          <Flame class="w-3.5 h-3.5 text-amber-500" /> 已完成: <strong class="text-zinc-900 font-semibold">{{ totalCompleted }}</strong> 项
        </span>
      </div>
    </div>

    <!-- Heatmap Grid -->
    <div v-if="loading" class="text-xs text-zinc-400 text-center py-6">
      热力图加载中...
    </div>
    <div v-else class="flex flex-col gap-2">
      <div class="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto py-1">
        <div 
          v-for="day in daysGrid" 
          :key="day.dateStr"
          @mouseenter="onCellMouseEnter($event, day)"
          @mouseleave="onCellMouseLeave"
          class="w-3.5 h-3.5 rounded-sm transition-transform hover:scale-125 cursor-pointer"
          :class="{
            'bg-zinc-100 border border-zinc-200/50': day.level === 0,
            'bg-blue-200': day.level === 1,
            'bg-blue-400': day.level === 2,
            'bg-blue-600': day.level === 3
          }"
        ></div>
      </div>

      <!-- Legend -->
      <div class="flex items-center justify-end gap-2 text-[10px] text-zinc-400 pt-2 border-t border-zinc-100 font-medium">
        <span>较少</span>
        <span class="w-2.5 h-2.5 rounded-sm bg-zinc-100 border border-zinc-200/50"></span>
        <span class="w-2.5 h-2.5 rounded-sm bg-blue-200"></span>
        <span class="w-2.5 h-2.5 rounded-sm bg-blue-400"></span>
        <span class="w-2.5 h-2.5 rounded-sm bg-blue-600"></span>
        <span>频繁</span>
      </div>
    </div>

    <!-- Floating Tooltip -->
    <div 
      v-if="hoveredDay"
      class="fixed z-[100] bg-zinc-900 text-white text-[11px] font-medium px-2.5 py-1 rounded-md shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-full"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      {{ hoveredDay.dateStr }}: {{ hoveredDay.count }} 项产出
    </div>
  </div>
</template>
