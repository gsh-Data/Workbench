<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { 
  FileText, Plus, Save, ChevronRight, Folder, Link2, X, Settings2,
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Undo, Redo, Image as ImageIcon
} from '@lucide/vue';
import api from '../utils/api';
import { ResizableImageExtension } from '../utils/ResizableImageExtension';

const files = ref([]);
const todos = ref([]);
const activeFile = ref(null);
const loading = ref(true);
const isSaving = ref(false);

const showModal = ref(false);
const isEditing = ref(false);
const currentDoc = ref({ name: '', taskId: '' });
const fileInputRef = ref(null);

const editor = useEditor({
  content: '# 欢迎来到知识库 (KNOWLEDGE BASE)\n\n选择一个文件或者创建一个新文件。',
  extensions: [
    StarterKit,
    ResizableImageExtension
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-lg focus:outline-none min-h-[500px] max-w-none p-6 font-mono text-black',
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

const triggerImageUpload = () => {
  if (fileInputRef.value) {
    fileInputRef.value.click();
  }
};

const handleImageUpload = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    editor.value.chain().focus().setImage({ src: dataUrl }).run();
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

const closeModal = () => {
  showModal.value = false;
};

const confirmModal = async () => {
  if (!currentDoc.value.name) return;
  const filename = currentDoc.value.name.endsWith('.md') ? currentDoc.value.name : `${currentDoc.value.name}.md`;
  
  if (!isEditing.value) {
    activeFile.value = { name: filename, taskId: currentDoc.value.taskId || null };
    editor.value.commands.setContent(`# ${currentDoc.value.name}\n\n`);
    await saveFile(true);
  } else {
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
    await fetchData();
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
  <div class="h-full flex bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden font-mono">
    
    <!-- Sidebar / File Tree -->
    <div class="w-64 bg-yellow-100 border-r-4 border-black flex flex-col shrink-0">
      <div class="p-4 border-b-4 border-black bg-yellow-300 flex items-center justify-between">
        <h3 class="font-black text-sm uppercase flex items-center gap-2 text-black">
          <Folder class="w-4 h-4 text-black" />
          知识库文档
        </h3>
        <button @click="openAddModal" class="p-1 border-2 border-black bg-white hover:bg-yellow-400">
          <Plus class="w-4 h-4 text-black" />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-2 space-y-2">
        <div v-if="loading" class="text-xs font-bold text-black text-center py-4">[加载中...]</div>
        <button 
          v-for="file in files" :key="file.name"
          @click="openFile(file)"
          class="w-full text-left p-2.5 border-2 border-black text-xs font-bold transition-all flex items-start gap-2"
          :class="activeFile?.name === file.name ? 'bg-black text-white shadow-[3px_3px_0px_0px_rgba(255,0,110,1)]' : 'bg-white text-black hover:bg-yellow-200 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'"
        >
          <FileText class="w-4 h-4 mt-0.5 shrink-0" />
          <div class="flex-1 overflow-hidden">
            <div class="truncate uppercase font-black">{{ file.name.replace('.md', '') }}</div>
            <div v-if="file.taskId" class="text-[9px] mt-1 text-black font-bold flex items-center gap-1 bg-yellow-300 px-1 py-0.5 border border-black truncate">
              <Link2 class="w-3 h-3 shrink-0"/> <span class="truncate">{{ getTodoName(file.taskId) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Editor Main Area -->
    <div class="flex-1 flex flex-col bg-white overflow-hidden">
      <!-- Title & Save Header -->
      <div class="h-14 border-b-4 border-black flex items-center justify-between px-6 bg-yellow-300 shrink-0">
        <div class="flex items-center gap-2 text-xs font-black text-black uppercase">
          <span>DOCS</span>
          <ChevronRight class="w-4 h-4 text-black" />
          <span v-if="activeFile" class="flex items-center gap-3">
            {{ activeFile.name.replace('.md', '') }}
            <button @click="openLinkModal" class="px-2 py-0.5 border-2 border-black bg-white text-[10px] font-black hover:bg-yellow-100">
              <Settings2 class="w-3 h-3 inline mr-1"/>设置关联
            </button>
          </span>
          <span v-else>[未命名文档]</span>
        </div>
        
        <button @click="saveFile()" :disabled="!activeFile || isSaving" class="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
          <Save class="w-4 h-4 inline mr-1" />
          {{ isSaving ? '保存中...' : '保存修改' }}
        </button>
      </div>

      <!-- Editor Toolbar -->
      <div class="border-b-4 border-black bg-white flex flex-wrap items-center gap-1 p-2" v-if="editor">
        <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'bg-black text-white': editor.isActive('bold'), 'bg-white text-black': !editor.isActive('bold') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="加粗">
          <Bold class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'bg-black text-white': editor.isActive('italic'), 'bg-white text-black': !editor.isActive('italic') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="斜体">
          <Italic class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'bg-black text-white': editor.isActive('strike'), 'bg-white text-black': !editor.isActive('strike') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="删除线">
          <Strikethrough class="w-4 h-4" />
        </button>
        
        <div class="w-1 h-6 bg-black mx-1"></div>
        
        <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'bg-black text-white': editor.isActive('heading', { level: 1 }), 'bg-white text-black': !editor.isActive('heading', { level: 1 }) }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="H1">
          <Heading1 class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'bg-black text-white': editor.isActive('heading', { level: 2 }), 'bg-white text-black': !editor.isActive('heading', { level: 2 }) }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="H2">
          <Heading2 class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'bg-black text-white': editor.isActive('heading', { level: 3 }), 'bg-white text-black': !editor.isActive('heading', { level: 3 }) }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="H3">
          <Heading3 class="w-4 h-4" />
        </button>
        
        <div class="w-1 h-6 bg-black mx-1"></div>
        
        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'bg-black text-white': editor.isActive('bulletList'), 'bg-white text-black': !editor.isActive('bulletList') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="无序列表">
          <List class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'bg-black text-white': editor.isActive('orderedList'), 'bg-white text-black': !editor.isActive('orderedList') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="有序列表">
          <ListOrdered class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'bg-black text-white': editor.isActive('blockquote'), 'bg-white text-black': !editor.isActive('blockquote') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="引用">
          <Quote class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'bg-black text-white': editor.isActive('codeBlock'), 'bg-white text-black': !editor.isActive('codeBlock') }" class="p-1.5 border-2 border-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="代码块">
          <Code class="w-4 h-4" />
        </button>
        
        <div class="w-1 h-6 bg-black mx-1"></div>
        
        <button @click="triggerImageUpload" class="p-1.5 border-2 border-black bg-white text-black font-bold text-xs shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300" title="插入图片">
          <ImageIcon class="w-4 h-4" />
        </button>
        <input type="file" ref="fileInputRef" @change="handleImageUpload" accept="image/*" class="hidden" />
        
        <div class="flex-1"></div>
        
        <button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()" class="p-1.5 border-2 border-black bg-white text-black disabled:opacity-30 hover:bg-yellow-300" title="撤销">
          <Undo class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()" class="p-1.5 border-2 border-black bg-white text-black disabled:opacity-30 hover:bg-yellow-300" title="重做">
          <Redo class="w-4 h-4" />
        </button>
      </div>
      
      <!-- Editor Canvas Area -->
      <div class="flex-1 overflow-y-auto p-4 bg-yellow-50">
        <div class="bg-white border-4 border-black min-h-full p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <editor-content :editor="editor" />
        </div>
      </div>
    </div>

    <!-- Metadata Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/60" @click.self="closeModal">
        <div class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
          <div class="flex justify-between items-center mb-4 pb-2 border-b-4 border-black">
            <h3 class="text-lg font-black uppercase text-black flex items-center gap-2">
              <Folder class="w-5 h-5 text-black" />
              {{ isEditing ? '文档关联设置' : '新建知识库文档' }}
            </h3>
            <button @click="closeModal" class="p-1 border-2 border-black bg-yellow-300">
              <X class="w-4 h-4 text-black" />
            </button>
          </div>
          
          <form @submit.prevent="confirmModal" class="space-y-4">
            <div>
              <label class="block text-xs font-black text-black uppercase mb-1">文档名称</label>
              <input 
                v-model="currentDoc.name" 
                :disabled="isEditing"
                placeholder="例如: 架构设计方案" 
                class="w-full border-4 border-black p-2.5 font-bold text-sm bg-white focus:bg-yellow-200 outline-none"
                required 
                autofocus 
              />
            </div>
            
            <div>
              <label class="block text-xs font-black text-black uppercase mb-1">关联任务 (可选)</label>
              <el-select 
                v-model="currentDoc.taskId" 
                placeholder="(无关联) 全局文档"
                clearable
                class="w-full"
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
            
            <div class="flex justify-end gap-2 pt-3 border-t-4 border-black">
              <button type="button" @click="closeModal" class="px-4 py-2 border-2 border-black bg-gray-200 font-bold text-xs uppercase">取消</button>
              <button type="submit" class="btn-primary text-xs py-2 px-5">
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
.ProseMirror {
  color: #000000;
}
.ProseMirror p {
  margin-top: 0;
  margin-bottom: 1em;
  color: #000000;
  line-height: 1.7;
  font-weight: 500;
}
.ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
  color: #000000;
  font-weight: 900;
  text-transform: uppercase;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
}
.ProseMirror h1 { font-size: 2em; border-bottom: 3px solid #000000; }
.ProseMirror h2 { font-size: 1.5em; border-bottom: 2px solid #000000; }
.ProseMirror h3 { font-size: 1.2em; }
.ProseMirror ul {
  list-style-type: square;
  padding-left: 1.5em;
  margin-bottom: 1em;
  font-weight: bold;
}
.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 1em;
  font-weight: bold;
}
.ProseMirror blockquote {
  border-left: 6px solid #000000;
  padding-left: 1rem;
  background: #fde047;
  color: #000000;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  margin-bottom: 1em;
  font-weight: 700;
  border-top: 2px solid #000000;
  border-bottom: 2px solid #000000;
  border-right: 2px solid #000000;
}
.ProseMirror code {
  background-color: #fde047;
  padding: 0.2em 0.4em;
  border: 1px solid #000000;
  font-family: monospace;
  font-size: 0.9em;
  font-weight: 800;
}
.ProseMirror pre {
  background: #000000;
  color: #00f0ff;
  padding: 1rem;
  border: 3px solid #000000;
  box-shadow: 4px 4px 0px 0px #ff006e;
  margin-bottom: 1em;
}
.ProseMirror pre code {
  background: none;
  padding: 0;
  border: none;
  color: inherit;
}
.ProseMirror.focus-visible {
  outline: none;
}
</style>
