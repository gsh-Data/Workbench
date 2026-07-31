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
    
    if (currentSnippet.value.taskId) {
      payload.taskId = currentSnippet.value.taskId;
    } else {
      payload.taskId = null;
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
  <div class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-[400px] font-mono">
    <!-- Header -->
    <div class="p-4 border-b-4 border-black bg-yellow-300 flex justify-between items-center">
      <h2 class="font-black uppercase text-black text-lg flex items-center gap-2">
        <CodeSquare :size="22" class="text-black" />
        知识片段 (SNIPPETS)
      </h2>
      <button @click="openAddModal" class="p-1 border-2 border-black bg-white hover:bg-yellow-400">
        <Plus :size="18" class="text-black" />
      </button>
    </div>
    
    <div class="p-4 flex-1 overflow-y-auto space-y-3">
      <div v-if="loading" class="text-center font-bold text-black py-4 text-xs">[加载中...]</div>
      <div v-else-if="snippets.length === 0" class="text-center font-bold text-black py-4 text-xs bg-yellow-50 border-2 border-black">[暂无保存的代码片段]</div>
      
      <div v-else class="space-y-3">
        <div v-for="snippet in snippets" :key="snippet.id" class="border-2 border-black p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] relative group">
          
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-black text-sm text-black uppercase flex items-center gap-2">
              {{ snippet.title }}
              <span v-if="snippet.taskId" class="text-[9px] bg-yellow-300 text-black px-1.5 py-0.5 border border-black font-bold truncate max-w-[120px]">
                <Link2 :size="10" class="inline shrink-0" /> <span class="truncate">{{ getTodoName(snippet.taskId) }}</span>
              </span>
            </h3>
            
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="copyCode(snippet.code)" class="p-1 border border-black bg-white hover:bg-yellow-300" title="复制">
                <Copy :size="12" />
              </button>
              <button @click="openEditModal(snippet)" class="p-1 border border-black bg-white hover:bg-yellow-300" title="编辑">
                <Edit2 :size="12" />
              </button>
              <button @click="deleteSnippet(snippet.id)" class="p-1 border border-black bg-red-500 text-white hover:bg-red-600" title="删除">
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
          
          <pre class="bg-black text-[#00f0ff] p-3 border-2 border-black text-xs font-mono overflow-x-auto mb-2 shadow-[2px_2px_0px_0px_rgba(255,0,110,1)]"><code>{{ snippet.code }}</code></pre>
          
          <div class="flex flex-wrap gap-1" v-if="snippet.tags && snippet.tags.length > 0">
            <span v-for="tag in snippet.tags" :key="tag" class="text-[9px] font-black uppercase bg-yellow-300 text-black px-1.5 py-0.5 border border-black">#{{ tag }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" @click.self="closeModal">
        <div class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg">
          <div class="flex justify-between items-center mb-4 pb-2 border-b-4 border-black">
            <h3 class="text-lg font-black uppercase text-black flex items-center gap-2">
              <CodeSquare class="w-5 h-5 text-black" />
              {{ isEditing ? '编辑知识片段' : '新增知识片段' }}
            </h3>
            <button @click="closeModal" class="p-1 border-2 border-black bg-yellow-300">
              <X class="w-4 h-4 text-black" />
            </button>
          </div>
          
          <form @submit.prevent="saveSnippet" class="space-y-3 font-mono">
            <div>
              <label class="block text-xs font-black text-black uppercase mb-1">标题</label>
              <input v-model="currentSnippet.title" placeholder="输入片段标题" class="w-full border-4 border-black p-2 text-xs font-bold bg-white" required autofocus />
            </div>
            
            <div>
              <label class="block text-xs font-black text-black uppercase mb-1">关联任务 (可选)</label>
              <el-select 
                v-model="currentSnippet.taskId" 
                placeholder="(不关联任务) 全局知识"
                clearable
                class="w-full"
              >
                <el-option label="(不关联任务) 全局知识" value="" />
                <el-option 
                  v-for="todo in activeTodos" 
                  :key="todo.id" 
                  :label="todo.text" 
                  :value="todo.id"
                />
              </el-select>
            </div>

            <div>
              <label class="block text-xs font-black text-black uppercase mb-1">内容 (代码/笔记)</label>
              <textarea v-model="currentSnippet.code" rows="5" placeholder="粘贴代码或笔记..." class="w-full border-4 border-black p-2 text-xs font-mono bg-white" required></textarea>
            </div>

            <div>
              <label class="block text-xs font-black text-black uppercase mb-1">标签</label>
              <input v-model="currentSnippet.tags" placeholder="例如: vue, frontend (用逗号分隔)" class="w-full border-4 border-black p-2 text-xs font-bold bg-white" />
            </div>
            
            <div class="flex justify-end gap-2 pt-2 border-t-4 border-black">
              <button type="button" @click="closeModal" class="px-4 py-2 border-2 border-black bg-gray-200 font-bold text-xs uppercase">取消</button>
              <button type="submit" class="btn-primary text-xs py-2 px-5">
                保存
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
</style>
