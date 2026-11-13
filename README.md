# HRIS Frontend

Frontend HRIS berbasis React + TypeScript + Vite dengan struktur folder clean agar lebih mudah dikembangkan dan di-maintain.

## Tech Stack
- React 19
- TypeScript
- Vite
- React Router
- Zustand
- Axios

## Struktur Folder
```text
src/
  app/
    layouts/            # Layout level aplikasi (contoh: dashboard shell)
    routes/             # Konfigurasi router + guard route
    store/              # Global app store (auth, ui, dll)

  pages/                # Halaman route-level (entry point UI per route)
    auth/
      login/
      register/
    dashboard/
      overview/

  features/             # Domain feature (logic + komponen per fitur)
    auth/
      api/
      hooks/
    dashboard/
      components/

  widgets/              # Komponen komposit lintas page (Header, Sidebar)
    layout/

  shared/               # Reusable lintas domain
    api/                # HTTP client, base config
    assets/             # Gambar/icon statis
    config/             # Konstanta & konfigurasi global
    hooks/              # Shared hooks
    types/              # Shared types
    ui/                 # Reusable UI components

  main.tsx              # Bootstrap aplikasi
  index.css             # Global styles
```

## Aturan Penempatan Kode
- Taruh **route page** di `pages/*`.
- Taruh **logic/domain feature** di `features/*`.
- Taruh **komponen reusable umum** di `shared/ui`.
- Taruh **layout gabungan** (mis. Header + Sidebar) di `widgets/*`.
- Taruh **state global app** di `app/store/*`.
- Hindari import silang yang melompat-lompat layer tanpa alasan.

## Menjalankan Project
```bash
npm install
npm run dev
```

## Build Production
```bash
npm run build
npm run preview
```
