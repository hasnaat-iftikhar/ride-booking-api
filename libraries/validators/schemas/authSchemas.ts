import Joi from 'joi';

export const registerSchema = Joi.object({
    name: Joi.string().required().min(2).max(100),
    email: Joi.string().email().required(),
    phone_number: Joi.string().required().min(10).max(20),
    password: Joi.string().required().min(8)
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});