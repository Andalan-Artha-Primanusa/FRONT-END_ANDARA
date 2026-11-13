import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Clock, RefreshCw, Edit, Trash2, DollarSign, Search, Timer } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { LoadingState, ErrorState, EmptyState } from '@/shared/ui/DataStateDisplay';
import { PageHeader } from '@/shared/ui';
import { workforceService } from '@/features/workforce/api/workforce.service';
import { showToast } from '@/shared/ui/toast';
import '@/shared/styles/CrudPage.css';
import '@/pages/dashboard/overview/OverviewPage.css';

const OvertimeRulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Semua" | "Active" | "Inactive">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await workforceService.getOvertimeRules();
      setRules(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error(err);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRules = useMemo(() => {
    return rules.filter((rule: any) => {
      const name = String(rule?.name || '').toLowerCase();
      const code = String(rule?.code || '').toLowerCase();
      const query = searchText.toLowerCase();
      const matchSearch = name.includes(query) || code.includes(query);

      let statusMatch = true;
      if (activeTab === "Active") statusMatch = rule.status === 'active';
      else if (activeTab === "Inactive") statusMatch = rule.status === 'inactive';

      return matchSearch && statusMatch;
    });
  }, [rules, searchText, activeTab]);

  const paginatedRules = filteredRules;

  const [totalPages, setTotalPages] = useState(1);

  const summaryStats = useMemo(() => {
    const total = rules.length;
    const active = rules.filter((r: any) => r.status === 'active').length;
    const avgMultiplier = rules.length > 0
      ? (rules.reduce((acc: number, r: any) => acc + (r.multiplier || 0), 0) / rules.length).toFixed(1)
      : "0";

    return [
      { label: "Total Aturan", subtitle: "Seluruh aturan", value: total, tone: "blue" as const },
      { label: "Aturan Aktif", subtitle: "Aturan yang aktif", value: active, tone: "green" as const },
      { label: "Rata-rata", subtitle: "Multiplier rata-rata", value: `${avgMultiplier}x`, tone: "purple" as const },
    ];
  }, [rules]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      await workforceService.deleteOvertimeRule(deleteTarget.id);
      showToast('Aturan lembur berhasil dihapus', 'success');
      setDeleteTarget(null);
      fetchData();
    } catch (error: any) {
      console.error('Failed to delete overtime rule:', error);
      showToast(error?.response?.data?.message || error?.message || 'Gagal menghapus aturan lembur', 'error');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, activeTab]);

  return (
    <div className="crud-page">
      <PageHeader
        title="Aturan Lembur"
        subtitle="Konfigurasi pengganda gaji dan batasan jam lembur."
        badge={{ icon: Timer, label: "Workforce" }}
        actions={
          <>
            <button className="btn-outline" onClick={fetchData} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Segarkan
            </button>
            <button className="btn-primary" onClick={() => navigate('/workforce/overtime-rules/create')}>
              <Plus size={16} />
              Buat Aturan
            </button>
          </>
        }
      />

      <div className="employee-summary-wrapper">
        {summaryStats.map((card: any) => {
          const Icon = card.tone === "blue" ? Clock : card.tone === "green" ? DollarSign : Timer;
          return (
            <div key={card.label} className="employee-summary-card">
              <div className="employee-summary-header">
                <div>
                  <p className="employee-summary-label">{card.label}</p>
                  <p className="employee-summary-subtitle">{card.subtitle}</p>
                </div>
                <div className={`employee-summary-icon-wrapper employee-icon-${card.tone}`}>
                  <Icon size={28} />
                </div>
              </div>
              <div className={`employee-summary-value employee-value-${card.tone}`}>{card.value}</div>
              <p className="employee-summary-trend">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <Card className="analytics-title-card">
        <div className="analytics-title-inner">
          <div className="analytics-icon">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="analytics-title">Daftar Kebijakan Lembur</h2>
            <p className="analytics-subtitle">Kelola dan lihat semua aturan lembur</p>
          </div>
        </div>
      </Card>

      <div className="table-section integrated-table-section">
        <div className="wuw-table-area integrated-table-area">
      <Card className="control-section-card integrated-control-card integrated-table-toolbar">
        <div className="control-section-inner">
          <div className="elyra-tabs">
            {["Semua", "Active", "Inactive"].map((tab) => (
              <button
                key={tab}
                className={`elyra-tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab as "Semua" | "Active" | "Inactive")}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="control-actions">
            <div className="search-box">
              <div className="search-icon-inside"><Search size={18} /></div>
              <input
                type="text"
                placeholder="Cari kebijakan..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="search-input-pill"
              />
            </div>
          </div>
        </div>
      </Card>

          {loading && <LoadingState message="Memuat aturan lembur..." />}

          {!loading && paginatedRules.length === 0 && (
            <div style={{ padding: '5rem 0' }}>
              <EmptyState
                title="Belum Ada Aturan"
                message={searchText || activeTab !== "Semua"
                  ? "Tidak ada aturan yang sesuai dengan kriteria Anda."
                  : "Belum ada aturan lembur yang dibuat. Buat aturan pertama untuk memulai."}
                actionLabel="Buat Aturan"
                onAction={() => navigate('/workforce/overtime-rules/create')}
              />
            </div>
          )}

          {!loading && paginatedRules.length > 0 && (
            <>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '300px' }}>Kebijakan</th>
                      <th>Multiplier</th>
                      <th>Batas Harian</th>
                      <th>Kelayakan</th>
                      <th className="th-center">Status</th>
                      <th className="th-center" style={{ width: '120px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRules.map((rule: any) => (
                      <tr key={rule.id}>
                        <td>
                          <div className="cell-name">
                            <div className="cell-avatar">
                              {rule.name ? rule.name.charAt(0).toUpperCase() : "R"}
                            </div>
                            <div className="cell-stacked">
                              <span className="cell-name-text">{rule.name}</span>
                              <span className="cell-stacked__sub">CODE: {rule.code || 'OT-DFT'}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#16a34a' }}>{rule.multiplier}x</span>
                        </td>
                        <td>
                          <span style={{ color: '#475569', fontWeight: 600 }}>{rule.max_hours_per_day || 0} Jam</span>
                        </td>
                        <td>
                          <span style={{ color: '#64748b', fontWeight: 500 }}>{rule.eligibility || 'Semua Staff'}</span>
                        </td>
                        <td className="td-center">
                          <span className={`status-badge ${rule.status === 'active' ? 'status-badge--approved' : 'status-badge--draft'}`}>
                            {rule.status || 'Active'}
                          </span>
                        </td>
                        <td className="td-center">
                          <div className="action-btn-group">
                            <button
                              className="action-btn action-btn-edit"
                              onClick={() => navigate(`/workforce/overtime-rules/edit/${rule.id}`)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              className="action-btn action-btn-delete"
                              onClick={() => setDeleteTarget(rule)}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <div className="pagination-info">
                  {filteredRules.length === 0
                    ? 'Menampilkan 0 data'
                    : `Menampilkan ${(currentPage - 1) * pageSize + 1}-${Math.min(currentPage * pageSize, filteredRules.length)} dari ${filteredRules.length} data`}
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Hapus Aturan Lembur"
        message={`Aturan "${deleteTarget?.name || 'ini'}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hapus"
        cancelLabel="Batal"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default OvertimeRulesPage;
