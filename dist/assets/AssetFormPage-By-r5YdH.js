import{r as e}from"./rolldown-runtime-hePW80VL.js";import{v as t}from"./vendor-charts-BnUX6R_L.js";import{Ct as n,H as r,Ot as i,T as a,Vn as o,Xt as s,er as c,g as l,jn as u,nr as d,nt as f,t as p,wn as m}from"./vendor-react-DSA084I3.js";import{t as h}from"./Button-DSuNyCE8.js";import{i as g,l as _}from"./index-BUQQrP7q.js";/* empty css                 *//* empty css                     */import{t as v}from"./Alert-BHan37Yw.js";import{t as y}from"./asset.service-Da7_a8tN.js";var b=e(t(),1),x=p(),S=`
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
`,C=()=>{let e=c(),{id:t}=d(),p=!!t,[C,w]=(0,b.useState)(!1),[T,E]=(0,b.useState)(!1),[D,O]=(0,b.useState)(``),[k,A]=(0,b.useState)({code:``,name:``,category:`Electronics`,brand:``,model:``,serial_number:``,condition:`new`,status:`available`,purchase_date:``,purchase_price:0,notes:``});(0,b.useEffect)(()=>{p&&(async()=>{E(!0);try{let e=await y.getAsset(t),n=e.data||e;A({...n,purchase_price:Number(n.purchase_price)||0})}catch(e){O(e.message||`Gagal memuat detail aset.`)}finally{E(!1)}})()},[t,p]);let j=async n=>{n.preventDefault(),w(!0),O(``);try{p?await y.updateAsset(t,k):await y.createAsset(k),e(`/inventory/assets`)}catch(e){O(e.message||`Gagal menyimpan data aset.`)}finally{w(!1)}},M=e=>{let{name:t,value:n}=e.target;A({...k,[t]:t===`purchase_price`?Number(n):n})};return T?(0,x.jsxs)(`div`,{style:{padding:`4rem`,textAlign:`center`,color:`#64748b`},children:[(0,x.jsx)(f,{className:`animate-pulse`,size:48,style:{margin:`0 auto 1rem`,opacity:.2}}),(0,x.jsx)(`p`,{children:`Memuat detail aset...`})]}):(0,x.jsxs)(`div`,{className:`crud-page asset-form-page`,children:[(0,x.jsx)(`style`,{children:S}),(0,x.jsx)(g,{title:p?`Edit Aset`:`Tambah Aset Baru`,subtitle:p?`Perbarui informasi detail aset perusahaan.`:`Daftarkan aset baru ke dalam sistem inventaris.`,badge:{icon:f,label:`Inventaris Aset`},actions:(0,x.jsxs)(`button`,{type:`button`,className:`btn-outline`,onClick:()=>e(`/inventory/assets`),children:[(0,x.jsx)(o,{size:16}),`Kembali`]})}),D&&(0,x.jsx)(`div`,{style:{marginBottom:`2rem`},children:(0,x.jsx)(v,{type:`error`,message:D,onClose:()=>O(``),dismissible:!0})}),(0,x.jsx)(`form`,{onSubmit:j,children:(0,x.jsxs)(`div`,{className:`form-grid`,children:[(0,x.jsxs)(`div`,{className:`form-column`,children:[(0,x.jsxs)(_,{glass:!0,style:{padding:`2.5rem`,borderRadius:`32px`},children:[(0,x.jsxs)(`div`,{className:`section-header`,children:[(0,x.jsx)(`div`,{className:`section-icon`,style:{background:`linear-gradient(135deg, var(--hero-bg-start), var(--hero-bg-end))`,boxShadow:`0 4px 12px rgba(10, 122, 62, 0.2)`},children:(0,x.jsx)(u,{size:22})}),(0,x.jsx)(`h3`,{className:`section-title`,children:`Informasi Utama`})]}),(0,x.jsxs)(`div`,{className:`field-group`,children:[(0,x.jsxs)(`div`,{className:`field-full`,children:[(0,x.jsxs)(`label`,{className:`field-label`,children:[`Nama Aset `,(0,x.jsx)(`span`,{className:`field-required`,children:`*`})]}),(0,x.jsxs)(`div`,{className:`input-wrapper`,children:[(0,x.jsx)(a,{size:16,className:`input-icon`}),(0,x.jsx)(`input`,{name:`name`,value:k.name,onChange:M,required:!0,placeholder:`MacBook Pro M3 14-inch`,className:`field-input-icon`})]})]}),(0,x.jsxs)(`div`,{children:[(0,x.jsxs)(`label`,{className:`field-label`,children:[`Kode Aset `,(0,x.jsx)(`span`,{className:`field-required`,children:`*`})]}),(0,x.jsx)(`input`,{name:`code`,value:k.code,onChange:M,required:!0,placeholder:`AST-001`,className:`field-input`})]}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Kategori`}),(0,x.jsxs)(`select`,{name:`category`,value:k.category,onChange:M,className:`field-select`,children:[(0,x.jsx)(`option`,{value:`Electronics`,children:`Elektronik`}),(0,x.jsx)(`option`,{value:`Furniture`,children:`Furnitur`}),(0,x.jsx)(`option`,{value:`Vehicle`,children:`Kendaraan`}),(0,x.jsx)(`option`,{value:`Other`,children:`Lainnya`})]})]}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Merek`}),(0,x.jsx)(`input`,{name:`brand`,value:k.brand,onChange:M,placeholder:`Apple`,className:`field-input`})]}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Model`}),(0,x.jsx)(`input`,{name:`model`,value:k.model,onChange:M,placeholder:`A2918`,className:`field-input`})]}),(0,x.jsxs)(`div`,{className:`field-full`,children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Nomor Seri`}),(0,x.jsxs)(`div`,{className:`input-wrapper`,children:[(0,x.jsx)(i,{size:16,className:`input-icon`}),(0,x.jsx)(`input`,{name:`serial_number`,value:k.serial_number,onChange:M,placeholder:`SN123456789`,className:`field-input-icon`})]})]})]})]}),(0,x.jsxs)(_,{glass:!0,style:{padding:`2.5rem`,borderRadius:`32px`},children:[(0,x.jsxs)(`div`,{className:`section-header`,children:[(0,x.jsx)(`div`,{className:`section-icon`,style:{background:`linear-gradient(135deg, #10b981, #059669)`,boxShadow:`0 4px 12px rgba(5, 150, 105, 0.2)`},children:(0,x.jsx)(n,{size:22})}),(0,x.jsx)(`h3`,{className:`section-title`,children:`Catatan Tambahan`})]}),(0,x.jsx)(`div`,{children:(0,x.jsx)(`textarea`,{name:`notes`,value:k.notes,onChange:M,rows:4,placeholder:`Tambahkan informasi spesifik mengenai aset ini...`,className:`field-textarea`})})]})]}),(0,x.jsxs)(`div`,{className:`form-column`,children:[(0,x.jsxs)(_,{glass:!0,style:{padding:`2rem`,borderRadius:`28px`},children:[(0,x.jsxs)(`div`,{className:`section-header`,children:[(0,x.jsx)(`div`,{style:{padding:`8px`,background:`#fef3c7`,borderRadius:`10px`,color:`#d97706`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:(0,x.jsx)(l,{size:20})}),(0,x.jsx)(`h4`,{style:{margin:0,fontSize:`1.1rem`,fontWeight:800,color:`var(--color-primary-dark)`},children:`Kondisi & Status`})]}),(0,x.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1.25rem`},children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Kondisi Aset`}),(0,x.jsxs)(`select`,{name:`condition`,value:k.condition,onChange:M,className:`field-select`,children:[(0,x.jsx)(`option`,{value:`new`,children:`Baru`}),(0,x.jsx)(`option`,{value:`good`,children:`Baik`}),(0,x.jsx)(`option`,{value:`fair`,children:`Cukup`}),(0,x.jsx)(`option`,{value:`poor`,children:`Buruk`})]})]}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Status Inventaris`}),(0,x.jsxs)(`select`,{name:`status`,value:k.status,onChange:M,className:`field-select`,children:[(0,x.jsx)(`option`,{value:`available`,children:`Tersedia`}),(0,x.jsx)(`option`,{value:`assigned`,children:`Digunakan`}),(0,x.jsx)(`option`,{value:`maintenance`,children:`Perbaikan`}),(0,x.jsx)(`option`,{value:`retired`,children:`Dihapus`})]})]})]})]}),(0,x.jsxs)(_,{glass:!0,style:{padding:`2rem`,borderRadius:`28px`},children:[(0,x.jsxs)(`div`,{className:`section-header`,children:[(0,x.jsx)(`div`,{style:{padding:`8px`,background:`#dcfce7`,borderRadius:`10px`,color:`#16a34a`,display:`flex`,alignItems:`center`,justifyContent:`center`},children:(0,x.jsx)(s,{size:20})}),(0,x.jsx)(`h4`,{style:{margin:0,fontSize:`1.1rem`,fontWeight:800,color:`var(--color-primary-dark)`},children:`Detail Finansial`})]}),(0,x.jsxs)(`div`,{style:{display:`flex`,flexDirection:`column`,gap:`1.25rem`},children:[(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Harga Beli (Rp)`}),(0,x.jsxs)(`div`,{className:`input-wrapper`,children:[(0,x.jsx)(`span`,{className:`input-prefix`,children:`Rp`}),(0,x.jsx)(`input`,{name:`purchase_price`,type:`text`,inputMode:`numeric`,value:k.purchase_price?Number(k.purchase_price).toLocaleString(`id-ID`):``,onChange:e=>A({...k,purchase_price:Number(e.target.value.replace(/\D/g,``))||0}),placeholder:`25.000.000`,style:{width:`100%`,height:`50px`,padding:`0 12px 0 40px`,borderRadius:`12px`,border:`1px solid #cbd5e1`,background:`#fff`,fontSize:`1rem`,color:`#0f172a`,boxSizing:`border-box`},onFocus:e=>{e.target.style.outline=`none`,e.target.style.borderColor=`var(--color-primary)`,e.target.style.boxShadow=`0 0 0 3px rgba(10, 122, 62, 0.1)`},onBlur:e=>{e.target.style.borderColor=`#cbd5e1`,e.target.style.boxShadow=`none`}})]})]}),(0,x.jsxs)(`div`,{children:[(0,x.jsx)(`label`,{className:`field-label`,children:`Tanggal Pembelian`}),(0,x.jsxs)(`div`,{className:`input-wrapper`,children:[(0,x.jsx)(m,{size:16,style:{position:`absolute`,left:`12px`,top:`50%`,transform:`translateY(-50%)`,color:`#94a3b8`,pointerEvents:`none`}}),(0,x.jsx)(`input`,{name:`purchase_date`,type:`date`,value:k.purchase_date,onChange:M,style:{width:`100%`,height:`50px`,padding:`0 12px 0 40px`,borderRadius:`12px`,border:`1px solid #cbd5e1`,background:`#fff`,fontSize:`1rem`,color:`#0f172a`,boxSizing:`border-box`},onFocus:e=>{e.target.style.outline=`none`,e.target.style.borderColor=`var(--color-primary)`,e.target.style.boxShadow=`0 0 0 3px rgba(10, 122, 62, 0.1)`},onBlur:e=>{e.target.style.borderColor=`#cbd5e1`,e.target.style.boxShadow=`none`}})]})]})]})]}),(0,x.jsxs)(`div`,{className:`submit-section`,children:[(0,x.jsxs)(h,{type:`submit`,variant:`primary`,size:`lg`,fullWidth:!0,disabled:C,style:{height:`60px`,borderRadius:`20px`,fontSize:`1.1rem`,fontWeight:800,boxShadow:`0 10px 20px rgba(10, 122, 62, 0.2)`},children:[(0,x.jsx)(r,{size:20}),C?`Menyimpan...`:p?`Perbarui Aset`:`Simpan Aset`]}),(0,x.jsx)(h,{type:`button`,variant:`outline`,size:`lg`,fullWidth:!0,onClick:()=>e(`/inventory/assets`),style:{height:`54px`,borderRadius:`20px`,fontWeight:700},children:`Batalkan`})]})]})]})})]})};export{C as default};