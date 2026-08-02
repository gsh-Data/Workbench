<script setup>
import { ref, computed, onBeforeUnmount, inject } from 'vue';
import { Play, Pause, RotateCcw, Flame, Coffee, Sparkles, Music } from '@lucide/vue';

const musicState = inject('musicState', ref({ isPlaying: false }));
const togglePlayMusic = inject('togglePlay', () => {});

const modes = {
  focus: { label: '专注工作', duration: 25 * 60, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  shortBreak: { label: '小憩片刻', duration: 5 * 60, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  longBreak: { label: '深度休息', duration: 15 * 60, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' }
};

const currentModeKey = ref('focus');
const timeLeft = ref(modes.focus.duration);
const isRunning = ref(false);
const completedSessions = ref(0);
const autoPlayMusic = ref(true);

let timerInterval = null;

const currentMode = computed(() => modes[currentModeKey.value]);

const formattedTime = computed(() => {
  const m = Math.floor(timeLeft.value / 60).toString().padStart(2, '0');
  const s = (timeLeft.value % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
});

const progressPercent = computed(() => {
  const total = currentMode.value.duration;
  return ((total - timeLeft.value) / total) * 100;
});

const strokeDashoffset = computed(() => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  return circumference - (progressPercent.value / 100) * circumference;
});

const setMode = (key) => {
  pauseTimer();
  currentModeKey.value = key;
  timeLeft.value = modes[key].duration;
};

const startTimer = () => {
  if (isRunning.value) return;
  isRunning.value = true;
  
  if (autoPlayMusic.value && currentModeKey.value === 'focus' && musicState.value.currentStation && !musicState.value.isPlaying) {
    togglePlayMusic();
  }

  timerInterval = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--;
    } else {
      onTimerFinish();
    }
  }, 1000);
};

const pauseTimer = () => {
  isRunning.value = false;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
};

const toggleTimer = () => {
  if (isRunning.value) {
    pauseTimer();
  } else {
    startTimer();
  }
};

const resetTimer = () => {
  pauseTimer();
  timeLeft.value = currentMode.value.duration;
};

const onTimerFinish = () => {
  pauseTimer();
  if (currentModeKey.value === 'focus') {
    completedSessions.value++;
    setMode('shortBreak');
  } else {
    setMode('focus');
  }
};

onBeforeUnmount(() => {
  if (timerInterval) clearInterval(timerInterval);
});
</script>

<template>
  <div class="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 flex flex-col h-full justify-between font-sans relative overflow-hidden">
    <!-- Header & Mode Tabs -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <Flame class="w-5 h-5 text-blue-600" />
        <h3 class="font-semibold text-base text-zinc-900 tracking-tight">专注番茄钟</h3>
      </div>

      <div class="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200/80 gap-1 text-xs font-medium">
        <button 
          @click="setMode('focus')" 
          class="px-2.5 py-1 rounded-md transition-all"
          :class="currentModeKey === 'focus' ? 'bg-white text-blue-600 font-semibold shadow-sm' : 'text-zinc-500 hover:text-zinc-900'"
        >专注</button>
        <button 
          @click="setMode('shortBreak')" 
          class="px-2.5 py-1 rounded-md transition-all"
          :class="currentModeKey === 'shortBreak' ? 'bg-white text-emerald-600 font-semibold shadow-sm' : 'text-zinc-500 hover:text-zinc-900'"
        >短休</button>
        <button 
          @click="setMode('longBreak')" 
          class="px-2.5 py-1 rounded-md transition-all"
          :class="currentModeKey === 'longBreak' ? 'bg-white text-purple-600 font-semibold shadow-sm' : 'text-zinc-500 hover:text-zinc-900'"
        >长休</button>
      </div>
    </div>

    <!-- Timer Ring & Display -->
    <div class="flex flex-col items-center justify-center my-4 relative">
      <div class="relative w-40 h-40 flex items-center justify-center">
        <svg class="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
          <circle 
            cx="60" cy="60" r="54" 
            class="text-zinc-100 stroke-current" 
            stroke-width="7" fill="none"
          />
          <circle 
            cx="60" cy="60" r="54" 
            class="stroke-current transition-all duration-300 ease-linear" 
            :class="currentMode.color"
            stroke-width="7" 
            stroke-linecap="round"
            fill="none"
            stroke-dasharray="339.29"
            :stroke-dashoffset="strokeDashoffset"
          />
        </svg>
        <div class="absolute flex flex-col items-center">
          <span class="text-3xl font-semibold tracking-tight text-zinc-900 font-mono">{{ formattedTime }}</span>
          <span class="text-xs font-medium text-zinc-500 mt-1 flex items-center gap-1">
            <component :is="currentModeKey === 'focus' ? Sparkles : Coffee" class="w-3.5 h-3.5" />
            {{ currentMode.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- Controls & Music Link -->
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-center gap-3">
        <button 
          @click="toggleTimer" 
          class="btn-primary flex-1 py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-sm"
          :class="isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'"
        >
          <component :is="isRunning ? Pause : Play" class="w-4 h-4" />
          <span>{{ isRunning ? '暂停计时' : '开始专注' }}</span>
        </button>

        <button 
          @click="resetTimer" 
          class="p-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-600 transition-colors shadow-sm"
          title="重置"
        >
          <RotateCcw class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 pt-3">
        <span class="flex items-center gap-1">
          🍅 今日专注: <strong class="text-zinc-900 font-semibold">{{ completedSessions }}</strong> 次
        </span>

        <label class="flex items-center gap-1.5 cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors">
          <input type="checkbox" v-model="autoPlayMusic" class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500/20" />
          <Music class="w-3.5 h-3.5 text-blue-600" />
          <span>自动音乐</span>
        </label>
      </div>
    </div>
  </div>
</template>
