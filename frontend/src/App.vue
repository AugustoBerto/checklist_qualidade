<template>
  <div v-if="isTvRoute" class="tv-mode-wrapper">
    <router-view />
  </div>

  <div v-else id="app">
    <header class="header">
      <div class="header-content">
        <div class="logo-container">
          <img src="./img/dass.png" alt="DASS" class="header-logo" />
          <h1 class="logo">Sistema de Checklist</h1>
        </div>
        
        <nav class="nav">
          <template v-if="!usuarioLogado">
            <router-link to="/" class="nav-link">Início</router-link>
            <router-link to="/consultar" class="nav-link">Consultar Histórico</router-link>
            <router-link to="/login" class="nav-link">Portal Colaborador</router-link>
            <router-link to="/adminlogin" class="nav-link">Acesso Gestão</router-link>
          </template>

          <template v-else>
            <template v-if="!isAdmin">
              <router-link to="/selecao" class="nav-link">Realizar Auditoria</router-link>
              <router-link to="/consultar" class="nav-link">Meus Registros</router-link>
            </template>

            <template v-if="isAdmin">
              <router-link to="/administrador" class="nav-link">Painel Gerencial</router-link>
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
import { ref, onMounted, watch, computed } from 'vue' 
import { RouterLink, useRouter, useRoute } from 'vue-router'
import localforage from 'localforage'

// Configuração do IndexedDB
localforage.config({
  name: 'AppLideranca',
  storeName: 'rascunhos_checklist'
});

const router = useRouter()
const route = useRoute()

// Estados Globais de Autenticação
const usuarioLogado = ref(false);
const nomeUsuario = ref('');
const isAdmin = ref(false); 

const verificarAuth = () => {
  const token = localStorage.getItem('token');
  
  if (token) {
    try {
      const payloadDecodificado = atob(token.split('.')[1]);
      const payloadObjeto = JSON.parse(payloadDecodificado);
      const tempoAtual = Math.floor(Date.now() / 1000);
      
      // Verifica se o Token expirou
      if (payloadObjeto.exp < tempoAtual) {
        limparSessao();
        return; 
      }
      
      usuarioLogado.value = true;

      // 📌 VALIDAÇÃO ROBUSTA DO TIPO DE USUÁRIO
      const usuarioSalvo = localStorage.getItem('usuario');
      if (usuarioSalvo && usuarioSalvo !== 'desconhecido') {
        try {
            const usuarioObj = JSON.parse(usuarioSalvo);
            
            // Captura o primeiro nome para ficar mais amigável
            nomeUsuario.value = usuarioObj.nome.split(' ')[0]; 
            
            // O sistema entende como admin se o 'nivelusuario' for 1 ou a flag 'admin' for true
            isAdmin.value = (usuarioObj.nivelusuario === 1 || usuarioObj.admin === true || localStorage.getItem('isAdmin') === 'true');
        } catch (e) {
            nomeUsuario.value = usuarioSalvo;
            isAdmin.value = localStorage.getItem('isAdmin') === 'true';
        }
      } else {
        isAdmin.value = localStorage.getItem('isAdmin') === 'true';
      }
      
    } catch (error) {
      console.error('Erro ao decodificar o token:', error);
      limparSessao();
    }
  } else {
    usuarioLogado.value = false;
    nomeUsuario.value = '';
    isAdmin.value = false;
  }
};

// Função auxiliar para evitar repetição de código
const limparSessao = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  localStorage.removeItem('isAdmin');
  usuarioLogado.value = false;
  nomeUsuario.value = '';
  isAdmin.value = false;
};

const fazerLogoff = async () => {
  limparSessao();
  
  try {
    // Apaga os rascunhos offline de checklists inacabados por segurança
    await localforage.clear();
  } catch (err) {
    console.error('Erro ao limpar o banco de dados local:', err);
  }

  router.push('/');
}

// 📌 Identifica Rotas de TV/Dashboards Públicos
const isTvRoute = computed(() => {
  return route.path.includes('/dashboard') || 
         route.path.includes('/tvdash') || 
         route.query.tv === 'true';
});

// Validação de Ciclo de Vida
onMounted(verificarAuth);
watch(() => route.path, verificarAuth);
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