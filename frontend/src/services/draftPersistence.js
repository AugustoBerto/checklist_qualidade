const cloneMetadata = (metadata, fotoVariaveis) => ({
  respostas: { ...(metadata.respostas || {}) },
  observacoesNaoConformes: { ...(metadata.observacoesNaoConformes || {}) },
  inicioChecklistTimestamp: metadata.inicioChecklistTimestamp || null,
  fotoVariaveis: [...fotoVariaveis]
});

/**
 * Persiste o conteúdo leve do rascunho separadamente das fotos. Todas as
 * escritas passam pela mesma fila para não disputar o IndexedDB.
 */
export function createDraftPersistence(storage, rascunhoKey, {
  debounceMs = 750,
  onError = (error) => console.error('Erro ao salvar rascunho:', error)
} = {}) {
  const fotoVariaveis = new Set();
  let timer = null;
  let metadataPendente = null;
  let fila = Promise.resolve();
  let ativo = true;

  const chaveFoto = (variavel) => `${rascunhoKey}:foto:${variavel}`;

  const enfileirar = (operacao) => {
    fila = fila
      .catch(() => undefined)
      .then(operacao)
      .catch((error) => onError(error));
    return fila;
  };

  const gravarMetadata = () => {
    if (!ativo || !metadataPendente) return fila;
    const metadata = metadataPendente;
    metadataPendente = null;
    return enfileirar(() => storage.setItem(rascunhoKey, metadata));
  };

  const agendarMetadata = (metadata) => {
    if (!ativo) return;
    metadataPendente = cloneMetadata(metadata, fotoVariaveis);
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      void gravarMetadata();
    }, debounceMs);
  };

  return {
    async load() {
      const metadata = await storage.getItem(rascunhoKey);
      if (!metadata) return null;

      const fotosLegadas = metadata.fotosNaoConformes || {};
      const variaveis = metadata.fotoVariaveis || Object.keys(fotosLegadas);
      const fotos = {};

      await Promise.all(variaveis.map(async (variavel) => {
        const foto = Object.prototype.hasOwnProperty.call(fotosLegadas, variavel)
          ? fotosLegadas[variavel]
          : await storage.getItem(chaveFoto(variavel));
        if (foto) {
          fotoVariaveis.add(variavel);
          fotos[variavel] = foto;
        }
      }));

      return { metadata, fotos };
    },

    schedule(metadata) {
      if (!ativo) return;
      agendarMetadata(metadata);
    },

    setPhoto(variavel, foto, metadata) {
      if (!ativo) return Promise.resolve();
      fotoVariaveis.add(variavel);
      const escrita = enfileirar(() => storage.setItem(chaveFoto(variavel), foto));
      agendarMetadata(metadata);
      return escrita;
    },

    removePhoto(variavel, metadata) {
      if (!ativo) return Promise.resolve();
      fotoVariaveis.delete(variavel);
      const escrita = enfileirar(() => storage.removeItem(chaveFoto(variavel)));
      agendarMetadata(metadata);
      return escrita;
    },

    flush(metadata) {
      if (!ativo) return Promise.resolve();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (metadata) metadataPendente = cloneMetadata(metadata, fotoVariaveis);
      return gravarMetadata();
    },

    clear() {
      ativo = false;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      metadataPendente = null;
      const variaveis = [...fotoVariaveis];
      fotoVariaveis.clear();
      return enfileirar(async () => {
        await storage.removeItem(rascunhoKey);
        await Promise.all(variaveis.map((variavel) => storage.removeItem(chaveFoto(variavel))));
      });
    }
  };
}
