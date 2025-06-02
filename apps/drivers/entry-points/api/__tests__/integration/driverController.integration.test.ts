import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import supertest from 'supertest';
import { app, sequelize } from '../../../../../../index'; // Path to app and sequelize
import { User, Driver as DriverModel, Ride as RideModel } from '../../../../../../models'; // Path to models
import type { DriverCreationAttributes, DriverAttributes } from '../../../../../../models/types'; // Path to types

const request = supertest(app);

// Helper to get a driver token
async function getDriverToken(driverDetails?: Partial<DriverCreationAttributes>): Promise<string> {
    const defaultDriver: DriverCreationAttributes = {
        name: 'Integration Driver',
        email: 'driver.integration@example.com',
        phone_number: 'DRIVERPHONE1',
        license_number: 'DRVINT001',
        password: 'DriverPass123!',
    };
    const currentDriver = { ...defaultDriver, ...(driverDetails || {}) };

    // Ensure driver with this email is cleaned up if exists from a previous failed run
    await DriverModel.destroy({ where: { email: currentDriver.email }, force: true });
    // Also destroy from User table if drivers are also users (based on your setup, assuming they might be for auth)
    await User.destroy({ where: { email: currentDriver.email }, force: true });

    const registerResponse = await request.post('/api/v1/drivers/register').send(currentDriver);
    if (registerResponse.status !== 201 && registerResponse.status !== 409) { // Allow 409 if already exists for some reason, login will fail later if wrong pass
        console.error('Driver registration for token failed:', registerResponse.body);
        throw new Error(`Failed to register driver for token: ${registerResponse.body?.error?.message || 'Unknown error'}`);
    }
    // If it was 409, it means the driver might exist from a previous test run that wasn't cleaned properly.
    // We proceed to login, if login fails, the test will fail, which is the desired outcome.

    const loginResponse = await request.post('/api/v1/drivers/login').send({
        email: currentDriver.email,
        password: currentDriver.password,
    });

    if (!loginResponse.body.token) {
        console.error('Driver login for token failed:', loginResponse.body);
        throw new Error('Failed to get driver token for integration tests. Login response: ' + JSON.stringify(loginResponse.body));
    }
    return loginResponse.body.token;
}

describe('Driver Integration Tests', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        // Clear all relevant tables before each test
        await RideModel.destroy({ truncate: true, cascade: true });
        await DriverModel.destroy({ truncate: true, cascade: true });
        await User.destroy({ truncate: true, cascade: true }); // Assuming drivers might create user entries or for general cleanup
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /api/v1/drivers/register', () => {
        const newDriver: DriverCreationAttributes = {
            name: 'Test Driver Reg',
            email: 'test.driver.reg@example.com',
            phone_number: '1234567890',
            license_number: 'TESTDRV123',
            password: 'Password123!',
        };

        it('should register a new driver successfully and return 201 with driver details (excluding password)', async () => {
            const response = await request.post('/api/v1/drivers/register').send(newDriver);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('driver_id');
            expect(response.body.name).toBe(newDriver.name);
            expect(response.body.email).toBe(newDriver.email);
            expect(response.body.license_number).toBe(newDriver.license_number);
            expect(response.body.password).toBeUndefined();
        });

        it('should return 409 if trying to register a driver with an existing email', async () => {
            await request.post('/api/v1/drivers/register').send(newDriver); // First registration
            const response = await request.post('/api/v1/drivers/register').send(newDriver); // Second attempt
            
            expect(response.status).toBe(409);
            expect(response.body.error.message).toBe('Driver with this email already exists');
        });

        // Add more validation tests as needed (e.g., missing fields, invalid email format)
        it('should return 400 if email is missing', async () => {
            const { email, ...incompleteDriver } = newDriver;
            const response = await request.post('/api/v1/drivers/register').send(incompleteDriver);
            expect(response.status).toBe(400); 
            expect(response.body.error.message).toBeDefined();
        });
         it('should return 400 if password is too short', async () => {
            const driverWithShortPassword = { ...newDriver, password: '123' };
            const response = await request.post('/api/v1/drivers/register').send(driverWithShortPassword);
            expect(response.status).toBe(400);
            expect(response.body.error.message).toBeDefined(); // Specific message depends on validator
        });
    });

    describe('POST /api/v1/drivers/login', () => {
        const driverCredentials: DriverCreationAttributes = {
            name: 'Login Test Driver',
            email: 'login.test.driver@example.com',
            phone_number: '0987654321',
            license_number: 'LOGINDRV001',
            password: 'ValidPassword123!',
        };

        beforeEach(async () => {
            // Register the driver before each login test
            await request.post('/api/v1/drivers/register').send(driverCredentials);
        });

        it('should login an existing driver successfully and return 200 with driver details and token', async () => {
            const response = await request.post('/api/v1/drivers/login').send({
                email: driverCredentials.email,
                password: driverCredentials.password,
            });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('driver');
            expect(response.body.driver.email).toBe(driverCredentials.email);
            expect(response.body.driver.password).toBeUndefined();
            expect(response.body).toHaveProperty('token');
        });

        it('should return 401 for invalid email', async () => {
            const response = await request.post('/api/v1/drivers/login').send({
                email: 'wrong.email@example.com',
                password: driverCredentials.password,
            });
            expect(response.status).toBe(401);
            expect(response.body.error.message).toBe('Invalid email or password');
        });

        it('should return 401 for invalid password', async () => {
            const response = await request.post('/api/v1/drivers/login').send({
                email: driverCredentials.email,
                password: 'WrongPassword123!',
            });
            expect(response.status).toBe(401);
            expect(response.body.error.message).toBe('Invalid email or password');
        });
    });

    describe('Driver Profile Management (GET, PUT, DELETE)', () => {
        let driverToken: string;
        let driverId: string;
        const initialDriverData: DriverCreationAttributes = {
            name: 'Profile Driver',
            email: 'profile.driver@example.com',
            phone_number: 'PROFILE001',
            license_number: 'PROFDRV001',
            password: 'ProfilePass123!',
            current_location_lat: 34.0522,
            current_location_lon: -118.2437,
            status: 'offline'
        };

        beforeEach(async () => {
            // Register and get driver_id
            const registerResponse = await request.post('/api/v1/drivers/register').send(initialDriverData);
            expect(registerResponse.status).toBe(201);
            driverId = registerResponse.body.driver_id;

            // Login to get token
            const loginResponse = await request.post('/api/v1/drivers/login').send({
                email: initialDriverData.email,
                password: initialDriverData.password,
            });
            expect(loginResponse.status).toBe(200);
            driverToken = loginResponse.body.token;
        });

        describe('GET /api/v1/drivers/profile', () => {
            it('should get the authenticated driver\'s profile and return 200', async () => {
                const response = await request
                    .get('/api/v1/drivers/profile')
                    .set('Authorization', `Bearer ${driverToken}`);

                expect(response.status).toBe(200);
                expect(response.body.driver_id).toBe(driverId);
                expect(response.body.email).toBe(initialDriverData.email);
                expect(response.body.name).toBe(initialDriverData.name);
                expect(response.body.password).toBeUndefined();
            });

            it('should return 401 if not authenticated', async () => {
                const response = await request.get('/api/v1/drivers/profile');
                expect(response.status).toBe(401);
            });
        });

        describe('PUT /api/v1/drivers/profile', () => {
            const profileUpdateData = {
                name: 'Updated Profile Driver Name',
                phone_number: 'PROFILE002',
                // Cannot update email, license_number, or password via this route as per typical design
            };

            it('should update the authenticated driver\'s profile and return 200', async () => {
                const response = await request
                    .put('/api/v1/drivers/profile')
                    .set('Authorization', `Bearer ${driverToken}`)
                    .send(profileUpdateData);

                expect(response.status).toBe(200);
                expect(response.body.name).toBe(profileUpdateData.name);
                expect(response.body.phone_number).toBe(profileUpdateData.phone_number);
                expect(response.body.email).toBe(initialDriverData.email); // Email should not change

                // Verify in DB
                const dbDriver = await DriverModel.findByPk(driverId);
                expect(dbDriver?.name).toBe(profileUpdateData.name);
            });

            it('should return 401 if not authenticated', async () => {
                const response = await request.put('/api/v1/drivers/profile').send(profileUpdateData);
                expect(response.status).toBe(401);
            });

            // Add test for validation errors if applicable (e.g., invalid phone number format)
        });
        
        describe('PUT /api/v1/drivers/status', () => {
            const statusUpdateOnline = { status: 'online' };
            const statusUpdateOffline = { status: 'offline' };
            const statusUpdateInvalid = { status: 'on_vacation' };

            it('should update the driver status to online and return 200', async () => {
                const response = await request
                    .put('/api/v1/drivers/status')
                    .set('Authorization', `Bearer ${driverToken}`)
                    .send(statusUpdateOnline);
                
                expect(response.status).toBe(200);
                expect(response.body.status).toBe('online');
                const dbDriver = await DriverModel.findByPk(driverId);
                expect(dbDriver?.status).toBe('online');
            });

            it('should update the driver status to offline and return 200', async () => {
                // First set to online
                await request.put('/api/v1/drivers/status').set('Authorization', `Bearer ${driverToken}`).send(statusUpdateOnline);
                // Then set to offline
                const response = await request
                    .put('/api/v1/drivers/status')
                    .set('Authorization', `Bearer ${driverToken}`)
                    .send(statusUpdateOffline);
                
                expect(response.status).toBe(200);
                expect(response.body.status).toBe('offline');
                const dbDriver = await DriverModel.findByPk(driverId);
                expect(dbDriver?.status).toBe('offline');
            });

            it('should return 400 for an invalid status value', async () => {
                const response = await request
                    .put('/api/v1/drivers/status')
                    .set('Authorization', `Bearer ${driverToken}`)
                    .send(statusUpdateInvalid);
                expect(response.status).toBe(400);
                expect(response.body.error.message).toContain('Invalid status value');
            });

            it('should return 401 if not authenticated', async () => {
                const response = await request.put('/api/v1/drivers/status').send(statusUpdateOnline);
                expect(response.status).toBe(401);
            });
        });

        describe('DELETE /api/v1/drivers/account', () => {
            it('should delete the authenticated driver\'s account and return 200', async () => {
                const response = await request
                    .delete('/api/v1/drivers/account')
                    .set('Authorization', `Bearer ${driverToken}`);
                
                expect(response.status).toBe(200);
                expect(response.body.message).toBe('Driver account deleted successfully');

                // Verify driver is deleted from DB
                const dbDriver = await DriverModel.findByPk(driverId);
                expect(dbDriver).toBeNull();
                // If drivers also create a User record, check that too
                const dbUser = await User.findOne({ where: { email: initialDriverData.email } });
                expect(dbUser).toBeNull(); // Or marked inactive, depending on system design
            });

            it('should return 401 if not authenticated', async () => {
                const response = await request.delete('/api/v1/drivers/account');
                expect(response.status).toBe(401);
            });

            it('should return 404 if trying to delete an already deleted account (using a new token of a deleted user)', async () => {
                // First, delete the account
                await request.delete('/api/v1/drivers/account').set('Authorization', `Bearer ${driverToken}`);
                
                // Attempt to delete again with the same token (which is now invalid as user is gone)
                // Or, more accurately, if we tried to log in again it would fail.
                // For this test, using the same token implies the session might still be considered valid for a short period by some systems,
                // but the underlying user/driver entity is gone.
                const secondResponse = await request
                    .delete('/api/v1/drivers/account')
                    .set('Authorization', `Bearer ${driverToken}`);
                
                // The service should ideally handle this by not finding the user from the JWT. 
                // This might result in a 401/403/404 depending on how authMiddleware and service layer interact.
                // A 404 from the service layer (driver not found) is also a valid outcome.
                expect([401, 403, 404]).toContain(secondResponse.status); 
            });
        });
    });

    describe('POST /api/v1/drivers/accept-ride', () => {
        let riderToken: string;
        let rideId: string;
        let driverToken: string;
        let driverId: string;

        const riderData = {
            name: 'Ride Requesting User',
            email: 'rider.for.accept@example.com',
            phone_number: 'RIDERACCEPT1',
            password: 'RiderPass456!',
        };

        const driverData: DriverCreationAttributes = {
            name: 'Ride Accepting Driver',
            email: 'driver.accepting@example.com',
            phone_number: 'DRIVERACCEPT1',
            license_number: 'DRVACCEPT01',
            password: 'DriverPass789!',
            status: 'offline', // Will be set to online before test
            current_location_lat: 34.0522, // Los Angeles
            current_location_lon: -118.2437,
        };

        // Helper to get a rider token (simplified from rider integration tests)
        async function getRiderAuthToken(riderRegData: any): Promise<string> {
            await User.destroy({ where: { email: riderRegData.email }, force: true });
            await request.post('/api/v1/auth/register').send(riderRegData); 
            const loginResponse = await request.post('/api/v1/auth/login').send({ email: riderRegData.email, password: riderRegData.password });
            return loginResponse.body.token;
        }

        beforeEach(async () => {
            // 1. Register and login rider
            riderToken = await getRiderAuthToken(riderData);
            
            // 2. Register and login driver
            const driverRegResponse = await request.post('/api/v1/drivers/register').send(driverData);
            driverId = driverRegResponse.body.driver_id;
            const driverLoginResponse = await request.post('/api/v1/drivers/login').send({ email: driverData.email, password: driverData.password });
            driverToken = driverLoginResponse.body.token;

            // 3. Set driver to online
            await request
                .put('/api/v1/drivers/status')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ status: 'online', current_location_lat: driverData.current_location_lat, current_location_lon: driverData.current_location_lon });

            // 4. Rider requests a ride
            const rideRequestPayload = { pickup_location: '123 Pickup St', dropoff_location: '789 Dropoff Ave' };
            const rideResponse = await request
                .post('/api/v1/riders/request-ride')
                .set('Authorization', `Bearer ${riderToken}`)
                .send(rideRequestPayload);
            expect(rideResponse.status).toBe(201); // Ensure ride request was successful
            rideId = rideResponse.body.ride_id;
        });

        it('should allow an online driver to accept a requested ride and return 200 with updated ride details', async () => {
            const response = await request
                .post('/api/v1/drivers/accept-ride')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ ride_id: rideId });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('ride_id', rideId);
            expect(response.body.status).toBe('in_progress');
            expect(response.body.driver_id).toBe(driverId);

            // Verify driver status changed to busy
            const driverProfile = await request.get('/api/v1/drivers/profile').set('Authorization', `Bearer ${driverToken}`);
            expect(driverProfile.body.status).toBe('busy');
        });

        it('should return 400 if ride_id is missing', async () => {
            const response = await request
                .post('/api/v1/drivers/accept-ride')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({}); // Missing ride_id
            expect(response.status).toBe(400);
            expect(response.body.error.message).toContain('ride_id'); // Message should indicate ride_id is required
        });

        it('should return 404 if ride does not exist', async () => {
            const response = await request
                .post('/api/v1/drivers/accept-ride')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ ride_id: 'non-existent-ride-id' });
            expect(response.status).toBe(404);
            expect(response.body.error.message).toBe('Ride not found or not in a requestable state');
        });

        it('should return 400 if driver is not online', async () => {
            // Set driver to offline
            await request
                .put('/api/v1/drivers/status')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ status: 'offline' });

            const response = await request
                .post('/api/v1/drivers/accept-ride')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ ride_id: rideId });
            expect(response.status).toBe(400);
            expect(response.body.error.message).toBe('Driver is not online');
        });

        it('should return 400 if ride is not in "requested" state (e.g., already accepted)', async () => {
            // First, driver accepts the ride
            await request
                .post('/api/v1/drivers/accept-ride')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ ride_id: rideId });

            // Attempt to accept again
            const secondResponse = await request
                .post('/api/v1/drivers/accept-ride')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ ride_id: rideId });
            expect(secondResponse.status).toBe(400);
            expect(secondResponse.body.error.message).toBe('Ride not found or not in a requestable state');
        });

        it('should return 401 if driver is not authenticated', async () => {
            const response = await request
                .post('/api/v1/drivers/accept-ride')
                .send({ ride_id: rideId });
            expect(response.status).toBe(401);
        });

        // Consider a test case for when the ride exists but is for a different region / not assignable to this driver (if applicable)
        // Consider a test case for transaction failure during accept (more complex to simulate in integration without specific mocks)
    });
}); 