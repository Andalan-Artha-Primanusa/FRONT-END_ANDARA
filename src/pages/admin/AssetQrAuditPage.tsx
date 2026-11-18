import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { ArrowLeft, Camera, QrCode, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, PageHeader } from "@/shared/ui";
import { assetService } from "@/features/assets/api/asset.service";
import { showToast } from "@/shared/ui/toast";

export default function AssetQrAuditPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [code, setCode] = useState("");
  const [asset, setAsset] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanning, setScanning] = useState(false);

  const lookup = async (value = code) => {
    if (!value.trim()) return;
    try {
      const result = await assetService.scanByCode(value.trim());
      setAsset(result?.data ?? result);
      setCode(value.trim());
    } catch { showToast("Aset tidak ditemukan", "error"); }
  };

  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    let frame = 0;
    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = context.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(image.data, image.width, image.height);
          if (result?.data) { void lookup(result.data); setScanning(false); return; }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [scanning]);

  const startCamera = async () => {
    const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    setStream(next); setScanning(true);
    if (videoRef.current) { videoRef.current.srcObject = next; await videoRef.current.play(); }
  };

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  return <div className="crud-page">
    <PageHeader title="Audit QR Aset" subtitle="Scan QR aset untuk melihat detail, pemegang, dan riwayat assignment." badge={{ icon: QrCode, label: "AUDIT ASET" }} actions={<button className="btn-secondary" onClick={() => navigate("/assets")}><ArrowLeft size={16} /> Kembali</button>} />
    <Card><div style={{ display: "grid", gap: 16, maxWidth: 720 }}>
      <div style={{ display: "flex", gap: 8 }}><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Masukkan kode aset" /><button className="btn-primary" onClick={() => void lookup()}><Search size={16} /> Cari</button><button className="btn-outline" onClick={() => void startCamera()}><Camera size={16} /> Scan</button></div>
      <video ref={videoRef} muted playsInline style={{ display: scanning ? "block" : "none", width: "100%", maxWidth: 480, borderRadius: 12 }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {asset && <div><h3>{asset.name}</h3><p>Kode: {asset.code}</p><p>Status: {asset.status}</p><p>Serial: {asset.serial_number || "-"}</p><p>Catatan audit: {asset.assignments?.length ?? 0} riwayat assignment.</p></div>}
    </div></Card>
  </div>;
}
