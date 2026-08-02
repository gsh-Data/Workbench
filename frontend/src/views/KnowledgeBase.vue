<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { 
  FileText, Plus, Save, ChevronRight, Folder, Link2, X, Settings2, Download,
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Undo, Redo, Image as ImageIcon, Sparkles
} from '@lucide/vue';

const exportDocsZip = () => {
  window.location.href = 'http://localhost:3000/api/docs/export';
};

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

const showAiSummaryModal = ref(false);
const isSummarizing = ref(false);
const aiSummaryText = ref('');

const aiSummarizeDoc = async () => {
  if (!activeFile.value || !editor.value) return;
  isSummarizing.value = true;
  aiSummaryText.value = '';
  showAiSummaryModal.value = true;

  try {
    const textContent = editor.value.getText();
    const res = await api.post('/ai/summarize-doc', {
      docTitle: activeFile.value.name,
      docContent: textContent
    });
    aiSummaryText.value = res.data.summary || '提炼完成但未获得有效内容';
  } catch (error) {
    console.error('AI Summarize failed:', error);
    aiSummaryText.value = '❌ 文档智能提炼失败，请确认是否配置 DeepSeek API Key。';
  } finally {
    isSummarizing.value = false;
  }
};

const insertSummaryToDoc = () => {
  if (editor.value && aiSummaryText.value) {
    const summaryHtml = `<blockquote><strong>🧠 DeepSeek AI 智能简报提炼：</strong><br/>${aiSummaryText.value.replace(/\n/g, '<br/>')}</blockquote><hr/>`;
    editor.value.chain().focus().insertContent(summaryHtml).run();
    showAiSummaryModal.value = false;
  }
};

const editor = useEditor({
  content: '<h1>欢迎使用知识库 (Knowledge Base)</h1><p>选择左侧文档或者点击 [+] 创建新文档。</p>',
  extensions: [
    StarterKit,
    ResizableImageExtension
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-zinc focus:outline-none min-h-[480px] max-w-none p-4 font-sans text-zinc-900',
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
    editor.value.commands.setContent(`<h1>${currentDoc.value.name}</h1><p>开始撰写文档内容...</p>`);
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
  <div class="h-full flex bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden font-sans">
    
    <!-- Sidebar / File Tree -->
    <div class="w-64 bg-zinc-50 border-r border-zinc-200 flex flex-col shrink-0">
      <div class="p-4 border-b border-zinc-200 bg-white flex items-center justify-between">
        <h3 class="font-semibold text-sm text-zinc-900 flex items-center gap-2">
          <Folder class="w-4 h-4 text-blue-600" />
          <span>知识库文档</span>
        </h3>
        <button @click="openAddModal" class="p-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 transition-colors">
          <Plus class="w-4 h-4" />
        </button>
      </div>
      
      <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div v-if="loading" class="text-xs font-medium text-zinc-400 text-center py-6">加载文档中...</div>
        <button 
          v-for="file in files" :key="file.name"
          @click="openFile(file)"
          class="w-full text-left p-2.5 rounded-lg border text-xs font-medium transition-all flex items-start gap-2.5"
          :class="activeFile?.name === file.name ? 'bg-blue-50 border-blue-200 text-blue-600 font-semibold shadow-sm' : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100 shadow-sm'"
        >
          <FileText class="w-4 h-4 mt-0.5 shrink-0" :class="activeFile?.name === file.name ? 'text-blue-600' : 'text-zinc-400'" />
          <div class="flex-1 overflow-hidden">
            <div class="truncate text-xs">{{ file.name.replace('.md', '') }}</div>
            <div v-if="file.taskId" class="text-[10px] mt-1 text-blue-700 font-medium flex items-center gap-1 bg-blue-50/80 px-1.5 py-0.5 rounded border border-blue-100 truncate">
              <Link2 class="w-3 h-3 shrink-0"/> <span class="truncate">{{ getTodoName(file.taskId) }}</span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Editor Main Area -->
    <div class="flex-1 flex flex-col bg-white overflow-hidden">
      <!-- Title & Save Header -->
      <div class="h-14 border-b border-zinc-200 flex items-center justify-between px-6 bg-white shrink-0">
        <div class="flex items-center gap-2 text-xs font-semibold text-zinc-700">
          <span class="text-zinc-400">文档</span>
          <ChevronRight class="w-4 h-4 text-zinc-400" />
          <span v-if="activeFile" class="flex items-center gap-2.5 text-zinc-900">
            {{ activeFile.name.replace('.md', '') }}
            <button @click="openLinkModal" class="px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-50 text-zinc-600 text-[11px] font-medium hover:bg-zinc-100 transition-colors flex items-center gap-1">
              <Settings2 class="w-3 h-3"/><span>设置关联</span>
            </button>
          </span>
          <span v-else class="text-zinc-400">[未选择文档]</span>
        </div>
        
        <div class="flex items-center gap-2">
          <button 
            @click="aiSummarizeDoc" 
            :disabled="!activeFile || isSummarizing"
            class="px-3 py-1.5 rounded-lg border border-purple-200/80 bg-gradient-to-r from-purple-500 to-rose-500 text-white hover:from-purple-600 hover:to-rose-600 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            title="使用 DeepSeek AI 智能提炼文档摘要与要点"
          >
            <Sparkles class="w-3.5 h-3.5 text-yellow-200 animate-pulse" />
            <span>{{ isSummarizing ? 'AI 提炼中...' : 'AI 智能提炼' }}</span>
          </button>

          <button @click="exportDocsZip" class="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm">
            <Download class="w-3.5 h-3.5 text-blue-600" />
            <span>导出 ZIP</span>
          </button>
          <button @click="saveFile()" :disabled="!activeFile || isSaving" class="btn-primary text-xs py-1.5 px-4 disabled:opacity-50 flex items-center gap-1.5">
            <Save class="w-3.5 h-3.5" />
            <span>{{ isSaving ? '保存中...' : '保存修改' }}</span>
          </button>
        </div>
      </div>

      <!-- Editor Toolbar -->
      <div class="border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center gap-1 p-2" v-if="editor">
        <button @click="editor.chain().focus().toggleBold().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('bold'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('bold') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="加粗">
          <Bold class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleItalic().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('italic'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('italic') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="斜体">
          <Italic class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleStrike().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('strike'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('strike') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="删除线">
          <Strikethrough class="w-4 h-4" />
        </button>
        
        <div class="w-[1px] h-5 bg-zinc-300 mx-1"></div>
        
        <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('heading', { level: 1 }), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('heading', { level: 1 }) }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="H1 标题">
          <Heading1 class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('heading', { level: 2 }), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('heading', { level: 2 }) }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="H2 标题">
          <Heading2 class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('heading', { level: 3 }), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('heading', { level: 3 }) }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="H3 标题">
          <Heading3 class="w-4 h-4" />
        </button>
        
        <div class="w-[1px] h-5 bg-zinc-300 mx-1"></div>
        
        <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('bulletList'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('bulletList') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="无序列表">
          <List class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('orderedList'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('orderedList') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="有序列表">
          <ListOrdered class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('blockquote'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('blockquote') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="引用">
          <Quote class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().toggleCodeBlock().run()" :class="{ 'bg-blue-50 text-blue-600 border-blue-200 font-semibold': editor.isActive('codeBlock'), 'bg-white text-zinc-700 border-zinc-200': !editor.isActive('codeBlock') }" class="p-1.5 rounded-lg border text-xs hover:bg-zinc-100 transition-colors" title="代码块">
          <Code class="w-4 h-4" />
        </button>
        
        <div class="w-[1px] h-5 bg-zinc-300 mx-1"></div>
        
        <button @click="triggerImageUpload" class="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs hover:bg-zinc-100 transition-colors" title="插入图片">
          <ImageIcon class="w-4 h-4" />
        </button>
        <input type="file" ref="fileInputRef" @change="handleImageUpload" accept="image/*" class="hidden" />
        
        <div class="flex-1"></div>
        
        <button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()" class="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 disabled:opacity-40 hover:bg-zinc-100 transition-colors" title="撤销">
          <Undo class="w-4 h-4" />
        </button>
        <button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()" class="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 disabled:opacity-40 hover:bg-zinc-100 transition-colors" title="重做">
          <Redo class="w-4 h-4" />
        </button>
      </div>
      
      <!-- Editor Canvas Area -->
      <div class="flex-1 overflow-y-auto p-6 bg-zinc-50">
        <div class="bg-white border border-zinc-200 rounded-xl min-h-full p-6 shadow-sm">
          <editor-content :editor="editor" />
        </div>
      </div>
    </div>

    <!-- Metadata Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm" @click.self="closeModal">
        <div class="bg-white border border-zinc-200 rounded-xl p-6 shadow-md w-full max-w-md">
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
            <h3 class="text-base font-semibold text-zinc-900 flex items-center gap-2">
              <Folder class="w-4 h-4 text-blue-600" />
              {{ isEditing ? '文档关联设置' : '新建知识库文档' }}
            </h3>
            <button @click="closeModal" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
              <X class="w-4 h-4" />
            </button>
          </div>
          
          <form @submit.prevent="confirmModal" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-zinc-700 mb-1.5">文档名称</label>
              <input 
                v-model="currentDoc.name" 
                :disabled="isEditing"
                placeholder="例如: 架构设计方案" 
                class="input-base"
                required 
                autofocus 
              />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-zinc-700 mb-1.5">关联任务 (可选)</label>
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
            
            <div class="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              <button type="button" @click="closeModal" class="px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs font-medium hover:bg-zinc-50">取消</button>
              <button type="submit" class="btn-primary text-xs py-2 px-4">
                {{ isEditing ? '保存设置' : '创建文档' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
    <!-- AI Summary Result Modal -->
    <Teleport to="body">
      <div v-if="showAiSummaryModal" class="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm" @click.self="showAiSummaryModal = false">
        <div class="bg-white/95 backdrop-blur-2xl border border-purple-100 rounded-2xl p-6 shadow-2xl w-full max-w-lg font-sans">
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-purple-100">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-rose-500 text-white flex items-center justify-center shadow-sm">
                <Sparkles class="w-4 h-4" />
              </div>
              <h3 class="font-semibold text-sm text-zinc-900">DeepSeek AI 智能提炼摘要</h3>
            </div>
            <button @click="showAiSummaryModal = false" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div v-if="isSummarizing" class="text-xs text-zinc-400 text-center py-12 flex flex-col items-center gap-2">
            <div class="flex gap-1">
              <span class="w-2 h-2 rounded-full bg-purple-500 animate-bounce"></span>
              <span class="w-2 h-2 rounded-full bg-rose-500 animate-bounce delay-100"></span>
              <span class="w-2 h-2 rounded-full bg-pink-500 animate-bounce delay-200"></span>
            </div>
            <span>DeepSeek AI 正在阅读提炼《{{ activeFile?.name }}》...</span>
          </div>

          <div v-else class="space-y-4">
            <div class="p-4 bg-purple-50/50 border border-purple-100 rounded-xl text-xs text-zinc-800 leading-relaxed font-sans max-h-72 overflow-y-auto whitespace-pre-wrap">
              {{ aiSummaryText }}
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              <button @click="showAiSummaryModal = false" class="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100">
                关闭
              </button>
              <button @click="insertSummaryToDoc" class="bg-gradient-to-r from-purple-500 to-rose-500 text-white px-4 py-2 rounded-xl font-semibold text-xs hover:from-purple-600 hover:to-rose-600 transition-all shadow-md flex items-center gap-1.5">
                <Plus class="w-3.5 h-3.5" />
                <span>插入到文档开头</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
.ProseMirror {
  color: #1d1d1f;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif;
}
.ProseMirror p {
  margin-top: 0;
  margin-bottom: 1em;
  color: #374151;
  line-height: 1.7;
  font-size: 0.95rem;
}
.ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
  color: #111827;
  font-weight: 600;
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  letter-spacing: -0.02em;
}
.ProseMirror h1 { font-size: 1.75em; border-bottom: 1px solid #e5e7eb; pb: 0.3em; }
.ProseMirror h2 { font-size: 1.35em; border-bottom: 1px solid #f3f4f6; pb: 0.2em; }
.ProseMirror h3 { font-size: 1.15em; }
.ProseMirror ul {
  list-style-type: disc;
  padding-left: 1.5em;
  margin-bottom: 1em;
}
.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.5em;
  margin-bottom: 1em;
}
.ProseMirror blockquote {
  border-left: 4px solid #2563eb;
  padding-left: 1rem;
  background: rgba(37, 99, 235, 0.05);
  color: #374151;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  margin-bottom: 1em;
  border-radius: 0 0.5rem 0.5rem 0;
}
.ProseMirror code {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875em;
  color: #2563eb;
}
.ProseMirror pre {
  background: #18181b;
  color: #f4f4f5;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid #27272a;
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
