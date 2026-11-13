import { api } from "@/shared/api/httpClient";
import { parsePaginatedResponse, type PaginatedResult, type PaginationParams } from "@/shared/api/pagination";
import type { EmployeeCreatePayload, EmployeeItem, EmployeeUpdatePayload, EmployeeOnboardingPayload, EmployeeOffboardingPayload } from "../types/employee.types";

/**
 * Type-safe API response wrapper
 */
interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface EmployeeSummary {
  total: number;
  active: number;
  departments: number;
  positions: number;
  department_breakdown?: Array<{ name: string; count: number }>;
}

const isEmployeeItem = (item: unknown): item is EmployeeItem =>
  item !== null && typeof item === "object";

/**
 * Extract single item from API response
 */
function extractItemFromResponse(response: unknown): EmployeeItem | null {
  if (!response || typeof response !== "object") {
    return null;
  }

  const resp = response as Record<string, unknown>;

  // Try direct item if already correct structure
  if ("id" in resp && "employee_code" in resp) {
    return resp as unknown as EmployeeItem;
  }

  // Try common API response paths
  const candidates = [resp.data, resp.payload, resp.item];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object" && "id" in candidate) {
      return candidate as EmployeeItem;
    }
  }

  return null;
}

/**
 * Handle API errors and return user-friendly messages
 */
function handleApiError(error: unknown, contextMessage: string): never {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown error occurred";

  const fullMessage = `${contextMessage}: ${message}`;
  console.error("🚨 Employee API Error:", {
    context: contextMessage,
    error,
    timestamp: new Date().toISOString(),
  });

  throw new Error(fullMessage);
}

/**
 * Fetch all employees
 */
export async function getAllEmployees(): Promise<EmployeeItem[]> {
  let allItems: EmployeeItem[] = [];
  let currentPage = 1;
  let hasMore = true;

  try {
    while (hasMore) {
      const result = await getEmployeesPage(currentPage, 100);
      const pageItems = result.items;
      if (pageItems.length === 0) break;

      allItems = [...allItems, ...pageItems];
      
      if (currentPage >= result.totalPages) {
        hasMore = false;
      } else {
        currentPage++;
      }

      // Safety cap to prevent infinite loops in case of API issues
      if (currentPage > 50) break; 
    }

    if (typeof window !== "undefined" && (window as Window & { __DEBUG__?: unknown }).__DEBUG__) {
      console.log("👥 All employee data consolidated:", {
        totalFetched: allItems.length,
        data: allItems,
        timestamp: new Date().toISOString(),
      });
    }

    return allItems;
  } catch (error) {
    console.warn("⚠️ Failed to fetch all employees:", error);
    return allItems; // Return what we have so far
  }
}

export async function getEmployeesPage(
  page = 1,
  perPage = 10,
  params: PaginationParams = {}
): Promise<PaginatedResult<EmployeeItem>> {
  const response = await api.get<ApiResponse<unknown>>("employees", {
    params: { ...params, page, per_page: perPage },
  });

  return parsePaginatedResponse<EmployeeItem>(response.data, isEmployeeItem);
}

export async function getEmployeeSummary(): Promise<EmployeeSummary> {
  const response = await api.get<ApiResponse<EmployeeSummary>>("employees/summary");
  const body = response.data as ApiResponse<EmployeeSummary> & { payload?: EmployeeSummary };
  const summary = body.data ?? body.payload;

  return {
    total: Number(summary?.total ?? 0),
    active: Number(summary?.active ?? 0),
    departments: Number(summary?.departments ?? 0),
    positions: Number(summary?.positions ?? 0),
    department_breakdown: Array.isArray(summary?.department_breakdown)
      ? summary.department_breakdown.map((item) => ({
          name: String(item?.name ?? ""),
          count: Number(item?.count ?? 0),
        }))
      : [],
  };
}

/**
 * Get single employee record
 */
export async function getEmployeeDetail(id: string | number): Promise<EmployeeItem> {
  try {
    const response = await api.get<ApiResponse<EmployeeItem>>(`employees/${id}`);

    if (!response?.data) {
      throw new Error("No employee data found");
    }

    const item = extractItemFromResponse(response.data);
    if (!item) {
      throw new Error(`Invalid employee data structure for ID ${id}`);
    }

    return item;
  } catch (error) {
    handleApiError(error, `Failed to fetch employee ${id}`);
  }
}

/**
 * Create new employee record
 */
export async function createEmployee(payload: EmployeeCreatePayload): Promise<EmployeeItem> {
  try {
    const response = await api.post<ApiResponse<EmployeeItem>>("employees", payload);

    if (!response?.data) {
      throw new Error("Invalid response after creating employee");
    }

    const item = extractItemFromResponse(response.data);
    if (!item) {
      throw new Error("No employee data in response");
    }

    return item;
  } catch (error) {
    handleApiError(error, "Failed to create employee");
  }
}

/**
 * Update employee record
 */
export async function updateEmployee(id: string | number, payload: EmployeeUpdatePayload): Promise<EmployeeItem> {
  try {
    const response = await api.put<ApiResponse<EmployeeItem>>(`employees/${id}`, payload);

    if (!response?.data) {
      throw new Error("Invalid response after updating employee");
    }

    const item = extractItemFromResponse(response.data);
    if (!item) {
      throw new Error("No employee data in response");
    }

    return item;
  } catch (error) {
    handleApiError(error, `Failed to update employee ${id}`);
  }
}

/**
 * Delete employee record
 */
export async function deleteEmployee(id: string | number): Promise<void> {
  try {
    await api.delete(`employees/${id}`);

    if (typeof window !== "undefined" && (window as Window & { __DEBUG__?: unknown }).__DEBUG__) {
      console.log(`🗑️ Employee ${id} deleted successfully`);
    }
  } catch (error) {
    handleApiError(error, `Failed to delete employee ${id}`);
  }
}

/**
 * Start employee onboarding
 */
export async function startOnboarding(id: string | number, payload: EmployeeOnboardingPayload): Promise<void> {
  try {
    await api.put(`employees/${id}/onboarding/start`, payload);
  } catch (error) {
    handleApiError(error, `Failed to start onboarding for employee ${id}`);
  }
}

/**
 * Complete employee onboarding
 */
export async function completeOnboarding(id: string | number): Promise<void> {
  try {
    await api.put(`employees/${id}/onboarding/complete`);
  } catch (error) {
    handleApiError(error, `Failed to complete onboarding for employee ${id}`);
  }
}

/**
 * Start employee offboarding
 */
export async function startOffboarding(id: string | number, payload: EmployeeOffboardingPayload): Promise<void> {
  try {
    await api.put(`employees/${id}/offboarding/start`, payload);
  } catch (error) {
    handleApiError(error, `Failed to start offboarding for employee ${id}`);
  }
}

/**
 * Complete employee offboarding
 */
export async function completeOffboarding(id: string | number): Promise<void> {
  try {
    await api.put(`employees/${id}/offboarding/complete`);
  } catch (error) {
    handleApiError(error, `Failed to complete offboarding for employee ${id}`);
  }
}
// Export as a service object for easier usage in components
export const employeeService = {
  getEmployees: getAllEmployees,
  getEmployeeSummary,
  getEmployeeDetail,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  startOnboarding,
  completeOnboarding,
  startOffboarding,
  completeOffboarding,
};
