import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, CreateUserRequest, LoginRequest, AuthResponse, JWTPayload } from '../types';
import Database from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  private db: Database;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor() {
    this.db = Database.getInstance();
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
  }

  async register(userData: CreateUserRequest): Promise<AuthResponse> {
    const { email, password, first_name, last_name } = userData;

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = uuidv4();
    const query = `
      INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, first_name, last_name, created_at, updated_at
    `;

    const result = await this.db.query(query, [userId, email, password_hash, first_name, last_name]);
    const user = result.rows[0];

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    };
  }

  async login(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user.id, user.email);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    };
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.db.query(query, [email]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  generateToken(userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      jti: uuidv4() // Unique identifier for each token
    };

    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as jwt.SignOptions);
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async refreshToken(token: string): Promise<string> {
    const payload = this.verifyToken(token);
    
    // Verify user still exists
    const user = await this.findUserById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate new token
    return this.generateToken(user.id, user.email);
  }
}