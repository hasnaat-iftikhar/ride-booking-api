export enum SuccessType {
	CREATED = "created",
	UPDATED = "updated",
	DELETED = "deleted",
	RETRIEVED = "retrieved",
	AUTHENTICATED = "authenticated",
}

interface SuccessResponse<T> {
	success: boolean;
	message: string;
	data: T;
	meta?: Record<string, unknown>;
}

const successMessages = {
	created: "Resource created successfully",
	updated: "Resource updated successfully",
	deleted: "Resource deleted successfully",
	retrieved: "Resource retrieved successfully",
	authenticated: "Authentication successful",
};

export function createSuccessResponse<T>(
	type: SuccessType,
	data: T,
	customMessage?: string,
	meta?: Record<string, unknown>
): SuccessResponse<T> {
	return {
		success: true,
		message: customMessage || successMessages[type],
		data,
		meta,
	};
}
