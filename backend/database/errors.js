const PG_ERROR_MESSAGES = Object.freeze({
  '23505': 'Registro duplicado.',
  '23503': 'Registro relacionado não encontrado ou ainda utilizado.',
  '23502': 'Campo obrigatório não informado.',
  '23514': 'Dados violam uma regra de validação.',
  '40001': 'A operação concorrente precisa ser repetida.',
  '40P01': 'A operação encontrou um conflito concorrente e precisa ser repetida.'
});

const isPgError = (error) => Boolean(error && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code));
const isRetryablePgError = (error) => isPgError(error) && ['40001', '40P01'].includes(error.code);

const postgresError = (error, fallback = 'Não foi possível concluir a operação.') => ({
  isPostgresError: isPgError(error),
  code: error?.code || null,
  constraint: error?.constraint || null,
  message: PG_ERROR_MESSAGES[error?.code] || fallback
});

const mensagemPostgres = (error, fallback) => postgresError(error, fallback).message;

module.exports = {
  PG_ERROR_MESSAGES,
  isPgError,
  isRetryablePgError,
  postgresError,
  mensagemPostgres
};
