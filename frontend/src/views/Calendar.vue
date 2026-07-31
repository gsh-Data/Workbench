<script setup>
import { ref, computed, onMounted } from 'vue';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, ListTodo, CheckSquare, Square, Play, Trash2 } from '@lucide/vue';
import api from '../utils/api';

const activeDate = ref(new Date());
const browseDate = ref(new Date());
const todos = ref([]);
const loading = ref(true);

const viewMode = ref('month'); // 'year', 'month', 'day'
const navDirection = ref(1);

const selectedDate = ref(null);
const showAddModal = ref(false);
const newTodoText = ref('');

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

const headerTitle = computed(() => {
  if (viewMode.value === 'year') {
    return `${browseDate.value.getFullYear()}年`;
  } else if (viewMode.value === 'month') {
    return browseDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
  } else {
    return activeDate.value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  }
});

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
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset*60*1000));
  const dateStr = localDate.toISOString().split('T')[0];
  return todos.value.filter(t => t.dueDate === dateStr);
};

const selectDay = (date) => {
  if (!date) return;
  activeDate.value = date;
  browseDate.value = date;
  viewMode.value = 'day';
};

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
  
  const offset = selectedDate.value.getTimezoneOffset();
  const localDate = new Date(selectedDate.value.getTime() - (offset*60*1000));
  const dateStr = localDate.toISOString().split('T')[0];

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
  <div class="h-full flex flex-col gap-6 relative font-mono">
    <!-- Header Area -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-yellow-300 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <CalendarIcon class="w-8 h-8 text-black" />
        </div>
        <div>
          <h1 class="text-3xl font-black text-black uppercase tracking-wider">日历任务 (CALENDAR)</h1>
          <p class="text-black font-bold uppercase text-xs">在时间维度上规划你的待办事项</p>
        </div>
      </div>
      
      <!-- View Mode Tabs -->
      <div class="flex bg-white p-1 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] gap-1">
        <button 
          @click="viewMode = 'year'" 
          class="px-4 py-1.5 font-black text-sm uppercase transition-all border-2 border-black"
          :class="viewMode === 'year' ? 'bg-black text-white' : 'bg-white text-black hover:bg-yellow-200'"
        >年 (YEAR)</button>
        <button 
          @click="viewMode = 'month'" 
          class="px-4 py-1.5 font-black text-sm uppercase transition-all border-2 border-black"
          :class="viewMode === 'month' ? 'bg-black text-white' : 'bg-white text-black hover:bg-yellow-200'"
        >月 (MONTH)</button>
        <button 
          @click="viewMode = 'day'" 
          class="px-4 py-1.5 font-black text-sm uppercase transition-all border-2 border-black"
          :class="viewMode === 'day' ? 'bg-black text-white' : 'bg-white text-black hover:bg-yellow-200'"
        >日 (DAY)</button>
      </div>
    </div>

    <!-- Calendar Container -->
    <div class="flex-1 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden">
      
      <!-- Calendar Control Header -->
      <div class="flex items-center justify-between p-4 border-b-4 border-black bg-yellow-300">
        <h2 class="text-2xl font-black text-black uppercase tracking-tight">{{ headerTitle }}</h2>
        <div class="flex gap-2">
          <button @click="prev" class="btn-icon bg-white">
            <ChevronLeft class="w-5 h-5 text-black" />
          </button>
          <button v-if="viewMode === 'day'" @click="openAddModal(activeDate)" class="btn-primary py-1 px-3 text-xs">
            <Plus class="w-4 h-4 inline mr-1" />添加任务
          </button>
          <button @click="next" class="btn-icon bg-white">
            <ChevronRight class="w-5 h-5 text-black" />
          </button>
        </div>
      </div>
      
      <!-- Main Content View -->
      <div class="flex-1 relative overflow-hidden bg-white">
        
        <!-- YEAR VIEW -->
        <div v-if="viewMode === 'year'" class="absolute inset-0 p-6 grid grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto">
          <div 
            v-for="month in monthsInYear" 
            :key="month.getMonth()"
            @click="selectMonth(month)"
            class="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-yellow-200 hover:-translate-y-1 transition-all"
          >
            <div class="text-2xl font-black text-black mb-1">{{ month.getMonth() + 1 }}月</div>
            <div v-if="getTodosCountForMonth(month) > 0" class="mt-2 bg-[#ff006e] text-white px-2 py-0.5 text-xs font-black border border-black">
              {{ getTodosCountForMonth(month) }} 项任务
            </div>
          </div>
        </div>

        <!-- MONTH VIEW -->
        <div v-else-if="viewMode === 'month'" class="absolute inset-0 flex flex-col">
          <div class="grid grid-cols-7 text-center py-2 text-xs font-black bg-black text-white uppercase border-b-4 border-black">
            <div>日 (SUN)</div>
            <div>一 (MON)</div>
            <div>二 (TUE)</div>
            <div>三 (WED)</div>
            <div>四 (THU)</div>
            <div>五 (FRI)</div>
            <div>六 (SAT)</div>
          </div>

          <div class="flex-1 grid grid-cols-7 auto-rows-fr border-l-2 border-t-2 border-black">
            <div 
              v-for="(day, idx) in daysInMonth" 
              :key="idx" 
              class="relative group p-1 min-h-[90px] border-b-2 border-r-2 border-black transition-colors"
              :class="{ 
                'hover:bg-yellow-100 cursor-pointer bg-white': day, 
                'bg-gray-100 opacity-40': !day
              }"
              @mouseenter="onDayMouseEnter($event, day)"
              @mouseleave="onDayMouseLeave"
            >
              <div v-if="day" class="flex flex-col h-full" @click="selectDay(day)">
                <div class="flex items-center justify-between mb-1">
                  <span 
                    class="text-xs font-black px-1.5 py-0.5 border border-black" 
                    :class="{ 
                      'bg-[#ff006e] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]': day.toDateString() === new Date().toDateString(),
                      'bg-black text-white': day.toDateString() === activeDate.toDateString() && day.toDateString() !== new Date().toDateString(),
                      'bg-white text-black': day.toDateString() !== activeDate.toDateString() && day.toDateString() !== new Date().toDateString()
                    }"
                  >
                    {{ day.getDate() }}
                  </span>
                  <button @click.stop="openAddModal(day)" class="opacity-0 group-hover:opacity-100 p-0.5 border border-black bg-yellow-300">
                    <Plus class="w-3 h-3 text-black" />
                  </button>
                </div>
                
                <div class="flex-1 overflow-y-auto space-y-1">
                  <div 
                    v-for="todo in getTodosForDate(day).slice(0, 2)" 
                    :key="todo.id"
                    class="text-[10px] p-1 border border-black truncate font-bold uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    :class="{ 
                      'line-through bg-gray-200 text-gray-500': (todo.status === 'done' || todo.completed),
                      'bg-yellow-300 text-black': todo.status === 'in-progress',
                      'bg-white text-black': (todo.status !== 'done' && todo.status !== 'in-progress' && !todo.completed)
                    }"
                  >
                    {{ todo.text }}
                  </div>
                  <div v-if="getTodosForDate(day).length > 2" class="text-[9px] font-black text-black pl-1">
                    +{{ getTodosForDate(day).length - 2 }} 更多
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- DAY VIEW -->
        <div v-else-if="viewMode === 'day'" class="absolute inset-0 p-6 overflow-y-auto">
          <div class="max-w-3xl mx-auto">
            <div v-if="dayTodos.length === 0" class="text-center py-16 bg-yellow-100 border-4 border-black p-8">
              <ListTodo class="w-12 h-12 text-black mx-auto mb-4" />
              <p class="text-xl font-black text-black uppercase mb-2">[今日无日程规划]</p>
              <button @click="openAddModal(activeDate)" class="btn-primary mt-4">
                + 添加日程任务
              </button>
            </div>
            <ul v-else class="space-y-3">
              <li 
                v-for="todo in dayTodos" 
                :key="todo.id" 
                class="flex items-center gap-4 p-4 bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group"
                :class="todo.status === 'in-progress' ? 'bg-yellow-200' : ''"
              >
                <button @click="toggleTodo(todo)" class="shrink-0">
                  <CheckSquare v-if="(todo.status === 'done' || todo.completed)" :size="24" class="text-black bg-lime-400 border-2 border-black" />
                  <Play v-else-if="todo.status === 'in-progress'" :size="24" class="text-black bg-cyan-400 border-2 border-black p-0.5" />
                  <Square v-else :size="24" class="text-black" />
                </button>
                <span 
                  class="flex-1 text-base font-black uppercase transition-all" 
                  :class="{ 
                    'line-through text-gray-500': (todo.status === 'done' || todo.completed), 
                    'text-black': (todo.status !== 'done' && !todo.completed)
                  }"
                >
                  {{ todo.text }}
                </span>
                <button @click="deleteTodo(todo.id)" class="opacity-0 group-hover:opacity-100 p-1 border-2 border-black bg-red-500 text-white">
                  <Trash2 :size="16" />
                </button>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md">
        <div class="flex justify-between items-center mb-4 pb-2 border-b-4 border-black">
          <h3 class="text-lg font-black uppercase text-black flex items-center gap-2">
            <ListTodo class="w-5 h-5 text-black" />
            添加日程任务
          </h3>
          <button @click="closeAddModal" class="p-1 border-2 border-black bg-yellow-300">
            <X class="w-4 h-4" />
          </button>
        </div>
        
        <p class="text-xs font-bold text-black mb-4 uppercase bg-yellow-100 p-2 border-2 border-black">
          日期: {{ selectedDate?.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
        
        <form @submit.prevent="addTodo" class="space-y-4">
          <input 
            v-model="newTodoText"
            placeholder="输入任务内容..."
            class="w-full border-4 border-black bg-white p-3 font-bold text-sm focus:bg-yellow-200 outline-none"
            autofocus
          />
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeAddModal" class="px-4 py-2 border-2 border-black bg-gray-200 font-bold text-xs uppercase">
              取消
            </button>
            <button type="submit" class="btn-primary text-xs py-2 px-5">
              保存至日历
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tooltip -->
    <div 
      v-if="hoveredDay && getTodosForDate(hoveredDay).length > 0"
      class="fixed z-[100] bg-white border-4 border-black p-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] pointer-events-none transform -translate-x-1/2 -translate-y-full w-60"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      <div class="text-xs font-black text-black mb-2 pb-1 border-b-2 border-black flex items-center justify-between">
        <span>{{ hoveredDay.getMonth() + 1 }}月{{ hoveredDay.getDate() }}日</span>
        <span class="bg-black text-white px-1.5 py-0.5 text-[9px]">{{ getTodosForDate(hoveredDay).length }} 项</span>
      </div>
      <div class="space-y-1 max-h-40 overflow-y-auto">
        <div 
          v-for="todo in getTodosForDate(hoveredDay)" 
          :key="todo.id"
          class="text-[11px] font-bold p-1 border border-black bg-yellow-100 truncate"
        >
          • {{ todo.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
