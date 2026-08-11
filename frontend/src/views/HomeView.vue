<template>
  <div class="page-container">
    <div class="welcome-header">
      <div class="header-icon">
        <i class="mdi mdi-shield-check"></i>
      </div>
      <h1>Portal da Qualidade</h1>
      <p>Sistema de Auditoria Interna da Liderança. Selecione um módulo para iniciar sua rotina.</p>
    </div>

    <div class="modules-grid">
      <router-link to="/selecao" class="module-card">
        <div class="icon-wrapper bg-blue">
          <i class="mdi mdi-clipboard-text-outline"></i>
        </div>
        <div class="module-info">
          <h3>Preencher Checklist</h3>
          <p>Iniciar uma nova auditoria nas linhas de produção e registrar não conformidades.</p>
        </div>
        <div class="arrow-icon">
          <i class="mdi mdi-chevron-right"></i>
        </div>
      </router-link>

      <router-link to="/consultar" class="module-card">
        <div class="icon-wrapper bg-green">
          <i class="mdi mdi-text-box-search-outline"></i>
        </div>
        <div class="module-info">
          <h3>Consultar Histórico</h3>
          <p>Visualizar relatórios anteriores e pesquisar checklists realizados.</p>
        </div>
        <div class="arrow-icon">
          <i class="mdi mdi-chevron-right"></i>
        </div>
      </router-link>

      <router-link v-if="isAdmin" to="/administrador" class="module-card">
        <div class="icon-wrapper bg-purple">
          <i class="mdi mdi-cog-outline"></i>
        </div>
        <div class="module-info">
          <h3>Painel Administrativo</h3>
          <p>Gestão de usuários, criação de formulários e configurações avançadas do sistema.</p>
        </div>
        <div class="arrow-icon">
          <i class="mdi mdi-chevron-right"></i>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const isAdmin = computed(() => {
  try { return JSON.parse(localStorage.getItem('usuario') || '{}').papel === 'ADMIN' } catch { return false }
})
</script>

<style scoped>
/* ==========================================
   LAYOUT GERAL
   ========================================== */
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 80vh;
}

/* ==========================================
   CABEÇALHO DA HOME
   ========================================== */
.welcome-header {
  text-align: center;
  margin-bottom: 4rem;
  margin-top: 2rem;
  animation: fadeInDown 0.6s ease-out;
}

.header-icon {
  font-size: 3.5rem;
  color: var(--primary);
  margin-bottom: 1rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  background: #eff6ff;
  width: 90px;
  height: 90px;
  border-radius: 50%;
  box-shadow: 0 0 0 10px #f8fafc;
}

.welcome-header h1 {
  font-size: 2.5rem;
  color: var(--text-primary);
  font-weight: 800;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.5px;
}

.welcome-header p {
  font-size: 1.1rem;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
}

/* ==========================================
   GRID DE MÓDULOS (O segredo para Tablets)
   ========================================== */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  width: 100%;
  animation: fadeInUp 0.6s ease-out 0.2s both;
}

/* ==========================================
   CARDS INTERATIVOS
   ========================================== */
.module-card {
  display: flex;
  align-items: center;
  background: var(--bg-card);
  padding: 1.5rem;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: var(--shadow-sm);
  position: relative;
  overflow: hidden;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
  border-color: var(--primary);
}

/* Brilho sutil no hover */
.module-card::after {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.module-card:hover::after {
  opacity: 1;
}

/* ==========================================
   ÍCONES E TEXTOS DOS CARDS
   ========================================== */
.icon-wrapper {
  width: 65px;
  height: 65px;
  border-radius: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2.2rem;
  margin-right: 1.5rem;
  flex-shrink: 0;
}

/* Cores específicas para cada módulo (Fácil identificação visual) */
.bg-blue { background: #eff6ff; color: #3b82f6; }
.bg-green { background: #ecfdf5; color: #10b981; }
.bg-orange { background: #fff7ed; color: #f97316; }
.bg-purple { background: #faf5ff; color: #a855f7; }

.module-info {
  flex-grow: 1;
}

.module-info h3 {
  margin: 0 0 0.3rem 0;
  font-size: 1.25rem;
  color: var(--text-primary);
  font-weight: 700;
}

.module-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.arrow-icon {
  color: #cbd5e1;
  font-size: 1.8rem;
  transition: all 0.3s ease;
  margin-left: 1rem;
}

.module-card:hover .arrow-icon {
  color: var(--primary);
  transform: translateX(5px);
}

/* ==========================================
   ANIMAÇÕES DE ENTRADA
   ========================================== */
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ==========================================
   RESPONSIVIDADE (Telas menores)
   ========================================== */
@media (max-width: 768px) {
  .welcome-header h1 { font-size: 2rem; }
  .welcome-header { margin-bottom: 2rem; }
  .icon-wrapper { width: 55px; height: 55px; font-size: 1.8rem; }
  .module-info h3 { font-size: 1.1rem; }
  .page-container { padding: 1.5rem; }
}

@media (max-width: 480px) {
  .welcome-header h1 { font-size: 1.6rem; }
  .header-icon { width: 70px; height: 70px; font-size: 2.5rem; }
  .module-card { padding: 1.2rem; flex-direction: column; text-align: center; }
  .icon-wrapper { margin: 0 0 1rem 0; }
  .arrow-icon { display: none; /* Esconde a seta em celulares para poupar espaço */ }
}
</style>
