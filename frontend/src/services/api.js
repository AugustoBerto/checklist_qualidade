import axios from 'axios';
import { authApi } from './auth';

const API_LOCAL_URL = import.meta.env.VITE_API_URL || '/api/checklist-app/api';
const REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS) || 15000;

const api = axios.create({
    baseURL: API_LOCAL_URL,
    withCredentials: true,
    timeout: REQUEST_TIMEOUT_MS,
});

export const configurarInterceptorDeAutenticacao = (router) => {
  let redirecionamentoDeAutenticacaoEmAndamento = false;
  let renovacaoEmAndamento = null;

  const redirecionarParaLogin = () => {
    localStorage.removeItem('usuario');
    if (!redirecionamentoDeAutenticacaoEmAndamento && router.currentRoute.value.path !== '/login') {
      redirecionamentoDeAutenticacaoEmAndamento = true;
      void router.replace('/login').finally(() => {
        redirecionamentoDeAutenticacaoEmAndamento = false;
      });
    }
  };

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const requisicao = error.config;
        if (requisicao && !requisicao._sessaoRenovada) {
          requisicao._sessaoRenovada = true;
          try {
            renovacaoEmAndamento ||= authApi.post('/auth/me').finally(() => {
              renovacaoEmAndamento = null;
            });
            await renovacaoEmAndamento;
            return api.request(requisicao);
          } catch {
            redirecionarParaLogin();
          }
        } else {
          redirecionarParaLogin();
        }
      }
      return Promise.reject(error);
    }
  );
};

export default api;
