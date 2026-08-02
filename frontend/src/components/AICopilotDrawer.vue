<script setup>
import { ref, watch, nextTick, onMounted } from 'vue';
import { 
  Sparkles, X, Send, Bot, User, Key, Cpu, Copy, Check, RefreshCw, MessageSquare 
} from '@lucide/vue';
import api from '../utils/api';
import AIKeyModal from './AIKeyModal.vue';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close']);

const messages = ref([
  {
    role: 'assistant',
    content: '你好！我是你的 **豆包 AI 智能领航员**（字节跳动 · 豆包大模型驱动）。很高兴为你服务！\n\n你可以向我询问任何编程、知识整理、日程规划或文本创作问题。你可以点击下方标签快速试用：',
    model: 'doubao-pro-32k'
  }
]);

const userInput = ref('');
const selectedModel = ref('doubao-pro-32k'); // 'doubao-pro-32k' | 'doubao-lite-32k'
const isGenerating = ref(false);
const showKeyModal = ref(false);
const chatContainer = ref(null);
const copiedIndex = ref(null);
const hasKey = ref(false);
const currentProvider = ref('local');
const localModel = ref('qwen2.5:latest');
const localModelsList = ref([]);

const quickPrompts = [
  '📝 帮我生成今日工作总结日报',
  '⚡ 检查并优化 JavaScript 异步代码',
  '🚀 拟定一个产品敏捷发布计划',
  '💡 寻找工作效率提升的妙招'
];

const checkKeyStatus = async () => {
  try {
    const res = await api.get('/ai/config');
    hasKey.value = res.data.hasKey;
    currentProvider.value = res.data.provider || 'local';
    localModel.value = res.data.localModel || 'qwen2.5:latest';
    if (currentProvider.value === 'local') {
      const localRes = await api.get('/ai/local-models');
      localModelsList.value = localRes.data.models || [];
      if (selectedModel.value === 'doubao-pro-32k' || !selectedModel.value) {
        selectedModel.value = localModel.value;
      }
    }
  } catch (e) {}
};

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const sendMessage = async (customPrompt = null) => {
  const query = customPrompt || userInput.value.trim();
  if (!query || isGenerating.value) return;

  messages.value.push({ role: 'user', content: query });
  if (!customPrompt) userInput.value = '';
  scrollToBottom();

  isGenerating.value = true;
  const assistantMsgIndex = messages.value.length;
  messages.value.push({ 
    role: 'assistant', 
    content: '', 
    model: selectedModel.value,
    isStreaming: true 
  });

  try {
    const payload = {
      model: selectedModel.value,
      messages: messages.value.slice(0, assistantMsgIndex).map(m => ({ role: m.role, content: m.content })),
      stream: true
    };

    const response = await fetch('http://localhost:3000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      messages.value[assistantMsgIndex].content = '⚠️ 请先配置 豆包 API Key 才能开始使用 AI 智能对话。';
      showKeyModal.value = true;
      return;
    }

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error || '请求失败');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          const dataStr = line.replace(/^data:\s*/, '').trim();
          if (dataStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              messages.value[assistantMsgIndex].content += delta.content;
            }
            scrollToBottom();
          } catch (e) {
            // Ignore parse errors on raw chunk splits
          }
        }
      }
    }
  } catch (error) {
    console.error('Doubao AI Chat Error:', error);
    messages.value[assistantMsgIndex].content += `\n\n❌ 出错了: ${error.message}`;
  } finally {
    messages.value[assistantMsgIndex].isStreaming = false;
    isGenerating.value = false;
    scrollToBottom();
  }
};

const copyContent = (text, index) => {
  navigator.clipboard.writeText(text);
  copiedIndex.value = index;
  setTimeout(() => { copiedIndex.value = null; }, 2000);
};

const clearChat = () => {
  messages.value = [
    {
      role: 'assistant',
      content: '对话记录已重置。随时告诉我你接下来的想法或需求！',
      model: selectedModel.value
    }
  ];
};

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    scrollToBottom();
    checkKeyStatus();
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- Overlay -->
    <div 
      v-if="isOpen" 
      class="fixed inset-0 bg-zinc-900/30 backdrop-blur-sm z-[100] transition-opacity" 
      @click="emit('close')"
    ></div>

    <!-- Drawer Panel -->
    <aside 
      :class="[
        'fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white/95 backdrop-blur-2xl border-l border-blue-100 shadow-2xl z-[105] flex flex-col font-sans transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      ]"
    >
      <!-- Drawer Header -->
      <div class="h-16 px-5 border-b border-blue-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-blue-50/60 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-blue-600 text-white flex items-center justify-center shadow-md">
            <Sparkles class="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-sm text-zinc-900">
                {{ currentProvider === 'local' ? '🏡 本地 AI 领航员' : '☁️ 豆包 AI 领航员' }}
              </h3>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="currentProvider === 'local' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-100 text-blue-600 border border-blue-200'">
                {{ currentProvider === 'local' ? (selectedModel || 'Ollama 本地') : '豆包大模型' }}
              </span>
            </div>
            <p class="text-[11px] text-zinc-500">
              {{ currentProvider === 'local' ? '私有化本地部署 · 零网络限制 · 100% 隐私' : '豆包大模型 · 极速生成 · 全网答疑' }}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5">
          <!-- Key Setting Modal Button -->
          <button 
            @click="showKeyModal = true"
            class="px-2.5 py-1 rounded-lg border border-emerald-200/80 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-semibold flex items-center gap-1 shadow-sm shrink-0"
            title="配置 AI 引擎模式"
          >
            <Cpu class="w-3.5 h-3.5 text-emerald-600" />
            <span>{{ currentProvider === 'local' ? '切换/设置模型' : (hasKey ? '修改 Key' : '绑定 Key') }}</span>
          </button>
          
          <button 
            @click="clearChat"
            class="p-2 rounded-xl text-zinc-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
            title="清空对话"
          >
            <RefreshCw class="w-4 h-4" />
          </button>

          <button 
            @click="emit('close')"
            class="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Model Selector Banner -->
      <div class="px-5 py-2.5 bg-emerald-50/40 border-b border-emerald-100 flex items-center justify-between text-xs">
        <span class="text-zinc-500 font-medium flex items-center gap-1.5">
          <Cpu class="w-3.5 h-3.5 text-emerald-600" />
          <span>{{ currentProvider === 'local' ? '本地已加载模型' : '豆包模型模式' }}</span>
        </span>

        <!-- Local Model Selector Dropdown -->
        <div v-if="currentProvider === 'local' && localModelsList.length > 0" class="flex items-center gap-1">
          <select 
            v-model="selectedModel" 
            class="bg-white border border-emerald-200 text-emerald-800 px-2 py-1 rounded-lg text-xs font-mono font-semibold focus:outline-none shadow-sm"
          >
            <option v-for="m in localModelsList" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <!-- Doubao Pills -->
        <div v-else-if="currentProvider === 'doubao'" class="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-blue-100 shadow-sm">
          <button 
            @click="selectedModel = 'doubao-pro-32k'"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
            :class="selectedModel === 'doubao-pro-32k' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900'"
          >
            Doubao Pro (专业型)
          </button>
          <button 
            @click="selectedModel = 'doubao-lite-32k'"
            class="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
            :class="selectedModel === 'doubao-lite-32k' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-zinc-600 hover:text-zinc-900'"
          >
            Doubao Lite (极速型)
          </button>
        </div>

        <div v-else class="text-xs font-mono text-emerald-700 font-bold">
          {{ selectedModel || 'qwen2.5:latest' }}
        </div>
      </div>

      <!-- Chat Messages Container -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto p-5 space-y-4">
        <div 
          v-for="(msg, idx) in messages" 
          :key="idx"
          class="flex gap-3 text-xs"
          :class="msg.role === 'user' ? 'flex-row-reverse' : ''"
        >
          <!-- Avatar -->
          <div 
            class="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
            :class="msg.role === 'user' ? 'bg-zinc-800' : 'bg-gradient-to-tr from-blue-600 to-indigo-600'"
          >
            <User v-if="msg.role === 'user'" class="w-4 h-4" />
            <Bot v-else class="w-4 h-4" />
          </div>

          <!-- Bubble Content -->
          <div class="max-w-[85%] space-y-2">
            <!-- Main Response Text -->
            <div 
              class="p-4 rounded-2xl text-xs leading-relaxed shadow-sm relative group"
              :class="msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-blue-50/50 border border-blue-100 text-zinc-800 rounded-tl-none'"
            >
              <div class="whitespace-pre-wrap font-sans">{{ msg.content || (msg.isStreaming ? '豆包思考生成中...' : '') }}</div>

              <!-- Streaming Bouncing Dots -->
              <div v-if="msg.isStreaming && !msg.content" class="flex gap-1 py-1">
                <span class="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce delay-100"></span>
                <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce delay-200"></span>
              </div>

              <!-- Copy Button -->
              <button 
                v-if="msg.role === 'assistant' && msg.content"
                @click="copyContent(msg.content, idx)"
                class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-white border border-blue-100 text-zinc-500 hover:text-blue-600 transition-all shadow-sm"
                title="复制此文本"
              >
                <Check v-if="copiedIndex === idx" class="w-3 h-3 text-emerald-500" />
                <Copy v-else class="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Prompts Pills -->
      <div class="px-4 py-2 border-t border-blue-100 bg-blue-50/20 overflow-x-auto flex gap-2 shrink-0">
        <button 
          v-for="(prompt, i) in quickPrompts" 
          :key="i"
          @click="sendMessage(prompt)"
          class="px-3 py-1.5 bg-white border border-blue-200/80 rounded-full text-[11px] text-zinc-700 hover:bg-blue-50 hover:text-blue-600 transition-all whitespace-nowrap shadow-sm shrink-0 font-medium"
        >
          {{ prompt }}
        </button>
      </div>

      <!-- Drawer Input Area -->
      <div class="p-4 border-t border-blue-100 bg-white shrink-0">
        <div class="flex gap-2">
          <textarea 
            v-model="userInput"
            @keyup.enter.exact.prevent="sendMessage()"
            placeholder="问问 豆包 AI 任何问题（Enter 发送，Shift+Enter 换行）..."
            rows="2"
            class="flex-1 bg-blue-50/30 border border-blue-200/80 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-sans"
          ></textarea>
          <button 
            @click="sendMessage()"
            :disabled="!userInput.trim() || isGenerating"
            class="bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white px-4 rounded-xl hover:opacity-90 active:scale-[0.96] transition-all shadow-md shrink-0 flex items-center justify-center disabled:opacity-50"
          >
            <Send class="w-4 h-4" />
          </button>
        </div>
      </div>

    </aside>

    <!-- API Key Modal -->
    <AIKeyModal 
      :is-open="showKeyModal" 
      @close="showKeyModal = false" 
      @saved="showKeyModal = false" 
    />
  </Teleport>
</template>
