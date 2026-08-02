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
  <div class="h-full flex flex-col gap-6 relative font-sans">
    <!-- Header Area -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="p-3 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl shadow-sm">
          <CalendarIcon class="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 class="text-2xl font-semibold text-zinc-900 tracking-tight">日历任务 (Calendar)</h1>
          <p class="text-zinc-500 font-medium text-xs">在时间维度上规划你的待办事项与日程</p>
        </div>
      </div>
      
      <!-- View Mode Segment Control -->
      <div class="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200 gap-1">
        <button 
          @click="viewMode = 'year'" 
          class="px-3 py-1.5 font-medium text-xs rounded-md transition-all"
          :class="viewMode === 'year' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/60 font-semibold' : 'text-zinc-600 hover:text-zinc-900'"
        >年 View</button>
        <button 
          @click="viewMode = 'month'" 
          class="px-3 py-1.5 font-medium text-xs rounded-md transition-all"
          :class="viewMode === 'month' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/60 font-semibold' : 'text-zinc-600 hover:text-zinc-900'"
        >月 View</button>
        <button 
          @click="viewMode = 'day'" 
          class="px-3 py-1.5 font-medium text-xs rounded-md transition-all"
          :class="viewMode === 'day' ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/60 font-semibold' : 'text-zinc-600 hover:text-zinc-900'"
        >日 View</button>
      </div>
    </div>

    <!-- Calendar Container Card -->
    <div class="flex-1 bg-white border border-zinc-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
      
      <!-- Calendar Control Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-white">
        <h2 class="text-xl font-semibold text-zinc-900 tracking-tight">{{ headerTitle }}</h2>
        <div class="flex items-center gap-2">
          <button @click="prev" class="btn-icon">
            <ChevronLeft class="w-4 h-4 text-zinc-700" />
          </button>
          <button v-if="viewMode === 'day'" @click="openAddModal(activeDate)" class="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
            <Plus class="w-4 h-4" /><span>添加任务</span>
          </button>
          <button @click="next" class="btn-icon">
            <ChevronRight class="w-4 h-4 text-zinc-700" />
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
            class="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
          >
            <div class="text-xl font-semibold text-zinc-900 mb-1 group-hover:text-blue-600 transition-colors">{{ month.getMonth() + 1 }}月</div>
            <div v-if="getTodosCountForMonth(month) > 0" class="mt-2 bg-blue-50 text-blue-600 px-2.5 py-0.5 text-xs font-medium rounded-full border border-blue-100">
              {{ getTodosCountForMonth(month) }} 项任务
            </div>
            <div v-else class="text-xs text-zinc-400 mt-2 font-medium">无规划</div>
          </div>
        </div>

        <!-- MONTH VIEW -->
        <div v-else-if="viewMode === 'month'" class="absolute inset-0 flex flex-col">
          <div class="grid grid-cols-7 text-center py-2.5 text-xs font-semibold bg-zinc-50 text-zinc-500 border-b border-zinc-200">
            <div>周日</div>
            <div>周一</div>
            <div>周二</div>
            <div>周三</div>
            <div>周四</div>
            <div>周五</div>
            <div>周六</div>
          </div>

          <div class="flex-1 grid grid-cols-7 auto-rows-fr bg-zinc-200 gap-[1px]">
            <div 
              v-for="(day, idx) in daysInMonth" 
              :key="idx" 
              class="relative group p-2 min-h-[85px] transition-colors"
              :class="{ 
                'hover:bg-zinc-50 cursor-pointer bg-white': day, 
                'bg-zinc-50/60 opacity-40': !day
              }"
              @mouseenter="onDayMouseEnter($event, day)"
              @mouseleave="onDayMouseLeave"
            >
              <div v-if="day" class="flex flex-col h-full" @click="selectDay(day)">
                <div class="flex items-center justify-between mb-1.5">
                  <span 
                    class="text-xs font-semibold px-2 py-0.5 rounded-md transition-colors" 
                    :class="{ 
                      'bg-blue-600 text-white shadow-sm': day.toDateString() === new Date().toDateString(),
                      'bg-zinc-900 text-white': day.toDateString() === activeDate.toDateString() && day.toDateString() !== new Date().toDateString(),
                      'bg-zinc-100 text-zinc-700': day.toDateString() !== activeDate.toDateString() && day.toDateString() !== new Date().toDateString()
                    }"
                  >
                    {{ day.getDate() }}
                  </span>
                  <button @click.stop="openAddModal(day)" class="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-all">
                    <Plus class="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div class="flex-1 overflow-y-auto space-y-1 pr-0.5">
                  <div 
                    v-for="todo in getTodosForDate(day).slice(0, 2)" 
                    :key="todo.id"
                    class="text-[11px] px-2 py-0.5 rounded border truncate font-medium transition-all"
                    :class="{ 
                      'line-through bg-zinc-100 text-zinc-400 border-zinc-200': (todo.status === 'done' || todo.completed),
                      'bg-amber-50 text-amber-700 border-amber-200': todo.status === 'in-progress',
                      'bg-blue-50 text-blue-700 border-blue-100': (todo.status !== 'done' && todo.status !== 'in-progress' && !todo.completed)
                    }"
                  >
                    {{ todo.text }}
                  </div>
                  <div v-if="getTodosForDate(day).length > 2" class="text-[10px] font-medium text-zinc-400 pl-1">
                    +{{ getTodosForDate(day).length - 2 }} 更多
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- DAY VIEW -->
        <div v-else-if="viewMode === 'day'" class="absolute inset-0 p-6 overflow-y-auto">
          <div class="max-w-2xl mx-auto">
            <div v-if="dayTodos.length === 0" class="text-center py-16 bg-zinc-50 border border-zinc-200 rounded-xl p-8">
              <ListTodo class="w-10 h-10 text-zinc-400 mx-auto mb-3" />
              <p class="text-base font-semibold text-zinc-900 mb-1">今日无日程规划</p>
              <p class="text-xs text-zinc-500 mb-4">创建任务在今日完成目标</p>
              <button @click="openAddModal(activeDate)" class="btn-primary">
                + 添加日程任务
              </button>
            </div>
            <ul v-else class="space-y-2.5">
              <li 
                v-for="todo in dayTodos" 
                :key="todo.id" 
                class="flex items-center gap-3 p-3.5 bg-white border border-zinc-200 rounded-xl shadow-sm group hover:border-zinc-300 transition-all"
                :class="todo.status === 'in-progress' ? 'bg-amber-50/50 border-amber-200' : ''"
              >
                <button @click="toggleTodo(todo)" class="shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <CheckSquare v-if="(todo.status === 'done' || todo.completed)" :size="20" class="text-emerald-600" />
                  <Play v-else-if="todo.status === 'in-progress'" :size="20" class="text-amber-600" />
                  <Square v-else :size="20" class="text-zinc-400" />
                </button>
                <span 
                  class="flex-1 text-sm font-medium transition-all" 
                  :class="{ 
                    'line-through text-zinc-400': (todo.status === 'done' || todo.completed), 
                    'text-zinc-900': (todo.status !== 'done' && !todo.completed)
                  }"
                >
                  {{ todo.text }}
                </span>
                <button @click="deleteTodo(todo.id)" class="opacity-0 group-hover:opacity-100 p-1.5 rounded text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-all">
                  <Trash2 :size="16" />
                </button>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>

    <!-- Modal -->
    <div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
      <div class="bg-white border border-zinc-200 rounded-xl p-6 shadow-md w-full max-w-md">
        <div class="flex justify-between items-center mb-4 pb-3 border-b border-zinc-100">
          <h3 class="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <ListTodo class="w-4 h-4 text-blue-600" />
            添加日程任务
          </h3>
          <button @click="closeAddModal" class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100">
            <X class="w-4 h-4" />
          </button>
        </div>
        
        <p class="text-xs font-medium text-zinc-600 mb-4 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 flex items-center gap-1.5">
          <CalendarIcon class="w-3.5 h-3.5 text-blue-600" />
          指定日期: {{ selectedDate?.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) }}
        </p>
        
        <form @submit.prevent="addTodo" class="space-y-4">
          <input 
            v-model="newTodoText"
            placeholder="输入任务内容..."
            class="input-base"
            autofocus
          />
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" @click="closeAddModal" class="px-4 py-2 rounded-lg border border-zinc-200 bg-white text-zinc-700 text-xs font-medium hover:bg-zinc-50">
              取消
            </button>
            <button type="submit" class="btn-primary text-xs py-2 px-4">
              保存至日历
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Tooltip -->
    <div 
      v-if="hoveredDay && getTodosForDate(hoveredDay).length > 0"
      class="fixed z-[100] bg-white border border-zinc-200 rounded-xl p-3 shadow-md pointer-events-none transform -translate-x-1/2 -translate-y-full w-60"
      :style="{ left: tooltipPos.x + 'px', top: tooltipPos.y + 'px' }"
    >
      <div class="text-xs font-semibold text-zinc-900 mb-2 pb-1 border-b border-zinc-100 flex items-center justify-between">
        <span>{{ hoveredDay.getMonth() + 1 }}月{{ hoveredDay.getDate() }}日</span>
        <span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-medium">{{ getTodosForDate(hoveredDay).length }} 项</span>
      </div>
      <div class="space-y-1 max-h-40 overflow-y-auto">
        <div 
          v-for="todo in getTodosForDate(hoveredDay)" 
          :key="todo.id"
          class="text-[11px] font-medium p-1.5 rounded bg-zinc-50 text-zinc-700 truncate border border-zinc-100"
        >
          • {{ todo.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
