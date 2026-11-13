export interface MyReimbursementPayload {
  title: string;
  description: string;
  amount: number;
  category: string;
  expense_date: string;
  receipt_path: string;
}

export type GenericApiItem = Record<string, unknown>;
