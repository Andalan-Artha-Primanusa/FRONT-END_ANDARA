import { useEffect, useState } from "react";
import { CheckCircle2, Fingerprint, LocateFixed, RefreshCw, Timer, XCircle } from "lucide-react";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { LoadingState } from "@/shared/ui/DataStateDisplay";
import { showToast } from "@/shared/ui/toast";
import { andalanAttendanceService, type AndalanAttendanceLocation } from "../api/andalan-attendance.service";
import { authenticateBiometric, registerBiometric } from "../utils/webauthn";
import "./AndalanAttendanceCard.css";

type Props = { mode: "check-in" | "check-out" };

const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("Browser tidak mendukung GPS."));
    return;
  }
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0,
  });
});

const AndalanAttendanceCard = ({ mode }: Props) => {
  const [today, setToday] = useState<Record<string, any> | null>(null);
  const [location, setLocation] = useState<AndalanAttendanceLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registeringBiometric, setRegisteringBiometric] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(() => sessionStorage.getItem("andara_biometric_registered") === "1");
  const [message, setMessage] = useState("Memuat setting lokasi absensi...");

  const load = async () => {
    setLoading(true);
    try {
      const [locations, attendance] = await Promise.all([
        andalanAttendanceService.locations(),
        andalanAttendanceService.today(),
      ]);
      setLocation(locations.find((item) => item.is_default) ?? locations[0] ?? null);
      setToday(attendance ?? null);
      setMessage(locations.length > 0 ? "GPS akan divalidasi berdasarkan radius lokasi yang ditentukan." : "Belum ada setting lokasi absensi.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || error?.message || "Gagal memuat setting absensi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const submit = async () => {
    setSubmitting(true);
    setMessage("Meminta verifikasi Face ID/biometrik...");
    try {
      const biometricToken = await authenticateBiometric();
      setMessage("Verifikasi berhasil. Mengambil posisi GPS...");
      const position = await getPosition();
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const result = mode === "check-in"
        ? await andalanAttendanceService.checkIn(latitude, longitude, biometricToken)
        : await andalanAttendanceService.checkOut(latitude, longitude, biometricToken);
      setToday(result?.attendance ?? result ?? null);
      setMessage(mode === "check-in" ? "Check-in berhasil tersimpan." : "Check-out berhasil tersimpan.");
      showToast(mode === "check-in" ? "Check-in berhasil" : "Check-out berhasil", "success");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || "Absensi gagal.";
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const enableBiometric = async () => {
    setRegisteringBiometric(true);
    setMessage("Mendaftarkan Face ID/biometrik perangkat...");
    try {
      await registerBiometric();
      setBiometricRegistered(true);
      setMessage("Face ID/biometrik aktif. Gunakan tombol absensi untuk verifikasi.");
      showToast("Face ID/biometrik berhasil diaktifkan", "success");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Pendaftaran biometrik gagal.";
      setMessage(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setRegisteringBiometric(false);
    }
  };

  if (loading) {
    return <Card className="andalan-attendance-card"><LoadingState message="Memuat absensi..." /></Card>;
  }

  const checkedIn = Boolean(today?.check_in_at);
  const checkedOut = Boolean(today?.check_out_at);
  const disabled = submitting || !location || (mode === "check-in" ? checkedIn : !checkedIn || checkedOut);

  return (
    <div className="andalan-attendance-stack">
      <Card className="andalan-attendance-card">
        <div className="andalan-attendance-header">
          <div>
            <span className="andalan-attendance-kicker"><LocateFixed size={15} /> Absensi GPS ANDARA</span>
            <h1>{mode === "check-in" ? "Check-in Kehadiran" : "Check-out Kehadiran"}</h1>
            <p>{message}</p>
          </div>
          <div className="andalan-attendance-icon"><Timer size={26} /></div>
        </div>

        <div className="andalan-attendance-info-grid">
          <div><span>Lokasi</span><strong>{location?.name || "Belum diatur"}</strong></div>
          <div><span>Radius</span><strong>{location ? `${location.radius} meter` : "-"}</strong></div>
          <div><span>Project</span><strong>{location?.project_id || location?.location_code || "Global"}</strong></div>
          <div><span>Status Hari Ini</span><strong>{checkedOut ? "Selesai" : checkedIn ? "Sudah Check-in" : "Belum Check-in"}</strong></div>
        </div>

        <div className="andalan-attendance-actions">
          <Button variant="outline" size="lg" onClick={() => void enableBiometric()} disabled={submitting || registeringBiometric}>
            {registeringBiometric ? <RefreshCw size={17} className="animate-spin" /> : <Fingerprint size={17} />}
            {registeringBiometric ? "Menyiapkan..." : biometricRegistered ? "Daftarkan ulang Face ID" : "Aktifkan Face ID"}
          </Button>
          <Button variant="primary" size="lg" onClick={() => void submit()} disabled={disabled}>
            {submitting ? <RefreshCw size={17} className="animate-spin" /> : mode === "check-in" ? <CheckCircle2 size={17} /> : <XCircle size={17} />}
            {submitting ? "Memproses..." : mode === "check-in" ? "Ambil Posisi & Check-in" : "Ambil Posisi & Check-out"}
          </Button>
          <Button variant="outline" size="lg" onClick={() => void load()} disabled={submitting}>
            <RefreshCw size={17} /> Segarkan
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AndalanAttendanceCard;
