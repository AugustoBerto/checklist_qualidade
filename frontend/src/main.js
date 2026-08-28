import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { configurarInterceptorDeAutenticacao } from './services/api'
import { restaurarSessao } from './services/session'
import '@mdi/font/css/materialdesignicons.css'
import './style.css'

const app = createApp(App)
configurarInterceptorDeAutenticacao(router)
const perfilRestaurado = await restaurarSessao()

app.use(router)
await router.isReady()
if (['/', '/login'].includes(router.currentRoute.value.path)) {
  await router.replace(perfilRestaurado ? '/selecao' : '/login')
}
app.mount('#app')
