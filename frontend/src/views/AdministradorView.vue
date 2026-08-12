<template>
  <div class="page-container">
    <div class="welcome-header">
      <div class="header-icon">
        <i class="mdi mdi-cog-outline"></i>
      </div>
      <h1>Painel Administrativo</h1>
      <p>Área administrativa para gerenciamento do sistema, controle de usuários e formulários.</p>
    </div>

    <div class="modules-grid">
      <!-- Card: Criar Novo Usuário -->
      <router-link to="/usuarios/novo" class="module-card">
        <div class="icon-wrapper bg-blue">
          <i class="mdi mdi-account-plus-outline"></i>
        </div>
        <div class="module-info">
          <h3>Criar Novo Usuário</h3>
          <p>Adicionar novos membros, definir permissões e gerenciar acessos ao sistema.</p>
        </div>
        <div class="arrow-icon">
          <i class="mdi mdi-chevron-right"></i>
        </div>
      </router-link>

      <!-- Card: Adicionar Novo Checklist -->
      <router-link to="/modelos/novo" class="module-card">
        <div class="icon-wrapper bg-green">
          <i class="mdi mdi-clipboard-plus-outline"></i>
        </div>
        <div class="module-info">
          <h3>Adicionar Novo Checklist</h3>
          <p>Criar novos modelos de auditoria e configurar as perguntas padrão das linhas.</p>
        </div>
        <div class="arrow-icon">
          <i class="mdi mdi-chevron-right"></i>
        </div>
      </router-link>
      <router-link to="/configuracoes" class="module-card">
        <div class="icon-wrapper bg-red">
          <i class="mdi mdi-clipboard-plus-outline"></i>
        </div>
        <div class="module-info">
          <h3>Configurar a base do sistema</h3>
          <p>Gerir Células, Turnos, Unidades, Setores e Marcas .</p>
        </div>
        <div class="arrow-icon">
          <i class="mdi mdi-chevron-right"></i>
        </div>
      </router-link>

    </div>
  </div>
</template>

<script setup>
// Lógica tratada pelo Vue Router
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
   GRID DE MÓDULOS
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
  background: var(--bg-card, #ffffff);
  padding: 1.5rem;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--border-color, #e2e8f0);
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.1));
  position: relative;
  overflow: hidden;
}

.module-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1));
  border-color: var(--primary, #3b82f6);
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

/* Cores específicas para cada módulo */
.bg-blue { background: #eff6ff; color: #3b82f6; }
.bg-green { background: #ecfdf5; color: #10b981; }
.bg-purple { background: #faf5ff; color: #a855f7; }
.bg-red { background: #f5e9e9; color: #d84949; }

.module-info {
  flex-grow: 1;
}

.module-info h3 {
  margin: 0 0 0.3rem 0;
  font-size: 1.25rem;
  color: var(--text-primary, #1e293b);
  font-weight: 700;
}

.module-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.arrow-icon {
  color: #cbd5e1;
  font-size: 1.8rem;
  transition: all 0.3s ease;
  margin-left: 1rem;
}

.module-card:hover .arrow-icon {
  color: var(--primary, #3b82f6);
  transform: translateX(5px);
}

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
  .page-container { padding: 1rem; }
  .modules-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .welcome-header h1 { font-size: 1.6rem; }
  .header-icon { width: 70px; height: 70px; font-size: 2.5rem; }
  .module-card { padding: 1.2rem; flex-direction: column; text-align: center; }
  .icon-wrapper { margin: 0 0 1rem 0; }
  .arrow-icon { display: none; }
}
</style>
