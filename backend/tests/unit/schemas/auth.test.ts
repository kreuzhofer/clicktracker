import { registerSchema, loginSchema, refreshTokenSchema } from '../../../src/schemas/auth';

describe('Auth Schema Validation Tests', () => {
  describe('registerSchema', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      first_name: 'John',
      last_name: 'Doe'
    };

    it('should validate correct registration data', () => {
      const { error, value } = registerSchema.validate(validRegisterData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validRegisterData);
    });

    it('should require email field', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        email: undefined
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['email']);
    });

    it('should validate email format', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        email: 'invalid-email'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['email']);
      expect(error?.details[0].message).toContain('valid email');
    });

    it('should require password field', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: undefined
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['password']);
    });

    it('should validate password strength', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: 'weak'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['password']);
    });

    it('should require password with uppercase, lowercase, number, and special character', () => {
      const testCases = [
        'lowercase123!',  // missing uppercase
        'UPPERCASE123!',  // missing lowercase
        'TestPassword!',  // missing number
        'TestPassword123' // missing special character
      ];

      testCases.forEach(password => {
        const { error } = registerSchema.validate({
          ...validRegisterData,
          password
        });
        
        expect(error).toBeDefined();
        expect(error?.details[0].path).toEqual(['password']);
      });
    });

    it('should require minimum password length', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        password: 'Test1!'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['password']);
      expect(error?.details[0].message).toContain('8 characters');
    });

    it('should require first_name field', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        first_name: undefined
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['first_name']);
    });

    it('should not allow empty first_name', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        first_name: ''
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['first_name']);
    });

    it('should limit first_name length', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        first_name: 'a'.repeat(51)
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['first_name']);
      expect(error?.details[0].message).toContain('50 characters');
    });

    it('should require last_name field', () => {
      const { error } = registerSchema.validate({
        ...validRegisterData,
        last_name: undefined
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['last_name']);
    });

    it('should trim whitespace from names', () => {
      const { error, value } = registerSchema.validate({
        ...validRegisterData,
        first_name: '  John  ',
        last_name: '  Doe  '
      });
      
      expect(error).toBeUndefined();
      expect(value.first_name).toBe('John');
      expect(value.last_name).toBe('Doe');
    });
  });

  describe('loginSchema', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'password123'
    };

    it('should validate correct login data', () => {
      const { error, value } = loginSchema.validate(validLoginData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(validLoginData);
    });

    it('should require email field', () => {
      const { error } = loginSchema.validate({
        password: 'password123'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['email']);
    });

    it('should validate email format', () => {
      const { error } = loginSchema.validate({
        email: 'invalid-email',
        password: 'password123'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['email']);
    });

    it('should require password field', () => {
      const { error } = loginSchema.validate({
        email: 'test@example.com'
      });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['password']);
    });

    it('should not validate password strength for login', () => {
      const { error } = loginSchema.validate({
        email: 'test@example.com',
        password: 'weak'
      });
      
      expect(error).toBeUndefined();
    });
  });

  describe('refreshTokenSchema', () => {
    it('should validate correct token data', () => {
      const tokenData = { token: 'valid-jwt-token' };
      const { error, value } = refreshTokenSchema.validate(tokenData);
      
      expect(error).toBeUndefined();
      expect(value).toEqual(tokenData);
    });

    it('should require token field', () => {
      const { error } = refreshTokenSchema.validate({});
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['token']);
    });

    it('should not allow empty token', () => {
      const { error } = refreshTokenSchema.validate({ token: '' });
      
      expect(error).toBeDefined();
      expect(error?.details[0].path).toEqual(['token']);
    });
  });
});