import { api } from "@/shared/api/httpClient";
import { parsePaginatedResponse, type PaginationParams } from "@/shared/api/pagination";

type UnknownRecord = Record<string, unknown>;

const toRecord = (value: unknown): UnknownRecord =>
	value && typeof value === "object" ? (value as UnknownRecord) : {};

const extractPayload = (raw: unknown): unknown => {
	const root = toRecord(raw);
	return root.data ?? raw;
};

const extractArrayPayload = <T>(raw: unknown): T[] => {
	const payload = extractPayload(raw);

	if (Array.isArray(payload)) {
		return payload as T[];
	}

	const payloadRecord = toRecord(payload);
	const candidates = [payloadRecord.items, payloadRecord.rows, payloadRecord.results, payloadRecord.data];

	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate as T[];
		}
	}

	return [];
};

export const getAdminNotificationsSummary = async () => {
	const response = await api.get("/admin/notifications/summary");
	return extractPayload(response.data);
};

export const createAdminNotification = async (payload: {
	title: string;
	message: string;
	type: string;
	user_ids: number[];
	category?: string;
	data?: Record<string, unknown>;
}) => {
	const response = await api.post("/admin/notifications", {
		title: payload.title,
		message: payload.message,
		type: payload.type,
		user_ids: payload.user_ids,
		category: payload.category,
		data: payload.data,
	});

	return extractPayload(response.data);
};

export const sendAdminBroadcastNotification = async (payload: {
	title: string;
	message: string;
	audience?: string;
}) => {
	const response = await api.post("/admin/notifications/broadcast", {
		title: payload.title,
		message: payload.message,
		audience: payload.audience ?? "all",
	});
	return extractPayload(response.data);
};

export const getAdminEmailNotifications = async () => {
	const response = await api.get("/admin/email-templates");
	const items = extractArrayPayload<UnknownRecord>(response.data);
	return items;
};

export const getAdminEmailNotificationLogs = async () => {
	const response = await api.get("/admin/email-notifications/logs");
	const items = extractArrayPayload<UnknownRecord>(response.data);
	return items;
};

export const createAdminEmailNotification = async (payload: {
	recipient_email: string;
	user_id?: number;
	subject?: string;
	message?: string;
	template_key?: string;
	template_data?: Record<string, unknown>;
	type?: string;
	reference_type?: string;
	reference_id?: number;
}) => {
	const response = await api.post("/admin/email-notifications", {
		recipient_email: payload.recipient_email,
		user_id: payload.user_id,
		subject: payload.subject,
		body: payload.message,
		template_key: payload.template_key,
		template_data: payload.template_data,
		type: payload.type,
		reference_type: payload.reference_type,
		reference_id: payload.reference_id,
	});

	return extractPayload(response.data);
};

export const getBiometricDevices = async (params: PaginationParams = {}) => {
	const response = await api.get("/biometric/devices", { params });
	const parsed = parsePaginatedResponse<UnknownRecord>(response.data);
	return {
		items: parsed.items,
		currentPage: parsed.currentPage,
		totalPages: parsed.totalPages,
		perPage: parsed.perPage,
		total: parsed.total,
		raw: response.data,
	};
};

export const createBiometricDevice = async (payload: {
	name: string;
	ip_address: string;
	location?: string;
	port?: number;
}) => {
	const response = await api.post("/biometric/devices", {
		name: payload.name,
		endpoint_url: `http://${payload.ip_address}${payload.port ? `:${payload.port}` : ""}`,
		location: payload.location,
		payload: {
			ip_address: payload.ip_address,
			port: payload.port,
		},
	});
	return extractPayload(response.data);
};

export const syncBiometricAttendance = async (payload: { device_id: string | number }) => {
	const response = await api.post("/biometric/sync-attendance", {
		biometric_device_id: payload.device_id,
	});
	return extractPayload(response.data);
};

export const getAuditLogs = async (params?: PaginationParams) => {
	const response = await api.get("/admin/audit-logs", { params });
	const parsed = parsePaginatedResponse<UnknownRecord>(response.data);
	return {
		items: parsed.items,
		totalPages: parsed.totalPages,
		total: parsed.total,
		currentPage: parsed.currentPage,
		raw: response.data,
	};
};

export const getAuditLogById = async (id: string | number) => {
	const response = await api.get(`/admin/audit-logs/${id}`);
	const payload = extractPayload(response.data);
	return toRecord(payload);
};

export const downloadImportTemplate = async () => {
	const response = await api.get("/admin/import/template", {
		responseType: "blob",
	});
	return response.data as Blob;
};

export const importUsers = async (file: File, role: string = "employee") => {
	const formData = new FormData();
	formData.append("file", file);
	formData.append("role", role);
	const response = await api.post("/admin/import/users", formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return extractPayload(response.data);
};

export const importEmployees = async (formData: FormData) => {
	const response = await api.post("/admin/import/employees", formData, {
		headers: { "Content-Type": "multipart/form-data" },
	});
	return extractPayload(response.data);
};
// =============================
// EMAIL NOTIFICATION (RETRY)
// =============================
export const retryAdminEmailNotification = async (id: string | number) => {
	const response = await api.post(`/admin/email-notifications/${id}/retry`);
	return extractPayload(response.data);
};

// =============================
// EMAIL TEMPLATE (CREATE)
// =============================
export const createEmailTemplate = async (payload: {
	key: string;
	name: string;
	description?: string;
	subject: string;
	html_body: string;
	text_body?: string;
	placeholders?: string[];
}) => {
	const response = await api.post("/admin/email-templates", {
		key: payload.key,
		name: payload.name,
		description: payload.description,
		subject: payload.subject,
		html_body: payload.html_body,
		text_body: payload.text_body,
		placeholders: payload.placeholders,
	});
	return extractPayload(response.data);
};

// =============================
// EMAIL TEMPLATE (UPDATE)
// =============================
export const updateEmailTemplate = async (
	id: string | number,
	payload: {
		name?: string;
		description?: string;
		subject?: string;
		html_body?: string;
		text_body?: string;
		placeholders?: string[];
		is_active?: boolean;
	}
) => {
	const response = await api.put(`/admin/email-templates/${id}`, payload);
	return extractPayload(response.data);
};

// =============================
// EMAIL TEMPLATE (PREVIEW)
// =============================
export const previewEmailTemplate = async (
	id: string | number,
	data?: Record<string, unknown>
) => {
	const response = await api.post(
		`/admin/email-templates/${id}/preview`,
		{
			data: data ?? {},
		}
	);
	return extractPayload(response.data);
};

// =============================
// EMAIL TEMPLATE (DELETE)
// =============================
export const deleteEmailTemplate = async (id: string | number) => {
	const response = await api.delete(`/admin/email-templates/${id}`);
	return extractPayload(response.data);
};
