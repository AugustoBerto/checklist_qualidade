<template>
  <div class="page-header">
    <div class="header-main">
      <div v-if="icon" class="header-icon-box">
        <i :class="icon"></i>
      </div>
      <div class="header-text">
        <h1 class="header-title">{{ title }}</h1>
        <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="header-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  }
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color, #e2e8f0);
  gap: 1rem;
  flex-wrap: wrap;
}

.header-main {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.header-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #eff6ff;
  color: var(--primary, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
}

.header-title {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 800;
  color: var(--text-primary, #0f172a);
  letter-spacing: -0.3px;
  line-height: 1.25;
}

.header-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 0.95rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .page-header {
    margin-bottom: 1.25rem;
    padding-bottom: 1rem;
  }
  .header-icon-box {
    width: 40px;
    height: 40px;
    font-size: 1.35rem;
  }
  .header-title {
    font-size: 1.35rem;
  }
  .header-subtitle {
    font-size: 0.88rem;
  }
  .header-actions {
    width: 100%;
    justify-content: stretch;
  }
  .header-actions > * {
    flex: 1;
  }
}
</style>
