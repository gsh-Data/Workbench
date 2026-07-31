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
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio',
    description: 'Retrowave & Cyberpunk vibes',
    url: 'https://stream.zeno.fm/fubyq23c72zuv',
    cover: 'https://images.unsplash.com/photo-1614729939124-03290b55c9ce?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jazz',
    name: 'Smooth Jazz',
    description: 'Coffee shop ambiance',
    url: 'https://stream.zeno.fm/kmvxpmdb44zuv',
    cover: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=400&q=80'
  }
];
</script>

<template>
  <div class="h-full space-y-6 font-mono">
    <!-- Header Banner -->
    <div class="flex items-center gap-4 bg-yellow-300 border-4 border-black p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <div class="p-3 bg-black text-white border-2 border-black">
        <Radio class="w-8 h-8 text-yellow-300" />
      </div>
      <div>
        <h1 class="text-3xl font-black text-black uppercase tracking-wider">音乐台 (MUSIC STATION)</h1>
        <p class="text-black font-bold uppercase text-xs">深度工作时的沉浸式背景音乐</p>
      </div>
    </div>

    <!-- Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="station in stations" 
        :key="station.id"
        class="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] group hover:shadow-[8px_8px_0px_0px_rgba(255,0,110,1)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
        @click="playStation(station)"
      >
        <img :src="station.cover" class="w-full h-44 object-cover border-b-4 border-black opacity-90 group-hover:opacity-100 transition-opacity" />
        
        <div class="p-4 bg-white flex items-center justify-between">
          <div>
            <h3 class="text-lg font-black text-black uppercase mb-1">{{ station.name }}</h3>
            <p class="text-xs font-bold text-gray-700 uppercase">{{ station.description }}</p>
          </div>
          
          <button class="w-12 h-12 border-2 border-black bg-[#ff006e] text-white flex items-center justify-center font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:bg-cyan-400 group-hover:text-black transition-colors">
            <Play class="w-5 h-5 ml-0.5" v-if="musicState.currentStation?.id !== station.id || !musicState.isPlaying" />
            <Volume2 class="w-5 h-5" v-else />
          </button>
        </div>
        
        <!-- Active Badge -->
        <div v-if="musicState.currentStation?.id === station.id" class="absolute top-2 right-2 bg-lime-400 text-black border-2 border-black px-2 py-0.5 font-black text-xs uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          PLAYING NOW
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
