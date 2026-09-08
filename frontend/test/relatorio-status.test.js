// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import RelatorioView from '../src/views/RelatorioView.vue'

const { api } = vi.hoisted(() => ({ api: { get: vi.fn() } }))
vi.mock('../src/services/api', () => ({ default: api }))
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '1' } }) }))

it.each([
  [95, 'otimo', 'Meta atingida'],
  [94, 'bom', 'Atenção'],
  [85, 'bom', 'Atenção'],
  [84, 'ruim', 'Abaixo da meta'],
])('classifica %s%% no resumo com os mesmos limites do dashboard', async (score, classe, label) => {
  api.get.mockResolvedValue({ data: {
    sucesso: true,
    info: { nome_modelo: 'Modelo', nome_usuario: 'Auditor' },
    dadosGrafico: [['status', 'total', 'cor'], ['Conforme', score, '#10b981'], ['Não Conforme', 100 - score, '#ef4444']],
  } })
  const wrapper = shallowMount(RelatorioView, { global: {
    mocks: { $route: { params: { id: '1' } } },
    stubs: { 'router-link': true },
  } })
  await flushPromises()
  expect(wrapper.find('.scorecard').classes()).toContain(classe)
  expect(wrapper.find('.scorecard').text()).toContain(label)
  wrapper.unmount()
})
