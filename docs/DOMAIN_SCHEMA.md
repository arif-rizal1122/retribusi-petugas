# 🌐 Domain Schema & Subdomain Mapping

Dokumentasi ini merinci pemetaan domain dan subdomain untuk sistem MPAD (Mitra Pajak & Retribusi Daerah) baik di lingkungan Produksi maupun Staging.

## 1. Lingkungan Produksi (Pemerintah Kota Baubau)
Domain resmi yang digunakan untuk operasional publik dan internal.

| Komponen | Domain | Deskripsi |
| :--- | :--- | :--- |
| **Portal Utama** | `mpad.baubaukota.go.id` | Pintu masuk utama aplikasi/Landing page |
| **Dashboard Admin** | `adminmpad.baubaukota.go.id` | Panel manajemen untuk Bapenda & OPD |
| **Backend API** | `apimpad.baubaukota.go.id` | Endpoint layanan data (Core API) |
| **Interface Petugas** | `petugasmpad.baubaukota.go.id` | Akses petugas lapangan (Mobile/Web) |

## 2. Lingkungan Staging / Development (VPS)
Digunakan untuk testing fitur baru sebelum di-deploy ke produksi.
**Host IP:** `157.10.252.74`

| Komponen | Domain | Deskripsi |
| :--- | :--- | :--- |
| **Main Entrance** | `mpad.online` | Pintu masuk utama lingkungan dev |
| **Admin Panel** | `admin.mpad.online` | Dashboard admin versi staging |
| **API Endpoint** | `api.mpad.online` | Backend API untuk development |
| **Officer Portal** | `petugas.mpad.online` | Antarmuka petugas versi staging |
| **Launch Teaser** | `launch.mpad.online` | Halaman promosi/hitung mundur |

## 3. Domain Alternatif / Legacy
Domain lain yang mungkin masih terdaftar dalam konfigurasi sistem (CORS/SSL):
- `sipanda.online`
- `admin.sipanda.online`
- `petugas.sipanda.online`
- `api.sipanda.online`

---
*Terakhir Diperbarui: 3 Maret 2026*
