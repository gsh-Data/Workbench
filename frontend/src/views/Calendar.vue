<script setup>
import { ref, computed, onMounted } from 'vue';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, ListTodo, CheckCircle2, Circle, PlayCircle, Trash2 } from '@lucide/vue';
import api from '../utils/api';

const activeDate = ref(new Date());
const browseDate = ref(new Date());
const todos = ref([]);
const loading = ref(true);

const viewMode = ref('month'); // 'year', 'month', 'day'
// Track navigation direction for slide animations
const navDirection = ref(1); // 1 = next, -1 = prev

const selectedDate = ref(null);
const showAddModal = ref(false);
const newTodoText = ref('');

// Tooltip State
const hoveredDay = ref(null);
const tooltipPos = ref({ x: 0, y: 0 });

const onDayMouseEnter = (e, day) => {
  if (!day || getTodosForDate(day).length === 0) return;
  hoveredDay.value = day;
  const rect = e.currentTarget.getBoundingClientRect();
  tooltipPos.value = {
    x: rect.left + rect.width / 2,
    y: rect.top - 10
  };
};

const onDayMouseLeave = () => {
  hoveredDay.value = null;
};

const fetchTodos = async () => {
  try {
    const res = await api.get('/todos');
    todos.value = res.data;
  } catch (error) {
    console.error('Failed to fetch todos:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(fetchTodos);

// Navigation Logic
const prev = () => {
  navDirection.value = -1;
  if (viewMode.value === 'year') {
    browseDate.value = new Date(browseDate.value.getFullYear() - 1, browseDate.value.getMonth(), 1);
  } else if (viewMode.value === 'month') {
    browseDate.value = new Date(browseDate.value.getFullYear(), browseDate.value.getMonth() - 1, 1);
  } else {
    activeDate.value = new Date(activeDate.value.getFullYear(), activeDate.value.getMonth(), activeDate.value.getDate() - 1);
    browseDate.value = new Date(activeDate.value);
  }
};

const next = () => {
  navDirection.value = 1;
  if (viewMode.value === 'year') {
    browseDate.value = new Date(browseDate.value.getFullYear() + 1, browseDate.value.getMonth(), 1);
  } else if (viewMode.value === 'month') {
    browseDate.value = new Date(browseDate.value.getFullYear(), browseDate.value.getMonth() + 1, 1);
  } else {
    activeDate.value = new Date(activeDate.value.getFullYear(), activeDate.value.getMonth(), activeDate.value.getDate() + 1);
    browseDate.value = new Date(activeDate.value);
  }
};

// Title Formatting
const headerTitle = computed(() => {
  if (viewMode.value === 'year') {
    return `${browseDate.value.getFullYear()}年`;
  } else if (viewMode.value === 'month') {
    return browseDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  } else {
    return activeDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  }
});

// --- Year View ---
const monthsInYear = computed(() => {
  return Array.from({ length: 12 }, (_, i) => new Date(browseDate.value.getFullYear(), i, 1));
});
const selectMonth = (date) => {
  browseDate.value = date;
  viewMode.value = 'month';
};
const getTodosCountForMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  return todos.value.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;
};

// --- Month View ---
const daysInMonth = computed(() => {
  const year = browseDate.value.getFullYear();
  const month = browseDate.value.getMonth();
  const date = new Date(year, month, 1);
  const days = [];
  
  let firstDay = date.getDay();
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
});
const getTodosForDate = (date) => {
  if (!date) return [];
  // Important: Convert local date to YYYY-MM-DD safely
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset*60*1000))
  const dateStr = localDate.toISOString().split('T')[0]
  return todos.value.filter(t => t.dueDate === dateStr);
};
const selectDay = (date) => {
  if (!date) return;
  activeDate.value = date;
  browseDate.value = date;
  viewMode.value = 'day';
};

// --- Day View ---
const dayTodos = computed(() => getTodosForDate(activeDate.value));

const toggleTodo = async (todo) => {
  try {
    let currentStatus = todo.status || (todo.completed ? 'done' : 'todo');
    let nextStatus = 'todo';
    let completed = false;
    
    if (currentStatus === 'todo') {
      nextStatus = 'in-progress';
    } else if (currentStatus === 'in-progress') {
      nextStatus = 'done';
      completed = true;
    }

    const updated = { ...todo, status: nextStatus, completed };
    await api.put(`/todos/${todo.id}`, updated);
    const index = todos.value.findIndex(t => t.id === todo.id);
    if (index !== -1) todos.value[index] = updated;
  } catch (error) {
    console.error('Failed to toggle todo:', error);
  }
};

const deleteTodo = async (id) => {
  try {
    await api.delete(`/todos/${id}`);
    todos.value = todos.value.filter(t => t.id !== id);
  } catch (error) {
    console.error('Failed to delete todo:', error);
  }
};

// Add Modal
const openAddModal = (date) => {
  if (!date) return;
  selectedDate.value = date;
  newTodoText.value = '';
  showAddModal.value = true;
};

const closeAddModal = () => {
  showAddModal.value = false;
  setTimeout(() => {
    selectedDate.value = null;
  }, 300);
};

const addTodo = async () => {
  if (!newTodoText.value.trim() || !selectedDate.value) return;
  
  const offset = selectedDate.value.getTimezoneOffset()
  const localDate = new Date(selectedDate.value.getTime() - (offset*60*1000))
  const dateStr = localDate.toISOString().split('T')[0]

  try {
    const response = await api.post('/todos', { 
      text: newTodoText.value,
      dueDate: dateStr
    });
    todos.value.push(response.data);
    closeAddModal();
  } catch (error) {
    console.error('Failed to add todo:', error);
  }
};
</script>

<template>
  <div class="h-full flex flex-col gap-6 relative">
    <!-- Header Area -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-accent-primary/20 rounded-2xl">
          <CalendarIcon class="w-8 h-8 text-accent-primary" />
        </div>
        <div>
          <h1 class="text-3xl font-bold text-text-primary">日历任务</h1>
          <p class="text-text-secondary">在时间维度上规划你的待办事项。</p>
        </div>
      </div>
      
      <!-- View Mode Tabs (Apple Segmented Control Style) -->
      <div class="flex bg-black/40 p-1 rounded-xl border border-white/5 backdrop-blur-md">
        <button 
          @click="viewMode = 'year'" 
          class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300"
          :class="viewMode === 'year' ? 'bg-white/10 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'"
        >年</button>
        <button 
          @click="viewMode = 'month'" 
          class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300"
          :class="viewMode === 'month' ? 'bg-white/10 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'"
        >月</button>
        <button 
          @click="viewMode = 'day'" 
          class="px-5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300"
          :class="viewMode === 'day' ? 'bg-white/10 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'"
        >日</button>
      </div>
    </div>

    <!-- Calendar Container (Apple Glassmorphism) -->
    <div class="flex-1 bg-bg-secondary/40 backdrop-blur-[20px] backdrop-saturate-[1.8] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
      
      <!-- Calendar Control Header -->
      <div class="flex items-center justify-between p-6 border-b border-white/5 bg-white/5 relative z-10">
        <transition name="fade-slide-up" mode="out-in">
          <h2 :key="headerTitle" class="text-3xl font-bold text-text-primary">{{ headerTitle }}</h2>
        </transition>
        <div class="flex gap-2">
          <button @click="prev" class="btn-icon bg-white/5 hover:bg-white/10 w-10 h-10 rounded-full">
            <ChevronLeft class="w-5 h-5" />
          </button>
          <!-- Quick Add Button for Day view -->
          <button v-if="viewMode === 'day'" @click="openAddModal(activeDate)" class="btn-icon bg-accent-primary text-white hover:brightness-110 w-10 h-10 rounded-full shadow-[0_0_15px_rgba(var(--accent-primary),0.5)]">
            <Plus class="w-5 h-5" />
          </button>
          <button @click="next" class="btn-icon bg-white/5 hover:bg-white/10 w-10 h-10 rounded-full">
            <ChevronRight class="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <!-- Mac-style View Container -->
      <div class="flex-1 relative overflow-hidden bg-white/5">
        <transition :name="viewMode === 'year' ? 'zoom-out' : 'zoom-in'" mode="out-in">
          
          <!-- YEAR VIEW -->
          <div v-if="viewMode === 'year'" key="year" class="absolute inset-0 p-8 grid grid-cols-3 md:grid-cols-4 gap-6 overflow-y-auto">
            <div 
              v-for="month in monthsInYear" 
              :key="month.getMonth()"
              @click="selectMonth(month)"
              class="bg-transparent hover:bg-white/5 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95"
            >
              <div class="text-2xl font-bold text-text-primary mb-2" :class="{ 'text-accent-primary': month.getMonth() === new Date().getMonth() && browseDate.getFullYear() === new Date().getFullYear() }">{{ month.getMonth() + 1 }}月</div>
              <div v-if="getTodosCountForMonth(month) > 0" class="flex gap-1 mt-2">
                <div v-for="i in Math.min(3, getTodosCountForMonth(month))" :key="i" class="w-2 h-2 rounded-full bg-accent-primary/60"></div>
              </div>
            </div>
          </div>

          <!-- MONTH VIEW -->
          <div v-else-if="viewMode === 'month'" key="month" class="absolute inset-0 flex flex-col">
            <!-- Weekdays -->
            <div class="grid grid-cols-7 text-center py-4 text-xs font-semibold tracking-wider text-text-secondary uppercase">
              <div>日</div>
              <div>一</div>
              <div>二</div>
              <div>三</div>
              <div>四</div>
              <div>五</div>
              <div>六</div>
            </div>

            <!-- Days Grid Container for Slide Transition -->
            <div class="flex-1 relative overflow-hidden">
              <transition :name="navDirection > 0 ? 'slide-left' : 'slide-right'" mode="out-in">
                <div :key="browseDate.getMonth()" class="absolute inset-0 grid grid-cols-7 auto-rows-fr gap-px">
                  <div 
                    v-for="(day, idx) in daysInMonth" 
                    :key="idx" 
                    class="relative group p-2 min-h-[100px] border-t border-r border-white/5 transition-colors"
                    :class="{ 
                      'hover:bg-white/5 cursor-pointer': day, 
                      'opacity-30': !day,
                      'border-r-0': (idx + 1) % 7 === 0 
                    }"
                    @mouseenter="onDayMouseEnter($event, day)"
                    @mouseleave="onDayMouseLeave"
                  >
                    <div v-if="day" class="flex flex-col h-full" @click="selectDay(day)">
                      <div class="flex items-center justify-between mb-2">
                        <div class="w-8 h-8 flex items-center justify-center">
                          <!-- Apple Calendar Style active/today indicators -->
                          <span 
                            class="text-sm font-semibold w-8 h-8 flex items-center justify-center rounded-full transition-all" 
                            :class="{ 
                              'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]': day.toDateString() === new Date().toDateString(),
                              'bg-text-primary text-bg-primary': day.toDateString() === activeDate.toDateString() && day.toDateString() !== new Date().toDateString(),
                              'text-text-primary': day.toDateString() !== activeDate.toDateString() && day.toDateString() !== new Date().toDateString()
                            }"
                          >
                            {{ day.getDate() }}
                          </span>
                        </div>
                        <button @click.stop="openAddModal(day)" class="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded-full">
                          <Plus class="w-4 h-4 text-text-secondary" />
                        </button>
                      </div>
                      
                      <div class="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide pr-1">
                        <div 
                          v-for="todo in getTodosForDate(day).slice(0, 3)" 
                          :key="todo.id"
                          class="text-xs px-2 py-1 rounded-md truncate shadow-sm transition-all hover:brightness-110 border"
                          :class="{ 
                            'line-through opacity-40 bg-white/5 border-transparent text-text-secondary': (todo.status === 'done' || todo.completed),
                            'bg-accent-primary/20 text-accent-primary border-accent-primary/30 shadow-[0_0_8px_rgba(var(--accent-primary),0.2)]': todo.status === 'in-progress',
                            'bg-white/10 text-text-primary border-transparent': (todo.status !== 'done' && todo.status !== 'in-progress' && !todo.completed)
                          }"
                        >
                          {{ todo.text }}
                        </div>
                        <div v-if="getTodosForDate(day).length > 3" class="text-[10px] text-text-secondary font-medium pl-1 mt-1">
                          + {{ getTodosForDate(day).length - 3 }} 更多
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- DAY VIEW -->
          <div v-else-if="viewMode === 'day'" key="day" class="absolute inset-0 p-8 overflow-y-auto">
            <transition :name="navDirection > 0 ? 'slide-left' : 'slide-right'" mode="out-in">
              <div :key="activeDate.toDateString()" class="max-w-3xl mx-auto min-h-full">
                <div v-if="dayTodos.length === 0" class="h-full flex flex-col items-center justify-center text-text-secondary pt-20">
                  <div class="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <ListTodo class="w-10 h-10 opacity-40" />
                  </div>
                  <p class="text-lg mb-2">今天真是轻松的一天</p>
                  <p class="text-sm opacity-60 mb-6">没有任何已安排的待办事项。</p>
                  <button @click="openAddModal(activeDate)" class="btn-primary rounded-full px-6 py-2 text-sm shadow-[0_4px_15px_var(--shadow-glow)]">
                    <span class="flex items-center gap-2"><Plus class="w-4 h-4"/> 安排任务</span>
                  </button>
                </div>
                <ul v-else class="space-y-4">
                  <li 
                    v-for="todo in dayTodos" 
                    :key="todo.id" 
                    class="flex items-center gap-4 p-5 bg-white/5 backdrop-blur-md rounded-2xl hover:bg-white/10 transition-all border shadow-sm group"
                    :class="todo.status === 'in-progress' ? 'border-accent-primary/30 shadow-[0_0_15px_rgba(var(--accent-primary),0.1)]' : 'border-white/5'"
                  >
                    <button @click="toggleTodo(todo)" class="flex items-center justify-center hover:scale-110 transition-transform">
                      <CheckCircle2 v-if="(todo.status === 'done' || todo.completed)" :size="26" class="text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)] rounded-full" />
                      <PlayCircle v-else-if="todo.status === 'in-progress'" :size="26" class="text-accent-primary shadow-[0_0_10px_rgba(59,130,246,0.3)] rounded-full animate-pulse" />
                      <Circle v-else :size="26" class="text-text-secondary" />
                    </button>
                    <span 
                      class="flex-1 text-lg font-medium transition-all duration-300" 
                      :class="{ 
                        'line-through text-text-secondary opacity-50': (todo.status === 'done' || todo.completed), 
                        'text-accent-primary': todo.status === 'in-progress',
                        'text-text-primary': (todo.status !== 'done' && todo.status !== 'in-progress' && !todo.completed) 
                      }"
                    >
                      {{ todo.text }}
                    </span>
                    <button @click="deleteTodo(todo.id)" class="p-2.5 text-text-secondary hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 :size="18" />
                    </button>
                  </li>
                </ul>
              </div>
            </transition>
          </div>
        </transition>
      </div>
    </div>

    <!-- Apple-style Spring Modal -->
    <div 
      v-if="showAddModal" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { duration: 300 } }"
    >
      <div 
        class="bg-bg-secondary/80 backdrop-blur-[30px] backdrop-saturate-[2] border border-white/10 p-8 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-full max-w-md"
        v-motion
        :initial="{ y: 100, scale: 0.9, opacity: 0 }"
        :enter="{ 
          y: 0, 
          scale: 1, 
          opacity: 1,
          transition: { type: 'spring', stiffness: 300, damping: 25, mass: 1 }
        }"
      >
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-bold flex items-center gap-2">
            <ListTodo class="w-5 h-5 text-accent-primary" />
            添加日程任务
          </h3>
          <button @click="closeAddModal" class="btn-icon w-8 h-8 rounded-full bg-white/5 hover:bg-white/10">
            <X class="w-4 h-4" />
          </button>
        </div>
        
        <p class="text-sm text-text-secondary mb-4">
          日期：{{ selectedDate?.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
        
        <form @submit.prevent="addTodo" class="space-y-4">
          <el-input 
            v-model="newTodoText"
            placeholder="输入任务内容并按回车..."
            autofocus
            @keyup.enter="addTodo"
          />
          <div class="flex justify-end gap-3 pt-4">
            <button type="button" @click="closeAddModal" class="px-5 py-2.5 rounded-xl font-medium text-text-secondary hover:bg-white/5 transition-colors">
              取消
            </button>
            <button type="submit" class="btn-primary rounded-xl px-6 py-2.5">
              添加至日历
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Fixed Hover Tooltip for Tasks -->
    <transition name="fade">
      <div 
        v-if="hoveredDay && getTodosForDate(hoveredDay).length > 0"
        class="fixed z-[100] bg-bg-secondary/95 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-2xl pointer-events-none transform -translate-x-1/2 -translate-y-full w-64"
        :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
      >
        <div class="text-sm font-bold text-text-primary mb-3 pb-2 border-b border-white/10 flex items-center justify-between">
          <span>{{ hoveredDay.getMonth() + 1 }}月{{ hoveredDay.getDate() }}日</span>
          <span class="text-xs font-normal text-accent-primary bg-accent-primary/20 px-2 py-0.5 rounded-full">{{ getTodosForDate(hoveredDay).length }} 项待办</span>
        </div>
        <div class="space-y-2 max-h-48 overflow-y-auto scrollbar-hide">
          <div 
            v-for="todo in getTodosForDate(hoveredDay)" 
            :key="todo.id"
            class="text-xs flex items-start gap-2 p-1.5 rounded-lg transition-colors"
            :class="{
              'opacity-50': (todo.status === 'done' || todo.completed),
              'bg-accent-primary/10 border border-accent-primary/20': todo.status === 'in-progress'
            }"
          >
            <span class="mt-0.5 flex-shrink-0">
              <CheckCircle2 v-if="(todo.status === 'done' || todo.completed)" class="w-4 h-4 text-green-500" />
              <PlayCircle v-else-if="todo.status === 'in-progress'" class="w-4 h-4 text-accent-primary animate-pulse" />
              <Circle v-else class="w-4 h-4 text-text-secondary" />
            </span>
            <span class="break-all font-medium" :class="(todo.status === 'done' || todo.completed) ? 'line-through text-text-secondary' : 'text-text-primary'">{{ todo.text }}</span>
          </div>
        </div>
        <!-- Little arrow pointer -->
        <div class="absolute left-1/2 bottom-0 w-3 h-3 bg-bg-secondary border-b border-r border-white/10 transform -translate-x-1/2 translate-y-1/2 rotate-45 pointer-events-none"></div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Slide and Fade Transitions for Month/Day Navigation */
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active,
.fade-slide-up-enter-active, .fade-slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.slide-left-enter-from { opacity: 0; transform: translateX(30px); }
.slide-left-leave-to { opacity: 0; transform: translateX(-30px); }

.slide-right-enter-from { opacity: 0; transform: translateX(-30px); }
.slide-right-leave-to { opacity: 0; transform: translateX(30px); }

.fade-slide-up-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-up-leave-to { opacity: 0; transform: translateY(-10px); }

/* Zoom transitions for viewMode switching (Year <-> Month <-> Day) */
.zoom-in-enter-active, .zoom-in-leave-active,
.zoom-out-enter-active, .zoom-out-leave-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.zoom-in-enter-from { opacity: 0; transform: scale(0.95); }
.zoom-in-leave-to { opacity: 0; transform: scale(1.05); }

.zoom-out-enter-from { opacity: 0; transform: scale(1.05); }
.zoom-out-leave-to { opacity: 0; transform: scale(0.95); }

/* Tooltip Fade Transition */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-100% + 10px));
}
</style>
