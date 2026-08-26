<template>
  <div id="app">
    <header class="header">
      <div class="header-content">
        <router-link to="/" class="logo-container" title="Sistema de Checklist DASS">
          <img :src="logoDass" alt="DASS" class="header-logo" />
          <div class="logo-text">
            <h1 class="logo">Checklist</h1>
            <span class="logo-subtitle">Qualidade & Auditoria</span>
          </div>
        </router-link>
        
        <nav class="nav">
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
              <router-link v-if="isAdmin" to="/administrador" active-class="active" class="nav-link">
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
      </div>
    </header>

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
import { ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import localforage from 'localforage'
import { encerrarSessao, obterPerfilLocal } from './services/session'
import ToastContainer from './components/ToastContainer.vue'
import ConfirmDialog from './components/ConfirmDialog.vue'

localforage.config({
  name: 'AppLideranca',
  storeName: 'rascunhos_checklist'
});

const router = useRouter()
const logoDass = new URL('./img/dass.png', import.meta.url).href

const usuarioLogado = ref(false);
const nomeUsuario = ref('');
const isAdmin = ref(false); 

const verificarAuth = () => {
  const usuarioObj = obterPerfilLocal();
  if (!usuarioObj) {
    usuarioLogado.value = false;
    nomeUsuario.value = '';
    isAdmin.value = false;
    return;
  }
  usuarioLogado.value = true;
  nomeUsuario.value = (usuarioObj.nome || usuarioObj.usuario || '').split(' ')[0];
  isAdmin.value = usuarioObj.papel === 'ADMIN';
};

const limparSessao = () => {
  localStorage.removeItem('usuario');
  localStorage.removeItem('isAdmin');
  usuarioLogado.value = false;
  nomeUsuario.value = '';
  isAdmin.value = false;
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
}

verificarAuth();
watch(() => router.currentRoute.value.path, verificarAuth);
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
  --primary: #2563eb;       
  --primary-hover: #1d4ed8;
  --accent: #3b82f6;        
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
   NAVEGAÇÃO E MENUS
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
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}

.nav-links::-webkit-scrollbar {
  display: none;
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
  background: #eff6ff; 
  color: var(--primary); 
  font-weight: 700;
}

.btn-login-link {
  background: var(--primary);
  color: #ffffff !important;
}

.btn-login-link:hover {
  background: var(--primary-hover) !important;
  color: #ffffff !important;
}

/* AÇÕES DO USUÁRIO E LOGOUT */
.user-actions { 
  display: flex; 
  align-items: center; 
  flex-shrink: 0;
  margin-left: 0.25rem;
}

.logout-button { 
  background: #fff1f2; 
  color: var(--danger); 
  border: 1px solid #fecdd3; 
  border-radius: var(--radius-md);
  padding: 0.5rem 0.9rem;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  transition: all 0.2s ease;
  min-height: 40px;
  white-space: nowrap;
}

.logout-button:hover { 
  background: var(--danger); 
  color: #ffffff; 
  border-color: var(--danger);
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
   TABLETS (SAMSUNG TAB A9 / A11 / 768px-1100px)
   ========================================== */
@media (max-width: 1080px) {
  .header-content {
    padding: 0 0.85rem;
    gap: 0.5rem;
  }
  .nav {
    gap: 0.5rem;
  }
  .nav-link {
    padding: 0.45rem 0.65rem;
    font-size: 0.88rem;
    gap: 0.3rem;
  }
  .nav-link i {
    font-size: 1.05rem;
  }
}

/* TABLET PORTRAIT / MOBILE (< 768px) */
@media (max-width: 768px) {
  .header-content { 
    flex-direction: column; 
    padding: 0.6rem 0.85rem;
    gap: 0.5rem;
  }
  .logo-container {
    width: 100%;
    justify-content: space-between;
  }
  .nav { 
    width: 100%; 
    justify-content: space-between;
    gap: 0.4rem;
  }
  .nav-links {
    flex-grow: 1;
    overflow-x: auto;
    padding-bottom: 2px;
    justify-content: flex-start;
  }
  .nav-link {
    flex-shrink: 0;
    min-height: 40px;
    padding: 0.45rem 0.65rem;
    font-size: 0.85rem;
  }
  .logout-button {
    min-height: 40px;
    padding: 0.45rem 0.75rem;
  }
  .main-content { 
    padding: 1rem 0.5rem; 
  }
}
</style>

