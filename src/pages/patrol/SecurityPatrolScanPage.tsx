import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, MapPin, QrCode, RefreshCw, ScanLine, ShieldCheck } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { PageHeader } from "@/shared/ui";
import { showToast } from "@/shared/ui/toast";
import { patrolService } from "@/features/patrol/api/patrol.service";
import "./SecurityPatrolPage.css";

import jsQR from "jsqr";

const parseQrCode = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    return parsed.qr_code || parsed.code || parsed.token || trimmed;
  } catch {
    return trimmed;
  }
};

const getPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });

const SecurityPatrolScanPage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Mulai kamera lalu scan QR checkpoint di ruangan.");
  const [loading, setLoading] = useState(false);
  const [lastCode, setLastCode] = useState("");
  const [lastCheckpoint, setLastCheckpoint] = useState<string | null>(null);

  const stopCamera = () => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraActive(false);
  };

  useEffect(() => stopCamera, []);

  const submitScan = async (rawValue: string) => {
    const qr_code = parseQrCode(rawValue);
    if (!qr_code || loading || qr_code === lastCode) return;

    setLastCode(qr_code);
    setLoading(true);
    setStatus("QR terbaca. Mengambil lokasi dan menyimpan bukti ronda...");

    try {
      const position = await getPosition();
      const scan = await patrolService.scan({
        qr_code,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        notes: notes.trim() || undefined,
      });

      const checkpointName = scan.checkpoint?.name ?? "Checkpoint";
      setLastCheckpoint(checkpointName);
      setStatus(`${checkpointName} berhasil discan.`);
      showToast("Patrol checkpoint tersimpan", "success");
      stopCamera();
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Gagal menyimpan patrol scan";
      setStatus(message);
      showToast(message, "error");
      setTimeout(() => setLastCode(""), 1500);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatus("Kamera aktif. Arahkan ke QR checkpoint ruangan.");
      scanningRef.current = true;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const scanLoop = async () => {
        if (!scanningRef.current || !videoRef.current || !ctx) return;
        
        try {
          if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });
            
            if (code && code.data) {
              await submitScan(code.data);
              return;
            }
          }
        } catch {
          stopCamera();
          showToast("Kamera bermasalah atau terputus.", "error");
          return;
        }
        window.setTimeout(scanLoop, 500);
      };
      
      void scanLoop();
    } catch {
      setStatus("Kamera tidak bisa diakses.");
      showToast("Izinkan akses kamera dari browser.", "error");
    }
  };

  return (
    <div className="patrol-page">
      <PageHeader
        title="Scan QR Ronda Satpam"
        subtitle="Dipakai setelah jam 20:00 untuk bukti satpam sudah keliling dan scan checkpoint ruangan."
        badge={{ icon: ShieldCheck, label: 'Security Patrol' }}
        actions={
          <Button variant="outline" size="md" onClick={cameraActive ? stopCamera : startCamera} disabled={loading}>
            {cameraActive ? <CameraOff size={16} /> : <Camera size={16} />}
            {cameraActive ? "Matikan Kamera" : "Aktifkan Kamera"}
          </Button>
        }
      />

      <div className="patrol-status-card">
        <CheckCircle2 size={22} />
        <div>
          <p>Status</p>
          <strong>{status}</strong>
          {lastCheckpoint && <span>Terakhir: {lastCheckpoint}</span>}
        </div>
      </div>

      <Card className="patrol-scan-card">
        <div className="patrol-video-frame">
          <video ref={videoRef} muted playsInline />
          {!cameraActive && (
            <div className="patrol-video-placeholder">
              <ScanLine size={42} />
              <span>Kamera belum aktif</span>
            </div>
          )}
        </div>

        <div className="patrol-manual-panel">
          <div>
            <h2>Input Manual Checkpoint</h2>
            <p>Fallback kalau kamera sulit membaca QR di area gelap.</p>
          </div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Catatan opsional, contoh: pintu gudang terkunci." />
          <div className="patrol-manual-form">
            <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Tempel kode QR checkpoint" />
            <Button variant="primary" size="md" onClick={() => submitScan(manualCode)} disabled={loading || !manualCode.trim()}>
              {loading ? <RefreshCw size={16} /> : <MapPin size={16} />}
              {loading ? "Menyimpan..." : "Simpan Scan"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SecurityPatrolScanPage;
