import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { configurarInterceptorDeAutenticacao } from './services/api'
import { restaurarSessao } from './services/session'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'

const app = createApp(App)
configurarInterceptorDeAutenticacao(router)
await restaurarSessao()

app.use(router)
app.mount('#app')
