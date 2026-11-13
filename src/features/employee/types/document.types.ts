export interface EmployeeDocument {
  id: number;
  employee_id: number;
  title: string;
  document_type: string;
  category: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'archived';
  file_name: string;
  file_path: string;
  file_mime: string;
  file_size: number;
  expires_at: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  is_confidential: boolean;
  file_url: string;
  created_at: string;
  updated_at: string;
}
