import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
//import './style.css'
import '@mdi/font/css/materialdesignicons.css'
import axios from 'axios';

const API_LOCAL_URL = 'http://10.111.0.101:3000';

axios.interceptors.response.use(
    (response) => {
        // Se a requisição deu certo, apenas repassa a resposta
        return response;
    },
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                console.warn("Sessão expirada ou token inválido. Forçando logout...");
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                router.push('/login');
            } else if (error.response.status === 403) {
                console.warn("Usuário sem permissão para acessar este recurso.");
                alert("Você não tem permissão para realizar esta ação.");
                // Opcional: router.push('/dashboard');
            }
        }
        return Promise.reject(error);
    }
);

const app = createApp(App)
app.config.globalProperties.$apiUrl = API_LOCAL_URL;
app.use(router)
app.mount('#app')
