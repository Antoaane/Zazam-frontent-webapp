import { createApp } from 'vue'
import { createPinia } from 'pinia'
import '@/main.scss'

import Main from './App.vue'
import router from './router'

const app = createApp(Main)

app.use(createPinia())
app.use(router)

app.mount('#app')
