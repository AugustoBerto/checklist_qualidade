import api from './api'
import { authApi } from './auth'

const limparPerfil = () => {
  localStorage.removeItem('usuario')
  localStorage.removeItem('isAdmin')
}

const salvarPerfil = (perfil) => {
  localStorage.setItem('usuario', JSON.stringify(perfil))
  localStorage.setItem('isAdmin', String(perfil.papel === 'ADMIN'))
  return perfil
}

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

export const autenticarComSenha = async (usuario, senha, exigirAdmin = false) => {
  await authApi.post('/auth/login', { usuario, senha })
  try {
    return await carregarPerfil(exigirAdmin)
  } catch (erro) {
    await encerrarSessaoCentral()
    throw erro
  }
}

export const autenticarComCracha = async (codBar, exigirAdmin = false) => {
  await authApi.post('/auth/login/codbar', { codBar })
  try {
    return await carregarPerfil(exigirAdmin)
  } catch (erro) {
    await encerrarSessaoCentral()
    throw erro
  }
}

export const restaurarSessao = async () => {
  try {
    await authApi.post('/auth/me')
    return await carregarPerfil()
  } catch {
    limparPerfil()
    return null
  }
}

export const encerrarSessao = encerrarSessaoCentral

export const obterPerfilLocal = () => {
  try {
    return JSON.parse(localStorage.getItem('usuario') || 'null')
  } catch {
    limparPerfil()
    return null
  }
}

export const possuiPerfilLocal = () => Boolean(obterPerfilLocal())
