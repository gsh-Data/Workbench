<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import TodoWidget from '../components/TodoWidget.vue';
import SnippetManager from '../components/SnippetManager.vue';
import CronMonitor from '../components/CronMonitor.vue';
import { Lightbulb, Send } from '@lucide/vue';

const greeting = ref('');
const timeStr = ref('');
let timeInterval;

const updateTime = () => {
  const now = new Date();
  timeStr.value = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const hour = now.getHours();
  if (hour < 12) greeting.value = '早上好';
  else if (hour < 18) greeting.value = '下午好';
  else greeting.value = '晚上好';
};

const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm prose-invert focus:outline-none min-h-[100px] max-h-[150px] overflow-y-auto p-4',
    },
  },
});

const saveIdea = () => {
  const content = editor.value.getHTML();
  if (!content || content === '<p></p>') return;
  // TODO: Save to knowledge base / inbox (mocked for now)
  console.log('Saved idea:', content);
  editor.value.commands.clearContent();
  // We can trigger an SSE mock here but this is front-end.
};

onMounted(() => {
  updateTime();
  timeInterval = setInterval(updateTime, 1000);
});

onBeforeUnmount(() => {
  clearInterval(timeInterval);
  if (editor.value) editor.value.destroy();
});
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome Card -->
    <div class="p-8 rounded-3xl bg-bg-secondary border border-white/5 shadow-2xl relative overflow-hidden">
      <div class="absolute top-0 right-0 w-64 h-64 bg-accent-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div class="relative z-10">
        <h1 class="text-4xl font-bold mb-2 text-text-primary">{{ timeStr }}</h1>
        <p class="text-lg text-text-secondary">{{ greeting }}，创造者。</p>
      </div>
    </div>

    <!-- Quick Capture & Widgets -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Left Column: Quick Entry & Todos -->
      <div class="col-span-1 lg:col-span-2 space-y-6">
        <!-- Tiptap Quick Entry -->
        <div class="rounded-2xl bg-bg-secondary border border-white/10 overflow-hidden shadow-md">
          <div class="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
            <Lightbulb class="w-4 h-4 text-accent-secondary" />
            <h3 class="text-sm font-semibold">快速记录</h3>
          </div>
          <div class="bg-black/20">
            <editor-content :editor="editor" />
          </div>
          <div class="p-2 border-t border-white/5 flex justify-end bg-white/5">
            <button @click="saveIdea" class="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-accent-gradient text-sm font-medium text-white hover:brightness-110 transition-all">
              <Send class="w-3 h-3" /> 保存
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <TodoWidget />
           <CronMonitor />
        </div>
      </div>
      
      <!-- Right Column: Snippets -->
      <div class="col-span-1">
        <SnippetManager />
      </div>
    </div>
  </div>
</template>

<style>
/* Tiptap overrides */
.ProseMirror p {
  margin-top: 0;
  margin-bottom: 0.5em;
  color: #e2e8f0;
}
.ProseMirror p.is-editor-empty:first-child::before {
  content: '在此记录你的想法...';
  float: left;
  color: #64748b;
  pointer-events: none;
  height: 0;
}
</style>
