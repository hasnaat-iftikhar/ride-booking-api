// jest.setup.js
console.log('Jest setup file loaded: Setting up mock environment variables for tests...');

// Set mock DB credentials ONLY if not already set (to allow .env.test to override for integration tests)
process.env.DB_HOST = process.env.DB_HOST || 'mock_db_host';
process.env.DB_PORT = process.env.DB_PORT || '0000'; // Dummy port
process.env.DB_NAME = process.env.DB_NAME || 'mock_db_name_for_tests';
process.env.DB_USER = process.env.DB_USER || 'mock_db_user';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'mock_db_password';

// Always set JWT_SECRET for tests if not present, as it's crucial for auth logic even in unit tests.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_tests_only';
// process.env.NODE_ENV = 'test'; // Jest sets this automatically

console.log('Mock environment variables potentially set (respecting existing ones).'); 