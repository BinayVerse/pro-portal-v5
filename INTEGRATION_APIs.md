# Integration Management APIs

This document outlines the newly created APIs for managing integration providers, modules, agents, and organization-specific integrations.

## Architecture Overview

The integration system consists of master data tables and organization-specific integration tables:

- **Master Data (Read-only):**
  - `integration_providers` - Provider configurations (Slack, Teams, WhatsApp, etc.)
  - `integration_modules` - Available modules
  - `integration_agents` - Available agents

- **Organization Data (Full CRUD):**
  - `organization_integrations` - Organization-specific integration configurations
  - `hrms_integration` - HRMS-specific integration details (synced with organization_integrations)

## API Endpoints

### 1. Master Data Endpoints (Read-Only)

#### GET /api/integration-providers
Fetch all active integration providers.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Provider Name",
      "code": "provider_code",
      "description": "Provider description",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Integration providers fetched successfully"
}
```

#### GET /api/integration-modules
Fetch all available integration modules.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Module Name",
      "code": "module_code",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Integration modules fetched successfully"
}
```

#### GET /api/integration-agents
Fetch all available integration agents.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "name": "Agent Name",
      "code": "agent_code",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "message": "Integration agents fetched successfully"
}
```

### 2. Organization Integrations Endpoints (Full CRUD)

#### GET /api/organization-integrations
Fetch all integrations for the authenticated user's organization.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Query Parameters:**
- `status` (optional) - Filter by status (active, inactive, expired, failed)
- `provider_id` (optional) - Filter by provider ID
- `agent_id` (optional) - Filter by agent ID
- `module_id` (optional) - Filter by module ID

**Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "data": [
    {
      "id": "uuid",
      "organization_id": "org_id",
      "provider_id": "uuid",
      "agent_id": "uuid",
      "module_id": "uuid",
      "connection_name": "My Integration",
      "client_id": "client_123",
      "api_key": "api_key_value",
      "access_token": "token_value",
      "refresh_token": "refresh_token_value",
      "token_expiry": "2024-12-31T00:00:00Z",
      "base_url": "https://api.example.com",
      "login_url": "https://example.com/login",
      "metadata_json": {},
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "provider_name": "Provider Name",
      "provider_code": "provider_code",
      "agent_name": "Agent Name",
      "agent_code": "agent_code",
      "module_name": "Module Name",
      "module_code": "module_code"
    }
  ],
  "message": "Organization integrations fetched successfully"
}
```

#### GET /api/organization-integrations/:id
Fetch a specific integration by ID.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
Same as GET /api/organization-integrations but for a single integration.

**Status Codes:**
- `200` - Success
- `404` - Integration not found

#### POST /api/organization-integrations
Create a new organization integration.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
```json
{
  "provider_id": "uuid (required)",
  "agent_id": "uuid (required)",
  "module_id": "uuid (required)",
  "connection_name": "string (required)",
  "client_id": "string (required)",
  "client_secret": "string (required)",
  "api_key": "string (required)",
  "access_token": "string (required)",
  "refresh_token": "string (optional)",
  "token_expiry": "timestamp (optional)",
  "base_url": "string (optional)",
  "login_url": "string (optional)",
  "metadata_json": "object (optional)",
  "status": "string (optional, default: 'active')",
  "hrms_system": "string (optional - for HRMS integrations)",
  "is_hrms": "boolean (optional)"
}
```

**Response:**
```json
{
  "statusCode": 201,
  "status": "success",
  "data": {
    "id": "uuid"
  },
  "message": "Organization integration created successfully"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Missing required fields
- `404` - Provider, Agent, or Module not found
- `401` - Unauthorized

#### PUT /api/organization-integrations/:id
Update an existing organization integration.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**Request Body:**
Same as POST request (all fields optional during update)

**Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Organization integration updated successfully"
}
```

**Status Codes:**
- `200` - Updated successfully
- `404` - Integration not found
- `401` - Unauthorized

#### DELETE /api/organization-integrations/:id
Delete an organization integration.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Organization integration deleted successfully"
}
```

**Status Codes:**
- `200` - Deleted successfully
- `404` - Integration not found
- `401` - Unauthorized

## Dual-Table Sync Logic

When creating, updating, or deleting organization integrations:

1. **Create/Update Operations:**
   - Primary operation is always performed on `organization_integrations` table
   - If the provider code is 'hrms' or `is_hrms` flag is true:
     - The operation is also synced to `hrms_integration` table
     - Fields that don't exist in `hrms_integration` are stored in `metadata_json`

2. **Delete Operations:**
   - Deletion from `organization_integrations` is primary
   - If it's an HRMS integration, the corresponding record in `hrms_integration` is also deleted

3. **View Operations:**
   - All views are served from `organization_integrations` table only
   - Metadata is included in the response

## Metadata Handling

Fields that exist in `organization_integrations` but not in `hrms_integration`:
- `provider_id`
- `agent_id`
- `module_id`
- `connection_name`
- `api_key`
- `login_url`

These fields are stored in the `metadata_json` field when syncing to the `hrms_integration` table.

## Error Handling

All endpoints follow consistent error response format:

```json
{
  "statusCode": <HTTP_STATUS_CODE>,
  "status": "error",
  "message": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request (missing or invalid fields)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

## Authentication

All endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <JWT_TOKEN>
```

The token is validated and the user's organization is automatically determined from the token.

## Database Transactions

Create, Update, and Delete operations use database transactions to ensure consistency between `organization_integrations` and `hrms_integration` tables. If any part of the operation fails, the entire transaction is rolled back.

## Created Files

### API Routes
- `server/api/integration-providers/index.get.ts` - GET providers
- `server/api/integration-modules/index.get.ts` - GET modules
- `server/api/integration-agents/index.get.ts` - GET agents
- `server/api/organization-integrations/index.get.ts` - GET all integrations
- `server/api/organization-integrations/index.post.ts` - CREATE integration
- `server/api/organization-integrations/[id].get.ts` - GET single integration
- `server/api/organization-integrations/[id].put.ts` - UPDATE integration
- `server/api/organization-integrations/[id].delete.ts` - DELETE integration

### Database Helpers
- Updated `server/utils/dbHelpers.ts` with:
  - `createOrganizationIntegration()` - Create with sync
  - `updateOrganizationIntegration()` - Update with sync
  - `deleteOrganizationIntegration()` - Delete with sync

## Testing

You can test these APIs using:

1. **cURL** - Command line HTTP client
2. **Postman** - API testing tool
3. **Thunder Client** - VS Code extension
4. **Insomnia** - REST client

Example cURL request:

```bash
curl -X GET http://localhost:3000/api/integration-providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Make sure the dev server is running before testing:

```bash
npm run dev
```
