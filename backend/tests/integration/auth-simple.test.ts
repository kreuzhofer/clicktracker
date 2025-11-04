import request from 'supertest';
import app from '../../src/index';
import { TestHelpers } from '../helpers/testHelpers';

describe('Authentication API Integration Tests', () => {
  describe('POST /api/auth/register', () => {
    const validUserData = {
      email: 'register@example.com',
      password: 'RegisterPassword123!',
      first_name: 'Register',
      last_name: 'User'
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      TestHelpers.expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user.first_name).toBe(validUserData.first_name);
      expect(response.body.data.user.last_name).toBe(validUserData.last_name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response);
      expect(Array.isArray(response.body.details)).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          email: 'invalid-email'
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
      expect(response.body.details.some((d: any) => d.field === 'email')).toBe(true);
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          ...validUserData,
          password: 'weak'
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'password');
      expect(response.body.details.some((d: any) => d.field === 'password')).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      email: 'login@example.com',
      password: 'LoginPassword123!',
      first_name: 'Login',
      last_name: 'User'
    };

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
      expect(response.body.details.some((d: any) => d.field === 'email')).toBe(true);
      expect(response.body.details.some((d: any) => d.field === 'password')).toBe(true);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: userData.password
        })
        .expect(400);

      TestHelpers.expectValidationError(response, 'email');
      expect(response.body.details.some((d: any) => d.field === 'email')).toBe(true);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;
    let userData: any;

    beforeEach(async () => {
      userData = {
        email: 'profile@example.com',
        password: 'ProfilePassword123!',
        first_name: 'Profile',
        last_name: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);
      
      authToken = response.body.data.token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      TestHelpers.expectSuccessResponse(response);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.first_name).toBe(userData.first_name);
      expect(response.body.data.user.last_name).toBe(userData.last_name);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      TestHelpers.expectErrorResponse(response, 'Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      TestHelpers.expectErrorResponse(response, 'Invalid or expired token');
    });
  });
});