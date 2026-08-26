<template>
  <teleport to="body">
    <transition name="dialog-fade">
      <div
        v-if="dialogState.isOpen"
        class="dialog-overlay"
        @click.self="handleCancel"
        role="dialog"
        aria-modal="true"
      >
        <div class="dialog-card">
          <div class="dialog-header">
            <div class="dialog-icon-badge" :class="`badge-${dialogState.variant}`">
              <i v-if="dialogState.variant === 'danger'" class="mdi mdi-alert-octagon-outline"></i>
              <i v-else-if="dialogState.variant === 'warning'" class="mdi mdi-alert-outline"></i>
              <i v-else-if="dialogState.variant === 'success'" class="mdi mdi-check-circle-outline"></i>
              <i v-else class="mdi mdi-information-outline"></i>
            </div>
            <div class="dialog-title-area">
              <h3 class="dialog-title">{{ dialogState.title }}</h3>
            </div>
          </div>

          <div class="dialog-body">
            <p class="dialog-message">{{ dialogState.message }}</p>
          </div>

          <div class="dialog-footer">
            <button
              v-if="dialogState.type === 'confirm'"
              type="button"
              class="btn-outline btn-dialog-cancel"
              @click="handleCancel"
            >
              {{ dialogState.cancelText || 'Cancelar' }}
            </button>

            <button
              type="button"
              class="btn-dialog-confirm"
              :class="confirmButtonClass"
              @click="handleConfirm"
            >
              {{ dialogState.confirmText || 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { computed } from 'vue';
import { dialogState, dialog } from '../services/feedback';

const handleConfirm = () => {
  dialog.close(true);
};

const handleCancel = () => {
  dialog.close(false);
};

const confirmButtonClass = computed(() => {
  if (dialogState.variant === 'danger') return 'btn-danger';
  if (dialogState.variant === 'warning') return 'btn-warning';
  return 'btn-primary';
});
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.dialog-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 460px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  animation: dialog-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 1.5rem 1.5rem 0.75rem 1.5rem;
}

.dialog-icon-badge {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.badge-danger {
  background: #fee2e2;
  color: #ef4444;
}

.badge-warning {
  background: #fef3c7;
  color: #d97706;
}

.badge-success {
  background: #d1fae5;
  color: #059669;
}

.badge-primary {
  background: #dbeafe;
  color: #2563eb;
}

.dialog-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.3;
}

.dialog-body {
  padding: 0.5rem 1.5rem 1.25rem 1.5rem;
}

.dialog-message {
  margin: 0;
  font-size: 0.95rem;
  color: #475569;
  line-height: 1.5;
  white-space: pre-line;
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.btn-dialog-cancel {
  min-height: 42px;
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
}

.btn-dialog-confirm {
  min-height: 42px;
  padding: 0.6rem 1.4rem;
  font-size: 0.95rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-warning {
  background: #f59e0b;
  color: #ffffff;
}

.btn-warning:hover {
  background: #d97706;
}

/* 🎬 Animações */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

@keyframes dialog-pop {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
