# Development Standards for Campaign Click Tracker

## 🚨 CRITICAL GUIDELINES - MUST FOLLOW

These standards were established after resolving test isolation issues and API inconsistencies. **All future development MUST adhere to these guidelines.**

## API Development Standards

### 1. Standardized Response Format
**MANDATORY**: All API endpoints must use this exact response format:

```javascript
// ✅ SUCCESS Response
{
  "success": true,
  "data": { /* actual response data */ },
  "message": "Optional success message",
  "meta": { /* pagination, counts, etc. */ }
}

// ✅ ERROR Response  
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": { /* validation errors, field-specific errors */ }
}
```

### 2. Authentication Standards
- Use consistent JWT token validation
- Return standardized error messages for auth failures
- Implement proper token expiration handling

### 3. Input Validation
- Use Joi schemas for all request validation
- Return detailed validation errors in standardized format
- Validate UUIDs, emails, URLs consistently

## Testing Standards

### 🔥 Test Isolation Rules (CRITICAL)

**NEVER share state between tests.** This causes flaky tests and debugging nightmares.

#### ✅ CORRECT: Isolated Test Context
```javascript
describe('API Tests', () => {
  async function createTestContext() {
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substr(2, 9);
    
    const user = await createTestUser({
      email: `test-${timestamp}-${randomId}@example.com`
    });
    
    const authToken = await loginTestUser(user.email);
    
    const campaign = await createTestCampaign({
      name: `Campaign-${timestamp}-${randomId}`
    });
    
    return { authToken, campaign, user };
  }
  
  it('should work correctly', async () => {
    const { authToken, campaign } = await createTestContext();
    // Test uses its own isolated data
  });
});
```

#### ❌ INCORRECT: Shared State
```javascript
describe('API Tests', () => {
  let sharedAuthToken; // DON'T DO THIS
  let sharedCampaign;  // DON'T DO THIS
  
  beforeAll(async () => {
    // This creates shared state that breaks test isolation
    sharedAuthToken = await createAuthToken();
  });
});
```

### Database Testing Standards

#### Recommended: Transaction Rollbacks
```javascript
beforeEach(async () => {
  await db.query('BEGIN');
});

afterEach(async () => {
  await db.query('ROLLBACK');
});
```

#### Alternative: Unique Test Data
```javascript
const createUniqueTestData = () => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  return {
    email: `test-${timestamp}-${randomId}@example.com`,
    campaignName: `Campaign-${timestamp}-${randomId}`,
    // Always unique, never conflicts
  };
};
```

### Error Handling in Tests
```javascript
// ✅ CORRECT: Detailed error information
if (response.status !== 201) {
  throw new Error(
    `API call failed: ${response.status} - ${JSON.stringify(response.body)}`
  );
}

// ❌ INCORRECT: Generic assertions
expect(response.status).toBe(201); // Doesn't show what went wrong
```

## Code Quality Checklist

### Before Committing Code
- [ ] **API Response Format**: Does it follow the standardized format?
- [ ] **Error Handling**: Are all error cases handled properly?
- [ ] **Input Validation**: Is Joi validation implemented?
- [ ] **Test Isolation**: Do tests create their own data?
- [ ] **TypeScript**: Are interfaces properly defined?
- [ ] **Documentation**: Are complex functions documented?

### Before Merging PR
- [ ] **All Tests Pass**: Unit and integration tests pass consistently
- [ ] **No Shared State**: Tests don't rely on shared variables
- [ ] **Performance**: No obvious performance regressions
- [ ] **Security**: Input validation and auth checks in place
- [ ] **Backwards Compatibility**: API changes don't break existing clients

## Common Anti-Patterns to Avoid

### ❌ DON'T: Share Test State
```javascript
let globalAuthToken; // Causes test failures
let globalCampaign;  // Creates dependencies between tests
```

### ❌ DON'T: Inconsistent API Responses
```javascript
// Some endpoints return data directly
return res.json(campaign);

// Others return it in a data wrapper  
return res.json({ data: campaign });

// This inconsistency causes client-side bugs
```

### ❌ DON'T: Generic Error Messages
```javascript
res.status(500).json({ error: 'Something went wrong' });
// Should be specific and actionable
```

### ❌ DON'T: Skip Input Validation
```javascript
// Always validate inputs
const { campaignId } = req.params; // What if it's not a valid UUID?
```

## Debugging Guidelines

### When Tests Fail
1. **Check for shared state** - Are tests using global variables?
2. **Verify test isolation** - Does each test create its own data?
3. **Check API response format** - Is the response structure what the test expects?
4. **Look for timing issues** - Are async operations properly awaited?

### When APIs Fail
1. **Check request validation** - Is input properly validated?
2. **Verify response format** - Does it match the standard format?
3. **Check error handling** - Are errors properly caught and formatted?
4. **Verify authentication** - Is the JWT token valid and not expired?

## Future Development Priorities

### Immediate (Next Sprint)
1. Standardize all existing API responses
2. Add transaction rollbacks to integration tests
3. Create test data factories for consistent setup

### Short-term (Next Month)
1. Implement comprehensive API documentation
2. Add performance benchmarks for critical endpoints
3. Set up automated testing in CI/CD

### Long-term (Next Quarter)
1. Add structured logging with correlation IDs
2. Implement comprehensive monitoring and alerting
3. Consider microservices architecture for scalability

---

## 📋 Quick Reference

### Test Context Template
```javascript
async function createTestContext() {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const user = await createTestUser({
    email: `test-${id}@example.com`,
    password: 'TestPassword123!'
  });
  
  const authToken = await loginTestUser(user.email, user.password);
  
  const campaign = await createTestCampaign({
    name: `Test Campaign ${id}`
  });
  
  return { authToken, campaign, user };
}
```

### API Response Template
```javascript
// Success
res.status(200).json({
  success: true,
  data: result,
  message: 'Operation completed successfully'
});

// Error
res.status(400).json({
  success: false,
  error: 'VALIDATION_ERROR',
  message: 'Invalid input provided',
  details: validationErrors
});
```

**Remember**: These standards exist because we've learned from past issues. Following them prevents bugs, reduces debugging time, and ensures system reliability.