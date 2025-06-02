import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import supertest from 'supertest';
import { app, sequelize } from '../../../../../../index'; // Adjusted path
import { User, Ride as RideModel, Driver as DriverModel } from '../../../../../../models'; // Adjusted path
import type { UserCreationAttributes, RideAttributes } from '../../../../../../models/types'; // Adjusted path

const request = supertest(app);

// Helper to get a rider token
async function getRiderToken(riderDetails?: Partial<UserCreationAttributes>): Promise<string> {
    const defaultRider: UserCreationAttributes = {
        name: 'Integration Rider',
        email: 'rider.integration@example.com',
        phone_number: 'RIDERPHONE',
        password: 'RiderPass123!',
    };
    const currentUser = { ...defaultRider, ...(riderDetails || {}) };

    await User.destroy({ where: { email: currentUser.email }, force: true });
    const registerResponse = await request.post('/api/v1/auth/register').send(currentUser);
    if (registerResponse.status !== 201) {
        console.error('Rider registration for token failed:', registerResponse.body);
        throw new Error(`Failed to register rider for token: ${registerResponse.body?.error?.message || 'Unknown error'}`);
    }
    
    const loginResponse = await request.post('/api/v1/auth/login').send({
        email: currentUser.email,
        password: currentUser.password,
    });

    if (!loginResponse.body.token) {
        console.error('Rider login for token failed:', loginResponse.body);
        throw new Error('Failed to get rider token for integration tests');
    }
    return loginResponse.body.token;
}


describe('Rider Integration Tests', () => {
    beforeAll(async () => {
        await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
        await RideModel.destroy({ truncate: true, cascade: true });
        await User.destroy({ truncate: true, cascade: true }); 
        await DriverModel.destroy({ truncate: true, cascade: true });
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /api/v1/riders/request-ride', () => {
        let riderToken: string;
        const riderData = {
            name: 'Ride Request User',
            email: 'riderequest.user@example.com',
            phone_number: '7778889999',
            password: 'RequestPass789!',
        };

        beforeEach(async () => {
            riderToken = await getRiderToken(riderData);
        });

        const validRidePayload = {
            pickup_location: '100 Main St',
            dropoff_location: '500 Central Ave',
        };

        it('should allow an authenticated rider to request a ride and return 201 with ride details', async () => {
            const response = await request
                .post('/api/v1/riders/request-ride')
                .set('Authorization', `Bearer ${riderToken}`)
                .send(validRidePayload);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('ride_id');
            expect(response.body.pickup_location).toBe(validRidePayload.pickup_location);
            expect(response.body.dropoff_location).toBe(validRidePayload.dropoff_location);
            expect(response.body.status).toBe('requested');
            expect(response.body).toHaveProperty('fare');
            expect(typeof response.body.fare).toBe('number');
            expect(response.body.user_id).toBeDefined(); 
        });

        it('should return 400 if pickup_location is missing', async () => {
            const { pickup_location, ...incompletePayload } = validRidePayload;
            const response = await request
                .post('/api/v1/riders/request-ride')
                .set('Authorization', `Bearer ${riderToken}`)
                .send(incompletePayload);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.message).toBeDefined(); 
        });

        it('should return 400 if dropoff_location is missing', async () => {
            const { dropoff_location, ...incompletePayload } = validRidePayload;
            const response = await request
                .post('/api/v1/riders/request-ride')
                .set('Authorization', `Bearer ${riderToken}`)
                .send(incompletePayload);
            
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
            expect(response.body.error.message).toBeDefined();
        });

        it('should return 401 if no token is provided', async () => {
            const response = await request
                .post('/api/v1/riders/request-ride')
                .send(validRidePayload);
            
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/v1/riders/rides', () => {
        let riderTokenForHistory: string;
        let riderUserId: string;
        const riderForHistoryData = {
            name: 'History Test Rider',
            email: 'history.rider@example.com',
            phone_number: '8889990000',
            password: 'HistoryPass890!',
        };

        beforeEach(async () => {
            const regResponse = await request.post('/api/v1/auth/register').send(riderForHistoryData);
            const registeredUser = await User.findOne({ where: { email: riderForHistoryData.email }});
            if (!registeredUser) throw new Error ('Test setup: Failed to find registered user for history test');
            riderUserId = registeredUser.user_id; 
            
            riderTokenForHistory = await getRiderToken(riderForHistoryData); 

            const ridePayload1 = { pickup_location: 'Loc A', dropoff_location: 'Loc B' };
            const ridePayload2 = { pickup_location: 'Loc C', dropoff_location: 'Loc D' };
            await request.post('/api/v1/riders/request-ride').set('Authorization', `Bearer ${riderTokenForHistory}`).send(ridePayload1);
            await request.post('/api/v1/riders/request-ride').set('Authorization', `Bearer ${riderTokenForHistory}`).send(ridePayload2);
        });

        it('should allow an authenticated rider to get their ride history and return 200', async () => {
            const response = await request
                .get('/api/v1/riders/rides')
                .set('Authorization', `Bearer ${riderTokenForHistory}`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            for (const ride of response.body as RideAttributes[]) {
                expect(ride.user_id).toBe(riderUserId);
            }
        });

        it('should return an empty array if the rider has no ride history', async () => {
            const newRiderData = {
                name: 'No History Rider',
                email: 'nohistory.rider@example.com',
                phone_number: '1010101010',
                password: 'NoHistoryPass!',
            };
            const newRiderToken = await getRiderToken(newRiderData);

            const response = await request
                .get('/api/v1/riders/rides')
                .set('Authorization', `Bearer ${newRiderToken}`);

            expect(response.status).toBe(200);
            expect(response.body).toEqual([]);
        });

        it('should return 401 if no token is provided', async () => {
            const response = await request.get('/api/v1/riders/rides');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/v1/riders/cancel-ride', () => {
        let riderTokenForCancel: string;
        let riderUserIdForCancel: string;
        let rideToCancelId: string;

        const riderForCancelData = {
            name: 'Cancel Test Rider',
            email: 'cancel.rider@example.com',
            phone_number: '2223334444',
            password: 'CancelPass234!',
        };

        let testDriverToken: string;
        let testDriverId: string;
        const testDriverData = {
            name: 'Test Driver for Cancel Ride', 
            email: 'driver.cancel.test@example.com', 
            phone_number: '3334445555', 
            license_number: 'DRVCANCEL1', 
            password: 'CancelDriverPass1!'
        };
        
        let otherRiderToken: string;
        const otherRiderData = {
            name: 'Other Cancel Rider', 
            email: 'other.cancel.rider@example.com', 
            phone_number: '4445556666', 
            password: 'OtherCancelPass1!'
        };

        beforeEach(async () => {
            const regResponse = await request.post('/api/v1/auth/register').send(riderForCancelData);
            const mainRider = await User.findOne({where: {email: riderForCancelData.email }});
            if (!mainRider) throw new Error('Test setup: Failed to find main rider for cancel test');
            riderUserIdForCancel = mainRider.user_id;
            riderTokenForCancel = await getRiderToken(riderForCancelData);
            
            otherRiderToken = await getRiderToken(otherRiderData);

            await DriverModel.destroy({ where: { email: testDriverData.email }, force: true });
            const driverReg = await request.post('/api/v1/drivers/register').send(testDriverData);
            testDriverId = driverReg.body.driver.driver_id;
            const driverLogin = await request.post('/api/v1/drivers/login').send({ email: testDriverData.email, password: testDriverData.password });
            testDriverToken = driverLogin.body.token;
            await request.put(`/api/v1/drivers/${testDriverId}/status`).set('Authorization', `Bearer ${testDriverToken}`).send({ status: 'online' });

            const ridePayload = { pickup_location: 'Cancel From St', dropoff_location: 'Cancel To Ave' };
            const rideRegResponse = await request.post('/api/v1/riders/request-ride')
                                       .set('Authorization', `Bearer ${riderTokenForCancel}`)
                                       .send(ridePayload);
            rideToCancelId = rideRegResponse.body.ride_id;
        });

        it('should allow a rider to cancel their own \'requested\' ride and return 200', async () => {
            const response = await request
                .post('/api/v1/riders/cancel-ride')
                .set('Authorization', `Bearer ${riderTokenForCancel}`)
                .send({ ride_id: rideToCancelId });

            expect(response.status).toBe(200);
            expect(response.body.ride_id).toBe(rideToCancelId);
            expect(response.body.status).toBe('canceled');
        });

        it('should allow a rider to cancel their own \'in_progress\' ride and return 200, and driver status becomes online', async () => {
            await request.post(`/api/v1/drivers/${testDriverId}/rides/${rideToCancelId}/accept`)
                         .set('Authorization', `Bearer ${testDriverToken}`);
            
            const cancelResponse = await request
                .post('/api/v1/riders/cancel-ride')
                .set('Authorization', `Bearer ${riderTokenForCancel}`)
                .send({ ride_id: rideToCancelId });

            expect(cancelResponse.status).toBe(200);
            expect(cancelResponse.body.status).toBe('canceled');

            const driverStatusResponse = await request.get(`/api/v1/drivers/${testDriverId}`).set('Authorization', `Bearer ${testDriverToken}`);
            expect(driverStatusResponse.body.status).toBe('online');
        });

        it('should return 404 if ride ID does not exist', async () => {
            const nonExistentRideId = 'ride-does-not-exist-123';
            const response = await request
                .post('/api/v1/riders/cancel-ride')
                .set('Authorization', `Bearer ${riderTokenForCancel}`)
                .send({ ride_id: nonExistentRideId });
            expect(response.status).toBe(404);
            expect(response.body.error.message).toBe('Ride not found');
        });

        it('should return 400 if ride is already completed', async () => {
            // Manually update ride to completed for this test (simplified)
            await RideModel.update({ status: 'completed' }, { where: { ride_id: rideToCancelId } });
            const response = await request
                .post('/api/v1/riders/cancel-ride')
                .set('Authorization', `Bearer ${riderTokenForCancel}`)
                .send({ ride_id: rideToCancelId });
            expect(response.status).toBe(400);
            expect(response.body.error.message).toBe('Ride cannot be canceled in its current state');
        });
        
        it('should return 400 if ride is already canceled', async () => {
            await request.post('/api/v1/riders/cancel-ride').set('Authorization', `Bearer ${riderTokenForCancel}`).send({ ride_id: rideToCancelId }); // First cancel
            const response = await request // Attempt to cancel again
                .post('/api/v1/riders/cancel-ride')
                .set('Authorization', `Bearer ${riderTokenForCancel}`)
                .send({ ride_id: rideToCancelId });
            expect(response.status).toBe(400);
            expect(response.body.error.message).toBe('Ride cannot be canceled in its current state');
        });

        it('should return 403 if another rider tries to cancel the ride', async () => {
            const response = await request
                .post('/api/v1/riders/cancel-ride')
                .set('Authorization', `Bearer ${otherRiderToken}`)
                .send({ ride_id: rideToCancelId });
            expect(response.status).toBe(403);
            expect(response.body.error.message).toBe('Forbidden: You can only cancel your own rides.');
        });

        it('should return 401 if no token is provided', async () => {
            const response = await request.post('/api/v1/riders/cancel-ride');
            expect(response.status).toBe(401);
        });
    });
}); 