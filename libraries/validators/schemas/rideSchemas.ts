import Joi from "joi";

export const requestRideSchema = Joi.object({
	pickup_location: Joi.string().required().min(3).max(255),
	dropoff_location: Joi.string().required().min(3).max(255),
});

export const cancelRideSchema = Joi.object({
	ride_id: Joi.string().required().uuid(),
});

export const acceptRideSchema = Joi.object({
	ride_id: Joi.string().required().uuid(),
});
