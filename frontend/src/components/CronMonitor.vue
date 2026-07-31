<script setup>
import { ref, onMounted } from 'vue';
import { Timer, Play, Square, Trash2, Plus } from '@lucide/vue';
import api from '../utils/api';

const cronJobs = ref([]);
const newJob = ref({ name: '', schedule: '0 0 * * *' });
const loading = ref(true);
const isAdding = ref(false);

const fetchJobs = async () => {
  try {
    const response = await api.get('/cron');
    cronJobs.value = response.data;
  } catch (error) {
    console.error('Failed to fetch cron jobs:', error);
  } finally {
    loading.value = false;
  }
};

const addJob = async () => {
  if (!newJob.value.name || !newJob.value.schedule) return;
  
  try {
    const response = await api.post('/cron', newJob.value);
    cronJobs.value.push(response.data);
    newJob.value = { name: '', schedule: '0 0 * * *' };
    isAdding.value = false;
  } catch (error) {
    console.error('Failed to add cron job:', error);
  }
};

const toggleJobStatus = async (job) => {
  try {
    const updatedStatus = job.status === 'active' ? 'inactive' : 'active';
    const response = await api.put(`/cron/${job.id}`, { ...job, status: updatedStatus });
    
    const index = cronJobs.value.findIndex(j => j.id === job.id);
    if (index !== -1) {
      cronJobs.value[index] = response.data;
    }
  } catch (error) {
    console.error('Failed to toggle job status:', error);
  }
};

const deleteJob = async (id) => {
  try {
    await api.delete(`/cron/${id}`);
    cronJobs.value = cronJobs.value.filter(j => j.id !== id);
  } catch (error) {
    console.error('Failed to delete job:', error);
  }
};

onMounted(fetchJobs);
</script>

<template>
  <div class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[400px] font-mono">
    <!-- Header -->
    <div class="p-4 border-b-4 border-black bg-yellow-300 flex justify-between items-center">
      <h2 class="font-black uppercase text-black text-lg flex items-center gap-2">
        <Timer :size="22" class="text-black" />
        自动化任务 (CRON)
      </h2>
      <button @click="isAdding = !isAdding" class="p-1 border-2 border-black bg-white hover:bg-yellow-400">
        <Plus :size="18" class="text-black" />
      </button>
    </div>
    
    <div class="p-4 flex-1 overflow-y-auto space-y-3">
      <div v-if="isAdding" class="p-3 border-4 border-black bg-yellow-100 space-y-2">
        <input v-model="newJob.name" placeholder="任务名称 (例如: 每日清理)" class="w-full border-2 border-black p-2 text-xs font-bold bg-white" />
        <input v-model="newJob.schedule" placeholder="Cron 表达式 (例如: 0 0 * * *)" class="w-full border-2 border-black p-2 text-xs font-bold bg-white" />
        <div class="flex justify-end gap-2 pt-1">
          <button @click="isAdding = false" class="px-3 py-1 border-2 border-black bg-gray-200 text-xs font-bold">取消</button>
          <button @click="addJob" class="btn-primary text-xs py-1 px-3">保存</button>
        </div>
      </div>

      <div v-if="loading" class="text-center font-bold text-black py-4 text-xs">[加载中...]</div>
      <div v-else-if="cronJobs.length === 0 && !isAdding" class="text-center font-bold text-black py-4 text-xs bg-yellow-50 border-2 border-black">[暂无自动化任务]</div>
      
      <div v-else class="space-y-2">
        <div v-for="job in cronJobs" :key="job.id" class="flex items-center justify-between p-3 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div class="flex flex-col gap-1">
            <h3 class="font-black text-sm text-black uppercase">{{ job.name }}</h3>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-bold bg-black text-white px-1.5 py-0.5 border border-black">{{ job.schedule }}</span>
              <span class="text-[9px] font-black uppercase px-1.5 py-0.5 border border-black" :class="job.status === 'active' ? 'bg-lime-400 text-black' : 'bg-gray-300 text-black'">
                {{ job.status }}
              </span>
            </div>
          </div>
          <div class="flex gap-1">
            <button @click="toggleJobStatus(job)" class="p-1.5 border-2 border-black bg-white hover:bg-yellow-300">
              <Square v-if="job.status === 'active'" :size="14" />
              <Play v-else :size="14" />
            </button>
            <button @click="deleteJob(job.id)" class="p-1.5 border-2 border-black bg-red-500 text-white hover:bg-red-600">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
