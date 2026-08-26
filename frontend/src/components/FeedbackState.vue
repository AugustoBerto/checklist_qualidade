<template>
  <div class="feedback-state-container" :class="type">
    <!-- Loading State -->
    <template v-if="type === 'loading'">
      <div class="spinner"></div>
      <p class="feedback-text">{{ message || 'Carregando dados...' }}</p>
    </template>

    <!-- Error State -->
    <template v-else-if="type === 'error'">
      <div class="icon-circle error">
        <i class="mdi mdi-alert-circle-outline"></i>
      </div>
      <h3 class="feedback-title">{{ title || 'Ocorreu um erro' }}</h3>
      <p class="feedback-text">{{ message || 'Não foi possível carregar os dados.' }}</p>
      <button v-if="showRetry" type="button" class="btn-retry" @click="$emit('retry')">
        <i class="mdi mdi-refresh"></i> Tentar Novamente
      </button>
    </template>

    <!-- Empty State -->
    <template v-else-if="type === 'empty'">
      <div class="icon-circle empty">
        <i :class="icon || 'mdi mdi-clipboard-text-off-outline'"></i>
      </div>
      <h3 class="feedback-title">{{ title || 'Nenhum registro encontrado' }}</h3>
      <p class="feedback-text">{{ message || 'Não existem dados correspondentes à sua consulta.' }}</p>
      <slot name="action"></slot>
    </template>
  </div>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'loading',
    validator: (val) => ['loading', 'error', 'empty'].includes(val)
  },
  title: {
    type: String,
    default: ''
  },
  message: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  showRetry: {
    type: Boolean,
    default: false
  }
})

defineEmits(['retry'])
</script>

<style scoped>
.feedback-state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3.5rem 1.5rem;
  width: 100%;
  box-sizing: border-box;
}

.spinner {
  border: 3.5px solid #e2e8f0;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border-left-color: var(--primary, #2563eb);
  animation: spin 0.85s linear infinite;
  margin-bottom: 1.25rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.icon-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  margin-bottom: 1.25rem;
}

.icon-circle.error {
  background: #fef2f2;
  color: var(--danger, #ef4444);
}

.icon-circle.empty {
  background: #f1f5f9;
  color: var(--text-secondary, #64748b);
}

.feedback-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.feedback-text {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-secondary, #64748b);
  max-width: 420px;
  line-height: 1.5;
}

.btn-retry {
  margin-top: 1.25rem;
  background: #eff6ff;
  color: var(--primary, #2563eb);
  border: 1px solid #bfdbfe;
  padding: 0.6rem 1.25rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  min-height: 42px;
}

.btn-retry:hover {
  background: var(--primary, #2563eb);
  color: white;
  border-color: var(--primary, #2563eb);
}
</style>
