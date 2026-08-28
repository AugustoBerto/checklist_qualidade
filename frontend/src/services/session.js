import api from './api'
import { authApi } from './auth'

const limparPerfil = () => {
  localStorage.removeItem('usuario')
}

const salvarPerfil = (perfil) => {
  localStorage.setItem('usuario', JSON.stringify(perfil))
  return perfil
}

let falhaRestauracao = null

const carregarPerfil = async (exigirAdmin = false) => {
  const { data } = await api.get('/perfis/me')
  const perfil = data.perfil
  if (exigirAdmin && perfil.papel !== 'ADMIN') {
    throw new Error('Esta conta não possui perfil de administrador no Checklist.')
  }
  return salvarPerfil(perfil)
}

const encerrarSessaoCentral = async () => {
  try { await authApi.post('/auth/logout') } catch {}
  limparPerfil()
}

let restauracaoEmAndamento = null

export const autenticarComSenha = async (usuario, senha, exigirAdmin = false) => {
  await authApi.post('/auth/login', { usuario, senha })
  try {
    return await carregarPerfil(exigirAdmin)
  } catch (erro) {
    limparPerfil()
    throw erro
  }
}

export const restaurarSessao = () => {
  if (restauracaoEmAndamento) return restauracaoEmAndamento

  restauracaoEmAndamento = (async () => {
    falhaRestauracao = null
    try {
      await authApi.post('/auth/me')
      return await carregarPerfil()
    } catch (erro) {
      if (erro.response?.status === 403) {
        falhaRestauracao = erro.response.data?.mensagem
          || erro.response.data?.message
          || 'Seu usuário não possui acesso ao Checklist.'
      }
      limparPerfil()
      return null
    } finally {
      restauracaoEmAndamento = null
    }
  })()

  return restauracaoEmAndamento
}

export const encerrarSessao = encerrarSessaoCentral

export const consumirFalhaRestauracao = () => {
  const falha = falhaRestauracao
  falhaRestauracao = null
  return falha
}

export const obterPerfilLocal = () => {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null')
  } catch {
    limparPerfil()
    return null
  }
}

export const possuiPerfilLocal = () => Boolean(obterPerfilLocal())
