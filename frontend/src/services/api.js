import axios from 'axios';
import router from '../router'; // Importamos o router para redirecionar no logout

const API_LOCAL_URL = import.meta.env.VITE_API_URL || '/api/checklist-app/api';

const api = axios.create({
    baseURL: API_LOCAL_URL,
    withCredentials: true,
});

// Interceptor de Resposta: Trata erros de autenticação globalmente
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response) {
            if (error.response.status === 401) {
                console.warn("Sessão expirada. Forçando logout...");
                localStorage.removeItem('usuario');
                localStorage.removeItem('isAdmin');
                router.push('/login');
            }
        }
        return Promise.reject(error);
    }
);

export default api;
