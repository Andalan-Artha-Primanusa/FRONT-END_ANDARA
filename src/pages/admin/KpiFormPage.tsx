import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { showToast } from '@/shared/ui/toast';
import { PageHeader } from '@/shared/ui';
import {
  Save,
  User,
  Calendar,
  Target,
  FileText,
  RefreshCw,
  ChevronLeft,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { getErrorMessage } from "@/shared/api/errorHandler";
import {
  createKpiPeriod,
  updateKpiPeriodItems,
  getKpiPeriodDetail,
} from "@/features/admin/api/kpi.service";
import { getAllEmployees } from "@/features/employee/api/employee.service";
import "@/shared/styles/CrudPage.css";
import "../dashboard/overview/OverviewPage.css";

const CATEGORIES: Record<string, string> = {
  financial: "Financial",
  customer: "Customer",
  operational: "Operational",
  employee: "Employee",
  sales: "Sales",
  project: "Project",
  quality: "Quality",
  compliance: "Compliance",
};

const FORMULAS: Record<string, string> = {
  standard: "Standard (A/T × 100)",
  growth: "Growth (%)",
  capped: "Capped (max 100)",
  efficiency: "Efficiency",
  quality: "Quality Rate",
  completion: "Completion Rate",
  manual: "Manual Input",
};

const MEASUREMENT_METHODS: Record<string, string> = {
  direct: "Direct Value",
  formula: "Formula Based",
  survey: "Survey Result",
  manual: "Manual Assessment",
};

type KpiItemForm = {
  tempId: string;
  indicator: string;
  description: string;
  category: string;
  measurement_method: string;
  formula_type: string;
  weight: string;
  target: string;
  achievement: string;
  source: string;
  existingId?: number;
};

const emptyItem = (): KpiItemForm => ({
  tempId: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
  indicator: "",
  description: "",
  category: "operational",
  measurement_method: "direct",
  formula_type: "standard",
  weight: "0",
  target: "0",
  achievement: "0",
  source: "",
});

const KpiFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);


  const [formData, setFormData] = useState({
    employee_id: "",
    period_type: "quarterly",
    period_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  const [items, setItems] = useState<KpiItemForm[]>([emptyItem()]);

  const totalWeight = items.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const weightOk = totalWeight === 100;

  useEffect(() => {
    const loadData = async () => {
      try {
        const empRes = await getAllEmployees();
        setEmployees(empRes);

        if (isEdit) {
          const res = await getKpiPeriodDetail(id);
          const data = res.data as any;
          setFormData({
            employee_id: String(data.employee_id),
            period_type: data.period_type,
            period_date: data.start_date || new Date().toISOString().slice(0, 10),
            notes: data.notes || "",
          });
          if (data.items && data.items.length > 0) {
            setItems(
              data.items.map((item: any) => ({
                tempId: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
                indicator: item.indicator,
                description: item.description || "",
                category: item.category || "operational",
                measurement_method: item.measurement_method || "direct",
                formula_type: item.formula_type || "standard",
                weight: String(item.weight),
                target: String(item.target),
                achievement: String(item.achievement || 0),
                source: item.source || "",
                existingId: item.id,
              }))
            );
          }
        }
      } catch (error) {
        showToast(getErrorMessage(error as never), "error");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, isEdit]);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (tempId: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };
  const updateItem = (tempId: string, field: string, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!weightOk) {
      showToast("Total bobot harus 100%", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await updateKpiPeriodItems(id, {
          notes: formData.notes,
          items: items.map((item) => ({
            ...(item.existingId ? { id: item.existingId } : {}),
            indicator: item.indicator,
            description: item.description,
            category: item.category,
            measurement_method: item.measurement_method,
            formula_type: item.formula_type,
            weight: Number(item.weight),
            target: Number(item.target),
            achievement: Number(item.achievement),
            source: item.source,
          })),
        });
      } else {
        await createKpiPeriod({
          employee_id: Number(formData.employee_id),
          period_type: formData.period_type,
          period_date: formData.period_date,
          notes: formData.notes,
          items: items.map((item) => ({
            indicator: item.indicator,
            description: item.description,
            category: item.category,
            measurement_method: item.measurement_method,
            formula_type: item.formula_type,
            weight: Number(item.weight),
            target: Number(item.target),
            source: item.source,
          })),
        });
      }
      navigate("/kpis", {
        state: {
          message: isEdit ? "Periode KPI berhasil diperbarui" : "Periode KPI berhasil dibuat",
        },
      });
    } catch (error) {
      showToast(getErrorMessage(error as never), "error");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="crud-page"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <RefreshCw size={32} className="animate-spin opacity-20" />
      </div>
    );
  }

  return (
    <div className="crud-page">
      <PageHeader
        title={isEdit ? "Ubah Periode KPI" : "Buat Periode KPI Baru"}
        subtitle={isEdit
          ? "Perbarui indikator dan pencapaian KPI periode ini."
          : "Buat periode KPI baru dengan indikator kinerja multi-item."}
        badge={{ icon: Target, label: "Manajemen KPI" }}
        style={{ marginBottom: "2rem" }}
        actions={
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate("/kpis")}
            disabled={loading}
          >
            <ChevronLeft size={18} />
            Kembali
          </button>
        }
      />

      <Card
        glass
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "40px 60px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.05)",
          borderRadius: 20,
        }}
      >
        <form onSubmit={handleSubmit}>
          <div
            className="form-sections"
            style={{ display: "flex", flexDirection: "column", gap: 32 }}
          >
            <div className="form-section">
              <h3
                style={{
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: "var(--text-secondary)",
                  marginBottom: 20,
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                  paddingBottom: 8,
                }}
              >
                Informasi Karyawan & Periode
              </h3>
              <div
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}
              >
                <div className="form-group" style={{ gridColumn: isEdit ? "span 3" : "span 1" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <User size={14} className="opacity-50" /> Karyawan
                  </label>
                  {isEdit ? (
                    <div
                      style={{
                        padding: "14px 18px",
                        background: "rgba(0,0,0,0.03)",
                        borderRadius: 10,
                        fontSize: 15,
                        fontWeight: 600,
                        border: "1px solid rgba(0,0,0,0.05)",
                        color: "var(--primary-color)",
                      }}
                    >
                      {formData.employee_id}
                    </div>
                  ) : (
                    <select
                      className="form-input"
                      value={formData.employee_id}
                      onChange={(e) =>
                        setFormData({ ...formData, employee_id: e.target.value })
                      }
                      required
                      style={{
                        width: "100%",
                        padding: 14,
                        borderRadius: 10,
                        border: "1px solid rgba(0,0,0,0.1)",
                        background: "#fff",
                        fontSize: 15,
                      }}
                    >
                      <option value="">Pilih Karyawan</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.user?.name || `Employee #${emp.id}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Calendar size={14} className="opacity-50" /> Tipe Periode
                  </label>
                  <select
                    className="form-input"
                    value={formData.period_type}
                    onChange={(e) =>
                      setFormData({ ...formData, period_type: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "#fff",
                      fontSize: 15,
                    }}
                  >
                    <option value="quarterly">Quarterly (3 Bulan)</option>
                    <option value="semi_annual">Semi-Annual (6 Bulan)</option>
                    <option value="annual">Annual (12 Bulan)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <Calendar size={14} className="opacity-50" /> Tanggal Periode
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.period_date}
                    onChange={(e) =>
                      setFormData({ ...formData, period_date: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: 14,
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.1)",
                      background: "#fff",
                      fontSize: 15,
                    }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <FileText size={14} className="opacity-50" /> Catatan
                </label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Catatan tambahan untuk periode ini..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: 14,
                    borderRadius: 10,
                    border: "1px solid rgba(0,0,0,0.1)",
                    background: "#fff",
                    fontSize: 15,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>

            <div className="form-section">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                  paddingBottom: 8,
                }}
              >
                <h3
                  style={{
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                    color: "var(--text-secondary)",
                    margin: 0,
                  }}
                >
                  <Layers size={14} style={{ marginRight: 6 }} />
                  Item KPI
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: weightOk ? "#10b981" : "#ef4444",
                    }}
                  >
                    Bobot: {totalWeight}%
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addItem}
                  >
                    <Plus size={14} /> Tambah Item
                  </Button>
                </div>
              </div>

              {items.map((item, index) => (
                <div
                  key={item.tempId}
                  style={{
                    padding: 20,
                    marginBottom: 16,
                    background: "rgba(0,0,0,0.02)",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-secondary)" }}>
                      Item #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 13,
                          padding: "4px 8px",
                          borderRadius: 6,
                        }}
                      >
                        <Trash2 size={14} /> Hapus
                      </button>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <div className="form-group" style={{ gridColumn: "span 2" }}>
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Indikator <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Nama indikator kinerja..."
                        value={item.indicator}
                        onChange={(e) => updateItem(item.tempId, "indicator", e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Kategori
                      </label>
                      <select
                        className="form-input"
                        value={item.category}
                        onChange={(e) => updateItem(item.tempId, "category", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                          background: "#fff",
                        }}
                      >
                        {Object.entries(CATEGORIES).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Formula
                      </label>
                      <select
                        className="form-input"
                        value={item.formula_type}
                        onChange={(e) => updateItem(item.tempId, "formula_type", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                          background: "#fff",
                        }}
                      >
                        {Object.entries(FORMULAS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Metode Pengukuran
                      </label>
                      <select
                        className="form-input"
                        value={item.measurement_method}
                        onChange={(e) => updateItem(item.tempId, "measurement_method", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                          background: "#fff",
                        }}
                      >
                        {Object.entries(MEASUREMENT_METHODS).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Bobot (%) <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        max="100"
                        value={item.weight}
                        onChange={(e) => updateItem(item.tempId, "weight", e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Target <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0"
                        min="0"
                        value={item.target}
                        onChange={(e) => updateItem(item.tempId, "target", e.target.value)}
                        required
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      />
                    </div>

                    {isEdit && (
                      <div className="form-group">
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                          Realisasi
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder="0"
                          min="0"
                          value={item.achievement}
                          onChange={(e) => updateItem(item.tempId, "achievement", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: "1px solid rgba(0,0,0,0.1)",
                            fontSize: 14,
                            fontWeight: 600,
                            color: "#8b5cf6",
                          }}
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                        Sumber Data
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Sumber data indikator..."
                        value={item.source}
                        onChange={(e) => updateItem(item.tempId, "source", e.target.value)}
                        style={{
                          width: "100%",
                          padding: "12px 14px",
                          borderRadius: 8,
                          border: "1px solid rgba(0,0,0,0.1)",
                          fontSize: 14,
                        }}
                      />
                    </div>

                    {!isEdit && (
                      <div className="form-group">
                        <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 6, display: "block" }}>
                          Deskripsi
                        </label>
                        <textarea
                          className="form-input"
                          rows={2}
                          placeholder="Deskripsi item..."
                          value={item.description}
                          onChange={(e) => updateItem(item.tempId, "description", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: "1px solid rgba(0,0,0,0.1)",
                            fontSize: 14,
                            resize: "vertical",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              marginTop: 48,
              display: "flex",
              gap: 16,
              justifyContent: "flex-end",
              borderTop: "1px solid rgba(0,0,0,0.05)",
              paddingTop: 32,
            }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/kpis")}
              style={{ padding: "0 32px" }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              disabled={!weightOk}
              style={{
                padding: "0 40px",
                boxShadow: weightOk
                  ? "0 10px 20px rgba(139, 92, 246, 0.2)"
                  : "none",
              }}
            >
              <Save size={18} />{" "}
              {isEdit ? "Simpan Perubahan" : "Simpan Periode KPI"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default KpiFormPage;
