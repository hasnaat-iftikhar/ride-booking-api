import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import supertest from 'supertest';
import { app, sequelize } from '../../index'; // Assuming app and sequelize are exported from root index.ts
import { User } from '../../models'; // Assuming User model is exported for cleanup

const request = supertest(app);

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    // Ensure the database is synced before running tests.
    // In a real-world scenario, you might use a separate test database and run migrations.
    await sequelize.sync({ force: true }); // This will drop and recreate tables
  });

  beforeEach(async () => {
    // Clean up the users table before each test to ensure test isolation
    await User.destroy({ truncate: true, cascade: true });
  });

  afterAll(async () => {
    // Close the database connection after all tests are done
    await sequelize.close();
  });

  describe('POST /auth/register', () => {
    const validUserData = {
      name: 'Integration Test User',
      email: 'integration.test@example.com',
      phone_number: '1234567890',
      password: 'Password123!',
    };

    it('should register a new user successfully and return 201 status with user data (excluding password)', async () => {
      const response = await request
        .post('/api/v1/auth/register') // Assuming a base path like /api/v1
        .send(validUserData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('user_id');
      expect(response.body.user.email).toBe(validUserData.email);
      expect(response.body.user.name).toBe(validUserData.name);
      expect(response.body.user).not.toHaveProperty('password');
      // TODO: Add token check if registration also logs in the user
    });

    it('should return 409 status if attempting to register with an email that already exists', async () => {
      // First, register the user
      await request.post('/api/v1/auth/register').send(validUserData);

      // Then, attempt to register again with the same email
      const response = await request
        .post('/api/v1/auth/register')
        .send(validUserData);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('User with this email already exists');
    });

    it('should return 400 status for missing required fields (e.g., email)', async () => {
      const { email, ...incompleteUserData } = validUserData;
      const response = await request
        .post('/api/v1/auth/register')
        .send(incompleteUserData);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      // The exact error message will depend on your validation middleware,
      // which we'll add/test more thoroughly later.
      // For now, we check that an error is indeed returned.
      expect(response.body.error.message).toBeDefined(); 
    });

    it('should return 400 status for invalid email format', async () => {
        const invalidEmailUserData = { ...validUserData, email: 'invalid-email' };
        const response = await request
          .post('/api/v1/auth/register')
          .send(invalidEmailUserData);
        
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        // Message depends on validation (Joi or other)
        expect(response.body.error.message).toBeDefined(); 
    });

    // Add more tests for other invalid inputs (e.g., short password, invalid phone)
    // once validation rules are more clearly defined and implemented at controller/middleware level.
  });

  describe('POST /auth/login', () => {
    const userData = {
      name: 'Login Test User',
      email: 'login.test@example.com',
      phone_number: '0987654321',
      password: 'StrongPassword123!',
    };

    beforeEach(async () => {
      // Ensure the user is registered before each login test
      // The User table is truncated before each test in the parent describe's beforeEach,
      // so we re-register here.
      await request.post('/api/v1/auth/register').send(userData);
    });

    it('should login an existing user successfully and return 200 status with user data and token', async () => {
      const loginCredentials = {
        email: userData.email,
        password: userData.password,
      };

      const response = await request
        .post('/api/v1/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
    });

    it('should return 401 status for login with incorrect password', async () => {
      const loginCredentials = {
        email: userData.email,
        password: 'WrongPassword123!',
      };

      const response = await request
        .post('/api/v1/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Invalid email or password');
    });

    it('should return 401 status for login with a non-existent email', async () => {
      const loginCredentials = {
        email: 'nonexistent.user@example.com',
        password: userData.password,
      };

      const response = await request
        .post('/api/v1/auth/login')
        .send(loginCredentials);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Invalid email or password'); 
      // Service might return 404 or specific "user not found" if desired,
      // but 401 is common for login to avoid revealing if email exists.
    });

    it('should return 400 status for missing email in login request', async () => {
      const loginCredentials = { password: userData.password }; 
      const response = await request
        .post('/api/v1/auth/login')
        .send(loginCredentials);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBeDefined(); // Exact message depends on validation
    });

    it('should return 400 status for missing password in login request', async () => {
      const loginCredentials = { email: userData.email };
      const response = await request
        .post('/api/v1/auth/login')
        .send(loginCredentials);
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBeDefined(); // Exact message depends on validation
    });
  });
}); 