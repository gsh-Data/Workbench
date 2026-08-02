<script setup>
import { ref, computed, watch, inject, onMounted } from 'vue';
import { 
  Play, Pause, SkipForward, SkipBack, Repeat, Repeat1, Shuffle, Volume2,
  Search, Music, Heart, Disc, ListMusic, Sparkles, Radio, AlignLeft, Check, ChevronDown, ChevronUp, Eye, X
} from '@lucide/vue';
import api from '../utils/api';

const musicState = inject('musicState');
const playStation = inject('playStation');
const togglePlay = inject('togglePlay');
const nextTrack = inject('nextTrack');
const prevTrack = inject('prevTrack');
const seekTrack = inject('seekTrack');
const setVolume = inject('setVolume');
const toggleMode = inject('toggleMode');

const activeTab = ref('discover'); // 'discover', 'search', 'lyrics'
const searchQuery = ref('');
const searchResults = ref([]);
const isSearching = ref(false);

const playlistInput = ref('');
const isImporting = ref(false);

const showMorePlaylists = ref(false);
const activeCategory = ref('全部');

const lyricsList = ref([]);
const activeLyricIndex = ref(0);
const lyricsContainer = ref(null);

// Preview Modal for playlist items
const selectedPlaylist = ref(null);
const playlistTracks = ref([]);
const isLoadingTracks = ref(false);
const showPlaylistModal = ref(false);

// Verified 100% Active NetEase Playlists
const categories = ['全部', '官方榜单', '治愈甜系', '轻音乐专注', '华语流行'];

const presetPlaylists = [
  {
    id: '3778678',
    name: '🔥 网易云热歌榜 (Top 100)',
    desc: '全网最火爆热门金曲，实时更新',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
    category: '官方榜单',
    tags: ['热歌榜', '热门', '全网爆款']
  },
  {
    id: '19723756',
    name: '🚀 飙升音乐榜 (Trending)',
    desc: '热度快速飙升的新歌与网红名曲',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&q=80',
    category: '官方榜单',
    tags: ['飙升榜', '流行', '新曲']
  },
  {
    id: '3779629',
    name: '✨ 新歌排行榜 (New Top)',
    desc: '最新华语与全球发售新曲推荐',
    cover: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&q=80',
    category: '官方榜单',
    tags: ['新歌', '新曲首发']
  },
  {
    id: '5059633707',
    name: '🌸 治愈甜系与晚安纯音乐',
    desc: '温柔软萌、适合独自沉静的高甜陪伴曲',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80',
    category: '治愈甜系',
    tags: ['治愈', '甜系', '晚安']
  },
  {
    id: '5059642708',
    name: '☕ 咖啡厅 Chillout Lofi',
    desc: '舒适温暖的背景音，专注写代码与阅读',
    cover: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&q=80',
    category: '轻音乐专注',
    tags: ['Lofi', '写代码', '专注']
  },
  {
    id: '708065275',
    name: '💖 华语经典流行金曲',
    desc: '回味经典流行，温暖你的每段时光',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80',
    category: '华语流行',
    tags: ['经典', '华语', '怀旧']
  },
  {
    id: '2884035',
    name: '🎸 独立原创音乐榜',
    desc: '充满灵性与态度的独立原创好歌',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&q=80',
    category: '官方榜单',
    tags: ['原创', '独立', '民谣']
  },
  {
    id: '2250982888',
    name: '🎶 抖音神曲与热歌精选',
    desc: '节奏感满满，热门短视频 BGM 大集合',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=80',
    category: '华语流行',
    tags: ['热歌', '网红BGM']
  }
];

const radioStations = [
  {
    id: 'lofi-girl',
    name: 'Lo-Fi Girl (24h Live Stream)',
    artist: 'Chill Beats',
    url: 'https://stream.zeno.fm/f3wvbbqmdg8uv',
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'synthwave',
    name: 'Synthwave Sunset Stream',
    artist: 'Retrowave Radio',
    url: 'https://stream.zeno.fm/fubyq23c72zuv',
    cover: 'https://images.unsplash.com/photo-1614729939124-03290b55c9ce?auto=format&fit=crop&w=400&q=80'
  },
  {
    id: 'jazz-cafe',
    name: 'Paris Smooth Jazz Cafe',
    artist: 'Jazz Ambiance',
    url: 'https://stream.zeno.fm/kmvxpmdb44zuv',
    cover: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=400&q=80'
  }
];

const filteredPlaylists = computed(() => {
  let list = presetPlaylists;
  if (activeCategory.value !== '全部') {
    list = list.filter(p => p.category === activeCategory.value);
  }
  if (!showMorePlaylists.value && activeCategory.value === '全部') {
    return list.slice(0, 3);
  }
  return list;
});

// Search Songs
const doSearch = async () => {
  if (!searchQuery.value.trim()) return;
  isSearching.value = true;
  try {
    const res = await api.get(`/music/search?keyword=${encodeURIComponent(searchQuery.value)}`);
    searchResults.value = res.data || [];
  } catch (error) {
    console.error('Search failed:', error);
  } finally {
    isSearching.value = false;
  }
};

// Import Playlist & Play immediately
const importPlaylist = async (playlistId = null) => {
  const targetId = playlistId || playlistInput.value.trim();
  if (!targetId) return;

  isImporting.value = true;
  try {
    const res = await api.get(`/music/playlist?id=${encodeURIComponent(targetId)}`);
    if (res.data && res.data.length > 0) {
      playStation(res.data[0], res.data);
      if (!playlistId) playlistInput.value = '';
    } else {
      // If Meting empty, fallback to hot songs playlist
      const fallbackRes = await api.get(`/music/playlist?id=3778678`);
      if (fallbackRes.data && fallbackRes.data.length > 0) {
        playStation(fallbackRes.data[0], fallbackRes.data);
      }
    }
  } catch (error) {
    console.error('Import playlist failed:', error);
  } finally {
    isImporting.value = false;
  }
};

// Open Playlist Track Preview Modal
const openPlaylistPreview = async (playlist) => {
  selectedPlaylist.value = playlist;
  showPlaylistModal.value = true;
  isLoadingTracks.value = true;
  playlistTracks.value = [];

  try {
    const res = await api.get(`/music/playlist?id=${playlist.id}`);
    playlistTracks.value = res.data || [];
  } catch (error) {
    console.error('Failed to load playlist tracks:', error);
  } finally {
    isLoadingTracks.value = false;
  }
};

const playAllPlaylist = () => {
  if (playlistTracks.value.length > 0) {
    playStation(playlistTracks.value[0], playlistTracks.value);
    showPlaylistModal.value = false;
  }
};

// Parse Lyrics LRC format
const parseLrc = (lrcStr) => {
  if (!lrcStr) return [];
  const lines = lrcStr.split('\n');
  const result = [];
  const timeExp = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
  
  lines.forEach(line => {
    const match = timeExp.exec(line);
    if (match) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms = parseInt(match[3]);
      const time = min * 60 + sec + ms / (match[3].length === 3 ? 1000 : 100);
      const text = line.replace(timeExp, '').trim();
      if (text) {
        result.push({ time, text });
      }
    }
  });
  return result.sort((a, b) => a.time - b.time);
};

// Fetch Lyrics when current song changes
watch(() => musicState.value.currentStation?.id, async (newId) => {
  if (!newId) return;
  lyricsList.value = [];
  if (musicState.value.currentStation?.lrc) {
    lyricsList.value = parseLrc(musicState.value.currentStation.lrc);
  } else {
    try {
      const res = await api.get(`/music/lyric?id=${newId}`);
      if (res.data && res.data.lyric) {
        lyricsList.value = parseLrc(res.data.lyric);
      }
    } catch (e) {
      console.warn('Failed to load lyrics:', e);
    }
  }
}, { immediate: true });

// Sync Lyrics Scroll
watch(() => musicState.value.currentTime, (currTime) => {
  if (lyricsList.value.length === 0) return;
  let idx = lyricsList.value.findIndex((item, i) => {
    const next = lyricsList.value[i + 1];
    return currTime >= item.time && (!next || currTime < next.time);
  });
  if (idx !== -1 && idx !== activeLyricIndex.value) {
    activeLyricIndex.value = idx;
    if (lyricsContainer.value && activeTab.value === 'lyrics') {
      const activeEl = lyricsContainer.value.children[idx];
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }
});

const formatSeconds = (sec) => {
  if (!sec || isNaN(sec)) return '00:00';
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};
</script>

<template>
  <div class="h-full flex flex-col gap-6 font-sans text-zinc-900">
    
    <!-- Top Female-friendly Header Banner -->
    <div class="p-6 md:p-8 bg-gradient-to-r from-rose-50/90 via-pink-50/70 to-purple-50/60 border border-pink-200/80 rounded-2xl shadow-sm flex items-center justify-between relative overflow-hidden">
      <div class="relative z-10">
        <div class="flex items-center gap-2 mb-2">
          <span class="bg-rose-500 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
            <Sparkles class="w-3 h-3" /> 柔和悦音馆
          </span>
          <span class="text-xs text-rose-500/80 font-medium">Sweet & Soft Ambiance</span>
        </div>
        <h1 class="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900 mb-1">
          音乐台 (Music Station)
        </h1>
        <p class="text-xs md:text-sm font-medium text-zinc-500">
          全网海量曲库搜索 · 热门歌单分类推荐 · 唱片光影与动态歌词
        </p>
      </div>

      <!-- Header Tabs -->
      <div class="hidden md:flex items-center gap-1.5 bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-pink-100 shadow-sm z-10">
        <button 
          @click="activeTab = 'discover'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          :class="activeTab === 'discover' ? 'bg-rose-500 text-white shadow-sm font-semibold' : 'text-zinc-600 hover:text-zinc-900'"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span>歌单发现</span>
        </button>

        <button 
          @click="activeTab = 'search'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          :class="activeTab === 'search' ? 'bg-rose-500 text-white shadow-sm font-semibold' : 'text-zinc-600 hover:text-zinc-900'"
        >
          <Search class="w-3.5 h-3.5" />
          <span>全网搜歌</span>
        </button>

        <button 
          @click="activeTab = 'lyrics'"
          class="px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
          :class="activeTab === 'lyrics' ? 'bg-rose-500 text-white shadow-sm font-semibold' : 'text-zinc-600 hover:text-zinc-900'"
        >
          <AlignLeft class="w-3.5 h-3.5" />
          <span>唱片与歌词</span>
        </button>
      </div>
    </div>

    <!-- Main Workspace Split -->
    <div class="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
      
      <!-- Left Panel (Discover / Search / Lyrics - 7 cols) -->
      <div class="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-1">
        
        <!-- DISCOVER TAB -->
        <div v-if="activeTab === 'discover'" class="space-y-6">
          
          <!-- Playlist Import Card -->
          <div class="bg-white/80 backdrop-blur-xl border border-pink-100/80 rounded-2xl p-5 shadow-sm">
            <h3 class="font-semibold text-sm text-zinc-900 mb-2 flex items-center gap-2">
              <ListMusic class="w-4 h-4 text-rose-500" />
              <span>导入网易云 / QQ 音乐歌单</span>
            </h3>
            <p class="text-xs text-zinc-400 mb-3">粘贴歌单链接或 ID（例如 `https://music.163.com/playlist?id=3778678`），瞬间导入全套曲库</p>
            <div class="flex gap-2">
              <input 
                v-model="playlistInput"
                placeholder="输入歌单链接或 ID..."
                class="flex-1 bg-rose-50/30 border border-pink-200/60 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 font-mono transition-all"
                @keyup.enter="importPlaylist()"
              />
              <button 
                @click="importPlaylist()"
                :disabled="isImporting"
                class="bg-rose-500 text-white px-4 py-2 rounded-xl font-medium text-xs hover:bg-rose-600 active:scale-[0.97] transition-all shadow-sm shrink-0 disabled:opacity-50"
              >
                {{ isImporting ? '解析中...' : '解析导入' }}
              </button>
            </div>
          </div>

          <!-- Preset Playlists Section -->
          <div class="space-y-3.5">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                <Heart class="w-4 h-4 text-rose-500 fill-rose-500" />
                <span>精选优雅歌单推荐</span>
              </h3>

              <!-- Categories Filter -->
              <div class="flex items-center gap-1.5 overflow-x-auto py-1">
                <button 
                  v-for="cat in categories" 
                  :key="cat"
                  @click="activeCategory = cat"
                  class="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                  :class="activeCategory === cat ? 'bg-rose-500 text-white font-semibold shadow-sm' : 'bg-white text-zinc-600 border border-pink-100 hover:bg-rose-50'"
                >
                  {{ cat }}
                </button>
              </div>
            </div>

            <!-- Playlists Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div 
                v-for="playlist in filteredPlaylists" 
                :key="playlist.id"
                class="group bg-white/90 backdrop-blur-xl border border-pink-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-pink-300/80 transition-all cursor-pointer flex flex-col"
              >
                <div class="relative h-32 overflow-hidden" @click="importPlaylist(playlist.id)">
                  <img :src="playlist.cover" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  
                  <!-- Direct Play Hover Button -->
                  <button class="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform" title="直接播放整单">
                    <Play class="w-4 h-4 ml-0.5" />
                  </button>

                  <!-- Preview Songs Icon -->
                  <button 
                    @click.stop="openPlaylistPreview(playlist)" 
                    class="absolute top-2.5 right-2.5 px-2 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-medium hover:bg-black/60 transition-colors flex items-center gap-1"
                    title="查看曲目"
                  >
                    <Eye class="w-3 h-3" /> 查看曲目
                  </button>
                </div>
                <div class="p-3.5 flex-1 flex flex-col justify-between bg-white" @click="importPlaylist(playlist.id)">
                  <div>
                    <h4 class="font-semibold text-xs text-zinc-900 line-clamp-1 mb-1 group-hover:text-rose-600 transition-colors">{{ playlist.name }}</h4>
                    <p class="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">{{ playlist.desc }}</p>
                  </div>
                  <div class="flex gap-1 mt-2.5">
                    <span v-for="tag in playlist.tags" :key="tag" class="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-medium">#{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- View More / Collapse Toggle Button -->
            <div v-if="activeCategory === '全部'" class="flex justify-center pt-2">
              <button 
                @click="showMorePlaylists = !showMorePlaylists"
                class="px-4 py-2 rounded-full border border-pink-200 bg-white text-rose-500 hover:bg-rose-50 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>{{ showMorePlaylists ? '收起部分歌单' : '查看更多歌单推荐 (共 8 个)' }}</span>
                <component :is="showMorePlaylists ? ChevronUp : ChevronDown" class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Live Radio Streams -->
          <div>
            <h3 class="font-semibold text-sm text-zinc-900 mb-3 flex items-center gap-2">
              <Radio class="w-4 h-4 text-purple-500" />
              <span>全天候沉浸式 Live 电台</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                v-for="station in radioStations"
                :key="station.id"
                @click="playStation(station)"
                class="p-3 rounded-xl border border-zinc-200/80 bg-white hover:border-pink-200 transition-all cursor-pointer flex items-center gap-3 shadow-sm"
              >
                <img :src="station.cover" class="w-10 h-10 rounded-lg object-cover" />
                <div class="overflow-hidden flex-1">
                  <div class="text-xs font-semibold text-zinc-900 truncate">{{ station.name }}</div>
                  <div class="text-[10px] text-zinc-400 truncate">{{ station.artist }}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- SEARCH TAB -->
        <div v-else-if="activeTab === 'search'" class="space-y-4">
          <!-- Search Bar -->
          <div class="flex gap-2">
            <div class="relative flex-1">
              <Search class="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input 
                v-model="searchQuery"
                @keyup.enter="doSearch"
                placeholder="搜索歌名、歌手（例如: 周杰伦 / 告白气球 / Taylor Swift）..."
                class="w-full bg-white border border-pink-200/80 rounded-xl pl-10 pr-3 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 shadow-sm transition-all"
              />
            </div>
            <button 
              @click="doSearch"
              :disabled="isSearching"
              class="bg-rose-500 text-white px-5 py-2.5 rounded-xl font-medium text-xs hover:bg-rose-600 active:scale-[0.97] transition-all shadow-sm shrink-0 disabled:opacity-50"
            >
              {{ isSearching ? '搜索中...' : '搜索歌曲' }}
            </button>
          </div>

          <!-- Search Results List -->
          <div class="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden min-h-[360px]">
            <div v-if="isSearching" class="text-xs text-zinc-400 text-center py-16">
              搜索全网曲库中...
            </div>
            <div v-else-if="searchResults.length === 0" class="text-xs text-zinc-400 text-center py-16">
              在上方输入关键词搜索歌曲
            </div>
            <ul v-else class="divide-y divide-zinc-100 max-h-[460px] overflow-y-auto">
              <li 
                v-for="song in searchResults" 
                :key="song.id"
                @click="playStation(song, searchResults)"
                class="p-3 hover:bg-rose-50/40 transition-colors flex items-center gap-3 cursor-pointer group"
                :class="musicState.currentStation?.id === song.id ? 'bg-rose-50/80' : ''"
              >
                <img :src="song.cover" class="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-100" />
                <div class="flex-1 overflow-hidden">
                  <div class="text-xs font-semibold text-zinc-900 truncate group-hover:text-rose-600 transition-colors">
                    {{ song.name }}
                  </div>
                  <div class="text-[11px] text-zinc-400 truncate">
                    {{ song.artist }} <span v-if="song.album">· {{ song.album }}</span>
                  </div>
                </div>
                <button class="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Play class="w-3.5 h-3.5 ml-0.5" />
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- LYRICS TAB -->
        <div v-else-if="activeTab === 'lyrics'" class="h-full flex flex-col bg-white border border-zinc-200 rounded-2xl shadow-sm p-6 overflow-hidden">
          <h3 class="font-semibold text-sm text-zinc-900 mb-4 flex items-center gap-2 shrink-0">
            <AlignLeft class="w-4 h-4 text-rose-500" />
            <span>实时歌词同步</span>
          </h3>

          <div v-if="lyricsList.length === 0" class="flex-1 flex flex-col items-center justify-center text-zinc-400 text-xs py-12">
            <Disc class="w-12 h-12 text-zinc-200 mb-3 animate-spin-slow" />
            <span>暂无当前歌曲的同步歌词</span>
          </div>

          <div v-else ref="lyricsContainer" class="flex-1 overflow-y-auto space-y-4 py-8 text-center scroll-smooth">
            <div 
              v-for="(line, idx) in lyricsList" 
              :key="idx"
              class="text-xs md:text-sm font-medium transition-all duration-300 leading-relaxed"
              :class="activeLyricIndex === idx ? 'text-rose-500 font-semibold text-base scale-105' : 'text-zinc-400 opacity-60'"
            >
              {{ line.text }}
            </div>
          </div>
        </div>

      </div>

      <!-- Right Panel: Apple Glass Vinyl Player (5 cols) -->
      <div class="lg:col-span-5 flex flex-col gap-4">
        
        <div class="bg-white/90 backdrop-blur-2xl border border-pink-100 rounded-2xl shadow-md p-6 flex flex-col items-center justify-between h-full relative overflow-hidden">
          
          <!-- Vinyl Disc Image Animation -->
          <div class="my-6 relative flex items-center justify-center">
            <div 
              class="w-48 h-48 rounded-full border-4 border-zinc-900 bg-zinc-900 shadow-2xl flex items-center justify-center relative overflow-hidden transition-transform"
              :class="musicState.isPlaying ? 'animate-spin-slow' : ''"
            >
              <!-- Disc Grooves -->
              <div class="absolute inset-2 rounded-full border border-zinc-700/40"></div>
              <div class="absolute inset-6 rounded-full border border-zinc-700/40"></div>
              <div class="absolute inset-10 rounded-full border border-zinc-700/40"></div>

              <!-- Cover Image Center -->
              <img 
                :src="musicState.currentStation?.cover || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&q=80'" 
                class="w-24 h-24 rounded-full object-cover border-2 border-zinc-800 shadow-inner" 
              />
            </div>
          </div>

          <!-- Song Info -->
          <div class="text-center w-full my-2">
            <h2 class="text-lg font-semibold text-zinc-900 truncate px-4">
              {{ musicState.currentStation?.name || '静候温暖旋律...' }}
            </h2>
            <p class="text-xs text-zinc-400 font-medium truncate mt-1">
              {{ musicState.currentStation?.artist || '选择上方歌曲或歌单开始播放' }}
            </p>
          </div>

          <!-- Progress Bar & Time -->
          <div class="w-full space-y-1.5 my-2">
            <div class="flex justify-between text-[10px] font-mono text-zinc-400">
              <span>{{ formatSeconds(musicState.currentTime) }}</span>
              <span>{{ formatSeconds(musicState.duration) }}</span>
            </div>
            <input 
              type="range"
              min="0"
              :max="musicState.duration || 100"
              :value="musicState.currentTime"
              @input="seekTrack($event.target.value)"
              class="w-full h-1.5 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          <!-- Full Player Controls -->
          <div class="w-full flex flex-col gap-4 mt-2">
            <div class="flex items-center justify-between px-4">
              <!-- Mode Toggle -->
              <button @click="toggleMode" class="text-zinc-400 hover:text-rose-500 transition-colors" title="切换模式">
                <Repeat1 v-if="musicState.mode === 'single'" class="w-4 h-4 text-rose-500" />
                <Shuffle v-else-if="musicState.mode === 'shuffle'" class="w-4 h-4 text-rose-500" />
                <Repeat v-else class="w-4 h-4 text-zinc-400" />
              </button>

              <div class="flex items-center gap-4">
                <!-- Prev Track -->
                <button @click="prevTrack" class="p-2 text-zinc-600 hover:text-zinc-900 active:scale-95 transition-all">
                  <SkipBack class="w-5 h-5" />
                </button>

                <!-- Play/Pause Button -->
                <button 
                  @click="togglePlay" 
                  class="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 active:scale-95 transition-all"
                >
                  <Pause v-if="musicState.isPlaying" class="w-5 h-5" />
                  <Play v-else class="w-5 h-5 ml-0.5" />
                </button>

                <!-- Next Track -->
                <button @click="nextTrack" class="p-2 text-zinc-600 hover:text-zinc-900 active:scale-95 transition-all">
                  <SkipForward class="w-5 h-5" />
                </button>
              </div>

              <!-- Volume Control -->
              <div class="flex items-center gap-1.5 text-zinc-400">
                <Volume2 class="w-4 h-4" />
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05"
                  :value="musicState.volume"
                  @input="setVolume($event.target.value)"
                  class="w-16 h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>
          </div>

          <!-- Current Playlist Quick Drawer -->
          <div v-if="musicState.playlist.length > 0" class="w-full mt-4 border-t border-pink-100 pt-3">
            <div class="flex items-center justify-between text-xs font-semibold text-zinc-700 mb-2">
              <span class="flex items-center gap-1">
                <ListMusic class="w-3.5 h-3.5 text-rose-500" /> 当前播放队列 ({{ musicState.playlist.length }})
              </span>
            </div>
            <div class="max-h-32 overflow-y-auto space-y-1 pr-1">
              <div 
                v-for="(item, idx) in musicState.playlist" 
                :key="item.id"
                @click="playStation(item, musicState.playlist)"
                class="flex items-center justify-between text-xs p-1.5 rounded-lg cursor-pointer transition-colors"
                :class="musicState.currentIndex === idx ? 'bg-rose-50 text-rose-600 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'"
              >
                <span class="truncate">{{ idx + 1 }}. {{ item.name }} - {{ item.artist }}</span>
                <Check v-if="musicState.currentIndex === idx" class="w-3.5 h-3.5 text-rose-500 shrink-0" />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>

    <!-- Playlist Tracks Preview Modal -->
    <Teleport to="body">
      <div v-if="showPlaylistModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm" @click.self="showPlaylistModal = false">
        <div class="bg-white/95 backdrop-blur-2xl border border-pink-100 rounded-2xl p-6 shadow-xl w-full max-w-lg font-sans">
          <div class="flex justify-between items-center mb-4 pb-3 border-b border-pink-100">
            <div class="flex items-center gap-3">
              <img :src="selectedPlaylist?.cover" class="w-10 h-10 rounded-xl object-cover" />
              <div>
                <h3 class="text-sm font-semibold text-zinc-900">{{ selectedPlaylist?.name }}</h3>
                <p class="text-[11px] text-zinc-400">{{ selectedPlaylist?.desc }}</p>
              </div>
            </div>
            <button @click="showPlaylistModal = false" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-rose-50">
              <X class="w-4 h-4" />
            </button>
          </div>

          <div v-if="isLoadingTracks" class="text-xs text-zinc-400 text-center py-12">
            正在读取歌单全量曲库...
          </div>
          <div v-else-if="playlistTracks.length === 0" class="text-xs text-zinc-400 text-center py-12">
            无法读取此歌单或内容为空，请重试
          </div>
          <div v-else class="space-y-3">
            <div class="flex items-center justify-between text-xs text-zinc-500 px-1 font-medium">
              <span>包含 {{ playlistTracks.length }} 首歌曲</span>
              <button @click="playAllPlaylist" class="bg-rose-500 text-white px-3 py-1 rounded-full text-xs font-semibold hover:bg-rose-600 transition-colors flex items-center gap-1 shadow-sm">
                <Play class="w-3.5 h-3.5" /> 播放整单
              </button>
            </div>

            <ul class="max-h-72 overflow-y-auto divide-y divide-zinc-100 border border-zinc-100 rounded-xl">
              <li 
                v-for="(track, idx) in playlistTracks" 
                :key="track.id"
                @click="playStation(track, playlistTracks); showPlaylistModal = false"
                class="p-2.5 hover:bg-rose-50/50 transition-colors flex items-center justify-between text-xs cursor-pointer group"
              >
                <div class="flex items-center gap-2.5 overflow-hidden">
                  <span class="text-zinc-400 font-mono text-[10px] w-5 text-right shrink-0">{{ idx + 1 }}</span>
                  <div class="truncate">
                    <span class="font-medium text-zinc-900 group-hover:text-rose-600 transition-colors">{{ track.name }}</span>
                    <span class="text-[11px] text-zinc-400 ml-1.5">- {{ track.artist }}</span>
                  </div>
                </div>
                <Play class="w-3.5 h-3.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </li>
            </ul>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<style scoped>
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spinSlow 20s linear infinite;
}
</style>
