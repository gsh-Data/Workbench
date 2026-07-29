<script setup>
import { inject } from 'vue';
import { Play, Square, Volume2, Radio } from '@lucide/vue';

const musicState = inject('musicState');
const playStation = inject('playStation');
const togglePlay = inject('togglePlay');

const stations = [
  {
    id: 'lofi-girl',
    name: 'Lo-Fi Girl (Chill Beats)',
    description: 'Beats to relax/study to',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv', // public lofi radio stream
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio',
    description: 'Retrowave & Cyberpunk vibes',
    url: 'https://stream.zeno.fm/fubyq23c72zuv', // public synthwave stream
    cover: 'https://images.unsplash.com/photo-1614729939124-03290b55c9ce?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz',
    description: 'Coffee shop ambiance',
    url: 'https://stream.zeno.fm/kmvxpmdb44zuv', // public jazz stream
    cover: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=400&q=80'
  }
];
</script>

<template>
  <div class="h-full space-y-6">
    <div class="flex items-center gap-3 mb-8">
      <div class="p-3 bg-accent-primary/20 rounded-2xl">
        <Radio class="w-8 h-8 text-accent-primary" />
      </div>
      <div>
        <h1 class="text-3xl font-bold text-text-primary">音乐台</h1>
        <p class="text-text-secondary">深度工作时的沉浸式背景音乐。</p>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="station in stations" 
        :key="station.id"
        class="bg-bg-secondary rounded-2xl overflow-hidden border border-white/5 shadow-xl group hover:border-white/20 transition-all cursor-pointer relative"
        @click="playStation(station)"
      >
        <div class="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/50 to-transparent z-10 pointer-events-none"></div>
        <img :src="station.cover" class="w-full h-48 object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
        
        <div class="absolute inset-0 z-20 p-6 flex flex-col justify-end">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-xl font-bold text-text-primary mb-1">{{ station.name }}</h3>
              <p class="text-sm text-text-secondary">{{ station.description }}</p>
            </div>
            
            <button class="w-12 h-12 rounded-full bg-accent-gradient flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
              <Play class="w-5 h-5 ml-1" v-if="musicState.currentStation?.id !== station.id || !musicState.isPlaying" />
              <Volume2 class="w-5 h-5 animate-pulse" v-else />
            </button>
          </div>
        </div>
        
        <!-- Active indicator overlay -->
        <div v-if="musicState.currentStation?.id === station.id" class="absolute inset-0 border-2 border-accent-primary rounded-2xl z-30 pointer-events-none"></div>
      </div>
    </div>
  </div>
</template>
