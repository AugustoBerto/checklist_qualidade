<template>
  <div class="toast-stack" aria-live="polite">
    <transition-group name="toast">
      <div
        v-for="t in toastState.toasts"
        :key="t.id"
        class="toast-item"
        :class="`toast-${t.type}`"
      >
        <div class="toast-icon">
          <i v-if="t.type === 'success'" class="mdi mdi-check-circle"></i>
          <i v-else-if="t.type === 'error'" class="mdi mdi-alert-circle"></i>
          <i v-else-if="t.type === 'warning'" class="mdi mdi-alert"></i>
          <i v-else class="mdi mdi-information"></i>
        </div>

        <div class="toast-content">
          <p class="toast-message">{{ t.message }}</p>
        </div>

        <button
          type="button"
          class="toast-close"
          @click="toast.remove(t.id)"
          aria-label="Fechar notificação"
        >
          <i class="mdi mdi-close"></i>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { toastState, toast } from '../services/feedback';
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 420px;
  width: calc(100% - 40px);
  pointer-events: none;
}

.toast-item {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  background: #ffffff;
  border-left: 5px solid #b1072c;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-icon {
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 500;
  color: #1e293b;
  line-height: 1.4;
  word-break: break-word;
}

.toast-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.toast-close:hover {
  background: #f1f5f9;
  color: #334155;
}

/* 🎨 Variantes */
.toast-success {
  border-left-color: #10b981;
}
.toast-success .toast-icon {
  color: #10b981;
}

.toast-error {
  border-left-color: #ef4444;
}
.toast-error .toast-icon {
  color: #ef4444;
}

.toast-warning {
  border-left-color: #f59e0b;
}
.toast-warning .toast-icon {
  color: #f59e0b;
}

.toast-info {
  border-left-color: #b1072c;
}
.toast-info .toast-icon {
  color: #b1072c;
}

/* 🎬 Animações Vue */
.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
.toast-leave-active {
  position: absolute;
}

@media (max-width: 768px) {
  .toast-stack {
    top: 12px;
    right: 12px;
    left: 12px;
    width: auto;
    max-width: none;
  }
}
</style>
