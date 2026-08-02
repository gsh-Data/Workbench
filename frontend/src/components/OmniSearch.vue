<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Search, FileText, CheckSquare, Code, ArrowRight, CornerDownLeft, X, Copy, Check } from '@lucide/vue';
import api from '../utils/api';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const router = useRouter();

const searchInput = ref(null);
const query = ref('');
const activeIndex = ref(0);

const docs = ref([]);
const todos = ref([]);
const snippets = ref([]);
const loading = ref(false);
const copiedId = ref(null);

const fetchData = async () => {
  if (docs.value.length > 0) return; // cache
  loading.value = true;
  try {
    const [docsRes, todosRes, snippetsRes] = await Promise.all([
      api.get('/docs'),
      api.get('/todos'),
      api.get('/snippets')
    ]);
    docs.value = docsRes.data || [];
    todos.value = todosRes.data || [];
    snippets.value = snippetsRes.data || [];
  } catch (error) {
    console.error('Failed to load search data:', error);
  } finally {
    loading.value = false;
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    fetchData();
    query.value = '';
    activeIndex.value = 0;
    setTimeout(() => {
      if (searchInput.value) searchInput.value.focus();
    }, 50);
  }
});

const filteredResults = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) {
    // Recent items if query is empty
    return [
      ...docs.value.slice(0, 3).map(d => ({ type: 'doc', id: d.name, title: d.name.replace('.md', ''), subtitle: '知识库文档', data: d })),
      ...todos.value.filter(t => !t.completed).slice(0, 3).map(t => ({ type: 'todo', id: t.id, title: t.text, subtitle: t.dueDate ? `截止: ${t.dueDate}` : '待办事项', data: t })),
      ...snippets.value.slice(0, 3).map(s => ({ type: 'snippet', id: s.id, title: s.title, subtitle: `代码片段 ${s.tags ? '#' + s.tags.join(' #') : ''}`, data: s }))
    ];
  }

  const results = [];

  // Search docs
  docs.value.forEach(d => {
    const title = d.name.replace('.md', '');
    if (title.toLowerCase().includes(q)) {
      results.push({ type: 'doc', id: d.name, title, subtitle: '知识库文档', data: d });
    }
  });

  // Search todos
  todos.value.forEach(t => {
    if (t.text.toLowerCase().includes(q)) {
      results.push({ 
        type: 'todo', 
        id: t.id, 
        title: t.text, 
        subtitle: t.status === 'in-progress' ? '进行中任务' : (t.completed ? '已完成任务' : '待办任务'), 
        data: t 
      });
    }
  });

  // Search snippets
  snippets.value.forEach(s => {
    const titleMatch = s.title.toLowerCase().includes(q);
    const codeMatch = s.code && s.code.toLowerCase().includes(q);
    const tagMatch = s.tags && s.tags.some(t => t.toLowerCase().includes(q));
    if (titleMatch || codeMatch || tagMatch) {
      results.push({ 
        type: 'snippet', 
        id: s.id, 
        title: s.title, 
        subtitle: `代码片段 · ${s.code ? s.code.slice(0, 35) + '...' : ''}`, 
        data: s 
      });
    }
  });

  return results.slice(0, 10);
});

watch(filteredResults, () => {
  activeIndex.value = 0;
});

const handleKeyDown = (e) => {
  if (!props.isOpen) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (filteredResults.value.length > 0) {
      activeIndex.value = (activeIndex.value + 1) % filteredResults.value.length;
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (filteredResults.value.length > 0) {
      activeIndex.value = (activeIndex.value - 1 + filteredResults.value.length) % filteredResults.value.length;
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (filteredResults.value[activeIndex.value]) {
      selectItem(filteredResults.value[activeIndex.value]);
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    close();
  }
};

const selectItem = (item) => {
  if (item.type === 'doc') {
    router.push({ path: '/knowledge', query: { doc: item.data.name } });
    close();
  } else if (item.type === 'todo') {
    router.push({ path: '/calendar' });
    close();
  } else if (item.type === 'snippet') {
    if (item.data.code) {
      navigator.clipboard.writeText(item.data.code);
      copiedId.value = item.id;
      setTimeout(() => { copiedId.value = null; close(); }, 800);
    } else {
      close();
    }
  }
};

const close = () => {
  emit('close');
};

const onGlobalKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (props.isOpen) {
      close();
    } else {
      // Toggle search
      emit('open');
    }
  }
};

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown);
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
      @click.self="close"
    >
      <div class="bg-white/95 backdrop-blur-2xl border border-zinc-200/80 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden font-sans flex flex-col transform transition-all animate-in fade-in zoom-in-95 duration-150">
        
        <!-- Search Input Bar -->
        <div class="flex items-center px-4 border-b border-zinc-100 bg-white/50">
          <Search class="w-5 h-5 text-zinc-400 shrink-0 mr-3" />
          <input 
            ref="searchInput"
            v-model="query"
            placeholder="搜索知识库文档、待办任务、代码片段... (Esc 取消)"
            class="w-full py-4 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none font-medium"
          />
          <button @click="close" class="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Results List -->
        <div class="max-h-[380px] overflow-y-auto p-2">
          <div v-if="loading" class="text-xs text-zinc-400 text-center py-8">
            搜索加载中...
          </div>
          <div v-else-if="filteredResults.length === 0" class="text-xs text-zinc-400 text-center py-8">
            未找到与 "{{ query }}" 匹配的内容
          </div>

          <div v-else class="space-y-1">
            <div 
              v-for="(item, idx) in filteredResults" 
              :key="item.type + item.id"
              @click="selectItem(item)"
              @mouseenter="activeIndex = idx"
              class="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent"
              :class="activeIndex === idx ? 'bg-blue-50/80 border-blue-200/60 text-blue-900' : 'hover:bg-zinc-50 text-zinc-800'"
            >
              <!-- Icon badge -->
              <div 
                class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                :class="{
                  'bg-blue-100/80 border-blue-200 text-blue-600': item.type === 'doc',
                  'bg-amber-100/80 border-amber-200 text-amber-600': item.type === 'todo',
                  'bg-emerald-100/80 border-emerald-200 text-emerald-600': item.type === 'snippet'
                }"
              >
                <FileText v-if="item.type === 'doc'" class="w-4 h-4" />
                <CheckSquare v-else-if="item.type === 'todo'" class="w-4 h-4" />
                <Code v-else-if="item.type === 'snippet'" class="w-4 h-4" />
              </div>

              <!-- Title & Subtitle -->
              <div class="flex-1 overflow-hidden">
                <div class="text-sm font-semibold truncate leading-snug">{{ item.title }}</div>
                <div class="text-[11px] text-zinc-500 truncate leading-snug">{{ item.subtitle }}</div>
              </div>

              <!-- Action Status -->
              <div class="shrink-0 flex items-center gap-1.5 text-xs text-zinc-400">
                <span v-if="copiedId === item.id" class="text-emerald-600 font-medium flex items-center gap-1">
                  <Check class="w-3.5 h-3.5" /> 已复制
                </span>
                <span v-else-if="item.type === 'snippet'" class="text-[10px] text-zinc-400 flex items-center gap-1 bg-zinc-100 px-1.5 py-0.5 rounded">
                  <Copy class="w-3 h-3" /> 复制代码
                </span>
                <CornerDownLeft v-else class="w-4 h-4 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        <!-- Footer Instructions -->
        <div class="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between text-[11px] text-zinc-400">
          <div class="flex items-center gap-3">
            <span><kbd class="px-1.5 py-0.5 bg-white rounded border border-zinc-200 font-mono text-[10px]">↑↓</kbd> 移动选择</span>
            <span><kbd class="px-1.5 py-0.5 bg-white rounded border border-zinc-200 font-mono text-[10px]">↵</kbd> 打开 / 复制</span>
            <span><kbd class="px-1.5 py-0.5 bg-white rounded border border-zinc-200 font-mono text-[10px]">Esc</kbd> 退出</span>
          </div>
          <div class="font-mono text-[10px] text-zinc-400">Ctrl + K</div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
