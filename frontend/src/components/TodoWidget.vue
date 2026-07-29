<script setup>
import { ref, onMounted } from 'vue';
import { CheckCircle2, Circle, PlayCircle, Trash2, Plus, ListTodo, FileText, X } from '@lucide/vue';
import api from '../utils/api';

const todos = ref([]);
const newTodoText = ref('');
const loading = ref(true);

const snippets = ref([]);
const selectedTodoSnippets = ref([]);
const showSnippetModal = ref(false);

const fetchData = async () => {
  try {
    const [todosRes, snippetsRes] = await Promise.all([
      api.get('/todos'),
      api.get('/snippets')
    ]);
    todos.value = todosRes.data;
    snippets.value = snippetsRes.data;
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    loading.value = false;
  }
};

const addTodo = async () => {
  if (!newTodoText.value.trim()) return;
  try {
    const response = await api.post('/todos', { text: newTodoText.value });
    todos.value.push(response.data);
    newTodoText.value = '';
  } catch (error) {
    console.error('Failed to add todo:', error);
  }
};

const toggleTodo = async (todo) => {
  try {
    let currentStatus = todo.status || (todo.completed ? 'done' : 'todo');
    let nextStatus = 'todo';
    let completed = false;
    
    if (currentStatus === 'todo') {
      nextStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
      nextStatus = 'done';
      completed = true;
    }

    const updated = { ...todo, status: nextStatus, completed };
    await api.put(`/todos/${todo.id}`, updated);
    const index = todos.value.findIndex(t => t.id === todo.id);
    if (index !== -1) todos.value[index] = updated;
  } catch (error) {
    console.error('Failed to toggle todo:', error);
  }
};

const deleteTodo = async (id) => {
  try {
    await api.delete(`/todos/${id}`);
    todos.value = todos.value.filter(t => t.id !== id);
  } catch (error) {
    console.error('Failed to delete todo:', error);
  }
};

const openSnippetModal = (todoId) => {
  selectedTodoSnippets.value = snippets.value.filter(s => s.taskId === todoId);
  showSnippetModal.value = true;
};

const closeSnippetModal = () => {
  showSnippetModal.value = false;
};

onMounted(fetchData);
</script>

<template>
  <div class="glass-panel widget">
    <div class="widget-header">
      <h2 class="widget-title"><ListTodo :size="20" color="var(--accent-primary)" /> 待办任务</h2>
    </div>
    
    <div class="widget-content relative">
      <form @submit.prevent="addTodo" class="add-form shrink-0">
        <el-input 
          v-model="newTodoText" 
          placeholder="添加新任务..." 
          class="flex-1"
        />
        <button type="submit" class="btn-primary add-btn">
          <Plus :size="18" />
        </button>
      </form>

      <div v-if="loading" class="loading">任务加载中...</div>
      <div v-else-if="todos.length === 0" class="empty-state">暂无任务，你已完成所有工作！</div>
      
      <ul v-else class="todo-list flex-1 overflow-y-auto pr-1">
        <li 
          v-for="todo in todos" 
          :key="todo.id" 
          class="todo-item group flex items-center gap-3 p-3 mb-2 rounded-xl transition-all border"
          :class="[
            todo.status === 'in-progress' ? 'bg-accent-primary/10 border-accent-primary/30 shadow-[0_0_15px_rgba(var(--accent-primary),0.1)]' : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5',
            (todo.status === 'done' || todo.completed) ? 'opacity-60' : ''
          ]"
        >
          <button @click="toggleTodo(todo)" class="todo-toggle flex-shrink-0 hover:scale-110 transition-transform">
            <CheckCircle2 v-if="(todo.status === 'done' || todo.completed)" :size="22" class="text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)] rounded-full" />
            <PlayCircle v-else-if="todo.status === 'in-progress'" :size="22" class="text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.3)] rounded-full animate-pulse" />
            <Circle v-else :size="22" class="text-text-secondary" />
          </button>
          
          <div class="todo-content flex-1 truncate">
            <span 
              class="todo-text text-sm font-medium transition-colors" 
              :class="{ 
                'line-through text-text-secondary': (todo.status === 'done' || todo.completed), 
                'text-accent-primary': todo.status === 'in-progress', 
                'text-text-primary': (todo.status !== 'done' && todo.status !== 'in-progress' && !todo.completed) 
              }"
            >
              {{ todo.text }}
            </span>
            <span v-if="todo.dueDate" class="text-[10px] ml-2 px-1.5 py-0.5 rounded bg-white/10 text-text-secondary font-mono">
              {{ todo.dueDate }}
            </span>
          </div>

          <!-- Snippet Badge -->
          <button 
            v-if="snippets.filter(s => s.taskId === todo.id).length > 0"
            @click="openSnippetModal(todo.id)"
            class="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 hover:bg-accent-secondary/40 transition-colors shrink-0 shadow-sm"
          >
            <FileText :size="12" />
            笔记 ({{ snippets.filter(s => s.taskId === todo.id).length }})
          </button>

          <button @click="deleteTodo(todo.id)" class="btn-icon delete-btn shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-text-secondary hover:text-red-500">
            <Trash2 :size="16" />
          </button>
        </li>
      </ul>
    </div>
  </div>

  <!-- Snippet Modal (Teleported to body to avoid clipping) -->
  <Teleport to="body">
    <div v-if="showSnippetModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="closeSnippetModal">
      <div 
        class="bg-bg-secondary/90 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl w-full max-w-lg" 
        v-motion 
        :initial="{ y: 50, opacity: 0, scale: 0.95 }" 
        :enter="{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
      >
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold flex items-center gap-2 text-text-primary">
            <FileText class="w-6 h-6 text-accent-secondary" />
            关联知识片段
          </h3>
          <button @click="closeSnippetModal" class="btn-icon w-8 h-8 rounded-full bg-white/5 hover:bg-white/10">
            <X class="w-4 h-4" />
          </button>
        </div>
        <div class="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div v-for="snippet in selectedTodoSnippets" :key="snippet.id" class="bg-black/30 border border-white/5 p-5 rounded-2xl">
            <h4 class="font-medium text-sm text-text-primary mb-3 flex items-center gap-2">
              {{ snippet.title }}
              <div v-if="snippet.tags && snippet.tags.length" class="flex gap-1">
                <span v-for="tag in snippet.tags" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-text-secondary">#{{ tag }}</span>
              </div>
            </h4>
            <pre class="text-xs text-accent-secondary bg-black/50 p-4 rounded-xl overflow-x-auto font-mono border border-white/5"><code>{{ snippet.code }}</code></pre>
          </div>
        </div>
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
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
}

.add-form {
  display: flex;
  gap: 0.5rem;
}

.add-btn {
  padding: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state, .loading {
  text-align: center;
  color: var(--text-secondary);
  padding: 2rem 0;
  font-size: 0.9rem;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent; 
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-color); 
  border-radius: 4px;
}
</style>
