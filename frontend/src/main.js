import { createApp } from 'vue'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import './style.css'
import ElementPlus from 'element-plus'
import App from './App.vue'
import router from './router'
import { MotionPlugin } from '@vueuse/motion'

const app = createApp(App)
app.use(router)
app.use(MotionPlugin)
app.use(ElementPlus)
app.mount('#app')
