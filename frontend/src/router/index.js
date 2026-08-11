import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import FormularioView from '../views/FormularioView.vue'
import ConsultarView from '../views/ConsultarView.vue'
import AdministradorView from '../views/AdministradorView.vue'
import LoginView from '../views/LoginView.vue'
import SelecaoView from '../views/CheckSelecao.vue'
import RelatorioView from '../views/RelatorioView.vue'
import CriarUsuarioView from '../views/CriarUsuarioView.vue'
import CriarModeloView from '../views/CriarModeloView.vue'
import EditarModelo from '../views/EditarModelo.vue'
import ConfiguracoesView from '../views/ConfiguracoesView.vue'
import { possuiPerfilLocal, restaurarSessao } from '../services/session'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/login', name: 'Login', component: LoginView },
  {
    path: '/formulario/:modelo',
    name: 'Formulario',
    component: FormularioView,
    meta: { requiresAuth: true }
  },
  {
    path: '/selecao',
    name: 'Selecao',
    component: SelecaoView,
    meta: { requiresAuth: true }
  },
  {
    path: '/relatorio/:id',
    name: 'Relatorio',
    component: RelatorioView,
    meta: { requiresAuth: true }
  },
  {
    path: '/usuarios/novo',
    name: 'CriarUsuario',
    component: CriarUsuarioView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/modelos/novo',
    name: 'CriarModelo',
    component: CriarModeloView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/administrador',
    name: 'Administrador',
    component: AdministradorView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/configuracoes',
    name: 'Configuracoes',
    component: ConfiguracoesView,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/editar-modelo/',
    name: 'EditarModelo',
    component: EditarModelo,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/consultar',
    name: 'Consultar',
    component: ConsultarView,
    meta: { requiresAuth: true },
  },
  {
    path: '/detalhe/:id',
    name: 'DetalheRelatorio',
    component: () => import('../views/DetalheRelatorioView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const getIsAdmin = () => {
  const userStr = localStorage.getItem('usuario');
  if (userStr) {
    try {
      const u = JSON.parse(userStr);
      if (u.papel === 'ADMIN') {
        return true;
      }
    } catch (e) {}
  }
  return false;
};

router.beforeEach(async (to) => {
  if (!possuiPerfilLocal()) await restaurarSessao()
  const autenticado = possuiPerfilLocal()
  const isAdmin = getIsAdmin()

  // --- IMPEDE ACESSO À LOGIN SE JÁ LOGADO ---
  if (to.path === '/login' && autenticado) {
    return { path: '/' }
  }

  // --- REGRAS DE PROTEÇÃO DE ROTA ---

  // 1. Requer autenticação e não tem token
  if (to.meta.requiresAuth && !autenticado) {
    return { name: 'Login' }
  }

  // 2. Rota de Admin acessada por usuário comum
  if (to.meta.requiresAdmin && !isAdmin) {
    return { path: '/selecao' }
  }
})

export default router
