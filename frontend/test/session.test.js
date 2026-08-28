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

const {
  autenticarComSenha,
  consumirFalhaRestauracao,
  restaurarSessao,
} = await import('../src/services/session');

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

  it('informa falta de autorização local sem encerrar a sessão Unix', async () => {
    authApi.post.mockResolvedValue({});
    api.get.mockRejectedValue({
      response: {
        status: 403,
        data: { mensagem: 'Acesso ao Checklist não liberado.' },
      },
    });

    await expect(restaurarSessao()).resolves.toBeNull();

    expect(consumirFalhaRestauracao()).toBe('Acesso ao Checklist não liberado.');
    expect(consumirFalhaRestauracao()).toBeNull();
    expect(authApi.post).toHaveBeenCalledOnce();
    expect(authApi.post).toHaveBeenCalledWith('/auth/me');
  });

  it('não encerra a sessão Unix quando o login é válido mas falta autorização local', async () => {
    authApi.post.mockResolvedValue({});
    api.get.mockRejectedValue({ response: { status: 403 } });

    await expect(autenticarComSenha('pessoa', 'senha')).rejects.toMatchObject({
      response: { status: 403 },
    });

    expect(authApi.post).toHaveBeenCalledOnce();
    expect(authApi.post).toHaveBeenCalledWith('/auth/login', {
      usuario: 'pessoa',
      senha: 'senha',
    });
  });
});
