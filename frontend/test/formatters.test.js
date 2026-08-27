import { describe, expect, it } from 'vitest';
import { urlLogoMarca } from '../src/services/formatters';

describe('urlLogoMarca', () => {
  it('usa a logo persistida, preserva apenas o fallback da Fila e omite os demais', () => {
    expect(urlLogoMarca({ id: 7, nome: 'ADIDAS', tem_logo: true, ultimaAlteracao: '2026-08-27T10:00:00Z' }, '/api/checklist-app/api', '/checklist/'))
      .toBe('/api/checklist-app/api/cadastros/marcas/7/logo?v=2026-08-27T10%3A00%3A00Z');
    expect(urlLogoMarca({ id: 8, nome: 'FILA', tem_logo: false }, '/api/checklist-app/api', '/checklist/'))
      .toBe('/checklist/logos/fila.png');
    expect(urlLogoMarca({ id: 9, nome: 'VEJA', tem_logo: false }, '/api/checklist-app/api', '/checklist/'))
      .toBeNull();
  });
});
