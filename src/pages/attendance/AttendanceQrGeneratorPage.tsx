import { useEffect, useMemo, useState } from "react";
import { Clock, QrCode, RefreshCw } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { showToast } from "@/shared/ui/toast";
import { companyService, type Company } from "@/features/company/api/company.service";
import { qrAttendanceService } from "@/features/attendance/api/qr-attendance.service";
import { getActiveLocations } from "@/features/location/api/location.service";
import type { LocationItem } from "@/features/location/types/location.types";
import "./AttendancePages.css";
import "./AttendanceQrGeneratorPage.css";

const AttendanceQrGeneratorPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [purpose, setPurpose] = useState<"attendance" | "check_in" | "check_out">("attendance");
  const [ttl, setTtl] = useState(120);
  const [token, setToken] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);

  const qrPayload = useMemo(() => token ? JSON.stringify({ type: "hris-attendance", token }) : "", [token]);
  const qrImageUrl = useMemo(
    () => qrPayload ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrPayload)}` : "",
    [qrPayload],
  );

  useEffect(() => {
    const init = async () => {
      try {
        const [companyData, locationData] = await Promise.all([
          companyService.list(),
          getActiveLocations().then((result) => result.items),
        ]);
        setCompanies(companyData);
        setLocations(locationData);
        if (companyData[0]) setCompanyId(String(companyData[0].id));
        if (locationData[0]) setLocationId(String(locationData[0].id));
      } catch {
        showToast("Gagal memuat data generator QR", "error");
      }
    };
    void init();
  }, []);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await qrAttendanceService.generate({
        company_id: companyId ? Number(companyId) : undefined,
        location_id: locationId ? Number(locationId) : undefined,
        purpose,
        ttl_seconds: ttl,
      });
      setToken(result.token);
      setExpiresAt(result.expires_at);
      showToast("QR attendance berhasil dibuat", "success");
    } catch (error: any) {
      showToast(error.response?.data?.message || "Gagal membuat QR", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="crud-page attendance-page qr-generator-page">
      <PageHeader
        title="Generate QR Attendance"
        subtitle="Buat QR dinamis untuk company, lokasi, dan sesi absensi."
        badge={{ icon: QrCode, label: 'QR Attendance' }}
        actions={
          <Button variant="primary" size="md" onClick={generate} disabled={loading}>
            {loading ? <RefreshCw size={16} /> : <QrCode size={16} />}
            {loading ? "Membuat..." : "Generate QR"}
          </Button>
        }
      />

      <div className="qr-generator-grid">
        <Card className="qr-generator-form">
          <label>Company
            <select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
              <option value="">Tanpa company spesifik</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label>Lokasi
            <select value={locationId} onChange={(event) => setLocationId(event.target.value)}>
              <option value="">Tanpa lokasi spesifik</option>
              {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
            </select>
          </label>
          <label>Tujuan
            <select value={purpose} onChange={(event) => setPurpose(event.target.value as typeof purpose)}>
              <option value="attendance">Attendance</option>
              <option value="check_in">Check In</option>
              <option value="check_out">Check Out</option>
            </select>
          </label>
          <label>Expired dalam detik
            <input type="number" min={30} max={3600} value={ttl} onChange={(event) => setTtl(Number(event.target.value))} />
          </label>
        </Card>

        <Card className="qr-output-card">
          {qrImageUrl ? (
            <>
              <img src={qrImageUrl} alt="QR attendance" />
              <div className="qr-expiry">
                <Clock size={16} />
                Expired: {expiresAt ? new Date(expiresAt).toLocaleString("id-ID") : "-"}
              </div>
              <textarea value={qrPayload} readOnly />
            </>
          ) : (
            <div className="qr-output-empty">
              <QrCode size={48} />
              <span>QR akan tampil setelah generate.</span>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default AttendanceQrGeneratorPage;
