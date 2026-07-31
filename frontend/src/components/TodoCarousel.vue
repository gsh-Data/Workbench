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
  <div class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full relative overflow-hidden">
    <div class="p-4 border-b-4 border-black bg-[#ff006e] text-white flex items-center justify-between shrink-0">
      <h3 class="font-black uppercase tracking-wider text-white flex items-center gap-2 text-lg">
        <Clock class="w-5 h-5 text-white" />
        焦点任务 (FOCUS)
      </h3>
    </div>
    
    <div class="flex-1 relative p-4 bg-white">
      <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-black font-black text-sm">
        [加载中...]
      </div>
      <div v-else-if="todos.length === 0" class="absolute inset-0 flex items-center justify-center text-black font-black text-sm">
        [暂无焦点任务]
      </div>
      
      <el-carousel v-else class="h-full w-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]" arrow="hover" :interval="4000">
        <el-carousel-item v-for="todo in todos" :key="todo.id" class="h-full">
          <div class="h-full flex flex-col justify-between p-6 relative overflow-hidden"
               :class="{
                 'bg-lime-300 text-black': todo.status === 'completed',
                 'bg-yellow-300 text-black': todo.status === 'in-progress',
                 'bg-[#00f0ff] text-black': todo.status !== 'completed' && todo.status !== 'in-progress'
               }">
            
            <!-- Top bar: Status -->
            <div class="flex items-center justify-between mb-4">
              <div class="inline-flex items-center gap-2 px-3 py-1 bg-black text-white font-black text-xs uppercase border-2 border-black">
                <span class="w-2.5 h-2.5 border border-white"
                      :class="todo.status === 'completed' ? 'bg-lime-400' : (todo.status === 'in-progress' ? 'bg-yellow-400' : 'bg-cyan-400')"></span>
                {{ todo.status === 'completed' ? '已完成' : (todo.status === 'in-progress' ? '进行中' : '待处理') }}
              </div>
              
              <CheckCircle2 v-if="todo.status === 'completed'" class="w-8 h-8 text-black" />
              <Clock v-else-if="todo.status === 'in-progress'" class="w-8 h-8 text-black" />
              <Circle v-else class="w-8 h-8 text-black" />
            </div>
            
            <!-- Main Title -->
            <div class="flex-1 flex items-center">
              <h2 class="text-2xl md:text-3xl font-black text-black leading-tight uppercase tracking-tight line-clamp-3">
                {{ todo.text }}
              </h2>
            </div>
            
            <!-- Bottom decorative accent -->
            <div class="w-16 h-3 bg-black mt-4"></div>
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
  background: #000000;
  padding: 4px 8px;
  border: 2px solid #000000;
  margin-bottom: 8px;
}
:deep(.el-carousel__button) {
  width: 8px;
  height: 8px;
  background-color: #ffffff;
  opacity: 1;
}
:deep(.el-carousel__indicator.is-active .el-carousel__button) {
  background-color: #ff006e;
  width: 16px;
}
</style>
