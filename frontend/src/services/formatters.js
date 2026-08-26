/**
 * Utilitários compartilhados de formatação de datas, horas e textos.
 */

export const formatarDataHora = (dataString) => {
  if (!dataString) return '--/--/---- --:--';
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return '--/--/---- --:--';
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

export const formatarData = (dataString) => {
  if (!dataString) return '--/--/----';
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return '--/--/----';
  return data.toLocaleDateString('pt-BR');
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

export const normalizarNomeLogo = (nome) => {
  if (!nome) return 'sem-nome';
  return String(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
};

export const urlLogoMarca = (nome, baseUrl = import.meta.env.BASE_URL || '/') => {
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${base}logos/${normalizarNomeLogo(nome)}.png`;
};
