<template>
  <div class="table-toolbar">
    <div class="toolbar-left">
      <!-- Campo de Busca Textual -->
      <div v-if="showSearch" class="search-box">
        <div class="search-input-wrapper">
          <i class="mdi mdi-magnify search-icon"></i>
          <input
            type="text"
            :value="modelValue"
            @input="onInput"
            :placeholder="placeholder"
            class="input-search"
          >
          <button
            v-if="modelValue"
            type="button"
            class="clear-input-btn"
            @click="onClearSearch"
            title="Limpar busca"
          >
            <i class="mdi mdi-close"></i>
          </button>
        </div>
      </div>

      <!-- Filtros Adicionais (Dropdowns, Datas, etc.) -->
      <div v-if="$slots.filters || $slots.default" class="filters-group">
        <slot name="filters">
          <slot></slot>
        </slot>
      </div>

      <!-- Botão de Limpar Todos os Filtros -->
      <button
        v-if="hasActiveFilters"
        type="button"
        class="btn-outline btn-limpar-filtros"
        @click="$emit('clear')"
        title="Limpar todos os filtros"
      >
        <i class="mdi mdi-filter-off-outline"></i>
        <span>Limpar</span>
      </button>
    </div>

    <!-- Ações Primárias / Botões à Direita -->
    <div v-if="$slots.actions" class="toolbar-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
let debounceTimer = null;

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Buscar...'
  },
  showSearch: {
    type: Boolean,
    default: true
  },
  hasActiveFilters: {
    type: Boolean,
    default: false
  },
  debounceMs: {
    type: Number,
    default: 300
  }
});

const emit = defineEmits(['update:modelValue', 'clear', 'search']);

const onInput = (event) => {
  const val = event.target.value;
  emit('update:modelValue', val);
  
  if (props.debounceMs > 0) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      emit('search', val);
    }, props.debounceMs);
  } else {
    emit('search', val);
  }
};

const onClearSearch = () => {
  emit('update:modelValue', '');
  emit('search', '');
};
</script>

<style scoped>
.table-toolbar {
  margin-bottom: 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  flex: 1;
  min-width: 260px;
}

.search-box {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 240px;
  max-width: 380px;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 1.2rem;
  pointer-events: none;
}

.input-search {
  width: 100%;
  padding: 0.65rem 2.2rem 0.65rem 2.4rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  font-size: 0.9rem;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  box-sizing: border-box;
  min-height: 42px;
  transition: all 0.2s ease;
}

.input-search:focus {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.12);
}

.clear-input-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.2s;
}

.clear-input-btn:hover {
  color: var(--primary, #b1072c);
}

.filters-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-limpar-filtros {
  min-height: 42px;
  padding: 0.6rem 1rem;
  font-size: 0.88rem;
  background: #f8fafc;
  border: 1.5px solid var(--border-color, #cbd5e1);
  color: #475569;
  border-radius: var(--radius-md, 8px);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.btn-limpar-filtros:hover {
  background: #fee2e2;
  color: var(--danger, #ef4444);
  border-color: #fca5a5;
}

/* ESTILOS UNIVERSAIS DE FILTROS SLOTTED */
:deep(.filter-select),
:deep(.select-filtro) {
  min-height: 42px;
  padding: 0.6rem 2.4rem 0.6rem 0.85rem;
  border: 1.5px solid var(--border-color, #cbd5e1);
  border-radius: var(--radius-md, 8px);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary, #0f172a);
  background-color: #f8fafc;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2364748b'%3e%3cpath d='M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1.2rem;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  cursor: pointer;
  box-sizing: border-box;
  font-family: inherit;
  min-width: 155px;
  transition: all 0.15s ease;
}

:deep(.filter-select:hover),
:deep(.select-filtro:hover) {
  background-color: #ffffff;
  border-color: #94a3b8;
}

:deep(.filter-select:focus),
:deep(.select-filtro:focus) {
  outline: none;
  border-color: var(--primary, #b1072c);
  background-color: #ffffff;
  box-shadow: 0 0 0 3px rgba(177, 7, 44, 0.12);
}

:deep(.filter-field),
:deep(.filtro-item) {
  display: flex;
  align-items: center;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }
  .toolbar-left {
    flex-direction: column;
    align-items: stretch;
    gap: 0.65rem;
  }
  .search-box {
    max-width: 100%;
    width: 100%;
  }
  .filters-group {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 0.65rem;
  }
  :deep(.filter-field),
  :deep(.filtro-item),
  :deep(.filter-select),
  :deep(.select-filtro) {
    width: 100%;
    min-width: 0;
  }
  .btn-limpar-filtros {
    width: 100%;
    justify-content: center;
  }
  .toolbar-actions {
    width: 100%;
  }
  .toolbar-actions > * {
    width: 100%;
    justify-content: center;
  }
}
</style>
