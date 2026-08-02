<script setup>
import { ref, onMounted } from 'vue';
import api from '../utils/api';
import { CheckCircle2, Circle, Clock } from '@lucide/vue';

const todos = ref([]);
const loading = ref(true);

const fetchTodos = async () => {
  try {
    const res = await api.get('/todos');
    const data = res.data;
    const sorted = data.sort((a, b) => {
      if (a.status === 'in-progress' && b.status !== 'in-progress') return -1;
      if (b.status === 'in-progress' && a.status !== 'in-progress') return 1;
      return 0;
    });
    todos.value = sorted.slice(0, 5);
  } catch (error) {
    console.error('Failed to fetch todos for carousel:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTodos();
});
</script>

<template>
  <div class="bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
    <div class="px-6 py-4 border-b border-zinc-100 bg-white flex items-center justify-between shrink-0">
      <h3 class="font-semibold text-base text-zinc-900 tracking-tight flex items-center gap-2">
        <Clock class="w-4 h-4 text-blue-600" />
        <span>焦点任务 (Focus Tasks)</span>
      </h3>
    </div>
    
    <div class="flex-1 relative p-6 bg-white">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-zinc-400 font-medium text-sm">
        加载焦点任务...
      </div>
      <div v-else-if="todos.length === 0" class="absolute inset-0 flex items-center justify-center text-zinc-400 font-medium text-sm">
        暂无焦点任务
      </div>
      
      <el-carousel v-else class="h-full w-full rounded-lg border border-zinc-200 overflow-hidden shadow-sm" arrow="hover" :interval="4000">
        <el-carousel-item v-for="todo in todos" :key="todo.id" class="h-full">
          <div 
            class="h-full flex flex-col justify-between p-6 relative overflow-hidden transition-colors"
            :class="{
              'bg-emerald-50 text-emerald-900': todo.status === 'completed',
              'bg-blue-50 text-blue-900': todo.status === 'in-progress',
              'bg-zinc-50 text-zinc-900': todo.status !== 'completed' && todo.status !== 'in-progress'
            }"
          >
            <!-- Top bar: Status -->
            <div class="flex items-center justify-between mb-4">
              <div 
                class="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold"
                :class="{
                  'bg-emerald-100 text-emerald-700': todo.status === 'completed',
                  'bg-blue-100 text-blue-700': todo.status === 'in-progress',
                  'bg-zinc-200 text-zinc-700': todo.status !== 'completed' && todo.status !== 'in-progress'
                }"
              >
                <span 
                  class="w-2 h-2 rounded-full"
                  :class="todo.status === 'completed' ? 'bg-emerald-500' : (todo.status === 'in-progress' ? 'bg-blue-500' : 'bg-zinc-500')"
                ></span>
                {{ todo.status === 'completed' ? '已完成' : (todo.status === 'in-progress' ? '进行中' : '待处理') }}
              </div>
              
              <CheckCircle2 v-if="todo.status === 'completed'" class="w-6 h-6 text-emerald-600" />
              <Clock v-else-if="todo.status === 'in-progress'" class="w-6 h-6 text-blue-600" />
              <Circle v-else class="w-6 h-6 text-zinc-400" />
            </div>
            
            <!-- Main Title -->
            <div class="flex-1 flex items-center">
              <h2 class="text-xl md:text-2xl font-semibold tracking-tight leading-tight line-clamp-3">
                {{ todo.text }}
              </h2>
            </div>
            
            <!-- Bottom decorative bar -->
            <div class="w-12 h-1 bg-blue-600 rounded-full mt-4"></div>
          </div>
        </el-carousel-item>
      </el-carousel>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-carousel) {
  height: 100%;
}
:deep(.el-carousel__container) {
  height: 100% !important;
}
:deep(.el-carousel__indicators) {
  background: rgba(24, 24, 27, 0.7);
  padding: 4px 8px;
  border-radius: 9999px;
  margin-bottom: 8px;
}
:deep(.el-carousel__button) {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background-color: #ffffff;
  opacity: 0.6;
}
:deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background-color: #3b82f6;
  opacity: 1;
  width: 14px;
}
</style>
