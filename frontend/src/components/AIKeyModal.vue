<script setup>
import { ref, onMounted } from 'vue';
import { Key, Sparkles, X, Check, Eye, EyeOff, AlertCircle, Cpu, HardDrive, RefreshCw } from '@lucide/vue';
import api from '../utils/api';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'saved']);

const selectedProvider = ref('local'); // 'local' | 'doubao'

// Local Ollama States
const localUrl = ref('http://127.0.0.1:11434');
const selectedLocalModel = ref('qwen2.5:latest');
const installedModels = ref([]);
const isLocalRunning = ref(false);
const isTestingLocal = ref(false);

// Doubao States
const apiKeyInput = ref('');
const endpointIdInput = ref('');
const showKey = ref(false);
const hasKey = ref(false);
const maskedKey = ref('');

const isSaving = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

const checkConfig = async () => {
  try {
    const res = await api.get('/ai/config');
    selectedProvider.value = res.data.provider || 'local';
    hasKey.value = res.data.hasKey;
    maskedKey.value = res.data.maskedKey || '';
    endpointIdInput.value = res.data.endpointId || '';
    localUrl.value = res.data.localUrl || 'http://127.0.0.1:11434';
    selectedLocalModel.value = res.data.localModel || 'qwen2.5:latest';
  } catch (e) {
    console.error('Failed to check AI config:', e);
  }
};

const checkLocalOllama = async () => {
  isTestingLocal.value = true;
  try {
    const res = await api.get('/ai/local-models');
    isLocalRunning.value = res.data.running;
    installedModels.value = res.data.models || [];
    if (installedModels.value.length > 0) {
      const match32b = installedModels.value.find(m => m.toLowerCase().includes('32b') || m.toLowerCase().includes('deepseek'));
      if (match32b && (!selectedLocalModel.value || selectedLocalModel.value === 'qwen2.5:latest')) {
        selectedLocalModel.value = match32b;
      } else if (!installedModels.value.includes(selectedLocalModel.value)) {
        selectedLocalModel.value = installedModels.value[0];
      }
    }
  } catch (e) {
    isLocalRunning.value = false;
    installedModels.value = [];
  } finally {
    isTestingLocal.value = false;
  }
};

const saveConfig = async () => {
  if (selectedProvider.value === 'doubao' && !apiKeyInput.value.trim() && !hasKey.value) {
    errorMessage.value = '配置云端豆包时请输入有效的 API Key';
    return;
  }
  isSaving.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  try {
    await api.post('/ai/config', { 
      provider: selectedProvider.value,
      apiKey: apiKeyInput.value.trim() || maskedKey.value, 
      endpointId: endpointIdInput.value.trim(),
      localUrl: localUrl.value.trim(),
      localModel: selectedLocalModel.value.trim()
    });
    successMessage.value = `${selectedProvider.value === 'local' ? '本地模型 (Ollama)' : '字节豆包 API'} 配置保存成功！`;
    apiKeyInput.value = '';
    await checkConfig();
    setTimeout(() => {
      emit('saved');
      emit('close');
    }, 1000);
  } catch (e) {
    errorMessage.value = e.response?.data?.error || '保存失败，请检查设置';
  } finally {
    isSaving.value = false;
  }
};

onMounted(() => {
  checkConfig();
  checkLocalOllama();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm" @click.self="emit('close')">
      <div class="bg-white/95 backdrop-blur-2xl border border-blue-100 rounded-2xl p-6 shadow-2xl w-full max-w-lg font-sans transition-all">
        
        <!-- Header -->
        <div class="flex justify-between items-center mb-5 pb-3 border-b border-zinc-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-blue-500 text-white flex items-center justify-center shadow-md">
              <Sparkles class="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 class="text-base font-semibold text-zinc-900">配置 AI 模型引擎</h3>
              <p class="text-[11px] text-zinc-400">支持本地私有化模型调试运行与云端 API 模式</p>
            </div>
          </div>
          <button @click="emit('close')" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors">
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Provider Mode Pills Switcher -->
        <div class="mb-5 p-1 bg-zinc-100 rounded-xl flex gap-1">
          <button 
            @click="selectedProvider = 'local'"
            class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            :class="selectedProvider === 'local' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-zinc-600 hover:text-zinc-900'"
          >
            <HardDrive class="w-3.5 h-3.5" />
            <span>🏡 本地模型 (Ollama)</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">离线免费</span>
          </button>

          <button 
            @click="selectedProvider = 'doubao'"
            class="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
            :class="selectedProvider === 'doubao' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-zinc-600 hover:text-zinc-900'"
          >
            <Cpu class="w-3.5 h-3.5" />
            <span>☁️ 字节豆包 API</span>
          </button>
        </div>

        <!-- Mode 1: Local Ollama Configuration -->
        <div v-if="selectedProvider === 'local'" class="space-y-4">
          <!-- Status Detection Card -->
          <div 
            class="p-3.5 rounded-xl border flex items-center justify-between transition-all"
            :class="isLocalRunning ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : 'bg-rose-50/80 border-rose-200 text-rose-900'"
          >
            <div class="flex items-center gap-2.5 text-xs">
              <span class="w-2.5 h-2.5 rounded-full" :class="isLocalRunning ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'"></span>
              <div>
                <span class="font-bold">{{ isLocalRunning ? '🟢 本地 Ollama 服务探查成功 (在线)' : '🔴 未检测到本地 Ollama 服务' }}</span>
                <p class="text-[11px] opacity-70 mt-0.5" v-if="isLocalRunning">已成功识别本地安装的模型</p>
                <p class="text-[11px] opacity-70 mt-0.5" v-else>请先启动本地 Ollama (`ollama serve`)</p>
              </div>
            </div>

            <button 
              @click="checkLocalOllama" 
              :disabled="isTestingLocal"
              class="p-1.5 bg-white/80 border rounded-lg text-xs hover:bg-white transition-all flex items-center gap-1"
              title="重新检测本地服务"
            >
              <RefreshCw class="w-3.5 h-3.5" :class="isTestingLocal ? 'animate-spin' : ''" />
              <span>检测</span>
            </button>
          </div>

          <!-- Installed Model Selection Dropdown -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Cpu class="w-3.5 h-3.5 text-emerald-600" />
              <span>选择已安装的本地模型 (Installed Models)</span>
            </label>

            <select 
              v-if="installedModels.length > 0"
              v-model="selectedLocalModel"
              class="w-full bg-emerald-50/30 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            >
              <option v-for="m in installedModels" :key="m" :value="m">{{ m }}</option>
            </select>

            <input 
              v-else
              type="text"
              v-model="selectedLocalModel"
              placeholder="自定义模型名称 (例如 qwen2.5:latest 或 deepseek-r1:1.5b)"
              class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>

          <!-- Local Ollama Endpoint URL -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <HardDrive class="w-3.5 h-3.5 text-blue-500" />
              <span>本地服务接口 Base URL</span>
            </label>
            <input 
              type="text"
              v-model="localUrl"
              placeholder="默认: http://127.0.0.1:11434"
              class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          <!-- Helper Guide -->
          <div class="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-[11px] text-zinc-500 space-y-1 font-mono leading-relaxed">
            <div class="font-bold text-zinc-700">💡 本地启动命令参考 (Terminal):</div>
            <div>• 运行 Qwen2.5: <code class="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-900">ollama run qwen2.5</code></div>
            <div>• 运行 DeepSeek R1: <code class="bg-zinc-200/80 px-1 py-0.5 rounded text-zinc-900">ollama run deepseek-r1:1.5b</code></div>
          </div>
        </div>

        <!-- Mode 2: Cloud Doubao Configuration -->
        <div v-else class="space-y-4">
          <!-- Status Banner -->
          <div v-if="hasKey" class="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
            <Check class="w-4 h-4 text-emerald-600 shrink-0" />
            <span>当前已绑定 豆包 Key: <code class="bg-emerald-100/80 px-1.5 py-0.5 rounded font-mono">{{ maskedKey }}</code></span>
          </div>

          <!-- Doubao API Key Input -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Key class="w-3.5 h-3.5 text-blue-500" />
              <span>豆包 (火山引擎) API Key</span>
            </label>
            <div class="relative">
              <input 
                :type="showKey ? 'text' : 'password'"
                v-model="apiKeyInput"
                placeholder="输入火山引擎 API Key (例如 12345678-xxxx...)"
                class="w-full bg-blue-50/30 border border-blue-200/80 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
              />
              <button 
                type="button"
                @click="showKey = !showKey" 
                class="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <component :is="showKey ? EyeOff : Eye" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Endpoint ID Input -->
          <div class="space-y-1.5">
            <label class="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <Cpu class="w-3.5 h-3.5 text-purple-500" />
              <span>接入点 Endpoint ID (选填/ep-xxxx)</span>
            </label>
            <input 
              type="text"
              v-model="endpointIdInput"
              placeholder="例如 ep-20250202123456-xxxxx (若为空使用默认)"
              class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
          </div>
        </div>

        <!-- Alert Messages -->
        <div v-if="errorMessage" class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center gap-2 mt-4">
          <AlertCircle class="w-4 h-4 shrink-0" />
          <span>{{ errorMessage }}</span>
        </div>

        <div v-if="successMessage" class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-600 flex items-center gap-2 mt-4">
          <Check class="w-4 h-4 shrink-0" />
          <span>{{ successMessage }}</span>
        </div>

        <!-- Footer Buttons -->
        <div class="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-100">
          <button 
            @click="emit('close')"
            class="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            取消
          </button>
          <button 
            @click="saveConfig"
            :disabled="isSaving"
            class="bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 text-white px-5 py-2 rounded-xl font-semibold text-xs hover:opacity-90 active:scale-[0.97] transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ isSaving ? '保存配置中...' : '保存引擎配置' }}</span>
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>
