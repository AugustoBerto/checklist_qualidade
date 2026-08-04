import axios from 'axios';
import router from '../router'; // Importamos o router para redirecionar no logout

const API_LOCAL_URL = 'http://10.111.0.101:3000/api';

const api = axios.create({
    baseURL: API_LOCAL_URL
});

// Interceptor de Requisição: Envia o token automaticamente em TODAS as chamadas
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor de Resposta: Trata erros de autenticação globalmente
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                console.warn("Sessão expirada. Forçando logout...");
                localStorage.clear(); // Limpa tudo (token, usuario, isAdmin)
                router.push('/login');
            } else if (error.response.status === 403) {
                alert("Você não tem permissão para realizar esta ação.");
            }
        }
        return Promise.reject(error);
    }
);

export default api;