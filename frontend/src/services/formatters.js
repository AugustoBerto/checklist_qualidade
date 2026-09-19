/**
 * Utilitários compartilhados de formatação de datas, horas e textos.
 */

import { CHECKLIST_API_URL } from './endpoints'

export const formatarDataHora = (dataString) => {
  if (!dataString) return '--/--/---- --:--';
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return '--/--/---- --:--';
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

export const formatarHora = (horaString) => {
  if (!horaString) return '--:--';
  const str = String(horaString).trim();
  if (str.length >= 5 && str.includes(':')) {
    return str.substring(0, 5);
  }
  const data = new Date(str);
  if (!isNaN(data.getTime())) {
    return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  return str;
};

export const urlLogoMarca = (
  marca,
  apiBase = CHECKLIST_API_URL,
  baseUrl = import.meta.env.BASE_URL || '/'
) => {
  if (marca?.tem_logo) {
    const versao = marca.ultimaAlteracao ? `?v=${encodeURIComponent(marca.ultimaAlteracao)}` : '';
    return `${apiBase}/cadastros/marcas/${marca.id}/logo${versao}`;
  }
  const nome = String(marca?.nome || '').trim().toUpperCase();
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  if (nome === 'FILA') return `${base}logos/fila.png`;
  if (nome === 'UMBRO') return `${base}logos/umbro.png`;
  if (nome === 'NIKE') return `${base}logos/nike.png`;
  return null;
};

export const formatarNomeCurto = (nomeCompleto) => {
  if (!nomeCompleto) return 'Não informado';
  const partes = String(nomeCompleto).trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(' ');
  return `${partes[0]} ${partes[partes.length - 1]}`;
};

/** Extrai listas dos envelopes usados pelos endpoints do frontend. */
export const extrairArrayDeDados = (respostaData) => {
  if (Array.isArray(respostaData)) return respostaData;
  if (!respostaData || typeof respostaData !== 'object') return [];
  if (Array.isArray(respostaData.dados)) return respostaData.dados;
  if (respostaData.dados && Array.isArray(respostaData.dados.dados)) return respostaData.dados.dados;
  if (Array.isArray(respostaData.rows)) return respostaData.rows;

  for (const chave of ['modelos', 'setores', 'marcas', 'categorias', 'celulas', 'usuarios', 'unidades', 'turnos']) {
    if (Array.isArray(respostaData[chave])) return respostaData[chave];
  }
  return Object.values(respostaData).find((valor) => Array.isArray(valor)) || [];
};
