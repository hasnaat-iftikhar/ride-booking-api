import Joi from "joi";

export const registerDriverSchema = Joi.object({
	name: Joi.string().required().min(2).max(100),
	email: Joi.string().email().required(),
	phone_number: Joi.string().required().min(10).max(20),
	license_number: Joi.string().required().min(5).max(50),
	password: Joi.string().required().min(8),
});

export const loginDriverSchema = Joi.object({
	email: Joi.string().email().required(),
	password: Joi.string().required(),
});

export const updateDriverSchema = Joi.object({
	name: Joi.string().min(2).max(100),
	phone_number: Joi.string().min(10).max(20),
	password: Joi.string().min(8),
}).min(1);

export const updateDriverStatusSchema = Joi.object({
	status: Joi.string().valid("online", "offline", "busy").required(),
});
