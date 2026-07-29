<script setup>
import { ref, onMounted } from 'vue';
import { Timer, Activity, Play, Square, Trash2, Plus } from '@lucide/vue';
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
  <div class="glass-panel widget">
    <div class="widget-header">
      <h2 class="widget-title"><Timer :size="20" color="#10b981" /> 自动化任务</h2>
      <button @click="isAdding = !isAdding" class="btn-icon">
        <Plus :size="18" />
      </button>
    </div>
    
    <div class="widget-content">
      <div v-if="isAdding" class="add-form-container space-y-3">
        <el-input v-model="newJob.name" placeholder="任务名称 (例如: 每日清理)" />
        <el-input v-model="newJob.schedule" placeholder="Cron 表达式 (例如: 0 0 * * *)" />
        <div class="form-actions pt-2">
          <button @click="isAdding = false" class="btn-cancel">取消</button>
          <button @click="addJob" class="btn-primary">保存</button>
        </div>
      </div>

      <div v-if="loading" class="loading">任务加载中...</div>
      <div v-else-if="cronJobs.length === 0 && !isAdding" class="empty-state">暂无已排期的自动化任务。</div>
      
      <div v-else class="job-list">
        <div v-for="job in cronJobs" :key="job.id" class="job-card" :class="job.status">
          <div class="job-info">
            <h3 class="job-name">{{ job.name }}</h3>
            <div class="job-meta">
              <span class="job-schedule">{{ job.schedule }}</span>
              <span class="status-badge">
                <span class="dot"></span>
                {{ job.status }}
              </span>
            </div>
          </div>
          <div class="job-actions">
            <button @click="toggleJobStatus(job)" class="btn-icon" :title="job.status === 'active' ? 'Stop' : 'Start'">
              <Square v-if="job.status === 'active'" :size="16" />
              <Play v-else :size="16" />
            </button>
            <button @click="deleteJob(job.id)" class="btn-icon delete-btn" title="Delete">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.widget {
  display: flex;
  flex-direction: column;
  height: 400px;
}

.widget-header {
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.widget-content {
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-form-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgba(0,0,0,0.2);
  padding: 1rem;
  border-radius: var(--border-radius-md);
  border: 1px solid var(--border-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-cancel {
  padding: 0.6rem 1rem;
  color: var(--text-secondary);
  border-radius: var(--border-radius-sm);
  transition: var(--transition-fast);
}

.btn-cancel:hover {
  background: rgba(255,255,255,0.05);
  color: var(--text-primary);
}

.job-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.job-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-sm);
  padding: 1rem;
  transition: var(--transition-fast);
}

.job-card:hover {
  background: rgba(255, 255, 255, 0.04);
}

.job-card.active {
  border-left: 3px solid #10b981;
}

.job-card.inactive {
  border-left: 3px solid var(--text-secondary);
  opacity: 0.8;
}

.job-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.job-name {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}

.job-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.job-schedule {
  font-family: monospace;
  font-size: 0.8rem;
  color: var(--text-secondary);
  background: rgba(0,0,0,0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.status-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--text-secondary);
}

.job-card.active .status-badge .dot {
  background-color: #10b981;
  box-shadow: 0 0 5px #10b981;
}

.job-actions {
  display: flex;
  gap: 0.25rem;
}

.delete-btn:hover {
  color: #ef4444;
}

.empty-state, .loading {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem 0;
  font-size: 0.9rem;
}
</style>
