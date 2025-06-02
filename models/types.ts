export type UserRole = 'rider' | 'admin';
export type AuthRole = UserRole | 'driver';

export interface UserAttributes {
    user_id: string;
    name: string;
    email: string;
    phone_number: string;
    password: string; // Hashed
    role: UserRole;
    created_at: Date;
    updated_at: Date;
}

export interface UserCreationAttributes {
    name: string;
    email: string;
    phone_number: string;
    password: string; // Hashed password (service hashes plaintext before calling data access)
    user_id?: string; // Optional: Auto-generated (e.g. UUIDV4)
    role?: UserRole; // Optional: Has defaultValue ('rider')
    // created_at, updated_at are not provided during creation if timestamps:true
}

export interface DriverAttributes {
    driver_id: string;
    name: string;
    email: string;
    phone_number: string;
    license_number: string;
    password: string; // Hashed
    status: 'online' | 'busy' | 'offline';
    current_location_lat?: number | null;
    current_location_lon?: number | null;
    created_at: Date;
    updated_at: Date;
}

export interface DriverCreationAttributes {
    name: string;
    email: string;
    phone_number: string;
    license_number: string;
    password: string; // Hashed password (service hashes plaintext before calling data access)
    driver_id?: string; // Optional: Auto-generated (e.g. UUIDV4)
    status?: 'online' | 'busy' | 'offline'; // Optional: Has defaultValue ('offline')
    current_location_lat?: number | null;
    current_location_lon?: number | null;
}

export type RideStatus = 'requested' | 'in_progress' | 'completed' | 'canceled';

export interface RideAttributes {
    ride_id: string; 
    driver_id: string | null;
    user_id: string;
    start_time: Date | null;
    end_time: Date | null;
    pickup_location: string;
    dropoff_location: string;
    fare: number;
    status: RideStatus; 
    created_at: Date;
    updated_at: Date;
}

export interface RideCreationAttributes {
    user_id: string;
    pickup_location: string;
    dropoff_location: string;
    fare: number;
    ride_id?: string;         
    driver_id?: string | null;
    start_time?: Date | null;
    end_time?: Date | null;   
    status?: RideStatus;      
}

// The old User, Driver, Ride interfaces are for external representation, not model attributes directly.
// Keeping them for now if they are used by services, but ideally services use Model attributes types.
export interface User { // This is likely UserType used in services, distinct from UserAttributes
    user_id: string;
    name: string;
    email: string;
    phone_number: string;
    password?: string; // Usually omitted in API responses
    role: UserRole;
    created_at: Date;
    updated_at: Date;
};

export interface Driver { // This is likely DriverType used in services
    driver_id: string;
    name: string;
    email: string;
    phone_number: string;
    license_number: string;
    status: 'online' | 'busy' | 'offline';
    current_location_lat?: number | null;
    current_location_lon?: number | null;
    password?: string; // Usually omitted
    created_at: Date;
    updated_at: Date;
};

export interface Ride { // This is likely RideType used in services
    ride_id: string;
    driver_id: string | null;
    user_id: string;
    start_time: Date | null;
    end_time: Date | null;
    pickup_location: string;
    dropoff_location: string;
    fare: number;
    status: RideStatus; 
    created_at: Date;
    updated_at: Date;
};