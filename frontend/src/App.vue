<template>
  <div id="app">
    <header class="header">
      <div class="header-content">
        <div class="logo-container">
          <img src="./img/dass.png" alt="DASS" class="header-logo" />
          <h1 class="logo">Sistema de Checklist</h1>
        </div>
        
        <nav class="nav">
          <template v-if="!usuarioLogado">
            <router-link to="/" class="nav-link">Início</router-link>
            <router-link to="/login" class="nav-link">Entrar</router-link>
          </template>

          <template v-else>
            <template v-if="!isAdmin">
              <router-link to="/selecao" class="nav-link">Realizar Auditoria</router-link>
              <router-link to="/consultar" class="nav-link">Histórico Completo</router-link>
            </template>

            <template v-if="isAdmin">
              <router-link to="/" class="nav-link">Portal</router-link>
              <router-link to="/administrador" class="nav-link">Painel Gerencial</router-link>
              <router-link to="/selecao" class="nav-link">Realizar Auditoria</router-link>
              <router-link to="/consultar" class="nav-link">Histórico Completo</router-link>
            </template>

            <div class="user-info">
              <span class="user-greeting">Olá, {{ nomeUsuario }}</span>
              <a @click="fazerLogoff" class="nav-link logout-button">
                <i class="mdi mdi-logout"></i> Sair
              </a>
            </div>
          </template>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <router-view :key="$route.fullPath" />
    </main>

    <footer class="footer">
      <div class="footer-content">
        <p>&copy; {{ new Date().getFullYear() }} DASS Itapipoca Automação - Sistema de Checklists</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import localforage from 'localforage'
import { encerrarSessao, restaurarSessao } from './services/session'

// Configuração do IndexedDB
localforage.config({
  name: 'AppLideranca',
  storeName: 'rascunhos_checklist'
});

const router = useRouter()

// Estados Globais de Autenticação
const usuarioLogado = ref(false);
const nomeUsuario = ref('');
const isAdmin = ref(false); 

const verificarAuth = () => {
  const usuarioSalvo = localStorage.getItem('usuario');
  if (!usuarioSalvo) {
    usuarioLogado.value = false;
    nomeUsuario.value = '';
    isAdmin.value = false;
    return;
  }
  try {
    const usuarioObj = JSON.parse(usuarioSalvo);
    usuarioLogado.value = true;
    nomeUsuario.value = (usuarioObj.nome || usuarioObj.usuario || '').split(' ')[0];
    isAdmin.value = usuarioObj.papel === 'ADMIN';
  } catch {
    limparSessao();
  }
};

// Função auxiliar para evitar repetição de código
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
    // Apaga os rascunhos offline de checklists inacabados por segurança
    await localforage.clear();
  } catch (err) {
    console.error('Erro ao limpar o banco de dados local:', err);
  }

  router.push('/');
}

// Validação de Ciclo de Vida
onMounted(async () => {
  await restaurarSessao();
  verificarAuth();
});
watch(() => router.currentRoute.value.path, verificarAuth);
</script>

<style>
/* ==========================================
   VARIÁVEIS GLOBAIS
   ========================================== */
:root {
  --bg-body: #f4f7f9; 
  --bg-card: #ffffff;
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --border-color: #e2e8f0;
  --primary: #2563eb;       
  --primary-hover: #1d4ed8;
  --accent: #3b82f6;        
  --danger: #ef4444;
  --success: #10b981;
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --radius-md: 8px;
  --radius-lg: 16px;
}

body {
  margin: 0;
  background-color: var(--bg-body) !important;
  color: var(--text-primary);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ==========================================
   HEADER CLARO E LIMPO
   ========================================== */
.header { 
  background: #ffffff; 
  border-bottom: 1px solid var(--border-color); 
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02); 
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
  padding: 0.8rem 2rem; 
  height: 70px; 
}
.logo-container { display: flex; align-items: center; gap: 1.5rem; }
.header-logo { height: 40px; object-fit: contain; }
.logo { font-size: 1.4rem; font-weight: 700; margin: 0; color: var(--text-primary); letter-spacing: 0.5px; }

/* ==========================================
   NAVEGAÇÃO
   ========================================== */
.nav { display: flex; align-items: center; gap: 1rem; }
.nav-link { 
  color: var(--text-secondary); 
  text-decoration: none; 
  font-weight: 600; 
  font-size: 1rem; 
  padding: 0.6rem 1.2rem; 
  border-radius: var(--radius-md); 
  transition: all 0.2s ease; 
  cursor: pointer; 
}
.nav-link:hover, .nav-link.router-link-active { background: #f1f5f9; color: var(--primary); }

.user-info { 
  display: flex; 
  align-items: center; 
  gap: 1.5rem; 
  margin-left: 1rem; 
  padding-left: 1rem; 
  border-left: 1px solid var(--border-color); 
}
.user-greeting { font-weight: 600; color: var(--text-primary); }

.logout-button { background: #fef2f2; color: var(--danger) !important; border: 1px solid #fecaca; }
.logout-button:hover { background: var(--danger); color: white !important; }

/* ==========================================
   MAIN E FOOTER
   ========================================== */
.main-content { min-height: calc(100vh - 70px - 60px); padding: 2rem; max-width: 1400px; margin: 0 auto; }
.footer { background: #ffffff; border-top: 1px solid var(--border-color); padding: 1.5rem 0; text-align: center; color: var(--text-secondary); font-size: 0.9rem; font-weight: 500; }

.tv-mode-wrapper {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  background-color: #0f172a; 
  overflow: hidden; 
}

/* ==========================================
   RESPONSIVIDADE (MOBILE)
   ========================================== */
@media (max-width: 768px) {
  .header-content { flex-direction: column; height: auto; gap: 1rem; padding: 1rem; }
  .nav { flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
  .user-info { margin-left: 0; padding-left: 0; border-left: none; width: 100%; justify-content: center; margin-top: 0.5rem; }
}
</style>
