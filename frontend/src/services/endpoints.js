const configuredGatewayUrl = import.meta.env.VITE_GATEWAY_URL?.trim()
const gatewayUrl = (configuredGatewayUrl || (import.meta.env.DEV ? 'http://localhost:2399' : '')).replace(/\/+$/, '')

if (!gatewayUrl) {
  throw new Error('VITE_GATEWAY_URL é obrigatória no frontend de produção.')
}

export const AUTH_API_URL = `${gatewayUrl}/api`
export const CHECKLIST_API_URL = `${gatewayUrl}/api/checklist-app/api`
