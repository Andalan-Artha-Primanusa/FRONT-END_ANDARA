export interface TrainingProgram {
  id: string | number;
  title: string;
  category?: string;
  description?: string;
  provider?: string;
  mode?: 'online' | 'offline' | 'hybrid';
  start_date?: string;
  end_date?: string;
  budget?: number | string;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  created_at?: string;
  updated_at?: string;
  enrollments?: TrainingEnrollment[];
  // Legacy compat fields
  nama?: string;
  deskripsi?: string;
  jadwal?: string;
}

export interface TrainingEnrollment {
  id: string | number;
  training_program_id: number;
  employee_id: number;
  status: 'pending' | 'enrolled' | 'in_progress' | 'completed' | 'cancelled';
  score?: number | string;
  certificate_path?: string;
  notes?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  program?: TrainingProgram;
  employee?: {
    id: number;
    employee_code?: string;
    user_id?: number;
    user?: {
      id: number;
      name: string;
      email?: string;
      profile?: any;
    };
    manager?: {
      profile?: any;
    };
  };
}

export interface Competency {
  id: string | number;
  name: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface EmployeeCompetency extends Competency {
  employee_id: string | number;
  assigned_at: string;
  score?: number;
  assessor?: {
    id: number;
    name: string;
    email?: string;
  };
}
