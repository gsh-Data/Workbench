<script setup>
import { ref, onMounted } from 'vue';
import { CheckSquare, Square, Play, Trash2, Plus, ListTodo, FileText, X } from '@lucide/vue';
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
  <div class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[420px]">
    <!-- Header -->
    <div class="p-4 border-b-4 border-black bg-yellow-300 flex items-center justify-between">
      <h2 class="font-black uppercase tracking-wider text-black text-lg flex items-center gap-2">
        <ListTodo :size="22" class="text-black" />
        待办任务 (TODOS)
      </h2>
    </div>
    
    <div class="p-4 flex-1 flex flex-col gap-4 overflow-hidden">
      <!-- Input Form -->
      <form @submit.prevent="addTodo" class="flex gap-2 shrink-0">
        <input 
          v-model="newTodoText" 
          placeholder="输入新任务名称..." 
          class="flex-1 border-3 border-black bg-white px-3 py-2 font-bold text-sm focus:bg-yellow-200 outline-none transition-colors border-2"
        />
        <button type="submit" class="bg-[#ff006e] text-white px-4 py-2 font-black border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all">
          <Plus :size="20" />
        </button>
      </form>

      <div v-if="loading" class="text-center font-bold text-black py-6 text-sm">[加载任务中...]</div>
      <div v-else-if="todos.length === 0" class="text-center font-bold text-black py-6 text-sm bg-yellow-100 border-2 border-black">[暂无任务]</div>
      
      <ul v-else class="flex-1 overflow-y-auto pr-1 space-y-2">
        <li 
          v-for="todo in todos" 
          :key="todo.id" 
          class="group flex items-center gap-3 p-3 border-2 border-black transition-all bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-100"
          :class="[
            todo.status === 'in-progress' ? 'bg-yellow-300 font-black' : '',
            (todo.status === 'done' || todo.completed) ? 'bg-gray-200 opacity-60' : ''
          ]"
        >
          <button @click="toggleTodo(todo)" class="shrink-0 hover:scale-110 transition-transform">
            <CheckSquare v-if="(todo.status === 'done' || todo.completed)" :size="20" class="text-black bg-lime-400 border border-black" />
            <Play v-else-if="todo.status === 'in-progress'" :size="20" class="text-black bg-cyan-400 border border-black p-0.5" />
            <Square v-else :size="20" class="text-black" />
          </button>
          
          <div class="flex-1 truncate">
            <span 
              class="text-sm font-bold uppercase transition-colors" 
              :class="{ 
                'line-through text-gray-700': (todo.status === 'done' || todo.completed), 
                'text-black': todo.status !== 'done'
              }"
            >
              {{ todo.text }}
            </span>
            <span v-if="todo.dueDate" class="text-[10px] ml-2 px-1.5 py-0.5 border border-black bg-white text-black font-mono font-bold">
              {{ todo.dueDate }}
            </span>
          </div>

          <!-- Snippet Badge -->
          <button 
            v-if="snippets.filter(s => s.taskId === todo.id).length > 0"
            @click="openSnippetModal(todo.id)"
            class="flex items-center gap-1 text-[10px] px-2 py-0.5 font-bold bg-[#00f0ff] text-black border border-black hover:bg-cyan-300 transition-colors shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          >
            <FileText :size="12" />
            笔记 ({{ snippets.filter(s => s.taskId === todo.id).length }})
          </button>

          <button @click="deleteTodo(todo.id)" class="shrink-0 opacity-0 group-hover:opacity-100 p-1 border border-black bg-red-500 text-white hover:bg-red-600 transition-opacity">
            <Trash2 :size="14" />
          </button>
        </li>
      </ul>
    </div>
  </div>

  <!-- Snippet Modal (Teleported to body) -->
  <Teleport to="body">
    <div v-if="showSnippetModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" @click.self="closeSnippetModal">
      <div class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg">
        <div class="flex justify-between items-center mb-4 pb-2 border-b-4 border-black">
          <h3 class="text-lg font-black uppercase flex items-center gap-2 text-black">
            <FileText class="w-5 h-5 text-black" />
            关联知识片段
          </h3>
          <button @click="closeSnippetModal" class="p-1 border-2 border-black bg-yellow-300 text-black hover:bg-yellow-400">
            <X class="w-4 h-4" />
          </button>
        </div>
        <div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div v-for="snippet in selectedTodoSnippets" :key="snippet.id" class="bg-yellow-100 border-2 border-black p-4">
            <h4 class="font-black text-sm text-black mb-2 flex items-center justify-between">
              <span>{{ snippet.title }}</span>
              <div v-if="snippet.tags && snippet.tags.length" class="flex gap-1">
                <span v-for="tag in snippet.tags" :key="tag" class="text-[9px] font-bold px-1.5 py-0.5 bg-black text-white">#{{ tag }}</span>
              </div>
            </h4>
            <pre class="text-xs text-black bg-white p-3 font-mono border-2 border-black overflow-x-auto"><code>{{ snippet.code }}</code></pre>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
</style>
