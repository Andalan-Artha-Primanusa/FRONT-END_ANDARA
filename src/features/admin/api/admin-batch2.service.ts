import { api } from "@/shared/api/httpClient";

export const promotionService = {
  promoteEmployee: async (employeeId: string | number, data: any) => {
    const response = await api.post(`/employees/${employeeId}/promote`, data);
    return response.data;
  },
};

export const taxService = {
  calculateProgressiveTax: async (annualIncome: number) => {
    const response = await api.post('/tax/progressive/calculate', { annual_income: annualIncome });
    return response.data;
  },
};
