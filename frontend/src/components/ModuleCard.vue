<template>
  <router-link :to="to" class="module-card">
    <div class="icon-wrapper" :class="colorClass">
      <i :class="icon"></i>
    </div>
    <div class="module-info">
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
    </div>
    <div class="arrow-icon">
      <i class="mdi mdi-chevron-right"></i>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  to: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'blue',
    validator: (val) => ['blue', 'green', 'purple', 'orange', 'red'].includes(val)
  }
})

const colorClass = computed(() => `bg-${props.color}`)
</script>

<style scoped>
.module-card {
  display: flex;
  align-items: center;
  background: var(--bg-card, #ffffff);
  padding: 1.6rem 1.4rem;
  border-radius: var(--radius-lg, 16px);
  border: 1px solid var(--border-color, #e2e8f0);
  text-decoration: none;
  color: inherit;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: var(--shadow-sm, 0 1px 2px rgba(0, 0, 0, 0.05));
  position: relative;
  overflow: hidden;
  min-height: 110px;
  box-sizing: border-box;
}

.module-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
  border-color: var(--primary, #2563eb);
}

.icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  margin-right: 1.25rem;
  flex-shrink: 0;
}

.bg-blue { background: #eff6ff; color: #2563eb; }
.bg-green { background: #ecfdf5; color: #10b981; }
.bg-purple { background: #faf5ff; color: #9333ea; }
.bg-orange { background: #fff7ed; color: #ea580c; }
.bg-red { background: #fef2f2; color: #dc2626; }

.module-info {
  flex-grow: 1;
}

.module-info h3 {
  margin: 0 0 0.35rem 0;
  font-size: 1.2rem;
  color: var(--text-primary, #0f172a);
  font-weight: 700;
  line-height: 1.3;
}

.module-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #64748b);
  line-height: 1.45;
}

.arrow-icon {
  color: #cbd5e1;
  font-size: 1.6rem;
  transition: all 0.25s ease;
  margin-left: 0.75rem;
  flex-shrink: 0;
}

.module-card:hover .arrow-icon {
  color: var(--primary, #2563eb);
  transform: translateX(4px);
}

@media (max-width: 768px) {
  .module-card {
    padding: 1.25rem;
  }
  .icon-wrapper {
    width: 50px;
    height: 50px;
    font-size: 1.6rem;
    margin-right: 1rem;
  }
  .module-info h3 {
    font-size: 1.1rem;
  }
}
</style>
