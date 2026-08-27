<template>
  <div v-if="modelValue" class="modal-backdrop" @click.self="fechar">
    <div class="modal-card slide-up" :style="{ maxWidth: maxWidth }">
      <div class="modal-header">
        <div class="modal-title-box">
          <i v-if="icon" :class="icon" class="modal-icon"></i>
          <h2 class="modal-title">{{ title }}</h2>
        </div>
        <button type="button" class="btn-close" @click="fechar" aria-label="Fechar modal">
          <i class="mdi mdi-close"></i>
        </button>
      </div>

      <div class="modal-body">
        <slot></slot>
      </div>

      <div v-if="$slots.footer" class="modal-footer">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: ''
  },
  maxWidth: {
    type: String,
    default: '540px'
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const fechar = () => {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
  box-sizing: border-box;
}

.modal-card {
  background: #ffffff;
  border-radius: var(--radius-lg, 16px);
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  border: 1px solid var(--border-color, #e2e8f0);
}

.slide-up {
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  background: #f8fafc;
}

.modal-title-box {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.modal-icon {
  font-size: 1.4rem;
  color: var(--primary, #b1072c);
}

.modal-title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary, #0f172a);
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.3rem;
  color: var(--text-secondary, #64748b);
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  width: 36px;
  height: 36px;
}

.btn-close:hover {
  background: #e2e8f0;
  color: var(--text-primary, #0f172a);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex-grow: 1;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border-color, #e2e8f0);
  background: #f8fafc;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

@media (max-width: 768px) {
  .modal-card {
    max-height: 94vh;
  }
  .modal-header {
    padding: 1rem 1.25rem;
  }
  .modal-body {
    padding: 1.25rem 1rem;
  }
  .modal-footer {
    padding: 0.85rem 1rem;
  }
}
</style>
