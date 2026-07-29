<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { FileText, Plus, Save, ChevronRight, Folder, Link2, X, Settings2 } from '@lucide/vue';
import api from '../utils/api';

const files = ref([]);
const todos = ref([]);
const activeFile = ref(null);
const loading = ref(true);
const isSaving = ref(false);

const showModal = ref(false);
const isEditing = ref(false);
const currentDoc = ref({ name: '', taskId: '' });

const editor = useEditor({
  content: '# 欢迎来到知识库\n\n选择一个文件或者创建一个新文件。',
  extensions: [StarterKit],
  editorProps: {
    attributes: {
      class: 'prose prose-invert prose-lg focus:outline-none min-h-[500px] max-w-none p-8',
    },
  },
});

const activeTodos = computed(() => {
  return todos.value.filter(t => t.status !== 'done' && !t.completed);
});

const getTodoName = (taskId) => {
  const todo = todos.value.find(t => t.id === taskId);
  return todo ? todo.text : '未知任务';
};

const fetchData = async () => {
  try {
    const [docsRes, todosRes] = await Promise.all([
      api.get('/docs'),
      api.get('/todos')
    ]);
    files.value = docsRes.data;
    todos.value = todosRes.data;
    
    // Update activeFile if it's currently selected (to refresh metadata)
    if (activeFile.value) {
      const updated = files.value.find(f => f.name === activeFile.value.name);
      if (updated) activeFile.value = updated;
    }
  } catch (error) {
    console.error('Failed to load data', error);
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  isEditing.value = false;
  currentDoc.value = { name: '', taskId: '' };
  showModal.value = true;
};

const openLinkModal = () => {
  if (!activeFile.value) return;
  isEditing.value = true;
  currentDoc.value = { name: activeFile.value.name, taskId: activeFile.value.taskId || '' };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const confirmModal = async () => {
  if (!currentDoc.value.name) return;
  const filename = currentDoc.value.name.endsWith('.md') ? currentDoc.value.name : `${currentDoc.value.name}.md`;
  
  if (!isEditing.value) {
    // Create new file
    activeFile.value = { name: filename, taskId: currentDoc.value.taskId || null };
    editor.value.commands.setContent(`# ${currentDoc.value.name}\n\n`);
    // Save immediately to register it
    await saveFile(true);
  } else {
    // Just update metadata (resave file with current content and new taskId)
    activeFile.value.taskId = currentDoc.value.taskId || null;
    await saveFile();
  }
  closeModal();
};

const openFile = async (file) => {
  activeFile.value = file;
  try {
    const res = await api.get(`/docs/${file.name}`);
    editor.value.commands.setContent(res.data.content);
  } catch (error) {
    console.error('Failed to open file', error);
  }
};

const saveFile = async (isNew = false) => {
  if (!activeFile.value) return;
  isSaving.value = true;
  try {
    const content = editor.value.getHTML();
    await api.post('/docs', {
      filename: activeFile.value.name,
      content,
      taskId: activeFile.value.taskId || null
    });
    await fetchData(); // refresh list
  } catch (error) {
    console.error('Failed to save', error);
  } finally {
    isSaving.value = false;
  }
};

onMounted(fetchData);
onBeforeUnmount(() => {
  if (editor.value) editor.value.destroy();
});
</script>

<template>
  <div class="h-full flex bg-bg-secondary rounded-2xl border border-white/10 overflow-hidden shadow-2xl relative">
    
    <!-- Sidebar / File Tree -->
    <div class="w-64 bg-black/20 border-r border-white/10 flex flex-col shrink-0">
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 class="font-semibold text-sm flex items-center gap-2 text-text-primary">
          <Folder class="w-4 h-4 text-accent-primary" />
          知识库文档
        </h3>
        <button @click="openAddModal" class="p-1 hover:bg-white/10 rounded-lg text-text-secondary hover:text-text-primary transition-colors">
          <Plus class="w-4 h-4" />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <div v-if="loading" class="text-xs text-text-secondary text-center py-4">加载中...</div>
        <button 
          v-for="file in files" :key="file.name"
          @click="openFile(file)"
          class="w-full text-left px-3 py-2.5 rounded-xl text-sm flex items-start gap-2 hover:bg-white/5 transition-all border border-transparent"
          :class="{ 'bg-white/10 text-text-primary font-medium border-white/5 shadow-sm': activeFile?.name === file.name, 'text-text-secondary': activeFile?.name !== file.name }"
        >
          <FileText class="w-4 h-4 mt-0.5 shrink-0" :class="activeFile?.name === file.name ? 'text-accent-primary' : ''" />
          <div class="flex-1 overflow-hidden">
            <div class="truncate">{{ file.name.replace('.md', '') }}</div>
            <div v-if="file.taskId" class="text-[10px] mt-1 text-accent-primary/80 flex items-center gap-1 font-normal bg-accent-primary/10 px-1.5 py-0.5 rounded w-fit max-w-full">
              <Link2 class="w-3 h-3 shrink-0"/> <span class="truncate">{{ getTodoName(file.taskId) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Editor -->
    <div class="flex-1 flex flex-col bg-bg-primary overflow-hidden">
      <div class="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-bg-secondary/50 backdrop-blur-md shrink-0">
        <div class="flex items-center gap-2 text-sm text-text-secondary">
          <span>文档</span>
          <ChevronRight class="w-4 h-4" />
          <span v-if="activeFile" class="text-text-primary font-medium flex items-center gap-3">
            {{ activeFile.name.replace('.md', '') }}
            <button @click="openLinkModal" class="p-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 text-xs flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors">
              <Settings2 class="w-3 h-3"/> 设置关联
            </button>
          </span>
          <span v-else>未命名</span>
        </div>
        
        <button @click="saveFile()" :disabled="!activeFile || isSaving" class="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-accent-gradient hover:brightness-110 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-[0_0_15px_rgba(var(--accent-primary),0.3)]">
          <Save class="w-4 h-4" />
          {{ isSaving ? '保存中...' : '保存修改' }}
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto">
        <editor-content :editor="editor" />
      </div>
    </div>

    <!-- Metadata Modal (Teleported) -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="closeModal">
        <div 
          class="bg-bg-secondary/90 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl w-full max-w-md" 
          v-motion 
          :initial="{ y: 50, opacity: 0, scale: 0.95 }" 
          :enter="{ y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
        >
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold flex items-center gap-2 text-text-primary">
              <Folder class="w-6 h-6 text-accent-primary" />
              {{ isEditing ? '文档关联设置' : '新建知识库文档' }}
            </h3>
            <button @click="closeModal" class="btn-icon w-8 h-8 rounded-full bg-white/5 hover:bg-white/10">
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <form @submit.prevent="confirmModal" class="space-y-5">
            <div>
              <label class="block text-xs text-text-secondary mb-1.5 ml-1">文档名称</label>
              <el-input 
                v-model="currentDoc.name" 
                :disabled="isEditing"
                placeholder="例如: 架构设计方案" 
                required 
                autofocus 
              />
            </div>
            
            <div>
              <label class="block text-xs text-text-secondary mb-1.5 ml-1">关联任务 (可选)</label>
              <el-select 
                v-model="currentDoc.taskId" 
                placeholder="(无关联) 全局文档"
                clearable
                class="w-full !bg-transparent"
                popper-class="apple-dropdown"
              >
                <el-option label="(无关联) 全局文档" value="" />
                <el-option 
                  v-for="todo in activeTodos" 
                  :key="todo.id" 
                  :label="todo.text" 
                  :value="todo.id"
                />
              </el-select>
            </div>
            
            <div class="flex justify-end gap-3 pt-4 border-t border-white/5">
              <button type="button" @click="closeModal" class="px-5 py-2.5 rounded-xl font-medium text-text-secondary hover:bg-white/5 transition-colors">取消</button>
              <button type="submit" class="bg-accent-primary text-white rounded-xl px-6 py-2.5 font-medium hover:brightness-110 transition-all shadow-[0_0_15px_rgba(var(--accent-primary),0.4)]">
                {{ isEditing ? '保存设置' : '创建文档' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.prose {
  color: #f8fafc;
}
.prose h1, .prose h2, .prose h3 {
  color: white;
}
.prose a {
  color: #3b82f6;
}
.prose code {
  color: #8b5cf6;
  background: rgba(0,0,0,0.3);
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
}
</style>
