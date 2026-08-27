<template>
  <div class="page-container portal-page">
    <div class="welcome-header">
      <div class="header-icon">
        <i class="mdi mdi-shield-check"></i>
      </div>
      <h1>Portal da Qualidade</h1>
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
        to="/administrador"
        title="Painel Administrativo"
        description="Gestão de usuários, criação de formulários e configurações da base do sistema."
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
