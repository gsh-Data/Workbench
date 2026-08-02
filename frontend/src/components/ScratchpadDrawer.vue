<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Edit3, X, Save, Copy, Check, FilePlus, Trash2 } from '@lucide/vue';
import api from '../utils/api';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['close']);
const router = useRouter();

const content = ref('');
const isSaving = ref(false);
const isCopied = ref(false);
let saveTimeout = null;

const fetchScratchpad = async () => {
  try {
    const res = await api.get('/scratchpad');
    content.value = res.data?.content || '';
  } catch (error) {
    console.error('Failed to load scratchpad:', error);
  }
};

const saveScratchpad = async () => {
  isSaving.value = true;
  try {
    await api.post('/scratchpad', { content: content.value });
  } catch (error) {
    console.error('Failed to save scratchpad:', error);
  } finally {
    isSaving.value = false;
  }
};

const onInput = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveScratchpad();
  }, 600);
};

const copyContent = () => {
  if (!content.value) return;
  navigator.clipboard.writeText(content.value);
  isCopied.value = true;
  setTimeout(() => { isCopied.value = false; }, 1500);
};

const clearContent = () => {
  content.value = '';
  saveScratchpad();
};

const convertToDoc = () => {
  if (!content.value) return;
  // Navigate to KnowledgeBase with pre-filled content
  router.push({ path: '/knowledge' });
  emit('close');
};

onMounted(fetchScratchpad);
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="isOpen" 
      class="fixed bottom-6 right-6 z-[90] w-96 bg-white/95 backdrop-blur-2xl border border-zinc-200/80 rounded-2xl shadow-xl p-5 flex flex-col font-sans animate-in slide-in-from-bottom-5 duration-200"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Edit3 class="w-4 h-4" />
          </div>
          <div>
            <h3 class="font-semibold text-sm text-zinc-900 tracking-tight">闪念草稿箱</h3>
            <div class="text-[10px] text-zinc-400 font-medium">
              {{ isSaving ? '自动保存中...' : '实时防抖保存' }}
            </div>
          </div>
        </div>

        <button @click="emit('close')" class="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Textarea -->
      <textarea 
        v-model="content"
        @input="onInput"
        placeholder="随时在此记录会议要点、闪念灵感、临时代码..."
        class="w-full h-56 bg-zinc-50/80 border border-zinc-200/80 rounded-xl p-3.5 text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono resize-none leading-relaxed transition-all"
      ></textarea>

      <!-- Action Footer -->
      <div class="flex items-center justify-between pt-3 mt-1 text-xs">
        <div class="flex items-center gap-1.5">
          <button 
            @click="copyContent"
            class="px-2.5 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 font-medium flex items-center gap-1 transition-colors"
          >
            <component :is="isCopied ? Check : Copy" class="w-3.5 h-3.5" :class="isCopied ? 'text-emerald-600' : 'text-zinc-500'" />
            <span>{{ isCopied ? '已复制' : '复制' }}</span>
          </button>

          <button 
            @click="clearContent"
            class="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
            title="清空草稿"
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <button 
          @click="convertToDoc"
          class="btn-primary py-1.5 px-3 rounded-lg text-xs font-medium flex items-center gap-1"
        >
          <FilePlus class="w-3.5 h-3.5" />
          <span>转为文档</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>
