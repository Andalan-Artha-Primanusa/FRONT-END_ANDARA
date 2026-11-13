import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from '@/shared/ui/toast';
import { ChevronLeft, Tag } from "lucide-react";
import { createWorkSchedule } from "@/features/work-schedule/api/work-schedule.service";
import WorkScheduleForm, { type WorkScheduleFormState } from "./components/WorkScheduleForm";
import "./WorkScheduleFormContainer.css";
import "../dashboard/overview/OverviewPage.css";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui";

const WorkScheduleCreatePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);


  const [formData, setFormData] = useState<WorkScheduleFormState>({
    name: "",
    check_in_time: "08:00",
    check_out_time: "17:00",
    grace_period: "10",
  });

  const handleCreate = async () => {
    setLoading(true);
    try {
      await createWorkSchedule({
        ...formData,
        grace_period: Number(formData.grace_period),
      });
      showToast("Jadwal kerja berhasil dibuat", "success");
      setTimeout(() => navigate("/work-schedules"), 1500);
    } catch (err: any) {
      showToast(err.message || "Gagal membuat jadwal kerja", "error");
      setLoading(false);
    }
  };

  return (
    <div className="crud-page">
      <PageHeader
        title="Buat Jadwal Baru"
        subtitle="Tambahkan shift kerja baru ke dalam sistem."
        badge={{ icon: Tag, label: "Workforce Center" }}
        actions={
          <button type="button" className="btn-outline" onClick={() => navigate("/work-schedules")} disabled={loading}>
            <ChevronLeft size={16} style={{ marginRight: '8px' }} />
            Kembali
          </button>
        }
        style={{ marginBottom: '2rem' }}
      />

      <WorkScheduleForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreate}
        onCancel={() => navigate("/work-schedules")}
        loading={loading}
        isUpdate={false}
      />
    </div>
  );
};

export default WorkScheduleCreatePage;
