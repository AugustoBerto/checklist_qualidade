import { createRouter, createWebHistory } from 'vue-router'
import { obterPerfilLocal, possuiPerfilLocal } from '../services/session'

const routes = [
  { path: '/', name: 'Home', component: () => import('../views/HomeView.vue') },
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  {
    path: '/formulario/:modelo',
    name: 'Formulario',
    component: () => import('../views/FormularioView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/selecao',
    name: 'Selecao',
    component: () => import('../views/CheckSelecao.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/relatorio/:id',
    name: 'Relatorio',
    component: () => import('../views/RelatorioView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/usuarios/novo',
    redirect: '/configuracoes?aba=usuarios'
  },
  {
    path: '/modelos/novo',
    redirect: '/configuracoes?aba=modelos'
  },
  {
    path: '/administrador',
    redirect: '/configuracoes'
  },
  {
    path: '/configuracoes',
    name: 'Configuracoes',
    component: () => import('../views/ConfiguracoesView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/consultar',
    name: 'Consultar',
    component: () => import('../views/ConsultarView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/detalhe/:id',
    name: 'DetalheRelatorio',
    component: () => import('../views/DetalheRelatorioView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

const getIsAdmin = () => obterPerfilLocal()?.papel === 'ADMIN'

router.beforeEach(async (to) => {
  const autenticado = possuiPerfilLocal()
  const isAdmin = getIsAdmin()

  if (to.path === '/login' && autenticado) {
    return { path: '/' }
  }

  if (to.meta.requiresAuth && !autenticado) {
    return { name: 'Login' }
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    return { path: '/selecao' }
  }
})

export default router
