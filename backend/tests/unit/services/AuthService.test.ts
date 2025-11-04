import { AuthService } from '../../../src/services/AuthService';
import Database from '../../../src/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('AuthService Unit Tests', () => {
  let authService: AuthService;
  let db: Database;

  beforeEach(() => {
    authService = new AuthService();
    db = Database.getInstance();
  });

  describe('register', () => {
    const validUserData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      first_name: 'Test',
      last_name: 'User'
    };

    it('should register a new user successfully', async () => {
      const result = await authService.register(validUserData);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(validUserData.email);
      expect(result.user.first_name).toBe(validUserData.first_name);
      expect(result.user.last_name).toBe(validUserData.last_name);
      expect(typeof result.token).toBe('string');
    });

    it('should hash the password before storing', async () => {
      await authService.register(validUserData);

      const user = await authService.findUserByEmail(validUserData.email);
      expect(user).not.toBeNull();
      expect(user!.password_hash).not.toBe(validUserData.password);
      
      // Verify password is properly hashed
      const isValidHash = await bcrypt.compare(validUserData.password, user!.password_hash);
      expect(isValidHash).toBe(true);
    });

    it('should throw error for duplicate email', async () => {
      await authService.register(validUserData);

      await expect(authService.register(validUserData))
        .rejects.toThrow('User already exists with this email');
    });

    it('should generate valid JWT token', async () => {
      const result = await authService.register(validUserData);
      
      const decoded = jwt.verify(result.token, process.env.JWT_SECRET!) as any;
      expect(decoded).toHaveProperty('userId');
      expect(decoded).toHaveProperty('email');
      expect(decoded.email).toBe(validUserData.email);
    });
  });

  describe('login', () => {
    const userData = {
      email: 'login@example.com',
      password: 'LoginPassword123!',
      first_name: 'Login',
      last_name: 'User'
    };

    beforeEach(async () => {
      await authService.register(userData);
    });

    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: userData.email,
        password: userData.password
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(userData.email);
      expect(typeof result.token).toBe('string');
    });

    it('should throw error for invalid email', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: userData.password
      })).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      await expect(authService.login({
        email: userData.email,
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid email or password');
    });

    it('should generate different tokens for each login', async () => {
      const result1 = await authService.login({
        email: userData.email,
        password: userData.password
      });

      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result2 = await authService.login({
        email: userData.email,
        password: userData.password
      });

      expect(result1.token).not.toBe(result2.token);
    });
  });

  describe('findUserByEmail', () => {
    const userData = {
      email: 'find@example.com',
      password: 'FindPassword123!',
      first_name: 'Find',
      last_name: 'User'
    };

    beforeEach(async () => {
      await authService.register(userData);
    });

    it('should find existing user by email', async () => {
      const user = await authService.findUserByEmail(userData.email);

      expect(user).not.toBeNull();
      expect(user!.email).toBe(userData.email);
      expect(user!.first_name).toBe(userData.first_name);
      expect(user!.last_name).toBe(userData.last_name);
    });

    it('should return null for non-existent email', async () => {
      const user = await authService.findUserByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });

    it('should be case sensitive', async () => {
      const user = await authService.findUserByEmail(userData.email.toUpperCase());
      expect(user).toBeNull();
    });
  });

  describe('findUserById', () => {
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'findbyid@example.com',
        password: 'FindById123!',
        first_name: 'FindById',
        last_name: 'User'
      });
      userId = result.user.id;
    });

    it('should find existing user by ID', async () => {
      const user = await authService.findUserById(userId);

      expect(user).not.toBeNull();
      expect(user!.id).toBe(userId);
      expect(user!.email).toBe('findbyid@example.com');
    });

    it('should return null for non-existent ID', async () => {
      const user = await authService.findUserById('00000000-0000-0000-0000-000000000000');
      expect(user).toBeNull();
    });
  });

  describe('verifyToken', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'token@example.com',
        password: 'TokenPassword123!',
        first_name: 'Token',
        last_name: 'User'
      });
      validToken = result.token;
      userId = result.user.id;
    });

    it('should verify valid token', () => {
      const payload = authService.verifyToken(validToken);

      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('email');
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe('token@example.com');
    });

    it('should throw error for invalid token', () => {
      expect(() => authService.verifyToken('invalid-token'))
        .toThrow('Invalid or expired token');
    });

    it('should throw error for expired token', () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId, email: 'token@example.com' },
        process.env.JWT_SECRET!,
        { expiresIn: '-1h' }
      );

      expect(() => authService.verifyToken(expiredToken))
        .toThrow('Invalid or expired token');
    });
  });

  describe('refreshToken', () => {
    let validToken: string;
    let userId: string;

    beforeEach(async () => {
      const result = await authService.register({
        email: 'refresh@example.com',
        password: 'RefreshPassword123!',
        first_name: 'Refresh',
        last_name: 'User'
      });
      validToken = result.token;
      userId = result.user.id;
    });

    it('should generate new token for valid token', async () => {
      // Wait a moment to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newToken = await authService.refreshToken(validToken);

      expect(typeof newToken).toBe('string');
      expect(newToken).not.toBe(validToken);

      // Verify new token is valid
      const payload = authService.verifyToken(newToken);
      expect(payload.userId).toBe(userId);
    });

    it('should throw error for invalid token', async () => {
      await expect(authService.refreshToken('invalid-token'))
        .rejects.toThrow('Invalid or expired token');
    });

    it('should throw error if user no longer exists', async () => {
      // Delete the user
      await db.query('DELETE FROM users WHERE id = $1', [userId]);

      await expect(authService.refreshToken(validToken))
        .rejects.toThrow('User not found');
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const email = 'generate@example.com';

      const token = authService.generateToken(userId, email);

      expect(typeof token).toBe('string');

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
    });

    it('should generate different tokens for different users', () => {
      const token1 = authService.generateToken('user1', 'user1@example.com');
      const token2 = authService.generateToken('user2', 'user2@example.com');

      expect(token1).not.toBe(token2);
    });
  });
});