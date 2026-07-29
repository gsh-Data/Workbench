<script setup>
import { ref, onMounted } from 'vue';
import { Cloud, CloudRain, Sun, Bell, Menu, LayoutDashboard, BookOpen, Music, Calendar as CalendarIcon, X, Palette, Check } from '@lucide/vue';
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
    showNotifications.value = true; // Auto open on new notification
    
    // Play a subtle ding sound if needed
    // const audio = new Audio('/ding.mp3');
    // audio.play().catch(e => console.error(e));
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
    // Basic Open-Meteo API without API Key (Example coordinates: Shanghai)
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

// Provide music state globally so MusicStation view can control it
import { provide } from 'vue';
provide('musicState', musicState);
provide('playStation', playStation);
provide('togglePlay', togglePlay);
</script>

<template>
  <div class="h-screen w-full flex flex-col overflow-hidden bg-bg-primary text-text-primary">
    <!-- Header -->
    <header class="h-16 shrink-0 flex items-center justify-between px-6 border-b border-white/10 bg-bg-secondary/70 backdrop-blur-[20px] backdrop-saturate-[1.8] z-50">
      <div class="flex items-center gap-4">
        <button @click="sidebarOpen = !sidebarOpen" class="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <Menu class="w-5 h-5 text-text-secondary hover:text-text-primary" />
        </button>
        <div class="font-bold text-xl bg-accent-gradient bg-clip-text text-transparent">
          工作台 V4
        </div>
      </div>
      
      <div class="flex items-center gap-6">
        <!-- Weather Widget -->
        <div v-if="weather" class="flex items-center gap-2 text-sm text-text-secondary bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
          <component :is="getWeatherIcon(weather.weathercode)" class="w-4 h-4 text-accent-primary" />
          <span>{{ weather.temperature }}°C</span>
        </div>
        
        <!-- Notifications -->
        <div class="relative">
          <button @click="showNotifications = !showNotifications" class="relative p-2 hover:bg-white/5 rounded-full transition-colors">
            <Bell class="w-5 h-5 text-text-secondary hover:text-text-primary" />
            <span v-if="notifications.length > 0" class="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_#ef4444]"></span>
          </button>
          
          <div v-if="showNotifications" class="absolute right-0 top-12 w-80 bg-bg-secondary border border-white/10 rounded-xl shadow-2xl p-4 z-50">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold">消息通知</h3>
              <button @click="notifications = []" class="text-xs text-text-secondary hover:text-text-primary">清空</button>
            </div>
            <div v-if="notifications.length === 0" class="text-sm text-text-secondary text-center py-4">
              暂无新通知
            </div>
            <div v-else class="space-y-3 max-h-64 overflow-y-auto">
              <div v-for="(notif, idx) in notifications" :key="idx" class="p-3 bg-white/5 rounded-lg border border-white/5 text-sm animate-fade-in">
                {{ notif.message }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- System Status -->
        <div class="flex items-center gap-2 text-xs font-semibold px-3 py-1 rounded-full border border-white/10 bg-black/20">
          <span class="w-2 h-2 rounded-full" :class="systemStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'"></span>
          <span class="uppercase text-text-secondary">{{ systemStatus }}</span>
        </div>
      </div>
    </header>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <aside :class="['shrink-0 w-64 bg-bg-secondary/40 backdrop-blur-[20px] backdrop-saturate-[1.8] border-r border-white/10 flex flex-col transition-transform duration-300', sidebarOpen ? 'translate-x-0' : '-ml-64']">
        <nav class="flex-1 p-4 space-y-2">
          <router-link to="/dashboard" class="nav-item group" active-class="active-nav-item">
            <LayoutDashboard class="w-5 h-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
            <span>仪表盘</span>
          </router-link>
          
          <router-link to="/calendar" class="nav-item group" active-class="active-nav-item">
            <CalendarIcon class="w-5 h-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
            <span>日历</span>
          </router-link>
          
          <router-link to="/knowledge" class="nav-item group" active-class="active-nav-item">
            <BookOpen class="w-5 h-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
            <span>知识库</span>
          </router-link>
          
          <router-link to="/music" class="nav-item group" active-class="active-nav-item">
            <Music class="w-5 h-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
            <span>音乐台</span>
            <div v-if="musicState.isPlaying" class="ml-auto w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
          </router-link>
        </nav>
        
        <!-- Theme Switcher -->
        <div class="p-4 border-t border-white/5">
          <div class="text-xs font-semibold text-text-secondary mb-3 flex items-center gap-2">
            <Palette class="w-4 h-4" />
            主题色彩
          </div>
          <div class="flex flex-col gap-2">
            <button 
              v-for="t in themes" 
              :key="t.id"
              @click="setTheme(t.id)"
              class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
              :class="currentTheme === t.id ? 'bg-white/10 text-text-primary' : 'text-text-secondary'"
            >
              <span class="w-4 h-4 rounded-full border border-white/20 shadow-inner" :style="{ backgroundColor: t.color }"></span>
              {{ t.name }}
              <Check v-if="currentTheme === t.id" class="w-4 h-4 ml-auto text-accent-primary" />
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Container -->
      <main class="flex-1 overflow-y-auto relative bg-bg-primary">
        <!-- Floating Music Player if active -->
        <div v-if="musicState.currentStation" class="absolute bottom-6 right-6 p-4 bg-bg-secondary/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex items-center gap-4 z-40 group cursor-pointer hover:border-accent-primary/50 transition-colors" @click="$router.push('/music')">
          <div class="w-10 h-10 rounded-full bg-accent-gradient flex items-center justify-center animate-spin-slow" :style="{ animationPlayState: musicState.isPlaying ? 'running' : 'paused' }">
            <Music class="w-5 h-5 text-text-primary" />
          </div>
          <div>
            <div class="text-xs text-text-secondary">正在播放</div>
            <div class="text-sm font-semibold truncate w-32">{{ musicState.currentStation.name }}</div>
          </div>
        </div>

        <div class="p-6 h-full">
          <!-- Vue Router View with Transitions -->
          <router-view v-slot="{ Component }">
            <transition name="apple-spring" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<style>
.nav-item {
  @apply flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-text-secondary hover:bg-white/5 hover:text-text-primary transition-all;
}

.active-nav-item {
  @apply bg-accent-primary/10 text-accent-primary;
}

.active-nav-item svg {
  @apply text-accent-primary;
}

.animate-spin-slow {
  animation: spin 4s linear infinite;
}

.apple-spring-enter-active,
.apple-spring-leave-active {
  transition: opacity 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1);
}

.apple-spring-enter-from,
.apple-spring-leave-to {
  opacity: 0;
  transform: scale(0.98) translateY(10px);
}
</style>
