<script setup>
import { ref, computed, onMounted, onUnmounted, provide } from 'vue';
import { Cloud, CloudRain, Sun, Bell, Menu, LayoutDashboard, BookOpen, Music, Calendar as CalendarIcon, ShieldCheck, Sparkles, Search, Edit3, Play, Pause, SkipForward, Bot } from '@lucide/vue';
import axios from 'axios';
import OmniSearch from './components/OmniSearch.vue';
import ScratchpadDrawer from './components/ScratchpadDrawer.vue';
import AICopilotDrawer from './components/AICopilotDrawer.vue';
import AIKeyModal from './components/AIKeyModal.vue';

const systemStatus = ref('connecting');
const weather = ref(null);
const notifications = ref([]);
const showNotifications = ref(false);
const sidebarOpen = ref(true);

const isSearchOpen = ref(false);
const isScratchpadOpen = ref(false);
const isAICopilotOpen = ref(false);
const isAIKeyModalOpen = ref(false);

const musicState = ref({
  isPlaying: false,
  currentStation: null,
  audio: null,
  playlist: [],
  currentIndex: 0,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  mode: 'loop' // 'loop' | 'single' | 'shuffle'
});

const hasActiveMusic = computed(() => !!musicState.value.currentStation);

// SSE Notifications
const setupSSE = () => {
  const eventSource = new EventSource('http://localhost:3000/api/notifications/stream');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    notifications.value.unshift(data);
    showNotifications.value = true;
  };
  
  eventSource.onerror = () => {
    systemStatus.value = 'offline';
  };
  
  eventSource.onopen = () => {
    systemStatus.value = 'online';
  };
};

const fetchWeather = async () => {
  try {
    const res = await axios.get('https://api.open-meteo.com/v1/forecast?latitude=31.2222&longitude=121.4581&current_weather=true');
    weather.value = res.data.current_weather;
  } catch (error) {
    console.error("Failed to fetch weather", error);
  }
};

const getWeatherIcon = (code) => {
  if (!code) return Cloud;
  if (code === 0 || code === 1) return Sun;
  if (code >= 50 && code <= 69) return CloudRain;
  return Cloud;
};

// Global Music Controls
const playStation = (station, playlist = []) => {
  if (playlist.length > 0) {
    musicState.value.playlist = playlist;
    const idx = playlist.findIndex(item => item.id === station.id);
    if (idx !== -1) musicState.value.currentIndex = idx;
  } else if (!musicState.value.playlist.some(p => p.id === station.id)) {
    musicState.value.playlist.push(station);
    musicState.value.currentIndex = musicState.value.playlist.length - 1;
  }

  if (musicState.value.audio) {
    musicState.value.audio.pause();
  }

  musicState.value.currentStation = station;
  const audio = new Audio(station.url);
  audio.volume = musicState.value.volume;

  audio.addEventListener('loadedmetadata', () => {
    musicState.value.duration = audio.duration || 0;
  });

  audio.addEventListener('timeupdate', () => {
    musicState.value.currentTime = audio.currentTime || 0;
  });

  audio.addEventListener('ended', () => {
    if (musicState.value.mode === 'single') {
      audio.currentTime = 0;
      audio.play();
    } else {
      nextTrack();
    }
  });

  audio.play().catch(e => console.warn('Audio play error:', e));
  musicState.value.audio = audio;
  musicState.value.isPlaying = true;
};

const togglePlay = () => {
  if (!musicState.value.audio) return;
  if (musicState.value.isPlaying) {
    musicState.value.audio.pause();
  } else {
    musicState.value.audio.play();
  }
  musicState.value.isPlaying = !musicState.value.isPlaying;
};

const nextTrack = () => {
  if (musicState.value.playlist.length === 0) return;
  let nextIdx = musicState.value.currentIndex + 1;
  if (musicState.value.mode === 'shuffle') {
    nextIdx = Math.floor(Math.random() * musicState.value.playlist.length);
  } else if (nextIdx >= musicState.value.playlist.length) {
    nextIdx = 0;
  }
  musicState.value.currentIndex = nextIdx;
  playStation(musicState.value.playlist[nextIdx], musicState.value.playlist);
};

const prevTrack = () => {
  if (musicState.value.playlist.length === 0) return;
  let prevIdx = musicState.value.currentIndex - 1;
  if (prevIdx < 0) prevIdx = musicState.value.playlist.length - 1;
  musicState.value.currentIndex = prevIdx;
  playStation(musicState.value.playlist[prevIdx], musicState.value.playlist);
};

const seekTrack = (seconds) => {
  if (musicState.value.audio) {
    musicState.value.audio.currentTime = seconds;
    musicState.value.currentTime = seconds;
  }
};

const setVolume = (vol) => {
  musicState.value.volume = vol;
  if (musicState.value.audio) {
    musicState.value.audio.volume = vol;
  }
};

const toggleMode = () => {
  const modes = ['loop', 'single', 'shuffle'];
  const idx = modes.indexOf(musicState.value.mode);
  musicState.value.mode = modes[(idx + 1) % modes.length];
};

const handleKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
    e.preventDefault();
    isAICopilotOpen.value = !isAICopilotOpen.value;
  }
};

onMounted(() => {
  setupSSE();
  fetchWeather();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

provide('musicState', musicState);
provide('playStation', playStation);
provide('togglePlay', togglePlay);
provide('nextTrack', nextTrack);
provide('prevTrack', prevTrack);
provide('seekTrack', seekTrack);
provide('setVolume', setVolume);
provide('toggleMode', toggleMode);
provide('openAICopilot', () => isAICopilotOpen.value = true);
provide('openAIKeyModal', () => isAIKeyModalOpen.value = true);
</script>

<template>
  <div 
    class="h-screen w-full flex flex-col overflow-hidden bg-[#fbfbfd] text-[#1d1d1f] font-sans antialiased transition-colors duration-500"
    :class="musicState.isPlaying ? 'music-rhythm-glow music-rhythm-active' : ''"
  >
    <!-- Dynamic Full-Stage Music Rhythm Header -->
    <header 
      class="h-16 shrink-0 flex items-center justify-between px-6 backdrop-blur-2xl saturate-180 z-50 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
      :class="[
        musicState.isPlaying 
          ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white border-b-2 border-pink-300/40 shadow-[0_8px_32px_rgba(244,63,94,0.3)]' 
          : (hasActiveMusic 
              ? 'bg-gradient-to-r from-rose-100/90 via-pink-100/80 to-purple-100/70 text-zinc-900 border-b border-pink-200/80 shadow-[0_4px_20px_rgba(244,63,94,0.08)]' 
              : 'bg-white/75 border-b border-black/[0.08] border-t-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.03)]')
      ]"
    >
      <div class="flex items-center gap-4">
        <button 
          @click="sidebarOpen = !sidebarOpen" 
          class="p-2 rounded-xl border transition-all shadow-sm active:scale-[0.96]"
          :class="[
            musicState.isPlaying 
              ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' 
              : (hasActiveMusic ? 'bg-white/80 border-pink-200 text-rose-700 hover:bg-white' : 'bg-white/80 border-black/[0.08] text-zinc-700 hover:bg-white')
          ]"
          title="切换侧边栏"
        >
          <Menu class="w-5 h-5" />
        </button>

        <div class="font-semibold text-lg tracking-tight flex items-center gap-2.5" :class="musicState.isPlaying ? 'text-white' : 'text-[#1d1d1f]'">
          <span>Goo Day</span>

          <!-- Full Stage Rhythm Equalizer Badge -->
          <span 
            v-if="musicState.isPlaying" 
            class="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full border border-white/30 flex items-center gap-2 backdrop-blur-md shadow-sm transition-all animate-pulse"
          >
            <!-- 6-Bar Dynamic Spectrum Equalizer -->
            <div class="flex items-end gap-[2px] h-3.5">
              <span class="w-[2px] bg-white rounded-full animate-audio-bar-1"></span>
              <span class="w-[2px] bg-yellow-200 rounded-full animate-audio-bar-2"></span>
              <span class="w-[2px] bg-white rounded-full animate-audio-bar-3"></span>
              <span class="w-[2px] bg-pink-200 rounded-full animate-audio-bar-4"></span>
              <span class="w-[2px] bg-white rounded-full animate-audio-bar-1"></span>
              <span class="w-[2px] bg-yellow-200 rounded-full animate-audio-bar-2"></span>
            </div>
            <span>音浪舞台模式</span>
          </span>

          <!-- Soft Paused Badge when Music Loaded but Paused -->
          <span 
            v-else-if="hasActiveMusic" 
            class="text-xs font-semibold bg-white/80 text-rose-600 px-3 py-1 rounded-full border border-pink-200/80 flex items-center gap-1.5 shadow-sm transition-all"
          >
            <span class="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>音乐暂停中</span>
          </span>

          <span v-else class="text-xs font-semibold bg-[#0066cc]/[0.08] text-[#0066cc] px-2.5 py-0.5 rounded-full border border-[#0066cc]/20 flex items-center gap-1">
            <Sparkles class="w-3 h-3 text-[#0066cc]" />
            v4.0 Super Station
          </span>
        </div>
      </div>

      <!-- Center Search & Live Ticker Spectrum Bar -->
      <div class="hidden md:flex items-center gap-3">
        <!-- Live Music Ticker if Music Loaded -->
        <div 
          v-if="hasActiveMusic"
          class="flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-md text-xs font-medium max-w-xs truncate shadow-sm transition-all cursor-pointer"
          :class="[
            musicState.isPlaying 
              ? 'bg-white/20 border border-white/30 text-white' 
              : 'bg-white/80 border border-pink-200 text-rose-800'
          ]"
          @click="$router.push('/music')"
        >
          <Music class="w-3.5 h-3.5 shrink-0" :class="musicState.isPlaying ? 'text-yellow-200 animate-spin-slow' : 'text-rose-500'" />
          <span class="truncate">{{ musicState.currentStation.name }} - {{ musicState.currentStation.artist }}</span>
          <button @click.stop="togglePlay" class="ml-1 p-1 rounded-full hover:bg-black/10 transition-colors">
            <Play v-if="!musicState.isPlaying" class="w-3.5 h-3.5" :class="musicState.isPlaying ? 'text-white' : 'text-rose-600'" />
            <Pause v-else class="w-3.5 h-3.5 text-white" />
          </button>
          <button @click.stop="nextTrack" class="p-1 rounded-full hover:bg-black/10 transition-colors">
            <SkipForward class="w-3.5 h-3.5" :class="musicState.isPlaying ? 'text-white' : 'text-rose-600'" />
          </button>
        </div>

        <!-- Global Search Button (Ctrl + K) -->
        <button 
          @click="isSearchOpen = true"
          class="flex items-center gap-3 px-4 py-2 border rounded-full text-xs font-medium transition-all w-64 justify-between"
          :class="[
            musicState.isPlaying 
              ? 'bg-white/20 border-white/30 text-white placeholder:text-white/70 hover:bg-white/30 shadow-sm' 
              : (hasActiveMusic ? 'bg-white/80 border-pink-200 text-zinc-700 hover:bg-white' : 'bg-black/[0.03] border-black/[0.06] text-zinc-500 hover:bg-black/[0.06]')
          ]"
        >
          <span class="flex items-center gap-2">
            <Search class="w-4 h-4" :class="musicState.isPlaying ? 'text-white/80' : 'text-zinc-400'" />
            <span :class="musicState.isPlaying ? 'text-white/90' : 'text-zinc-500'">搜索全局内容...</span>
          </span>
          <kbd class="px-1.5 py-0.5 rounded font-mono text-[10px]" :class="musicState.isPlaying ? 'bg-white/30 border border-white/40 text-white' : 'bg-white border border-black/[0.08] text-zinc-400'">Ctrl K</kbd>
        </button>
      </div>
      
      <!-- Right Action Chips -->
      <div class="flex items-center gap-2.5">
        <!-- Weather Widget -->
        <div 
          v-if="weather" 
          class="hidden sm:flex items-center gap-2 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all"
          :class="[
            musicState.isPlaying 
              ? 'bg-white/20 border-white/30 text-white' 
              : (hasActiveMusic ? 'bg-white/80 border-pink-200 text-rose-700' : 'bg-black/[0.03] border-black/[0.06] text-zinc-700')
          ]"
        >
          <component :is="getWeatherIcon(weather.weathercode)" class="w-4 h-4" :class="musicState.isPlaying ? 'text-yellow-200' : (hasActiveMusic ? 'text-rose-500' : 'text-[#0066cc]')" />
          <span>{{ weather.temperature }}°C</span>
        </div>

        <!-- Doubao AI Copilot Button -->
        <button 
          @click="isAICopilotOpen = !isAICopilotOpen" 
          class="px-3 py-1.5 rounded-xl border active:scale-[0.96] transition-all shadow-md flex items-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-transparent hover:opacity-90"
          title="豆包 AI 智能领航员 (Ctrl+Shift+A)"
        >
          <Sparkles class="w-4 h-4 text-amber-200 animate-pulse" />
          <span class="hidden lg:inline">豆包 AI</span>
        </button>

        <!-- Scratchpad Toggle Button -->
        <button 
          @click="isScratchpadOpen = !isScratchpadOpen" 
          class="p-2 rounded-xl border active:scale-[0.96] transition-all shadow-sm flex items-center gap-1.5 text-xs font-medium"
          :class="[
            musicState.isPlaying 
              ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' 
              : (hasActiveMusic ? 'bg-white/80 border-pink-200 text-rose-600 hover:bg-white' : 'bg-white/80 border-black/[0.08] text-zinc-700 hover:bg-white')
          ]"
          title="闪念草稿箱"
        >
          <Edit3 class="w-4 h-4" :class="musicState.isPlaying ? 'text-yellow-200' : (hasActiveMusic ? 'text-rose-500' : 'text-[#0066cc]')" />
          <span class="hidden lg:inline">闪念草稿</span>
        </button>
        
        <!-- Notifications -->
        <div class="relative">
          <button 
            @click="showNotifications = !showNotifications" 
            class="relative p-2 rounded-xl border active:scale-[0.96] transition-all shadow-sm"
            :class="[
              musicState.isPlaying 
                ? 'bg-white/20 border-white/30 text-white hover:bg-white/30' 
                : (hasActiveMusic ? 'bg-white/80 border-pink-200 text-rose-600 hover:bg-white' : 'bg-white/80 border-black/[0.08] text-zinc-700')
            ]"
          >
            <Bell class="w-5 h-5" />
            <span v-if="notifications.length > 0" class="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" :class="musicState.isPlaying ? 'bg-yellow-300' : 'bg-[#0066cc]'"></span>
          </button>
          
          <div v-if="showNotifications" class="absolute right-0 top-12 w-80 bg-white/95 backdrop-blur-2xl border rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.15)] p-4 z-50 text-zinc-900 border-zinc-200">
            <div class="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100">
              <h3 class="font-semibold text-sm text-zinc-900">消息通知</h3>
              <button @click="notifications = []" class="text-xs text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded-md hover:bg-zinc-100">清空</button>
            </div>
            <div v-if="notifications.length === 0" class="text-xs text-zinc-400 text-center py-6">
              暂无新通知
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <div v-for="(notif, idx) in notifications" :key="idx" class="p-3 bg-zinc-50 rounded-xl text-xs text-zinc-700 border border-zinc-100">
                {{ notif.message }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- System Status -->
        <div 
          class="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border shadow-sm transition-all"
          :class="[
            musicState.isPlaying 
              ? 'bg-white/20 border-white/30 text-white' 
              : (hasActiveMusic ? 'bg-white/80 border-pink-200 text-rose-700' : 'bg-white/80 border-black/[0.08] text-zinc-700')
          ]"
        >
          <span class="w-2 h-2 rounded-full" :class="systemStatus === 'online' ? 'bg-emerald-400' : 'bg-rose-500'"></span>
          <span class="capitalize">{{ systemStatus }}</span>
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Translucent Glass Sidebar -->
      <aside 
        :class="[
          'shrink-0 w-64 backdrop-blur-xl saturate-180 border-r flex flex-col transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-40',
          sidebarOpen ? 'translate-x-0' : '-ml-64',
          musicState.isPlaying ? 'bg-white/85 border-pink-200/60' : 'bg-white/75 border-black/[0.08]'
        ]"
      >
        <nav class="flex-1 p-4 space-y-1">
          <div class="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider px-3 mb-2">服务导航</div>
          
          <router-link to="/dashboard" class="nav-item group" active-class="active-nav-item">
            <LayoutDashboard class="w-4 h-4 shrink-0" />
            <span>仪表盘</span>
          </router-link>
          
          <router-link to="/calendar" class="nav-item group" active-class="active-nav-item">
            <CalendarIcon class="w-4 h-4 shrink-0" />
            <span>日历</span>
          </router-link>
          
          <router-link to="/knowledge" class="nav-item group" active-class="active-nav-item">
            <BookOpen class="w-4 h-4 shrink-0" />
            <span>知识库</span>
          </router-link>
          
          <router-link to="/music" class="nav-item group" active-class="active-nav-item">
            <Music class="w-4 h-4 shrink-0" />
            <span>音乐台</span>

            <!-- Animated Audio Equalizer Ladder in Sidebar -->
            <div v-if="musicState.isPlaying" class="ml-auto flex items-end gap-[2.5px] h-3">
              <span class="w-[2px] bg-rose-500 rounded-full animate-audio-bar-1"></span>
              <span class="w-[2px] bg-pink-500 rounded-full animate-audio-bar-2"></span>
              <span class="w-[2px] bg-purple-500 rounded-full animate-audio-bar-3"></span>
              <span class="w-[2px] bg-rose-500 rounded-full animate-audio-bar-4"></span>
            </div>
          </router-link>
        </nav>
        
        <!-- Sidebar Footer -->
        <div class="p-4 border-t border-black/[0.06] bg-black/[0.01]">
          <div class="flex items-center gap-3">
            <div 
              class="w-9 h-9 rounded-xl text-white flex items-center justify-center font-semibold text-xs shrink-0 transition-colors"
              :class="musicState.isPlaying ? 'bg-rose-500 shadow-[0_2px_8px_rgba(244,63,94,0.4)]' : 'bg-[#0066cc] shadow-[0_2px_8px_rgba(0,102,204,0.3)]'"
            >
              WB
            </div>
            <div class="overflow-hidden">
              <div class="text-xs font-semibold text-[#1d1d1f] truncate">Workbench Admin</div>
              <div class="text-[11px] text-zinc-500 truncate flex items-center gap-1">
                <ShieldCheck class="w-3 h-3 text-emerald-600 inline" /> Super Station v4.0
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- Main Content Container -->
      <main class="flex-1 overflow-y-auto relative bg-[#fbfbfd]">
        <div class="p-6 h-full">
          <router-view v-slot="{ Component }">
            <component :is="Component" />
          </router-view>
        </div>
      </main>
    </div>

    <!-- Modals & Drawers -->
    <OmniSearch :is-open="isSearchOpen" @close="isSearchOpen = false" @open="isSearchOpen = true" />
    <ScratchpadDrawer :is-open="isScratchpadOpen" @close="isScratchpadOpen = false" />
    <AICopilotDrawer :is-open="isAICopilotOpen" @close="isAICopilotOpen = false" />
    <AIKeyModal :is-open="isAIKeyModalOpen" @close="isAIKeyModalOpen = false" @saved="isAIKeyModalOpen = false" />
  </div>
</template>

<style scoped>
.nav-item {
  @apply flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-600 font-medium hover:bg-black/[0.04] hover:text-[#1d1d1f] active:scale-[0.98] transition-all;
}

.active-nav-item {
  @apply bg-[#0066cc]/[0.08] text-[#0066cc] font-semibold rounded-xl border border-[#0066cc]/20 hover:bg-[#0066cc]/[0.1] hover:text-[#0066cc];
}

.active-nav-item svg {
  @apply text-[#0066cc];
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spinSlow 20s linear infinite;
}
</style>
