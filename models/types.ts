export interface User {
    user_id: string;
    name: string;
    email: string;
    phone_number: string;
    password: string;
    created_at: Date;
    updated_at: Date;
};

export interface Driver {
    driver_id: string;
    name: string;
    email: string;
    phone_number: string;
    license_number: string;
    status: 'online' | 'busy' | 'offline';
    password: string;
    created_at: Date;
    updated_at: Date;
};

export interface Ride {
    ride_id: string;
    driver_id: string;
    user_id: string;
    start_time: Date;
    end_time: Date;
    pickup_location: string;
    dropoff_location: string;
    fare: number;
    status: 'requested' | 'in_progress' | 'completed' | 'canceled';
    created_at: Date;
    updated_at: Date;
};