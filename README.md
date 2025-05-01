# Ride Booking API

A backend API service for a ride-booking platform, managing users (riders/admins), drivers, and ride requests. Built with Node.js, Express, TypeScript, and PostgreSQL.

## Features

*   **User Management:** User registration (rider/admin roles), JWT-based authentication.
*   **Driver Management:** Driver registration, JWT-based authentication, profile management (get, update, delete), status updates (online, offline, busy).
*   **Ride Management:**
    *   Riders can request rides.
    *   Riders can view their ride history.
    *   Riders can cancel their requested/in-progress rides.
    *   Drivers can accept available ride requests.
*   **Admin:** View all drivers (requires 'admin' role).
*   **Security:** Password hashing (Argon2), JWT authentication, rate limiting on login endpoints.
*   **Validation:** Request validation using Joi schemas.
*   **Standardized Responses:** Consistent JSON response format for success and errors.

## Tech Stack

*   **Backend:** Node.js, Express.js
*   **Language:** TypeScript
*   **Database:** PostgreSQL
*   **ORM:** Sequelize
*   **Authentication:** JSON Web Tokens (JWT) (`jsonwebtoken`)
*   **Password Hashing:** Argon2 (`argon2`)
*   **Validation:** Joi
*   **Linting:** ESLint with TypeScript plugin
*   **Environment Variables:** `dotenv`

## Project Structure

```
├── apps/                 # Core application modules (auth, drivers, riders)
│   ├── auth/
│   │   ├── data-access/
│   │   ├── domain/       # Service layer (business logic)
│   │   └── entry-points/ # API controllers
│   ├── drivers/
│   └── riders/
├── config/               # Configuration files (database.ts)
├── libraries/            # Reusable libraries (auth, responses, validators)
├── middleware/           # Express middleware (errorHandler, authMiddleware)
├── migrations/           # Database migration files (manual currently)
├── models/               # Sequelize model definitions and TS types
├── scripts/              # Utility scripts (manual migration runner - use with caution)
├── dist/                 # Compiled JavaScript output (from tsc)
├── node_modules/         # Project dependencies
├── .env.example          # Example environment variables file
├── .eslintrc.cjs         # ESLint configuration
├── .gitignore            # Git ignore file
├── index.ts              # Main application entry point
├── package.json
├── package-lock.json
├── README.md             # This file
└── tsconfig.json         # TypeScript configuration
```

## Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn
*   PostgreSQL Server

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd ride-booking-api
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up PostgreSQL Database:**
    *   Ensure PostgreSQL is running.
    *   Create a database (e.g., `ride_booking_db`).
    *   Create a database user (e.g., `api_admin`) with a password and grant necessary privileges (CONNECT, USAGE on database; CREATE, USAGE on schema `public`).

4.  **Configure Environment Variables:**
    *   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    *   Edit the `.env` file and replace the placeholder values with your actual configuration:
        ```dotenv
        # .env file

        # PostgreSQL Database Configuration
        DB_HOST=localhost
        DB_PORT=5432 # Or your specific PostgreSQL port
        DB_NAME=ride_booking_db # Your database name
        DB_USER=your_db_user # Your database username
        DB_PASSWORD=your_db_password # Your database password

        # Server Configuration
        PORT=3000 # Optional - The port the server will run on

        # JWT Configuration
        JWT_SECRET=replace_this_with_a_long_random_secure_string # Use a strong, secret key

        # Node Environment (optional - defaults to development)
        # NODE_ENV=development
        ```
    *   **Important:** Add `.env` to your `.gitignore` file if it's not already there to avoid committing secrets.

5.  **Build the project:**
    ```bash
    npm run build
    ```

6.  **Run Database Migrations:**
    *   **Current Method (Manual Script - Use with Caution):** The project currently includes a *manual* script to run the initial schema migration. This script lacks proper tracking and is not recommended for continuous development or production. **Drop existing tables (`rides`, `drivers`, `users`) and potentially related ENUM types if you encounter errors.**
        ```bash
        # Make sure you have built the project first (npm run build)
        node dist/scripts/run-migrations.js
        ```
    *   **Recommended Method (Future):** Set up `sequelize-cli` for robust migration management (`npx sequelize-cli db:migrate`). See TODOs.

7.  **Start the server:**
    ```bash
    npm start
    ```
    The server should start on the port specified in your `.env` file (default 3000).

## API Endpoints

The API provides endpoints for managing authentication, riders, and drivers. Please refer to the detailed documentation generated previously or use a tool like Postman with the following structure:

*   **Auth:** `POST /auth/register`, `POST /auth/login`
*   **Rider:** `POST /rider/request-ride`, `GET /rider/rides`, `POST /rider/cancel-ride` (Requires Auth)
*   **Driver:** `POST /driver/register`, `POST /driver/login`, `GET /driver/profile`, `PUT /driver/profile`, `DELETE /driver/account`, `PUT /driver/status`, `POST /driver/accept-ride`, `GET /driver/all` (Admin Only)

See the previously generated detailed documentation for request/response bodies and status codes.

## Available Scripts

*   `npm start`: Starts the application using the compiled code in `dist/`.
*   `npm run build`: Compiles the TypeScript code to JavaScript in the `dist/` directory.
*   `npm run lint`: Runs ESLint to check for code style issues and potential errors.
*   `npm run type-check`: Runs the TypeScript compiler to check for type errors without emitting files.
*   `node dist/scripts/run-migrations.js`: (Manual) Executes the initial schema migration (requires build).

## Configuration

Application configuration (database credentials, JWT secret, port) is managed through environment variables loaded from a `.env` file using `dotenv`.

## Security

*   **Authentication:** Handled via JWT.
*   **Authorization:** Basic Role-Based Access Control (RBAC) implemented for admin endpoints.
*   **Password Hashing:** Uses Argon2 for securely hashing passwords.
*   **Rate Limiting:** Applied to login endpoints to prevent brute-force attacks.

## Linting & Formatting

ESLint is configured for code quality and consistency. Run `npm run lint` to check the codebase.

## TODOs / Future Work

*   **Logging:** Implement a structured logging library (e.g., Winston, Pino) instead of `console.log`/`console.error`.
*   **Database Migrations:** Replace the manual migration script and remove `sequelize.sync()` entirely by setting up and using `sequelize-cli` for reliable schema management.
*   **Testing:** Implement comprehensive unit tests (for services, utilities) and integration tests (for API endpoints).
*   **Fare Calculation:** Implement actual logic for `calculateFare` (likely involving external services).
*   **Driver Assignment Logic:** Refine the driver availability/assignment flow in `requestRide`.
*   **Authorization:** Enhance RBAC, potentially add permission checks for other routes.
*   **Configuration Management:** Improve loading and validation of environment variables.
*   **Error Handling:** Consider more specific error wrapping in data access layers.
*   **Geospatial Data:** Use proper geospatial data types for locations if needed for distance calculations or radius searches.

## License

ISC (Based on `package.json`)
