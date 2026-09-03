<template>
  <div class="page-container portal-page">
    <div class="welcome-header">
      <div class="header-icon">
        <i class="mdi mdi-shield-check"></i>
      </div>
      <h1>Checklist da Liderança</h1>
      <p>Sistema de Auditoria Interna da Liderança. Selecione um módulo para iniciar sua rotina.</p>
    </div>

    <div class="modules-grid">
      <ModuleCard
        to="/selecao"
        title="Preencher Checklist"
        description="Iniciar uma nova auditoria nas linhas de produção e registrar não conformidades."
        icon="mdi mdi-clipboard-text-outline"
        color="dass"
      />

      <ModuleCard
        to="/consultar"
        title="Consultar Histórico"
        description="Visualizar relatórios anteriores e pesquisar checklists realizados."
        icon="mdi mdi-text-box-search-outline"
        color="dass"
      />

      <ModuleCard
        v-if="isAdmin"
        to="/configuracoes"
        title="Painel Gerencial"
        description="Gestão de usuários, modelos de checklist e configurações de base do sistema."
        icon="mdi mdi-cog-outline"
        color="dass"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import ModuleCard from '../components/ModuleCard.vue'
import { obterPerfilLocal } from '../services/session'

const isAdmin = computed(() => obterPerfilLocal()?.papel === 'ADMIN')
</script>

<style scoped>
.portal-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-header { text-align: center; margin: 1rem 0 2.5rem; }
.header-icon {
  font-size: 3rem;
  color: var(--primary, #b1072c);
  margin-bottom: 0.75rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  background: #fff1f2;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  box-shadow: 0 0 0 8px #f1f5f9;
}
.welcome-header h1 {
  font-size: 2.2rem;
  color: var(--text-primary, #0f172a);
  font-weight: 800;
  margin: 0 0 0.5rem;
  letter-spacing: -0.5px;
}
.welcome-header p {
  font-size: 1.05rem;
  color: var(--text-secondary, #64748b);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.5;
}
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  width: 100%;
}
@media (max-width: 768px) {
  .welcome-header h1 { font-size: 1.8rem; }
  .welcome-header { margin-bottom: 1.75rem; }
  .modules-grid { grid-template-columns: 1fr; }
}
</style>
