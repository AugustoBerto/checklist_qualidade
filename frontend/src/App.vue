<template>
  <div id="app">
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <!-- Botão Hambúrguer Mobile / Tablet (<= 1080px) -->
          <button
            type="button"
            class="mobile-menu-btn"
            @click="toggleSidebar"
            aria-label="Abrir Menu de Navegação"
            title="Abrir Menu"
          >
            <i class="mdi mdi-menu"></i>
          </button>

          <router-link to="/" class="logo-container" title="Sistema de Checklist DASS">
            <img :src="logoDass" alt="DASS" class="header-logo" />
            <div class="logo-text">
              <h1 class="logo">Checklist</h1>
              <span class="logo-subtitle">Qualidade & Auditoria</span>
            </div>
          </router-link>
        </div>
        
        <!-- Navegação Desktop Padrão (> 1080px) -->
        <nav class="nav desktop-nav">
          <div class="nav-links">
            <template v-if="!usuarioLogado">
              <router-link to="/" exact-active-class="active" class="nav-link">
                <i class="mdi mdi-home-outline"></i>
                <span>Início</span>
              </router-link>
              <router-link to="/login" active-class="active" class="nav-link btn-login-link">
                <i class="mdi mdi-login"></i>
                <span>Entrar</span>
              </router-link>
            </template>

            <template v-else>
              <router-link to="/" exact-active-class="active" class="nav-link">
                <i class="mdi mdi-home-outline"></i>
                <span>Início</span>
              </router-link>
              <router-link to="/selecao" active-class="active" class="nav-link">
                <i class="mdi mdi-clipboard-check-outline"></i>
                <span>Auditorias</span>
              </router-link>
              <router-link to="/consultar" active-class="active" class="nav-link">
                <i class="mdi mdi-history"></i>
                <span>Histórico</span>
              </router-link>
              <router-link v-if="isAdmin" to="/configuracoes" active-class="active" class="nav-link">
                <i class="mdi mdi-cog-outline"></i>
                <span>Painel Gerencial</span>
              </router-link>
            </template>
          </div>

          <div v-if="usuarioLogado" class="user-actions">
            <button type="button" @click="fazerLogoff" class="logout-button" title="Encerrar Sessão">
              <i class="mdi mdi-logout"></i>
              <span>Sair</span>
            </button>
          </div>
        </nav>

        <!-- Ações Rápidas Mobile / Tablet (<= 1080px) -->
        <div class="header-mobile-actions">
          <template v-if="usuarioLogado && perfilUsuario">
            <button type="button" @click="toggleSidebar" class="mobile-user-pill" title="Ver Menu e Perfil">
              <i class="mdi mdi-account-circle"></i>
              <span class="mobile-user-name">{{ formatarNomeCurto(perfilUsuario.nome) }}</span>
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="btn-login-link mobile-login-quick" title="Fazer Login">
              <i class="mdi mdi-login"></i>
              <span>Entrar</span>
            </router-link>
          </template>
        </div>
      </div>
    </header>

    <!-- Backdrop da Sidebar Retrátil -->
    <transition name="sidebar-fade">
      <div v-if="sidebarAberta" class="sidebar-backdrop" @click="fecharSidebar"></div>
    </transition>

    <!-- Sidebar Retrátil Mobile / Tablet (Drawer Off-Canvas) -->
    <aside class="sidebar-drawer" :class="{ 'is-open': sidebarAberta }">
      <!-- Topo da Sidebar com Logo e Fechar -->
      <div class="sidebar-header">
        <div class="sidebar-brand">
          <img :src="logoDass" alt="DASS" class="sidebar-logo-img" />
          <div class="sidebar-brand-text">
            <span class="sidebar-app-title">Checklist</span>
            <span class="sidebar-app-subtitle">Qualidade & Auditoria</span>
          </div>
        </div>
        <button type="button" class="btn-close-sidebar" @click="fecharSidebar" aria-label="Fechar menu">
          <i class="mdi mdi-close"></i>
        </button>
      </div>

      <!-- Card do Colaborador Logado -->
      <div v-if="usuarioLogado && perfilUsuario" class="sidebar-user-card">
        <div class="sidebar-avatar">
          <i class="mdi mdi-account"></i>
        </div>
        <div class="sidebar-user-details">
          <strong class="sidebar-user-name">{{ perfilUsuario.nome }}</strong>
          <div class="sidebar-user-meta">
            <span class="sidebar-role-badge" :class="isAdmin ? 'badge-admin' : 'badge-user'">
              {{ perfilUsuario.papel || 'OPERACIONAL' }}
            </span>
            <span class="sidebar-matricula">Matrícula: {{ perfilUsuario.matricula }}</span>
          </div>
        </div>
      </div>

      <!-- Navegação da Sidebar (Links Touch-Friendly) -->
      <nav class="sidebar-nav">
        <div class="sidebar-nav-section-title">Menu Principal</div>

        <router-link to="/" exact-active-class="active" class="sidebar-nav-link" @click="fecharSidebar">
          <i class="mdi mdi-home-outline"></i>
          <span>Página Inicial</span>
        </router-link>

        <template v-if="usuarioLogado">
          <router-link to="/selecao" active-class="active" class="sidebar-nav-link" @click="fecharSidebar">
            <i class="mdi mdi-clipboard-check-outline"></i>
            <span>Auditorias / Novo Checklist</span>
          </router-link>

          <router-link to="/consultar" active-class="active" class="sidebar-nav-link" @click="fecharSidebar">
            <i class="mdi mdi-history"></i>
            <span>Histórico de Relatórios</span>
          </router-link>

          <template v-if="isAdmin">
            <div class="sidebar-divider"></div>
            <div class="sidebar-nav-section-title">Gestão</div>

            <router-link to="/configuracoes" active-class="active" class="sidebar-nav-link" @click="fecharSidebar">
              <i class="mdi mdi-cog-outline"></i>
              <span>Painel Gerencial</span>
            </router-link>
          </template>
        </template>

        <template v-else>
          <div class="sidebar-divider"></div>
          <router-link to="/login" active-class="active" class="sidebar-nav-link sidebar-nav-login" @click="fecharSidebar">
            <i class="mdi mdi-login"></i>
            <span>Entrar no Sistema</span>
          </router-link>
        </template>
      </nav>

      <!-- Rodapé da Sidebar -->
      <div class="sidebar-footer">
        <button v-if="usuarioLogado" type="button" @click="fazerLogoffMobile" class="btn-sidebar-logout">
          <i class="mdi mdi-logout"></i>
          <span>Encerrar Sessão</span>
        </button>
        <div class="sidebar-footer-info">
          <span>&copy; {{ new Date().getFullYear() }} Grupo DASS</span>
        </div>
      </div>
    </aside>

    <main class="main-content">
      <router-view :key="$route.path" />
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>&copy; {{ new Date().getFullYear() }} Grupo DASS &bull; Sistema de Gestão e Auditoria de Qualidade</p>
      </div>
    </footer>

    <!-- 📌 Componentes Globais de Feedback / Popups -->
    <ToastContainer />
    <ConfirmDialog />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import localforage from 'localforage'
import { encerrarSessao, obterPerfilLocal } from './services/session'
import { formatarNomeCurto } from './services/formatters'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

localforage.config({
  name: 'AppLideranca',
  storeName: 'rascunhos_checklist'
});

const router = useRouter()
const logoDass = new URL('./img/dass.png', import.meta.url).href

const usuarioLogado = ref(false);
const isAdmin = ref(false); 
const perfilUsuario = ref(null);
const sidebarAberta = ref(false);

const toggleSidebar = () => {
  sidebarAberta.value = !sidebarAberta.value;
  if (typeof document !== 'undefined') {
    document.body.style.overflow = sidebarAberta.value ? 'hidden' : '';
  }
};

const fecharSidebar = () => {
  if (sidebarAberta.value) {
    sidebarAberta.value = false;
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }
};

const onKeydown = (e) => {
  if (e.key === 'Escape' && sidebarAberta.value) {
    fecharSidebar();
  }
};

const verificarAuth = () => {
  const usuarioObj = obterPerfilLocal();
  if (!usuarioObj) {
    usuarioLogado.value = false;
    isAdmin.value = false;
    perfilUsuario.value = null;
    return;
  }
  usuarioLogado.value = true;
  isAdmin.value = usuarioObj.papel === 'ADMIN';
  perfilUsuario.value = usuarioObj;
};

const limparSessao = () => {
  localStorage.removeItem('usuario');
  usuarioLogado.value = false;
  isAdmin.value = false;
  perfilUsuario.value = null;
};

const fazerLogoff = async () => {
  await encerrarSessao();
  limparSessao();
  
  try {
    await localforage.clear();
  } catch (err) {
    console.error('Erro ao limpar o banco de dados local:', err);
  }

  router.push('/login');
};

const fazerLogoffMobile = async () => {
  fecharSidebar();
  await fazerLogoff();
};

onMounted(() => {
  verificarAuth();
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown);
  }
});

watch(() => router.currentRoute.value.path, () => {
  fecharSidebar();
  verificarAuth();
});
</script>

<style>
/* ==========================================
   VARIÁVEIS GLOBAIS
   ========================================== */
:root {
  --bg-body: #f8fafc; 
  --bg-card: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --primary: #b1072c;       /* Vermelho Oficial Dass */
  --primary-hover: #8f0523;
  --primary-active: #70031a;
  --primary-light: #fff1f2;
  --primary-border: #fecdd3;
  --accent: #c71940;        
  --danger: #ef4444;
  --danger-hover: #dc2626;
  --success: #10b981;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}

body {
  margin: 0;
  background-color: var(--bg-body) !important;
  color: var(--text-primary);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ==========================================
   HEADER PRINCIPAL
   ========================================== */
.header { 
  background: #ffffff; 
  border-bottom: 1px solid var(--border-color); 
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04); 
  position: sticky; 
  top: 0; 
  z-index: 100; 
}

.header-content { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  max-width: 1400px; 
  margin: 0 auto; 
  padding: 0 1.25rem; 
  min-height: 64px;
  height: auto; 
  gap: 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* BOTÃO HAMBÚRGUER MOBILE / TABLET */
.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 1.5rem;
  width: 44px;
  height: 44px;
  cursor: pointer;
  transition: all 0.18s ease;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

.mobile-menu-btn:hover {
  background: #f1f5f9;
  color: var(--primary);
  border-color: var(--primary-border);
}

.mobile-menu-btn:active {
  background: #fff1f2;
  transform: scale(0.96);
}

/* LOGO */
.logo-container { 
  display: flex; 
  align-items: center; 
  gap: 0.75rem; 
  text-decoration: none;
  flex-shrink: 0;
}

.header-logo { 
  height: 36px; 
  width: auto;
  object-fit: contain; 
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo { 
  font-size: 1.2rem; 
  font-weight: 800; 
  margin: 0; 
  color: var(--text-primary); 
  letter-spacing: -0.3px;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 0.7rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* ==========================================
   NAVEGAÇÃO DESKTOP (> 1080px)
   ========================================== */
.nav { 
  display: flex; 
  align-items: center; 
  justify-content: flex-end;
  gap: 0.75rem; 
  flex-grow: 1;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.nav-link { 
  color: var(--text-secondary); 
  text-decoration: none; 
  font-weight: 600; 
  font-size: 0.92rem; 
  padding: 0.5rem 0.85rem; 
  border-radius: var(--radius-md); 
  transition: all 0.18s ease; 
  cursor: pointer; 
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-height: 40px;
  white-space: nowrap;
  box-sizing: border-box;
}

.nav-link i {
  font-size: 1.15rem;
}

.nav-link:hover { 
  background: #f1f5f9; 
  color: var(--text-primary); 
}

.nav-link.active,
.nav-link.router-link-exact-active { 
  background: #fff1f2; 
  color: var(--primary); 
  font-weight: 700;
}

/* ==========================================
   AÇÕES RÁPIDAS MOBILE NO HEADER (<= 1080px)
   ========================================== */
.header-mobile-actions {
  display: none;
  align-items: center;
  gap: 0.5rem;
}

.mobile-user-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 0.35rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  min-height: 38px;
  transition: all 0.15s ease;
}

.mobile-user-pill i {
  font-size: 1.2rem;
  color: var(--primary);
}

.mobile-user-pill:hover,
.mobile-user-pill:active {
  background: #fff1f2;
  border-color: var(--primary-border);
}

.mobile-login-quick {
  min-height: 38px;
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
}

/* ==========================================
   BOTÕES DE AUTENTICAÇÃO
   ========================================== */
.user-actions { 
  display: flex; 
  align-items: center; 
  flex-shrink: 0;
  margin-left: 0.25rem;
}

.auth-button,
.logout-button,
.btn-login-link { 
  background: #fff1f2; 
  color: var(--primary, #b1072c); 
  border: 1px solid #fecdd3; 
  border-radius: var(--radius-md, 10px);
  padding: 0.5rem 0.95rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: all 0.2s ease;
  min-height: 40px;
  white-space: nowrap;
  text-decoration: none;
  box-sizing: border-box;
}

.auth-button i,
.logout-button i,
.btn-login-link i {
  font-size: 1.15rem;
}

.auth-button:hover,
.logout-button:hover,
.btn-login-link:hover { 
  background: var(--primary, #b1072c) !important; 
  color: #ffffff !important; 
  border-color: var(--primary, #b1072c) !important;
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.auth-button:active,
.logout-button:active,
.btn-login-link:active {
  transform: translateY(0);
}

/* ==========================================
   SIDEBAR RETRÁTIL (DRAWER OFF-CANVAS)
   ========================================== */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1040;
  -webkit-tap-highlight-color: transparent;
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active {
  transition: opacity 0.25s ease;
}

.sidebar-fade-enter-from,
.sidebar-fade-leave-to {
  opacity: 0;
}

.sidebar-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(320px, 86vw);
  height: 100vh;
  height: 100dvh;
  background: #ffffff;
  z-index: 1050;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15);
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.sidebar-drawer.is-open {
  transform: translateX(0);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.25rem 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: #ffffff;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sidebar-logo-img {
  height: 32px;
  width: auto;
  object-fit: contain;
}

.sidebar-brand-text {
  display: flex;
  flex-direction: column;
}

.sidebar-app-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.1;
}

.sidebar-app-subtitle {
  font-size: 0.68rem;
  color: var(--text-secondary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-close-sidebar {
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: #64748b;
  font-size: 1.35rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-close-sidebar:hover {
  background: #fee2e2;
  color: var(--danger);
  border-color: #fca5a5;
}

/* CARD DE USUÁRIO NA SIDEBAR */
.sidebar-user-card {
  margin: 1rem 1.15rem 0.5rem 1.15rem;
  padding: 0.9rem 1rem;
  background: #f8fafc;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sidebar-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #fff1f2;
  color: var(--primary);
  border: 1.5px solid #fecdd3;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  flex-shrink: 0;
}

.sidebar-user-details {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.sidebar-user-name {
  font-size: 0.92rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-user-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.sidebar-role-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
}

.badge-admin { background: #fff1f2; color: #b1072c; border: 1px solid #fecdd3; }
.badge-user { background: #e2e8f0; color: #475569; }

.sidebar-matricula {
  font-size: 0.78rem;
  color: var(--text-secondary);
  font-family: monospace;
}

/* LISTA DE NAVEGAÇÃO DA SIDEBAR */
.sidebar-nav {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sidebar-nav-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 0.5rem 0.5rem 0.25rem 0.5rem;
}

.sidebar-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0.5rem 0;
}

.sidebar-nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  min-height: 48px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.95rem;
  color: #475569;
  text-decoration: none;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.sidebar-nav-link i {
  font-size: 1.3rem;
  color: #64748b;
  transition: color 0.15s ease;
}

.sidebar-nav-link:hover {
  background: #f1f5f9;
  color: var(--text-primary);
}

.sidebar-nav-link:hover i {
  color: var(--primary);
}

.sidebar-nav-link.active {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  font-weight: 700;
  border-left: 3.5px solid var(--primary, #b1072c);
}

.sidebar-nav-link.active i {
  color: var(--primary, #b1072c);
}

.sidebar-nav-login {
  background: #fff1f2;
  color: var(--primary, #b1072c);
  border: 1px solid #fecdd3;
}

.sidebar-nav-login:hover {
  background: var(--primary, #b1072c);
  color: #ffffff;
}

.sidebar-nav-login:hover i {
  color: #ffffff;
}

/* RODAPÉ DA SIDEBAR */
.sidebar-footer {
  padding: 1rem 1.15rem;
  border-top: 1px solid var(--border-color);
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-sidebar-logout {
  width: 100%;
  background: #fff1f2;
  color: var(--danger, #ef4444);
  border: 1px solid #fecdd3;
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 48px;
  transition: all 0.2s ease;
}

.btn-sidebar-logout i {
  font-size: 1.25rem;
}

.btn-sidebar-logout:hover {
  background: var(--danger, #ef4444);
  color: #ffffff;
  border-color: var(--danger, #ef4444);
}

.sidebar-footer-info {
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

/* ==========================================
   MAIN CONTENT & FOOTER
   ========================================== */
.main-content { 
  min-height: calc(100vh - 64px - 56px); 
  padding: 1.5rem 1rem; 
  max-width: 1400px; 
  margin: 0 auto; 
  box-sizing: border-box;
}

.footer { 
  background: #ffffff; 
  border-top: 1px solid var(--border-color); 
  padding: 1rem 0; 
  text-align: center; 
  color: var(--text-secondary); 
  font-size: 0.82rem; 
  font-weight: 500; 
}

/* ==========================================
   RESPONSIVIDADE (DESKTOP VS MOBILE/TABLET)
   ========================================== */
@media (min-width: 1081px) {
  .mobile-menu-btn,
  .header-mobile-actions,
  .sidebar-backdrop,
  .sidebar-drawer {
    display: none !important;
  }
}

@media (max-width: 1080px) {
  .desktop-nav {
    display: none !important;
  }

  .mobile-menu-btn {
    display: inline-flex !important;
  }

  .header-mobile-actions {
    display: flex !important;
  }

  .header-content {
    padding: 0 1rem;
  }
}

@media (max-width: 768px) {
  .header-content {
    padding: 0 0.75rem;
    min-height: 58px;
  }

  .logo {
    font-size: 1.05rem;
  }

  .logo-subtitle {
    font-size: 0.65rem;
  }

  .header-logo {
    height: 30px;
  }

  .main-content {
    padding: 1rem 0.5rem;
  }
}
</style>
