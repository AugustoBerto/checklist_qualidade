import axios from 'axios';

const API_LOCAL_URL = import.meta.env.VITE_API_URL || '/api/checklist-app/api';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000;

const api = axios.create({
    baseURL: API_LOCAL_URL,
    withCredentials: true,
    timeout: REQUEST_TIMEOUT_MS,
});

export const configurarInterceptorDeAutenticacao = (router) => {
  let redirecionamentoDeAutenticacaoEmAndamento = false;

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('usuario');
        localStorage.removeItem('isAdmin');
        if (!redirecionamentoDeAutenticacaoEmAndamento && router.currentRoute.value.path !== '/login') {
          redirecionamentoDeAutenticacaoEmAndamento = true;
          void router.replace('/login').finally(() => {
            redirecionamentoDeAutenticacaoEmAndamento = false;
          });
        }
      }
      return Promise.reject(error);
    }
  );
};

export default api;
