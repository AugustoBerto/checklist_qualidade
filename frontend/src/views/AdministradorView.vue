<template>
  <div class="page-container portal-page">
    <div class="welcome-header">
      <div class="header-icon">
        <i class="mdi mdi-cog-outline"></i>
      </div>
      <h1>Painel Administrativo</h1>
      <p>Área administrativa para gerenciamento do sistema, controle de usuários e formulários.</p>
    </div>

    <div class="modules-grid">
      <ModuleCard
        to="/usuarios/novo"
        title="Criar Novo Usuário"
        description="Adicionar novos membros, definir permissões e gerenciar acessos ao sistema."
        icon="mdi mdi-account-plus-outline"
        color="dass"
      />

      <ModuleCard
        to="/modelos/novo"
        title="Adicionar Novo Checklist"
        description="Criar novos modelos de auditoria e configurar as perguntas padrão das linhas."
        icon="mdi mdi-clipboard-plus-outline"
        color="dass"
      />

      <ModuleCard
        to="/configuracoes"
        title="Configurar Base do Sistema"
        description="Gerenciar Células, Turnos, Unidades, Setores e Marcas."
        icon="mdi mdi-cogs"
        color="dass"
      />
    </div>
  </div>
</template>

<script setup>
import ModuleCard from '../components/ModuleCard.vue'
</script>
