<template>
  <div v-if="totalPages > 1 || total > 0" class="pagination-bar">
    <div class="pagination-info">
      <span v-if="total > 0">
        Total de <strong>{{ total }}</strong> {{ total === 1 ? 'registro' : 'registros' }}
      </span>
      <span v-if="totalPages > 1" class="page-count">
        (Página <strong>{{ page }}</strong> de <strong>{{ totalPages }}</strong>)
      </span>
    </div>

    <div v-if="totalPages > 1" class="pagination-controls">
      <button
        type="button"
        class="btn-page"
        :disabled="page <= 1"
        @click="$emit('change', page - 1)"
        title="Página anterior"
      >
        <i class="mdi mdi-chevron-left"></i>
        <span>Anterior</span>
      </button>

      <button
        type="button"
        class="btn-page"
        :disabled="page >= totalPages"
        @click="$emit('change', page + 1)"
        title="Próxima página"
      >
        <span>Próxima</span>
        <i class="mdi mdi-chevron-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  page: {
    type: Number,
    default: 1
  },
  totalPages: {
    type: Number,
    default: 1
  },
  total: {
    type: Number,
    default: 0
  },
  pageSize: {
    type: Number,
    default: 25
  }
});

defineEmits(['change']);
</script>

<style scoped>
.pagination-bar {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.pagination-info {
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  display: flex;
  align-items: center;
  gap: 6px;
}

.pagination-info strong {
  color: var(--text-primary, #0f172a);
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-page {
  background-color: #ffffff;
  border: 1.5px solid var(--border-color, #cbd5e1);
  color: var(--text-primary, #0f172a);
  padding: 0.5rem 0.95rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 38px;
  transition: all 0.2s ease;
}

.btn-page:hover:not(:disabled) {
  background-color: #f8fafc;
  border-color: #94a3b8;
  color: var(--primary, #b1072c);
}

.btn-page:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f8fafc;
  border-color: #e2e8f0;
}

@media (max-width: 640px) {
  .pagination-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .pagination-info {
    justify-content: center;
  }
  .pagination-controls {
    justify-content: space-between;
  }
  .pagination-controls button {
    flex: 1;
    justify-content: center;
  }
}
</style>
