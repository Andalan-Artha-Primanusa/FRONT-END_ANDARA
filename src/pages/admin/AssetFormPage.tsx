import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Box, Package, Tag,
  Hash, Info, Truck, DollarSign, Calendar
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Alert } from '@/shared/ui/Alert';
import { PageHeader } from '@/shared/ui';
import { assetService } from '@/features/assets/api/asset.service';
import '@/shared/styles/CrudPage.css';
import "../dashboard/overview/OverviewPage.css";

const FORM_STYLES = `
.asset-form-page .form-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.asset-form-page .form-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  align-items: start;
}

.asset-form-page .form-column {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.asset-form-page .field-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.asset-form-page .field-full {
  grid-column: 1 / -1;
}

.asset-form-page .field-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 6px;
  display: block;
}

.asset-form-page .field-required {
  color: #ef4444;
}

.asset-form-page .field-input {
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 1rem;
  color: #0f172a;
  box-sizing: border-box;
  transition: all 0.2s;
}

.asset-form-page .field-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10, 122, 62, 0.1);
}

.asset-form-page .field-input-icon {
  width: 100%;
  height: 50px;
  padding: 0 16px 0 44px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 1rem;
  color: #0f172a;
  box-sizing: border-box;
  transition: all 0.2s;
}

.asset-form-page .field-input-icon:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10, 122, 62, 0.1);
}

.asset-form-page .field-select {
  width: 100%;
  height: 50px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 1rem;
  color: #0f172a;
  box-sizing: border-box;
  transition: all 0.2s;
  cursor: pointer;
}

.asset-form-page .field-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10, 122, 62, 0.1);
}

.asset-form-page .field-textarea {
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: #fff;
  font-size: 1rem;
  color: #0f172a;
  box-sizing: border-box;
  transition: all 0.2s;
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
}

.asset-form-page .field-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(10, 122, 62, 0.1);
}

.asset-form-page .input-wrapper {
  position: relative;
}

.asset-form-page .input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.asset-form-page .input-prefix {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 700;
  pointer-events: none;
}

.asset-form-page .section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}

.asset-form-page .section-icon {
  padding: 10px;
  border-radius: 12px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.asset-form-page .section-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--color-primary-dark);
}

.asset-form-page .submit-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
}

@media (max-width: 768px) {
  .asset-form-page .form-grid {
    grid-template-columns: 1fr;
  }

  .asset-form-page .field-group {
    grid-template-columns: 1fr;
  }
}
`;

const AssetFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Electronics',
    brand: '',
    model: '',
    serial_number: '',
    condition: 'new',
    status: 'available',
    purchase_date: '',
    purchase_price: 0,
    notes: ''
  });

  useEffect(() => {
    if (isEdit) {
      const fetchAsset = async () => {
        setFetching(true);
        try {
          const res = await assetService.getAsset(id);
          const data = res.data || res;
          setFormData({
            ...data,
            purchase_price: Number(data.purchase_price) || 0
          });
        } catch (err: any) {
          setErrorMessage(err.message || "Gagal memuat detail aset.");
        } finally {
          setFetching(false);
        }
      };
      fetchAsset();
    }
  }, [id, isEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");
    try {
      if (isEdit) {
        await assetService.updateAsset(id, formData);
      } else {
        await assetService.createAsset(formData);
      }
      navigate('/inventory/assets');
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan data aset.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'purchase_price' ? Number(value) : value
    });
  };

  if (fetching) return (
    <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
      <Package className="animate-pulse" size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
      <p>Memuat detail aset...</p>
    </div>
  );

  return (
    <div className="crud-page asset-form-page">
      <style>{FORM_STYLES}</style>

      <PageHeader
        title={isEdit ? 'Edit Aset' : 'Tambah Aset Baru'}
        subtitle={isEdit ? 'Perbarui informasi detail aset perusahaan.' : 'Daftarkan aset baru ke dalam sistem inventaris.'}
        badge={{ icon: Package, label: "Inventaris Aset" }}
        actions={
          <button type="button" className="btn-outline" onClick={() => navigate('/inventory/assets')}>
            <ArrowLeft size={16} />
            Kembali
          </button>
        }
      />

      {errorMessage && (
        <div style={{ marginBottom: '2rem' }}>
          <Alert type="error" message={errorMessage} onClose={() => setErrorMessage("")} dismissible />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-column">
            <Card glass style={{ padding: '2.5rem', borderRadius: '32px' }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: 'linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))', boxShadow: '0 4px 12px rgba(10, 122, 62, 0.2)' }}>
                  <Box size={22} />
                </div>
                <h3 className="section-title">Informasi Utama</h3>
              </div>

              <div className="field-group">
                <div className="field-full">
                  <label className="field-label">Nama Aset <span className="field-required">*</span></label>
                  <div className="input-wrapper">
                    <Tag size={16} className="input-icon" />
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      placeholder="MacBook Pro M3 14-inch"
                      className="field-input-icon"
                    />
                  </div>
                </div>

                <div>
                  <label className="field-label">Kode Aset <span className="field-required">*</span></label>
                  <input
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    placeholder="AST-001"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Kategori</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="field-select"
                  >
                    <option value="Electronics">Elektronik</option>
                    <option value="Furniture">Furnitur</option>
                    <option value="Vehicle">Kendaraan</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Merek</label>
                  <input
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    placeholder="Apple"
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="field-label">Model</label>
                  <input
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    placeholder="A2918"
                    className="field-input"
                  />
                </div>

                <div className="field-full">
                  <label className="field-label">Nomor Seri</label>
                  <div className="input-wrapper">
                    <Hash size={16} className="input-icon" />
                    <input
                      name="serial_number"
                      value={formData.serial_number}
                      onChange={handleChange}
                      placeholder="SN123456789"
                      className="field-input-icon"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card glass style={{ padding: '2.5rem', borderRadius: '32px' }}>
              <div className="section-header">
                <div className="section-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}>
                  <Info size={22} />
                </div>
                <h3 className="section-title">Catatan Tambahan</h3>
              </div>
              <div>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={4}
                  placeholder="Tambahkan informasi spesifik mengenai aset ini..."
                  className="field-textarea"
                />
              </div>
            </Card>
          </div>

          <div className="form-column">
            <Card glass style={{ padding: '2rem', borderRadius: '28px' }}>
              <div className="section-header">
                <div style={{ padding: '8px', background: '#fef3c7', borderRadius: '10px', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Truck size={20} />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>Kondisi & Status</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="field-label">Kondisi Aset</label>
                  <select
                    name="condition"
                    value={formData.condition}
                    onChange={handleChange}
                    className="field-select"
                  >
                    <option value="new">Baru</option>
                    <option value="good">Baik</option>
                    <option value="fair">Cukup</option>
                    <option value="poor">Buruk</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Status Inventaris</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="field-select"
                  >
                    <option value="available">Tersedia</option>
                    <option value="assigned">Digunakan</option>
                    <option value="maintenance">Perbaikan</option>
                    <option value="retired">Dihapus</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card glass style={{ padding: '2rem', borderRadius: '28px' }}>
              <div className="section-header">
                <div style={{ padding: '8px', background: '#dcfce7', borderRadius: '10px', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={20} />
                </div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary-dark)' }}>Detail Finansial</h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="field-label">Harga Beli (Rp)</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">Rp</span>
                    <input
                      name="purchase_price"
                      type="text"
                      inputMode="numeric"
                      value={formData.purchase_price ? Number(formData.purchase_price).toLocaleString("id-ID") : ""}
                      onChange={(e) => setFormData({ ...formData, purchase_price: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                      placeholder="25.000.000"
                      style={{ width: '100%', height: '50px', padding: '0 12px 0 40px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(10, 122, 62, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
                <div>
                  <label className="field-label">Tanggal Pembelian</label>
                  <div className="input-wrapper">
                    <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
                    <input
                      name="purchase_date"
                      type="date"
                      value={formData.purchase_date}
                      onChange={handleChange}
                      style={{ width: '100%', height: '50px', padding: '0 12px 0 40px', borderRadius: '12px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '1rem', color: '#0f172a', boxSizing: 'border-box' }}
                      onFocus={(e) => { e.target.style.outline = 'none'; e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(10, 122, 62, 0.1)'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#cbd5e1'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <div className="submit-section">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={loading}
                style={{
                  height: '60px',
                  borderRadius: '20px',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  boxShadow: '0 10px 20px rgba(10, 122, 62, 0.2)'
                }}
              >
                <Save size={20} />
                {loading ? 'Menyimpan...' : isEdit ? 'Perbarui Aset' : 'Simpan Aset'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                onClick={() => navigate('/inventory/assets')}
                style={{ height: '54px', borderRadius: '20px', fontWeight: 700 }}
              >
                Batalkan
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AssetFormPage;
