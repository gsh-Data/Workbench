<script setup>
import { ref, onMounted, provide } from 'vue';
import { Cloud, CloudRain, Sun, Bell, Menu, LayoutDashboard, BookOpen, Music, Calendar as CalendarIcon, Check } from '@lucide/vue';
import axios from 'axios';
import { useTheme } from './composables/useTheme';

const { themes, currentTheme, setTheme } = useTheme();
const systemStatus = ref('connecting');
const weather = ref(null);
const notifications = ref([]);
const showNotifications = ref(false);
const sidebarOpen = ref(true);

const musicState = ref({
  isPlaying: false,
  currentStation: null,
  audio: null
});

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
const playStation = (station) => {
  if (musicState.value.audio) {
    musicState.value.audio.pause();
  }
  musicState.value.currentStation = station;
  musicState.value.audio = new Audio(station.url);
  musicState.value.audio.play();
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

onMounted(() => {
  setupSSE();
  fetchWeather();
});

provide('musicState', musicState);
provide('playStation', playStation);
provide('togglePlay', togglePlay);
</script>

<template>
  <div class="h-screen w-full flex flex-col overflow-hidden bg-bg-primary text-black font-mono">
    <!-- Header -->
    <header class="h-16 shrink-0 flex items-center justify-between px-6 border-b-4 border-black bg-white z-50">
      <div class="flex items-center gap-4">
        <button @click="sidebarOpen = !sidebarOpen" class="p-2 border-2 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all">
          <Menu class="w-5 h-5 text-black" />
        </button>
        <div class="font-black text-2xl uppercase tracking-wider text-black flex items-center gap-2">
          <span class="bg-black text-white px-2 py-0.5">WORKSTATION</span>
          <span class="text-sm font-bold bg-yellow-300 px-2 py-0.5 border-2 border-black">V4.0</span>
        </div>
      </div>
      
      <div class="flex items-center gap-4">
        <!-- Weather Widget -->
        <div v-if="weather" class="flex items-center gap-2 text-xs font-bold text-black bg-white px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <component :is="getWeatherIcon(weather.weathercode)" class="w-4 h-4 text-black" />
          <span>{{ weather.temperature }}°C</span>
        </div>
        
        <!-- Notifications -->
        <div class="relative">
          <button @click="showNotifications = !showNotifications" class="relative p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] transition-all">
            <Bell class="w-5 h-5 text-black" />
            <span v-if="notifications.length > 0" class="absolute -top-1 -right-1 w-3 h-3 bg-[#ff006e] border border-black"></span>
          </button>
          
          <div v-if="showNotifications" class="absolute right-0 top-12 w-80 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-4 z-50">
            <div class="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
              <h3 class="font-black uppercase tracking-wider text-black text-base">消息通知</h3>
              <button @click="notifications = []" class="text-xs font-bold text-black hover:bg-yellow-300 px-2 py-0.5 border border-black">清空</button>
            </div>
            <div v-if="notifications.length === 0" class="text-xs text-black font-bold text-center py-4">
              [暂无新通知]
            </div>
            <div v-else class="space-y-2 max-h-64 overflow-y-auto">
              <div v-for="(notif, idx) in notifications" :key="idx" class="p-3 bg-yellow-100 border-2 border-black text-xs font-bold">
                {{ notif.message }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- System Status -->
        <div class="flex items-center gap-2 text-xs font-black px-3 py-1 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <span class="w-3 h-3 border border-black" :class="systemStatus === 'online' ? 'bg-lime-400' : 'bg-red-500'"></span>
          <span class="uppercase text-black">{{ systemStatus }}</span>
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside :class="['shrink-0 w-64 bg-white border-r-4 border-black flex flex-col transition-transform duration-200', sidebarOpen ? 'translate-x-0' : '-ml-64']">
        <nav class="flex-1 p-4 space-y-3">
          <router-link to="/dashboard" class="nav-item group" active-class="active-nav-item">
            <LayoutDashboard class="w-5 h-5 shrink-0" />
            <span>仪表盘</span>
          </router-link>
          
          <router-link to="/calendar" class="nav-item group" active-class="active-nav-item">
            <CalendarIcon class="w-5 h-5 shrink-0" />
            <span>日历</span>
          </router-link>
          
          <router-link to="/knowledge" class="nav-item group" active-class="active-nav-item">
            <BookOpen class="w-5 h-5 shrink-0" />
            <span>知识库</span>
          </router-link>
          
          <router-link to="/music" class="nav-item group" active-class="active-nav-item">
            <Music class="w-5 h-5 shrink-0" />
            <span>音乐台</span>
            <div v-if="musicState.isPlaying" class="ml-auto w-3 h-3 bg-[#ff006e] border border-black"></div>
          </router-link>
        </nav>
        
        <!-- Theme Switcher -->
        <div class="p-4 border-t-4 border-black bg-yellow-100">
          <div class="text-xs font-black text-black uppercase tracking-wider mb-3 flex items-center gap-2">
            <span>设计风格主题</span>
          </div>
          <div class="flex flex-col gap-2">
            <button 
              v-for="t in themes" 
              :key="t.id"
              @click="setTheme(t.id)"
              class="flex items-center gap-3 px-3 py-2 border-2 border-black text-xs font-black transition-all hover:bg-yellow-300"
              :class="currentTheme === t.id ? 'bg-black text-white shadow-[2px_2px_0px_0px_rgba(255,0,110,1)]' : 'bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'"
            >
              <span class="w-4 h-4 border border-black shrink-0" :style="{ backgroundColor: t.color }"></span>
              <span class="truncate">{{ t.name }}</span>
              <Check v-if="currentTheme === t.id" class="w-4 h-4 ml-auto text-[#ff006e]" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Container -->
      <main class="flex-1 overflow-y-auto relative bg-bg-primary">
        <!-- Floating Music Player if active -->
        <div 
          v-if="musicState.currentStation" 
          class="fixed bottom-6 right-6 p-4 bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4 z-40 cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all" 
          @click="$router.push('/music')"
        >
          <div class="w-10 h-10 border-2 border-black bg-[#ff006e] flex items-center justify-center text-white font-bold">
            <Music class="w-5 h-5 text-white" />
          </div>
          <div>
            <div class="text-[10px] font-black uppercase text-black">正在播放</div>
            <div class="text-xs font-black truncate w-32 uppercase text-black">{{ musicState.currentStation.name }}</div>
          </div>
        </div>

        <div class="p-6 h-full">
          <router-view v-slot="{ Component }">
            <component :is="Component" />
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
.nav-item {
  @apply flex items-center gap-3 px-4 py-3 border-2 border-black bg-white font-bold text-sm text-black hover:bg-yellow-300 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all;
}

.active-nav-item {
  @apply bg-black text-white shadow-[4px_4px_0px_0px_rgba(255,0,110,1)] border-black;
}

.active-nav-item svg {
  @apply text-[#ff006e];
}
</style>
