import { reactive } from 'vue';

// 📌 Estado reativo para Toasts
export const toastState = reactive({
  toasts: []
});

// 📌 Estado reativo para Dialog / Confirmação
export const dialogState = reactive({
  isOpen: false,
  title: '',
  message: '',
  type: 'confirm', // 'confirm' | 'alert'
  variant: 'danger', // 'danger' | 'warning' | 'primary' | 'success'
  confirmText: 'Confirmar',
  cancelText: 'Cancelar',
  resolver: null
});

let nextToastId = 1;

export const toast = {
  show(message, type = 'info', duration = 4000) {
    const id = nextToastId++;
    const toastItem = { id, message, type };
    toastState.toasts.push(toastItem);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
    return id;
  },

  success(message, duration = 3500) {
    return this.show(message, 'success', duration);
  },

  error(message, duration = 4500) {
    return this.show(message, 'error', duration);
  },

  warning(message, duration = 4000) {
    return this.show(message, 'warning', duration);
  },

  info(message, duration = 3500) {
    return this.show(message, 'info', duration);
  },

  remove(id) {
    const index = toastState.toasts.findIndex(t => t.id === id);
    if (index !== -1) {
      toastState.toasts.splice(index, 1);
    }
  },

  clear() {
    toastState.toasts = [];
  }
};

export const dialog = {
  confirm({
    title = 'Confirmar Ação',
    message = 'Deseja realmente prosseguir?',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger'
  } = {}) {
    return new Promise((resolve) => {
      dialogState.isOpen = true;
      dialogState.title = title;
      dialogState.message = message;
      dialogState.type = 'confirm';
      dialogState.variant = variant;
      dialogState.confirmText = confirmText;
      dialogState.cancelText = cancelText;
      dialogState.resolver = resolve;
    });
  },

  alert({
    title = 'Atenção',
    message = '',
    confirmText = 'OK',
    variant = 'primary'
  } = {}) {
    return new Promise((resolve) => {
      dialogState.isOpen = true;
      dialogState.title = title;
      dialogState.message = message;
      dialogState.type = 'alert';
      dialogState.variant = variant;
      dialogState.confirmText = confirmText;
      dialogState.cancelText = '';
      dialogState.resolver = resolve;
    });
  },

  close(result = false) {
    dialogState.isOpen = false;
    if (dialogState.resolver) {
      dialogState.resolver(result);
      dialogState.resolver = null;
    }
  }
};

export const useFeedback = () => ({
  toastState,
  dialogState,
  toast,
  dialog
});
