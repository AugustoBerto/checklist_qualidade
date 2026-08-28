import { describe, expect, it, vi } from 'vitest';
import { createDraftPersistence } from '../src/services/draftPersistence';

const criarStorage = () => {
  const dados = new Map();
  const operacoes = [];
  let emAndamento = 0;
  let maximoEmAndamento = 0;

  const executar = async (tipo, chave, valor) => {
    emAndamento += 1;
    maximoEmAndamento = Math.max(maximoEmAndamento, emAndamento);
    operacoes.push({ tipo, chave, valor });
    await Promise.resolve();
    if (tipo === 'set') dados.set(chave, valor);
    else dados.delete(chave);
    emAndamento -= 1;
  };

  return {
    dados,
    operacoes,
    get maximoEmAndamento() { return maximoEmAndamento; },
    getItem: vi.fn((chave) => Promise.resolve(dados.get(chave) || null)),
    setItem: vi.fn((chave, valor) => executar('set', chave, valor)),
    removeItem: vi.fn((chave) => executar('remove', chave))
  };
};

describe('createDraftPersistence', () => {
  it('consolida metadados sem serializar fotos', async () => {
    vi.useFakeTimers();
    const storage = criarStorage();
    const persistencia = createDraftPersistence(storage, 'rascunho', { debounceMs: 750 });

    persistencia.schedule({ respostas: { a: 'Conforme' }, observacoesNaoConformes: {}, inicioChecklistTimestamp: 'inicio' });
    persistencia.schedule({ respostas: { a: 'Não Conforme' }, observacoesNaoConformes: { a: 'obs' }, inicioChecklistTimestamp: 'inicio' });
    vi.advanceTimersByTime(750);
    await persistencia.flush();

    expect(storage.setItem).toHaveBeenCalledTimes(1);
    expect(storage.dados.get('rascunho')).toEqual({
      respostas: { a: 'Não Conforme' },
      observacoesNaoConformes: { a: 'obs' },
      inicioChecklistTimestamp: 'inicio',
      fotoVariaveis: []
    });
    vi.useRealTimers();
  });

  it('persiste fotos em chaves próprias, restaura e remove tudo ao limpar', async () => {
    const storage = criarStorage();
    const persistencia = createDraftPersistence(storage, 'rascunho');
    const metadata = { respostas: { a: 'Não Conforme' }, observacoesNaoConformes: {}, inicioChecklistTimestamp: 'inicio' };

    await persistencia.setPhoto('a', 'data:image/jpeg;base64,foto', metadata);
    await persistencia.flush(metadata);

    expect(storage.dados.get('rascunho:foto:a')).toBe('data:image/jpeg;base64,foto');
    expect(storage.dados.get('rascunho').fotoVariaveis).toEqual(['a']);

    const restaurado = await persistencia.load();
    expect(restaurado.fotos).toEqual({ a: 'data:image/jpeg;base64,foto' });

    await persistencia.clear();
    expect(storage.dados.has('rascunho')).toBe(false);
    expect(storage.dados.has('rascunho:foto:a')).toBe(false);
    expect(storage.maximoEmAndamento).toBe(1);

    // Garante que chamadas subsequentes de flush ou schedule após clear() não recriam o rascunho
    await persistencia.flush(metadata);
    persistencia.schedule(metadata);
    expect(storage.dados.has('rascunho')).toBe(false);
  });

  it('descarta metadados e fotos sem bloquear novas escritas', async () => {
    const storage = criarStorage();
    const persistencia = createDraftPersistence(storage, 'rascunho');
    const metadata = {
      modeloId: 7,
      modeloVersao: 3,
      respostas: { a: 'Não Conforme' },
      observacoesNaoConformes: {},
      inicioChecklistTimestamp: 'inicio'
    };

    await persistencia.setPhoto('a', 'foto-antiga', metadata);
    await persistencia.flush(metadata);
    await persistencia.discard();

    expect(storage.dados.has('rascunho')).toBe(false);
    expect(storage.dados.has('rascunho:foto:a')).toBe(false);

    persistencia.schedule({ ...metadata, respostas: { a: 'Conforme' } });
    await persistencia.flush();

    expect(storage.dados.get('rascunho')).toEqual({
      modeloId: 7,
      modeloVersao: 3,
      respostas: { a: 'Conforme' },
      observacoesNaoConformes: {},
      inicioChecklistTimestamp: 'inicio',
      fotoVariaveis: []
    });
  });
});
