import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from './views/Dashboard.vue';
import KnowledgeBase from './views/KnowledgeBase.vue';
import MusicStation from './views/MusicStation.vue';
import Calendar from './views/Calendar.vue';

const routes = [
  { path: '/', redirect: '/dashboard' },
  { path: '/dashboard', component: Dashboard },
  { path: '/calendar', component: Calendar },
  { path: '/knowledge', component: KnowledgeBase },
  { path: '/music', component: MusicStation },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
