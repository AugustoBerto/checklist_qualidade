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
import AdminLoginView from '../views/AdminLoginView.vue'
import EditarModelo from '../views/EditarModelo.vue'
import DashboardView from '../views/DashboardView.vue'
import ConfiguracoesView from '../views/ConfiguracoesView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/adminlogin', name: 'AdminLogin', component: AdminLoginView },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardView,
    //meta: { requiresAuth: true
  },
  {
    path: '/formulario/:modelo',
    name: 'Formulario',
    component: FormularioView,
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/selecao',
    name: 'Selecao',
    component: SelecaoView,
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/relatorio/:id',
    name: 'Relatorio',
    component: RelatorioView,
    meta: { requiresAuth: true, requiresUser: true }
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
    //meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/detalhe/:id', // Rota para o relatório detalhado
    name: 'DetalheRelatorio',
    component: () => import('../views/DetalheRelatorioView.vue'),
    //meta: { requiresAuth: true } // Rota protegida
  },
  // Rota para o Admin criar um novo painel (A tela que mandei na resposta anterior)
  {
    path: '/dashboard-builder/novo',
    name: 'CriarDashboard',
    component: () => import('../views/CriarDashboardView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  // Rota dinâmica que renderiza o painel final (A tela deste código acima)
  {
    path: '/dashboard-dinamico/:id',
    name: 'DashboardDinamico',
    component: () => import('../views/DashboardDinamico.vue'),
    meta: { requiresAuth: true }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const isTokenExpirado = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const agora = Math.floor(Date.now() / 1000);
    return payload.exp < agora;
  } catch (e) {
    return true; // Se o token estiver malformado, considera expirado
  }
};

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  // --- VERIFICAÇÃO DE EXPIRAÇÃO ---
  if (token && isTokenExpirado(token)) {
    console.warn("Token expirado detectado no Router. Limpando sessão...");
    localStorage.clear();
    return next({ name: 'Login' });
  }

  // --- IMPEDE ACESSO À LOGIN SE JÁ LOGADO ---
  if ((to.path === '/login' || to.path === '/adminlogin') && token) {
    return isAdmin ? next({ path: '/administrador' }) : next({ path: '/selecao' });
  }

  // --- REGRAS DE PROTEÇÃO DE ROTA ---

  // 1. Requer autenticação e não tem token
  if (to.meta.requiresAuth && !token) {
    return next({ name: 'Login' });
  }

  // 2. Rota de Admin acessada por usuário comum
  if (to.meta.requiresAdmin && !isAdmin) {
    return next({ path: '/selecao' });
  }

  // 3. Rota de Usuário acessada por Admin 
  // (Opcional: se o Admin puder preencher checklists, remova essa regra)
  if (to.meta.requiresUser && isAdmin) {
    return next({ path: '/administrador' });
  }

  next();
})

export default router