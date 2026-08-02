<script setup>
import { ref, onMounted } from 'vue';
import { CheckSquare, Square, Play, Trash2, Plus, ListTodo, FileText, X, Sparkles } from '@lucide/vue';
import api from '../utils/api';

const todos = ref([]);
const newTodoText = ref('');
const loading = ref(true);
const isDecomposing = ref(false);

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

const aiDecomposeTask = async () => {
  if (!newTodoText.value.trim() || isDecomposing.value) return;
  isDecomposing.value = true;
  try {
    const res = await api.post('/ai/decompose-task', { taskText: newTodoText.value.trim() });
    if (res.data && res.data.subtasks && res.data.subtasks.length > 0) {
      for (const subtask of res.data.subtasks) {
        const added = await api.post('/todos', { text: `[AI 拆解] ${subtask}` });
        todos.value.push(added.data);
      }
      newTodoText.value = '';
    }
  } catch (error) {
    console.error('AI Decompose failed:', error);
    alert('AI 任务拆解失败，请确认是否已配置 DeepSeek API Key');
  } finally {
    isDecomposing.value = false;
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

const openSnippetModal = (taskId) => {
  selectedTodoSnippets.value = snippets.value.filter(s => s.taskId === taskId);
  showSnippetModal.value = true;
};

const closeSnippetModal = () => {
  showSnippetModal.value = false;
  selectedTodoSnippets.value = [];
};

onMounted(fetchData);
</script>

<template>
  <div class="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full overflow-hidden">
    <div class="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-white shrink-0">
      <h2 class="font-semibold text-base text-zinc-900 tracking-tight flex items-center gap-2">
        <ListTodo class="w-4 h-4 text-blue-600" />
        <span>任务清单 (Tasks)</span>
      </h2>
      <span class="text-xs text-zinc-500 font-medium bg-zinc-100 px-2.5 py-1 rounded-md">
        共 {{ todos.length }} 项
      </span>
    </div>
    
    <div class="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
      <!-- Input Form -->
      <form @submit.prevent="addTodo" class="flex gap-2 shrink-0">
        <input 
          v-model="newTodoText" 
          placeholder="输入新任务名称 (或复杂目标，如: 准备下周产品发布会)..." 
          class="flex-1 bg-zinc-100 border-0 rounded-lg text-sm px-3.5 py-2 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all"
        />
        <button 
          type="button" 
          @click="aiDecomposeTask"
          :disabled="isDecomposing || !newTodoText.trim()"
          class="bg-gradient-to-r from-purple-500 to-rose-500 text-white px-3 py-2 rounded-lg font-semibold text-xs hover:from-purple-600 hover:to-rose-600 transition-all flex items-center gap-1 shrink-0 disabled:opacity-50 shadow-sm"
          title="使用 DeepSeek AI 智能拆解为多个子步骤"
        >
          <Sparkles class="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
          <span>{{ isDecomposing ? 'AI 拆解中...' : 'AI 拆解' }}</span>
        </button>
        <button 
          type="submit" 
          class="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-blue-700 transition-colors flex items-center gap-1 shrink-0"
        >
          <Plus :size="18" />
          <span>添加</span>
        </button>
      </form>

      <div v-if="loading" class="text-center font-medium text-zinc-400 py-8 text-sm">加载任务中...</div>
      <div v-else-if="todos.length === 0" class="text-center font-medium text-zinc-500 py-8 text-sm bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
        暂无待办任务，在上方添加新任务
      </div>
      
      <ul v-else class="flex-1 overflow-y-auto pr-1 space-y-2.5">
        <li 
          v-for="todo in todos" 
          :key="todo.id" 
          class="group flex items-center gap-3 p-3 rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 transition-all shadow-sm"
          :class="[
            todo.status === 'in-progress' ? 'bg-amber-50/50 border-amber-200' : '',
            (todo.status === 'done' || todo.completed) ? 'bg-zinc-50 opacity-75' : ''
          ]"
        >
          <button @click="toggleTodo(todo)" class="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
            <CheckSquare v-if="(todo.status === 'done' || todo.completed)" :size="18" class="text-emerald-600" />
            <Play v-else-if="todo.status === 'in-progress'" :size="18" class="text-amber-600" />
            <Square v-else :size="18" class="text-zinc-400" />
          </button>
          
          <div class="flex-1 truncate">
            <span 
              class="text-sm font-medium transition-colors" 
              :class="{ 
                'line-through text-zinc-400': (todo.status === 'done' || todo.completed), 
                'text-zinc-900': todo.status !== 'done'
              }"
            >
              {{ todo.text }}
            </span>
            <span v-if="todo.dueDate" class="text-[11px] ml-2 px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
              {{ todo.dueDate }}
            </span>
          </div>

          <!-- Snippet Badge -->
          <button 
            v-if="snippets.filter(s => s.taskId === todo.id).length > 0"
            @click="openSnippetModal(todo.id)"
            class="flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors shrink-0 border border-blue-100"
          >
            <FileText :size="13" />
            笔记 ({{ snippets.filter(s => s.taskId === todo.id).length }})
          </button>

          <button @click="deleteTodo(todo.id)" class="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
            <Trash2 :size="15" />
          </button>
        </li>
      </ul>
    </div>
  </div>

  <!-- Snippet Modal -->
  <Teleport to="body">
    <div v-if="showSnippetModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm" @click.self="closeSnippetModal">
      <div class="bg-white border border-zinc-200 rounded-xl p-6 shadow-md w-full max-w-lg">
        <div class="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
          <h3 class="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <FileText class="w-4 h-4 text-blue-600" />
            关联知识片段
          </h3>
          <button @click="closeSnippetModal" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X class="w-4 h-4" />
          </button>
        </div>
        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          <div v-for="snippet in selectedTodoSnippets" :key="snippet.id" class="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
            <h4 class="font-semibold text-sm text-zinc-900 mb-2 flex items-center justify-between">
              <span>{{ snippet.title }}</span>
              <div v-if="snippet.tags && snippet.tags.length" class="flex gap-1">
                <span v-for="tag in snippet.tags" :key="tag" class="text-[10px] font-medium px-2 py-0.5 bg-zinc-200 text-zinc-700 rounded">#{{ tag }}</span>
              </div>
            </h4>
            <pre class="text-xs text-zinc-800 bg-white p-3 font-mono border border-zinc-200 rounded-md overflow-x-auto"><code>{{ snippet.code }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
</style>
