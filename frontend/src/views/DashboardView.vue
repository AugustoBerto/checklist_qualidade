<template>
  <div class="dashboard-wrapper" :class="{ 'tv-mode': isTvDash }">
    
    <header class="dashboard-header no-print" v-if="!isTvDash">
      <div class="header-info">
        <h1><i class="mdi mdi-view-dashboard-outline"></i> Dashboard de Performance</h1>
      </div>
      
      <div class="header-actions">
        <router-link to="/">
          <button class="btn-refresh"><i class="mdi mdi-keyboard-return"></i>Voltar</button>
        </router-link>
      </div>
    </header>

    <section class="credentials-card no-print" v-if="!isTvDash">
      <div class="credentials-content">
        <div class="credential-item">
          <i class="mdi mdi-account-key"></i>
          <span class="label">Usuário Tableau:</span>
          <span class="value">{{ credenciais.usuario }}</span>
        </div>
        <div class="credential-item">
          <i class="mdi mdi-lock-outline"></i>
          <span class="label">Senha:</span>
          <span class="value">{{ credenciais.senha }}</span>
        </div>
      </div>
    </section>

    <main class="viz-container" :class="{ 'tv-container': isTvDash }">
      <tableau-viz 
        id="meu-painel-tableau"
        :src="tableauLink" 
        :toolbar="isTvDash ? 'hidden' : 'bottom'" 
        class="tableau-frame"
      >
      </tableau-viz>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import '@tableau/embedding-api'; 

const route = useRoute();

const isTvDash = computed(() => {
  return route.path.includes('tvdash') || route.name === 'tvdash' || route.query.tv === 'true';
});

// Sem ref() ou reactive() - Variáveis completamente estáticas
const tableauLink = 'https://bi.grupodass.com.br/#/site/op/views/CheckListLiderana/CheckListLiderana?:iid=1';

const credenciais = {
  usuario: 'bi_itp',
  senha: 'bi_itp'
};

const recarregarPainel = () => {
  // 📌 CORREÇÃO: Pegamos o elemento fora do sistema de reatividade do Vue
  const vizElement = document.getElementById('meu-painel-tableau');
  
  // Verificamos se o elemento existe e se a API do Tableau já injetou a função refreshDataAsync
  if (vizElement && typeof vizElement.refreshDataAsync === 'function') {
    vizElement.refreshDataAsync();
  } else {
    // Fallback: Se a API falhar, recarregamos a página de forma bruta
    window.location.reload();
  }
};

onMounted(() => {
  if (isTvDash.value) {
    console.log("Modo TV Ativado. O painel será atualizado a cada 5 minutos.");
    setInterval(() => {
      recarregarPainel();
    }, 300000); 
  }
});
</script>

<style scoped>
/* ==========================================
   LAYOUT PADRÃO
   ========================================== */
.dashboard-wrapper {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  padding: 1.5rem;
  background-color: #f1f5f9;
  gap: 1rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  padding: 1rem 2rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.header-info h1 {
  margin: 0;
  font-size: 1.4rem;
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 10px;
}

.credentials-card {
  background: #fffbeb; 
  border: 1px solid #fde68a;
  padding: 1rem 2rem;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.credentials-content {
  display: flex;
  gap: 30px;
  flex-wrap: wrap;
}

.credential-item { display: flex; align-items: center; gap: 8px; font-size: 1rem; }
.credential-item i { color: #d97706; }
.credential-item .label { font-weight: 600; color: #92400e; }
.credential-item .value { background: white; padding: 2px 10px; border-radius: 4px; border: 1px solid #fde68a; font-family: monospace; font-weight: 700; color: #1e293b; }
.credential-note { margin: 0; font-size: 0.8rem; color: #b45309; font-style: italic; }

.viz-container {
  flex: 1;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.tableau-frame {
  width: 100%;
  height: 100%;
  display: block;
}

.btn-refresh {
  background-color: white;
  border: 1px solid #cbd5e1;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  font-weight: 700;
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-refresh:hover { background-color: #2563eb; color: white; border-color: #2563eb; }

/* ==========================================
   MODO TV (TELA CHEIA)
   ========================================== */
.dashboard-wrapper.tv-mode {
  padding: 0;
  height: 100vh;
  background-color: #000;
  gap: 0;
}

.viz-container.tv-container {
  border-radius: 0;
  border: none;
  box-shadow: none;
}
</style>