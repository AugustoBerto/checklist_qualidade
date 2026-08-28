const gatewayUrl = (import.meta.env.VITE_GATEWAY_URL || 'http://localhost:2399').replace(/\/+$/, '')

export const AUTH_API_URL = `${gatewayUrl}/api`
export const CHECKLIST_API_URL = `${gatewayUrl}/api/checklist-app/api`
