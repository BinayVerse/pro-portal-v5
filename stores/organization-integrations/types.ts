export interface IntegrationProvider {
  id: string
  name: string
  code: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface IntegrationModule {
  id: string
  name: string
  code: string
  created_at: string
}

export interface IntegrationAgent {
  id: string
  name: string
  code: string
  created_at: string
}

export interface OrganizationIntegration {
  id: string
  organization_id: string
  provider_id: string
  agent_id: string
  module_id: string
  connection_name: string
  client_id: string
  client_secret?: string
  api_key?: string
  access_token?: string
  refresh_token?: string
  token_expiry?: string
  base_url?: string
  login_url?: string
  metadata_json?: Record<string, any>
  status: 'active' | 'inactive' | 'expired' | 'failed'
  created_at: string
  updated_at: string
  // Join fields from API response
  provider_name?: string
  provider_code?: string
  agent_name?: string
  agent_code?: string
  module_name?: string
  module_code?: string
}

export interface CreateIntegrationPayload {
  provider_id: string
  agent_id: string
  module_id: string
  connection_name: string
  client_id: string
  client_secret: string
  api_key: string
  access_token: string
  refresh_token?: string
  token_expiry?: string
  base_url?: string
  login_url?: string
  metadata_json?: Record<string, any>
  status?: 'active' | 'inactive' | 'expired' | 'failed'
  hrms_system?: string
  is_hrms?: boolean
}

export interface UpdateIntegrationPayload {
  connection_name?: string
  client_id?: string
  client_secret?: string
  api_key?: string
  access_token?: string
  refresh_token?: string
  token_expiry?: string
  base_url?: string
  login_url?: string
  metadata_json?: Record<string, any>
  status?: 'active' | 'inactive' | 'expired' | 'failed'
  hrms_system?: string
  is_hrms?: boolean
}

export interface IntegrationRelationships {
  agentModules: Array<{ agent_id: string; module_id: string }>
  agentProviders: Array<{ agent_id: string; provider_id: string }>
  providerModules: Array<{ provider_id: string; module_id: string }>
}

export interface GroupedIntegration {
  provider_id: string
  agent_id: string
  module_id: string
  provider_name: string
  provider_code: string
  agent_name: string
  agent_code: string
  module_name: string
  module_code: string
  connections: OrganizationIntegration[]
}

export interface ApiResponse<T> {
  statusCode: number
  status: 'success' | 'error'
  data?: T
  message: string
}
