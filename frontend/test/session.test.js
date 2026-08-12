import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = { get: vi.fn() };
const authApi = { post: vi.fn() };
const armazenamentoLocal = new Map();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    clear: () => armazenamentoLocal.clear(),
    getItem: (chave) => armazenamentoLocal.get(chave) ?? null,
    removeItem: (chave) => armazenamentoLocal.delete(chave),
    setItem: (chave, valor) => armazenamentoLocal.set(chave, String(valor))
  },
  configurable: true
});
const valoresLocais = new Map();

vi.stubGlobal('localStorage', {
  clear: () => valoresLocais.clear(),
  getItem: (chave) => valoresLocais.get(chave) || null,
  removeItem: (chave) => valoresLocais.delete(chave),
  setItem: (chave, valor) => valoresLocais.set(chave, String(valor))
});

vi.mock('../src/services/api', () => ({ default: api }));
vi.mock('../src/services/auth', () => ({ authApi }));

const { restaurarSessao } = await import('../src/services/session');

describe('restaurarSessao', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    authApi.post.mockReset();
  });

  it('reutiliza a mesma restauração enquanto ela estiver em andamento', async () => {
    let resolverAuth;
    authApi.post.mockReturnValue(new Promise((resolve) => { resolverAuth = resolve; }));
    api.get.mockResolvedValue({ data: { perfil: { nome: 'Pessoa', papel: 'ADMIN' } } });

    const primeira = restaurarSessao();
    const segunda = restaurarSessao();
    expect(primeira).toBe(segunda);
    expect(authApi.post).toHaveBeenCalledTimes(1);

    resolverAuth();
    await expect(primeira).resolves.toEqual({ nome: 'Pessoa', papel: 'ADMIN' });
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});
