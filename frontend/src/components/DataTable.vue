<template>
  <div class="data-table-wrapper">
    <!-- Estado de Carregamento -->
    <FeedbackState
      v-if="isLoading"
      type="loading"
      :message="loadingMessage"
    />

    <!-- Estado de Erro -->
    <FeedbackState
      v-else-if="error"
      type="error"
      title="Erro ao carregar dados"
      :message="error"
      :show-retry="true"
      @retry="$emit('retry')"
    />

    <!-- Estado Vazio -->
    <template v-else-if="!items || items.length === 0">
      <slot name="empty">
        <FeedbackState
          type="empty"
          :title="emptyTitle"
          :message="emptyMessage"
          :icon="emptyIcon"
        />
      </slot>
    </template>

    <!-- Tabela com Dados -->
    <template v-else>
      <div class="table-responsive">
        <table class="data-table">
          <thead v-if="$slots.header">
            <slot name="header"></slot>
          </thead>
          <tbody>
            <slot name="body">
              <slot v-for="(item, index) in items" :key="item.id || index" :item="item" :index="index"></slot>
            </slot>
          </tbody>
        </table>
      </div>

      <!-- Paginação Integrada -->
      <slot name="pagination">
        <TablePagination
          v-if="showPagination"
          :page="page"
          :total-pages="totalPages"
          :total="total"
          @change="$emit('change-page', $event)"
        />
      </slot>
    </template>
  </div>
</template>

<script setup>
import FeedbackState from './FeedbackState.vue';
import TablePagination from './TablePagination.vue';

defineProps({
  items: {
    type: Array,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  emptyTitle: {
    type: String,
    default: 'Nenhum registro encontrado'
  },
  emptyMessage: {
    type: String,
    default: 'Não foram encontrados registros para os critérios informados.'
  },
  emptyIcon: {
    type: String,
    default: 'mdi mdi-table-off'
  },
  loadingMessage: {
    type: String,
    default: 'Carregando dados...'
  },
  showPagination: {
    type: Boolean,
    default: false
  },
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
});

defineEmits(['retry', 'change-page']);
</script>

<style scoped>
.data-table-wrapper {
  width: 100%;
}

.table-responsive {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-md, 10px);
  background: #ffffff;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

:deep(th) {
  background: #f8fafc;
  padding: 0.9rem 1.1rem;
  color: #475569;
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1.5px solid var(--border-color, #e2e8f0);
  white-space: nowrap;
}

:deep(td) {
  padding: 1rem 1.1rem;
  border-bottom: 1px solid #f1f5f9;
  color: var(--text-primary, #0f172a);
  font-size: 0.95rem;
  vertical-align: middle;
}

:deep(th.col-id),
:deep(td.col-id) {
  width: 75px;
  min-width: 75px;
  max-width: 90px;
}

:deep(th.text-center),
:deep(td.text-center) {
  text-align: center;
}

:deep(th.col-acoes),
:deep(th.text-right) {
  text-align: right;
  width: 140px;
  min-width: 140px;
  white-space: nowrap;
}

:deep(td.col-acoes),
:deep(td.text-right) {
  text-align: right;
  width: 140px;
  min-width: 140px;
  white-space: nowrap;
}

:deep(tbody tr) {
  transition: background-color 0.15s ease;
}

:deep(tbody tr.clickable-row) {
  cursor: pointer;
  -webkit-tap-highlight-color: rgba(177, 7, 44, 0.05);
}

:deep(tbody tr:hover),
:deep(tbody tr.clickable-row:hover) {
  background-color: #f8fafc;
}

:deep(tbody tr.clickable-row:active) {
  background-color: #f1f5f9;
}

:deep(tbody tr:last-child td) {
  border-bottom: none;
}

:deep(th.col-chevron),
:deep(td.col-chevron) {
  width: 32px;
  min-width: 32px;
  max-width: 36px;
  padding-left: 0;
  padding-right: 0.75rem;
  text-align: right;
  color: #94a3b8;
  font-size: 1.15rem;
}

:deep(tr.clickable-row:hover td.col-chevron) {
  color: var(--primary, #b1072c);
}

@media (max-width: 768px) {
  :deep(.hide-mobile) {
    display: none !important;
  }

  :deep(th) {
    padding: 0.75rem 0.65rem;
    font-size: 0.8rem;
  }

  :deep(td) {
    padding: 0.85rem 0.65rem;
    font-size: 0.88rem;
  }

  :deep(th.col-id),
  :deep(td.col-id) {
    width: 50px;
    min-width: 50px;
  }

  :deep(th.col-chevron),
  :deep(td.col-chevron) {
    width: 24px;
    min-width: 24px;
    padding-right: 0.5rem;
  }
}

@media (max-width: 1024px) {
  :deep(.hide-tablet) {
    display: none !important;
  }
}
</style>
