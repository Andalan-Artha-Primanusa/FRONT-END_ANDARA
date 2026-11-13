import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { payrollService } from "@/features/payroll/api/payroll.service";
import type { PayrollSlip } from "@/features/payroll/types/payroll.types";
import "@/shared/styles/CrudPage.css";
import "./PayrollSlipPage.css";

const PayrollSlipPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [slip, setSlip] = useState<PayrollSlip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSlip = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const response = await payrollService.getPayrollSlip(id);
        // API returns { success: true, data: {...} }
        const data = response?.data || response;
        setSlip(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal memuat slip gaji");
      } finally {
        setLoading(false);
      }
    };
    void loadSlip();
  }, [id]);

  const formatCurrency = (value: number) => `Rp ${(value || 0).toLocaleString("id-ID")}`;

  if (loading) {
    return (
      <div className="crud-page">
        <Card className="crud-card">
          <div style={{ padding: "2rem", textAlign: "center" }}>Memuat slip gaji...</div>
        </Card>
      </div>
    );
  }

  if (error || !slip) {
    return (
      <div className="crud-page">
        <Card className="crud-card">
          <div style={{ padding: "2rem", textAlign: "center", color: "#ef4444" }}>
            {error || "Slip gaji tidak ditemukan"}
            <br />
            <button onClick={() => navigate(-1)} style={{ marginTop: "1rem" }}>
              Kembali
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const { employee, period, summary, earnings, deductions } = slip;

  return (
    <div className="crud-page">
      <Card className="crud-card payroll-slip-card">
        {/* Header */}
        <div className="payroll-slip-header">
          <div className="slip-company-info">
            <h1>PT. HRIS Indonesia</h1>
            <p>Jl. Sudirman No. 123, Jakarta Selatan</p>
            <p>Telp: (021) 123-4567 | Email: hr@hris.co.id</p>
          </div>
          <div className="slip-title">
            <h2>SLIP GAJI</h2>
            <p>Periode: {period}</p>
          </div>
        </div>

        {/* Employee Info */}
        <div className="payroll-slip-employee">
          <div className="slip-employee-grid">
            <div>
              <strong>Nama</strong>
              <p>{employee?.name || "-"}</p>
            </div>
            <div>
              <strong>ID Karyawan</strong>
              <p>{employee?.employee_code || employee?.id || "-"}</p>
            </div>
            <div>
              <strong>Departemen</strong>
              <p>{employee?.department || "-"}</p>
            </div>
            <div>
              <strong>Posisi</strong>
              <p>{employee?.position || "-"}</p>
            </div>
            <div>
              <strong>Email</strong>
              <p>{employee?.email || "-"}</p>
            </div>
          </div>
        </div>

        {/* Earnings & Deductions */}
        <div className="payroll-slip-body">
          <div className="slip-section">
            <h3>Pendapatan (Earnings)</h3>
            <table className="slip-table">
              <tbody>
                <tr>
                  <td>Gaji Pokok (Basic Salary)</td>
                  <td className="amount">{formatCurrency(summary.basic_salary)}</td>
                </tr>
                {earnings?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td className="amount">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                <tr className="slip-subtotal">
                  <td><strong>Total Pendapatan</strong></td>
                  <td className="amount"><strong>{formatCurrency(summary.gross_pay)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="slip-section">
            <h3>Potongan (Deductions)</h3>
            <table className="slip-table">
              <tbody>
                {deductions?.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.name}</td>
                    <td className="amount">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
                <tr className="slip-subtotal">
                  <td><strong>Total Potongan</strong></td>
                  <td className="amount"><strong>{formatCurrency(summary.total_deduction)}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="payroll-slip-summary">
          <div className="slip-summary-row">
            <span>Gross Pay</span>
            <span>{formatCurrency(summary.gross_pay)}</span>
          </div>
          <div className="slip-summary-row">
            <span>Total Potongan</span>
            <span>- {formatCurrency(summary.total_deduction)}</span>
          </div>
          <div className="slip-summary-row total">
            <span><strong>Take Home Pay</strong></span>
            <span><strong>{formatCurrency(summary.take_home_pay)}</strong></span>
          </div>
        </div>

        {/* Footer */}
        <div className="payroll-slip-footer">
          <p>Slip ini digenerate secara otomatis oleh sistem HRIS</p>
          <p>Status: {slip.status}</p>
        </div>

        {/* Actions */}
        <div className="payroll-slip-actions">
          <button className="btn-outline" onClick={() => window.print()}>
            Cetak / Print
          </button>
          <button className="btn-outline" onClick={() => navigate(-1)}>
            Kembali
          </button>
        </div>
      </Card>
    </div>
  );
};

export default PayrollSlipPage;
