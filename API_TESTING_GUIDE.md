# Integration APIs Testing Guide

This guide provides step-by-step instructions to test all the newly created integration APIs.

## Prerequisites

1. **Dev Server Running**
   ```bash
   npm run dev
   ```
   The server typically runs on `http://localhost:3000`

2. **Valid JWT Token**
   - Get a valid JWT token from your authentication system
   - Include it in all requests with: `Authorization: Bearer YOUR_TOKEN`

3. **Database Access**
   - Ensure the PostgreSQL database is accessible
   - The tables `integration_providers`, `integration_modules`, `integration_agents`, `organization_integrations`, and `hrms_integration` must exist

## Testing Tools

Choose one of the following tools:

### Option 1: cURL (Command Line)
```bash
curl -X GET http://localhost:3000/api/integration-providers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Option 2: Postman
1. Open Postman
2. Create a new request
3. Set method to GET/POST/PUT/DELETE
4. Enter URL: `http://localhost:3000/api/integration-providers`
5. Go to Headers tab
6. Add header: `Authorization: Bearer YOUR_JWT_TOKEN`
7. Click Send

### Option 3: Thunder Client (VS Code)
1. Install Thunder Client extension
2. Create a new request
3. Set method and URL
4. Add Authorization header
5. Send request

## Test Cases

### 1. Master Data Endpoints (Read-Only)

#### Test 1.1: Get Integration Providers
```
Method: GET
URL: http://localhost:3000/api/integration-providers
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains array of providers with id, name, code, description, is_active
```

#### Test 1.2: Get Integration Modules
```
Method: GET
URL: http://localhost:3000/api/integration-modules
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains array of modules with id, name, code
```

#### Test 1.3: Get Integration Agents
```
Method: GET
URL: http://localhost:3000/api/integration-agents
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains array of agents with id, name, code
```

#### Test 1.4: Test Authentication Failure
```
Method: GET
URL: http://localhost:3000/api/integration-providers
Headers: (none)

Expected Response:
- Status: 401
- Message: "Unauthorized: No token provided"
```

### 2. Organization Integrations - List Operations

#### Test 2.1: Get All Organization Integrations
```
Method: GET
URL: http://localhost:3000/api/organization-integrations
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains array of integrations (may be empty initially)
```

#### Test 2.2: Get Integrations with Filter - By Status
```
Method: GET
URL: http://localhost:3000/api/organization-integrations?status=active
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains only integrations with status='active'
```

#### Test 2.3: Get Integrations with Filter - By Provider
```
Method: GET
URL: http://localhost:3000/api/organization-integrations?provider_id=<PROVIDER_UUID>
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains only integrations for specified provider
```

### 3. Organization Integrations - Create Operation

#### Test 3.1: Create New Integration
```
Method: POST
URL: http://localhost:3000/api/organization-integrations
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "provider_id": "<PROVIDER_UUID_FROM_TEST_1.1>",
  "agent_id": "<AGENT_UUID_FROM_TEST_1.3>",
  "module_id": "<MODULE_UUID_FROM_TEST_1.2>",
  "connection_name": "Test Integration",
  "client_id": "test_client_123",
  "client_secret": "test_secret_456",
  "api_key": "test_api_key_789",
  "access_token": "test_access_token",
  "refresh_token": "test_refresh_token",
  "token_expiry": "2025-12-31T00:00:00Z",
  "base_url": "https://api.example.com",
  "login_url": "https://example.com/login",
  "status": "active"
}

Expected Response:
- Status: 201
- Contains: { "statusCode": 201, "status": "success", "data": { "id": "uuid" } }
```

**Note:** Save the returned `id` for subsequent tests.

#### Test 3.2: Create Integration with HRMS Sync
```
Method: POST
URL: http://localhost:3000/api/organization-integrations
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "provider_id": "<HRMS_PROVIDER_UUID>",
  "agent_id": "<AGENT_UUID>",
  "module_id": "<MODULE_UUID>",
  "connection_name": "HRMS Integration",
  "client_id": "hrms_client",
  "client_secret": "hrms_secret",
  "api_key": "hrms_api_key",
  "access_token": "hrms_access_token",
  "base_url": "https://hrms.example.com",
  "is_hrms": true,
  "hrms_system": "SAP",
  "metadata_json": {
    "custom_field": "custom_value"
  },
  "status": "active"
}

Expected Response:
- Status: 201
- Should create records in both organization_integrations AND hrms_integration
```

#### Test 3.3: Create Integration - Missing Required Field
```
Method: POST
URL: http://localhost:3000/api/organization-integrations
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "provider_id": "<PROVIDER_UUID>",
  "agent_id": "<AGENT_UUID>",
  "module_id": "<MODULE_UUID>",
  "connection_name": "Test"
  /* Missing: client_id, client_secret, api_key, access_token */
}

Expected Response:
- Status: 400
- Message: "Missing required field: client_id"
```

#### Test 3.4: Create Integration - Invalid Provider
```
Method: POST
URL: http://localhost:3000/api/organization-integrations
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "provider_id": "00000000-0000-0000-0000-000000000000",
  "agent_id": "<AGENT_UUID>",
  "module_id": "<MODULE_UUID>",
  "connection_name": "Test",
  "client_id": "test",
  "client_secret": "test",
  "api_key": "test",
  "access_token": "test"
}

Expected Response:
- Status: 404
- Message: "Provider not found"
```

### 4. Organization Integrations - Read Single

#### Test 4.1: Get Specific Integration
```
Method: GET
URL: http://localhost:3000/api/organization-integrations/<INTEGRATION_ID_FROM_TEST_3.1>
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Contains complete integration object with all details and related data
```

#### Test 4.2: Get Non-Existent Integration
```
Method: GET
URL: http://localhost:3000/api/organization-integrations/00000000-0000-0000-0000-000000000000
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 404
- Message: "Integration not found"
```

### 5. Organization Integrations - Update Operation

#### Test 5.1: Update Integration
```
Method: PUT
URL: http://localhost:3000/api/organization-integrations/<INTEGRATION_ID_FROM_TEST_3.1>
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body:
{
  "connection_name": "Updated Integration Name",
  "access_token": "new_access_token",
  "client_secret": "new_secret",
  "api_key": "new_api_key",
  "client_id": "updated_client_id",
  "status": "inactive"
}

Expected Response:
- Status: 200
- Message: "Organization integration updated successfully"
```

#### Test 5.2: Update Non-Existent Integration
```
Method: PUT
URL: http://localhost:3000/api/organization-integrations/00000000-0000-0000-0000-000000000000
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
  Content-Type: application/json

Body: { ... }

Expected Response:
- Status: 404
- Message: "Integration not found"
```

### 6. Organization Integrations - Delete Operation

#### Test 6.1: Delete Integration
```
Method: DELETE
URL: http://localhost:3000/api/organization-integrations/<INTEGRATION_ID_FROM_TEST_3.1>
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 200
- Message: "Organization integration deleted successfully"
```

#### Test 6.2: Verify Deletion
```
Method: GET
URL: http://localhost:3000/api/organization-integrations/<INTEGRATION_ID_FROM_TEST_3.1>
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 404
- Message: "Integration not found"
```

#### Test 6.3: Delete Non-Existent Integration
```
Method: DELETE
URL: http://localhost:3000/api/organization-integrations/00000000-0000-0000-0000-000000000000
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN

Expected Response:
- Status: 404
- Message: "Integration not found"
```

### 7. HRMS Sync Verification Tests

#### Test 7.1: Verify HRMS Record Creation
After creating an integration with `is_hrms: true`, verify that a record exists in `hrms_integration` table:

```sql
SELECT * FROM public.hrms_integration 
WHERE organization_id = 'YOUR_ORG_ID' 
AND hrms_system = 'SAP';
```

Expected: Record should exist with synced data.

#### Test 7.2: Verify Metadata Storage
For fields not in hrms_integration, check metadata:

```sql
SELECT metadata_json FROM public.hrms_integration 
WHERE organization_id = 'YOUR_ORG_ID';
```

Expected: Should contain fields like `provider_id`, `agent_id`, `module_id`, `api_key`, `login_url`.

#### Test 7.3: Verify HRMS Record Deletion
After deleting an HRMS integration, verify it's removed from hrms_integration:

```sql
SELECT COUNT(*) FROM public.hrms_integration 
WHERE organization_id = 'YOUR_ORG_ID' 
AND hrms_system = 'SAP';
```

Expected: Count should be 0.

## Error Response Examples

All errors follow this format:

```json
{
  "statusCode": <HTTP_CODE>,
  "status": "error",
  "message": "Error description"
}
```

Common Errors:
- `401 Unauthorized` - Missing or invalid JWT token
- `400 Bad Request` - Missing required fields
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Database or server error

## Performance Considerations

- List endpoints support filtering to reduce data transfer
- Pagination can be added if needed (not currently implemented)
- Metadata is returned as JSON object - keep it reasonably sized

## Security Notes

1. **Never expose sensitive data in logs:**
   - client_secret
   - access_token
   - refresh_token

2. **Always use HTTPS in production**

3. **JWT tokens should have:**
   - Reasonable expiration time
   - Proper signing algorithm
   - Validated issuer

4. **Database credentials:**
   - Use environment variables
   - Never commit secrets to repository

## Troubleshooting

### Issue: 401 Unauthorized on all requests
- **Solution:** Verify JWT token is valid and not expired
- Check token format: `Authorization: Bearer <TOKEN>`

### Issue: 404 Not Found for valid ID
- **Solution:** Verify the ID exists in your organization
- Check if user is authenticated with correct org_id

### Issue: 500 Internal Server Error
- **Solution:** Check server logs for database connection issues
- Verify database tables exist and are properly structured
- Ensure DATABASE_URL environment variable is set

### Issue: Foreign Key Constraint Violation
- **Solution:** Ensure provider_id, agent_id, and module_id are valid UUIDs
- Run test 1.1, 1.2, 1.3 first to get valid IDs

## Next Steps

1. Run all test cases in order
2. Check server logs for any errors
3. Review database records to verify data integrity
4. Add to Postman collection for team use
5. Consider adding pagination for list endpoints
6. Add rate limiting for production deployment
