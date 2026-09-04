<template>
  <router-link :to="to" class="module-card">
    <div class="icon-wrapper" :class="colorClass"><i :class="icon"></i></div>
    <div class="module-info"><h3>{{ title }}</h3><p>{{ description }}</p></div>
    <div class="arrow-icon"><i class="mdi mdi-chevron-right"></i></div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  to: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  color: { type: String, default: 'dass' },
})

const colorClass = computed(() => `bg-${props.color}`)
</script>

<style scoped>
.module-card {
  display: flex;
  align-items: center;
  background: var(--bg-card, #fff);
  padding: 1.25rem 1.35rem;
  border-radius: 14px;
  border: 1px solid var(--border-color, #e2e8f0);
  text-decoration: none;
  color: inherit;
  transition: all 0.25s ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  min-height: 88px;
  box-sizing: border-box;
}
.module-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  border-color: var(--primary, #b1072c);
}
.icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  margin-right: 1.15rem;
  flex-shrink: 0;
}
.bg-dass { background: #fff1f2; color: #b1072c; }
.module-info { flex-grow: 1; }
.module-info h3 { margin: 0 0 0.25rem; font-size: 1.08rem; color: var(--text-primary, #0f172a); font-weight: 700; line-height: 1.3; }
.module-info p { margin: 0; font-size: 0.88rem; color: var(--text-secondary, #64748b); line-height: 1.4; }
.arrow-icon { color: #cbd5e1; font-size: 1.4rem; transition: all 0.25s ease; margin-left: 0.75rem; flex-shrink: 0; }
.module-card:hover .arrow-icon { color: var(--primary, #b1072c); transform: translateX(4px); }
@media (max-width: 768px) {
  .module-card { padding: 1rem 1.15rem; }
  .icon-wrapper { width: 42px; height: 42px; font-size: 1.35rem; margin-right: 0.85rem; }
  .module-info h3 { font-size: 1rem; }
  .module-info p { font-size: 0.82rem; }
}
</style>
