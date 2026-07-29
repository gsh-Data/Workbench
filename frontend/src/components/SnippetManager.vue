<script setup>
import { ref, onMounted, computed } from 'vue';
import { Copy, Trash2, Plus, CodeSquare, Link2, X, Edit2 } from '@lucide/vue';
import api from '../utils/api';

const snippets = ref([]);
const todos = ref([]);
const loading = ref(true);

const showModal = ref(false);
const isEditing = ref(false);
const currentSnippet = ref({ id: null, title: '', code: '', tags: '', taskId: '' });

const fetchData = async () => {
  try {
    const [snippetsRes, todosRes] = await Promise.all([
      api.get('/snippets'),
      api.get('/todos')
    ]);
    snippets.value = snippetsRes.data;
    todos.value = todosRes.data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    loading.value = false;
  }
};

const activeTodos = computed(() => {
  // Only show uncompleted tasks in the dropdown
  return todos.value.filter(t => t.status !== 'done' && !t.completed);
});

const getTodoName = (taskId) => {
  const todo = todos.value.find(t => t.id === taskId);
  return todo ? todo.text : '未知任务';
};

const openAddModal = () => {
  isEditing.value = false;
  currentSnippet.value = { id: null, title: '', code: '', tags: '', taskId: '' };
  showModal.value = true;
};

const openEditModal = (snippet) => {
  isEditing.value = true;
  currentSnippet.value = { 
    ...snippet, 
    tags: snippet.tags ? snippet.tags.join(', ') : '',
    taskId: snippet.taskId || ''
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const saveSnippet = async () => {
  if (!currentSnippet.value.title || !currentSnippet.value.code) return;
  
  try {
    const payload = {
      title: currentSnippet.value.title,
      code: currentSnippet.value.code,
      tags: currentSnippet.value.tags ? currentSnippet.value.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    
    // Only attach taskId if selected
    if (currentSnippet.value.taskId) {
      payload.taskId = currentSnippet.value.taskId;
    } else {
      payload.taskId = null; // Clear out task id if unselected
    }

    if (isEditing.value) {
      const response = await api.put(`/snippets/${currentSnippet.value.id}`, payload);
      const index = snippets.value.findIndex(s => s.id === currentSnippet.value.id);
      if (index !== -1) snippets.value[index] = response.data;
    } else {
      const response = await api.post('/snippets', payload);
      snippets.value.unshift(response.data);
    }
    
    closeModal();
  } catch (error) {
    console.error('Failed to save snippet:', error);
  }
};

const deleteSnippet = async (id) => {
  try {
    await api.delete(`/snippets/${id}`);
    snippets.value = snippets.value.filter(s => s.id !== id);
  } catch (error) {
    console.error('Failed to delete snippet:', error);
  }
};

const copyCode = (code) => {
  navigator.clipboard.writeText(code);
};

onMounted(fetchData);
</script>

<template>
  <div class="glass-panel widget">
    <div class="widget-header">
      <h2 class="widget-title"><CodeSquare :size="20" color="var(--accent-secondary)" /> 知识片段</h2>
      <button @click="openAddModal" class="btn-icon">
        <Plus :size="18" />
      </button>
    </div>
    
    <div class="widget-content">
      <div v-if="loading" class="loading">片段加载中...</div>
      <div v-else-if="snippets.length === 0" class="empty-state">暂无已保存的代码片段！</div>
      
      <div v-else class="snippet-list">
        <div v-for="snippet in snippets" :key="snippet.id" class="snippet-card relative group">
          
          <div class="snippet-header">
            <h3 class="snippet-title flex items-center gap-2">
              {{ snippet.title }}
              <span v-if="snippet.taskId" class="text-[10px] bg-accent-secondary/20 text-accent-secondary px-1.5 py-0.5 rounded flex items-center gap-1 font-normal border border-accent-secondary/30 truncate max-w-[120px]">
                <Link2 :size="10" class="shrink-0" /> <span class="truncate">{{ getTodoName(snippet.taskId) }}</span>
              </span>
            </h3>
            
            <div class="snippet-actions opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="copyCode(snippet.code)" class="btn-icon" title="复制内容">
                <Copy :size="14" />
              </button>
              <button @click="openEditModal(snippet)" class="btn-icon" title="编辑/关联任务">
                <Edit2 :size="14" />
              </button>
              <button @click="deleteSnippet(snippet.id)" class="btn-icon delete-btn" title="删除">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <pre class="snippet-code custom-scrollbar"><code>{{ snippet.code }}</code></pre>
          <div class="snippet-tags" v-if="snippet.tags && snippet.tags.length > 0">
            <span v-for="tag in snippet.tags" :key="tag" class="tag">#{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Snippet Editor Modal (Teleported) -->
  <Teleport to="body">
    <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="closeModal">
      <div 
        class="bg-bg-secondary/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-lg" 
        v-motion 
        :initial="{ y: 50, opacity: 0, scale: 0.95 }" 
        :enter="{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
      >
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold flex items-center gap-2 text-text-primary">
            <CodeSquare class="w-6 h-6 text-accent-secondary" />
            {{ isEditing ? '编辑知识片段' : '新增知识片段' }}
          </h3>
          <button @click="closeModal" class="btn-icon w-8 h-8 rounded-full bg-white/5 hover:bg-white/10">
            <X class="w-4 h-4" />
          </button>
        </div>
        
        <form @submit.prevent="saveSnippet" class="space-y-4">
          <div>
            <label class="block text-xs text-text-secondary mb-1 ml-1">标题</label>
            <el-input v-model="currentSnippet.title" placeholder="输入片段或笔记标题" required autofocus />
          </div>
          
          <div>
            <label class="block text-xs text-text-secondary mb-1.5 ml-1">关联任务 (可选)</label>
            <el-select 
              v-model="currentSnippet.taskId" 
              placeholder="(不关联任务) 全局知识"
              clearable
              class="w-full !bg-transparent"
              popper-class="apple-dropdown"
            >
              <el-option label="(不关联任务) 全局知识" value="" />
              <el-option 
                v-for="todo in activeTodos" 
                :key="todo.id" 
                :label="todo.text" 
                :value="todo.id"
              />
            </el-select>
            <p class="text-[10px] text-text-secondary mt-1 ml-1">下拉选择正在进行的任务，以便双向绑定。</p>
          </div>

          <div>
            <label class="block text-xs text-text-secondary mb-1 ml-1">内容 (代码/笔记)</label>
            <el-input v-model="currentSnippet.code" type="textarea" :rows="6" placeholder="在此处粘贴代码或详细笔记..." required />
          </div>

          <div>
            <label class="block text-xs text-text-secondary mb-1 ml-1">标签</label>
            <el-input v-model="currentSnippet.tags" placeholder="例如: vue, frontend (用逗号分隔)" />
          </div>
          
          <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
            <button type="button" @click="closeModal" class="px-5 py-2.5 rounded-xl font-medium text-text-secondary hover:bg-white/5 transition-colors">取消</button>
            <button type="submit" class="bg-accent-secondary text-text-primary rounded-xl px-6 py-2.5 font-medium hover:brightness-110 transition-all shadow-[0_0_15px_rgba(var(--accent-secondary),0.4)]">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
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

.snippet-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.snippet-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 1.25rem;
  transition: var(--transition-fast);
}

.snippet-card:hover {
  border-color: rgba(var(--accent-secondary), 0.3);
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  background: rgba(255, 255, 255, 0.03);
}

.snippet-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.snippet-title {
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}

.snippet-actions {
  display: flex;
  gap: 0.25rem;
}

.snippet-code {
  background: #000;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.85rem;
  color: #a78bfa;
  overflow-x: auto;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border-color);
}

.snippet-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.05);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}

.delete-btn {
  transition: var(--transition-fast);
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

.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1); 
  border-radius: 4px;
}
</style>
