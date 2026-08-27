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

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.welcome-header {
  text-align: center;
  margin-bottom: 2.5rem;
  margin-top: 1rem;
}

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
  margin: 0 0 0.5rem 0;
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
