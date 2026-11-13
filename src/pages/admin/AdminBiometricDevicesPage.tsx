import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/shared/ui/Card";
import { showToast } from "@/shared/ui/toast";
import { Button } from "@/shared/ui/Button";
import { PageHeader } from "@/shared/ui";
import { getErrorMessage } from "@/shared/api/errorHandler";
import { MonitorCog, RefreshCw, Wifi, WifiOff, Plus, Edit2 } from "lucide-react";
import {
  getBiometricDevices,
  syncBiometricAttendance,
} from "@/features/admin/api/admin-batch1.service";
import type { BiometricDeviceItem } from "@/features/admin/types/admin.types";
import "@/shared/styles/CrudPage.css";
import "@/pages/dashboard/overview/OverviewPage.css";
import "@/pages/payroll/PayrollShared.css";
import "./AdminCrudPages.css";

const normalizeBoolean = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return lowered === "true" || lowered === "1" || lowered === "online" || lowered === "active";
  }
  return false;
};

const AdminBiometricDevicesPage = () => {
  const navigate = useNavigate();

  const [devices, setDevices] = useState<BiometricDeviceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncingId, setSyncingId] = useState<string | number | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDevices, setTotalDevices] = useState(0);

  const summary = useMemo(() => {
    const onlineCount = devices.filter((device) =>
      normalizeBoolean(device.is_online ?? device.online ?? device.status === "online")
    ).length;
    return {
      total: totalDevices,
      online: onlineCount,
      offline: Math.max(devices.length - onlineCount, 0),
    };
  }, [devices, totalDevices]);

  const paginatedDevices = devices;

  const loadDevices = async () => {
    setLoading(true);
    try {
      const result = await getBiometricDevices({ page: currentPage, per_page: pageSize });
      setDevices(Array.isArray(result.items) ? result.items : []);
      setTotalPages(result.totalPages);
      setTotalDevices(result.total);
    } catch (error: unknown) {
      showToast(getErrorMessage(error as Record<string, unknown>), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDevices();
  }, [currentPage, pageSize]);

  const handleSync = async (device: BiometricDeviceItem) => {
    const deviceId = device.id;
    if (deviceId === undefined || deviceId === null) return;

    setSyncingId(deviceId);

    try {
      await syncBiometricAttendance({
        device_id: deviceId,
      });
      const deviceName = typeof device.name === "string" ? device.name : String(deviceId);
      showToast(`Sinkronisasi kehadiran untuk perangkat ${deviceName} berhasil dijalankan.`, "success");
    } catch (error: unknown) {
      showToast(getErrorMessage(error as Record<string, unknown>), "error");
    } finally {
      setSyncingId(null);
    }
  };

  const summaryCards = [
    {
      label: "Total Device",
      subtitle: "Seluruh perangkat biometric",
      value: String(summary.total),
      change: "Terhubung dalam daftar admin",
      tone: "blue" as const,
      icon: MonitorCog,
    },
    {
      label: "Online",
      subtitle: "Device aktif dan merespon",
      value: String(summary.online),
      change: "Siap dipakai sinkronisasi",
      tone: "green" as const,
      icon: Wifi,
    },
    {
      label: "Offline",
      subtitle: "Butuh pengecekan jaringan",
      value: String(summary.offline),
      change: "Perlu tindak lanjut admin",
      tone: "orange" as const,
      icon: WifiOff,
    },
  ];

  return (
    <div className="crud-page">
      <PageHeader
        title="Biometric Devices"
        subtitle="Kelola perangkat biometric, pantau status koneksi, dan jalankan sinkronisasi attendance."
        badge={{ icon: MonitorCog, label: "Admin Center" }}
        actions={
          <>
            <button className="btn-outline" onClick={() => void loadDevices()} disabled={loading}>
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Memuat..." : "Segarkan"}
            </button>
            <button className="btn-primary" onClick={() => navigate("/admin/biometric-devices/create")}>
              <Plus size={16} />
              Tambah Device
            </button>
          </>
        }
      />

      <div className="leave-requests-wrapper">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="leave-summary-card">
              <div className="leave-summary-header">
                <div>
                  <p className="leave-summary-label">{card.label}</p>
                  <p className="leave-summary-subtitle">{card.subtitle}</p>
                </div>
                <div
                  className={`leave-summary-icon-wrapper leave-icon-${
                    card.tone === "blue"
                      ? "blue"
                      : card.tone === "green"
                        ? "green"
                        : card.tone === "orange"
                          ? "orange"
                          : "purple"
                  }`}
                >
                  <Icon size={28} />
                </div>
              </div>
              <div
                className={`leave-summary-value leave-value-${
                  card.tone === "blue"
                    ? "blue"
                    : card.tone === "green"
                      ? "green"
                      : card.tone === "orange"
                        ? "orange"
                        : "purple"
                }`}
              >
                {card.value}
              </div>
              <p className="leave-summary-trend">Status device</p>
            </div>
          );
        })}
      </div>

      <Card className="table-card" glass>
        <div className="table-header-bar">
          <h3>Daftar Device</h3>
          <span className="table-count">{totalDevices} device</span>
        </div>

        {devices.length > 0 ? (
          <>
            <div className="table-card-inner">
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Device</th>
                      <th>IP Address</th>
                      <th>Lokasi</th>
                      <th>Status</th>
                      <th>Terakhir Sinkron</th>
                      <th className="th-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDevices.map((device, index) => {
                      const deviceId = device.id ?? index;
                      const name = typeof device.name === "string" && device.name ? device.name : "Unnamed Device";
                      const ipAddress =
                        typeof device.ip_address === "string"
                          ? device.ip_address
                          : typeof device.ip === "string"
                            ? device.ip
                            : "-";
                      const location =
                        typeof device.location === "string"
                          ? device.location
                          : typeof device.branch === "string"
                            ? device.branch
                            : "-";
                      const isOnline = normalizeBoolean(
                        device.is_online ?? device.online ?? device.status === "online"
                      );
                      const lastSync =
                        device.last_sync_at || device.last_synced_at || device.updated_at || "-";

                      return (
                        <tr key={String(deviceId)}>
                          <td>
                            <span className="cell-id">{String(deviceId)}</span>
                          </td>
                          <td>
                            <div className="cell-name">
                              <div className="cell-avatar">
                                <MonitorCog size={14} />
                              </div>
                              <span className="cell-name-text">{name}</span>
                            </div>
                          </td>
                          <td>{ipAddress}</td>
                          <td>{location}</td>
                          <td>
                            <span
                              className={`status-badge ${
                                isOnline ? "status-badge--approved" : "status-badge--draft"
                              }`}
                            >
                              {isOnline ? "online" : "offline"}
                            </span>
                          </td>
                          <td className="cell-date">{String(lastSync)}</td>
                          <td className="td-center">
                            <div className="action-btn-group">
                              <button
                                className="action-btn action-btn-edit"
                                onClick={() => navigate(`/admin/biometric-devices/edit/${deviceId}`)}
                                title="Edit"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="action-btn"
                                onClick={() => void handleSync(device)}
                                disabled={syncingId === deviceId}
                                title="Sync"
                                style={{ background: "#f1f5f9", color: "#64748b" }}
                              >
                                <RefreshCw
                                  size={16}
                                  className={syncingId === deviceId ? "animate-spin" : ""}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            {totalPages > 1 && (
              <div className="table-pagination">
                <div className="pagination-info">
                  Menampilkan {(currentPage - 1) * pageSize + 1}-
                  {Math.min(currentPage * pageSize, totalDevices)} dari {totalDevices}
                </div>
                <div className="pagination-controls">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                  >
                    Sebelumnya
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-page-btn ${currentPage === page ? "active" : ""}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="table-card-inner">
            <div className="empty-state">
              <MonitorCog size={32} style={{ opacity: 0.4 }} />
              <p>Belum ada perangkat biometric yang terdaftar.</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminBiometricDevicesPage;
