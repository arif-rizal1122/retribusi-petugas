# Retribusi Petugas - Flow dan Breakdown Repo

Dokumen ini adalah referensi konsolidasi untuk repo `retribusi-petugas`. Sumber analisa berasal dari route React, context auth, helper API, halaman petugas, service QR, konfigurasi Capacitor, dan struktur asset.

Scope yang sengaja tidak dirinci per file: `node_modules/`, `dist/`, cache, log lokal, binary, dan asset generated Android/iOS yang hanya hasil build. File source, konfigurasi, native wrapper penting, dan asset utama dirangkum di bawah.

## Peran Repo

`retribusi-petugas` adalah aplikasi lapangan untuk petugas/verifikator/pengawas. Aplikasi ini berfokus pada pekerjaan operasional: peta lapangan, scanner QR, pembayaran, verifikasi, pemeriksaan, tugas, wajib pajak, billing, master data terbatas, SKPD, dan PBB.

Fungsi utama:

- Login petugas dan update lokasi.
- Peta potensi dan objek lapangan.
- Scanner QR untuk membaca tagihan/pembayaran.
- Konfirmasi pembayaran dan upload bukti.
- Pemeriksaan lapangan dan enforcement.
- Daftar tugas petugas.
- Kelola wajib pajak/objek/tagihan sesuai role.
- Buat SKPD dari objek dan formula.
- Modul PBB Bapenda.
- PWA dan native shell Android/iOS via Capacitor.

## Environment dan Cara Jalan

File `.env` dibutuhkan untuk mengarah ke API.

Contoh minimal:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Perintah umum:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 3003
npm run build
npx cap sync
```

Untuk native:

```bash
npx cap open android
npx cap open ios
```

## Alur Data

1. Petugas login lewat `/login`.
2. `AuthContext` mengirim kredensial ke `POST /api/login`.
3. Token dan user disimpan ke `localStorage.token` dan `localStorage.user`.
4. Setelah login, aplikasi dapat mengirim lokasi petugas ke `POST /api/user/location`.
5. `src/lib/api.ts` menambahkan bearer token ke request.
6. Halaman petugas mengambil tugas, tagihan, objek pajak, pembayaran, peta, dan modul PBB dari API.
7. QR scanner membaca payload QR lalu mengarahkan ke konfirmasi/verifikasi pembayaran.
8. Jika API mengembalikan `401`, token/user dihapus dan user harus login ulang.

## Autentikasi dan Keamanan

| Bagian | Penjelasan |
| --- | --- |
| Token storage | `localStorage.token`. |
| User storage | `localStorage.user`. |
| Login | `POST /api/login`. |
| Logout | `POST /api/logout`, lalu clear storage. |
| Lokasi | `POST /api/user/location` dengan geolocation browser/native. |
| Guard route | `ProtectedRoute` membatasi halaman berdasarkan auth/role. |
| Role umum | `super_admin`, `opd`, `petugas`, `verifikator`, `viewer`, dan role pengawas pada modul tertentu. |
| Risiko | Token localStorage dan izin geolocation perlu kontrol XSS, HTTPS, dan consent platform. |

## Route dan Page

| Path | Komponen | Fungsi |
| --- | --- | --- |
| `/` | redirect | Mengarah berdasarkan auth/onboarding. |
| `/welcome` | `Welcome` | Intro aplikasi. |
| `/login` | `LoginPage` | Login petugas. |
| `/register` | `RegisterPage` | Registrasi/pendaftaran bila diaktifkan. |
| `/peta` | `PetaLapangan` | Peta potensi, objek, dan pembayaran lapangan. |
| `/dashboard` | `Dashboard` | Ringkasan operasional petugas. |
| `/scanner` | `FieldScanner` | Scanner QR. |
| `/payment-confirmation` | `PaymentConfirmation` | Konfirmasi pembayaran hasil scan/pilih tagihan. |
| `/field-check` | `FieldInspection` | Pemeriksaan lapangan/enforcement. |
| `/taxpayers` | `TaxpayerManagement` | Daftar/CRUD wajib pajak. |
| `/taxpayers/:id` | `TaxpayerDetail` | Detail wajib pajak. |
| `/billing` | `BillingManagement` | Tagihan dan pembayaran. |
| `/tasks` | `DaftarTugas` | Tugas petugas. |
| `/verification` | `PaymentVerification` | Verifikasi pembayaran. |
| `/reporting` | `Reporting` | Laporan. |
| `/master-data` | `MasterData` | Master data terbatas. |
| `/skpd/create` | `CreateSKPD` | Pembuatan SKPD. |
| `/pbb-bapenda` | `PbbBapenda` | Modul PBB Bapenda. |
| `/profile` | `Profile` | Profil dan password. |
| `/download` | `DownloadPage` | Download aplikasi/dokumen. |
| `/user-guide` | `UserGuide` | Panduan petugas. |
| `/presentation` | `PresentationPage` | Materi presentasi. |
| `/about` | `About` | Informasi aplikasi. |

## Fetching dan Endpoint yang Dipakai

| Modul | Endpoint utama |
| --- | --- |
| Auth | `/api/login`, `/api/logout`, `/api/me`, `/api/me/update`, `/api/user/password`, `/api/user/location`. |
| Peta | `/api/dashboard/map-potentials`, `/api/tax-objects/{id}/pending-periods`, `/api/upload`, `/api/payments`. |
| Billing | `/api/bills`, `/api/tax-objects`, `/api/upload`, `/api/payments`, `/api/bills/{id}/pay`. |
| Konfirmasi pembayaran | `/api/bills`, `/api/bills/{id}/pay`. |
| Scanner | QR payload/URL lokal, lalu navigasi ke payment confirmation. |
| Pemeriksaan lapangan | `/api/pengawas/enforcements`, update enforcement dengan GPS/foto. |
| Tugas | `/api/petugas-tasks`, `/api/petugas-tasks/{id}`. |
| Verifikasi | `/api/payments?status=pending`, `/api/payments/{id}/status`. |
| Wajib pajak | `/api/taxpayers`, `/api/opds`, `/api/retribution-types`, `/api/retribution-classifications`. |
| Master data | `/api/retribution-types`, `/api/retribution-classifications`, `/api/zones`, `/api/retribution-rates`. |
| SKPD | `/api/tax-objects/{id}`, `/api/tax-formulas`, `/api/simulate-tax`, `/api/bills`, `/api/documents/skrd/{id}`. |
| PBB | `/api/pbb/bapenda/inquiry`, `/api/pbb/bapenda/pay`, `/api/pbb/bapenda/transactions`. |

## Design System dan UI

- Styling menggunakan Tailwind CSS.
- Komponen UI berada di `src/components/ui/`.
- Ikon menggunakan `lucide-react`.
- Peta memakai `leaflet`/`react-leaflet`.
- QR scanner memakai library scanner/browser camera dan service parsing sendiri.
- Layout mobile-operasional: bottom navigation, halaman padat, kartu status, filter, tombol aksi cepat, form upload, dan peta.
- PWA metadata berada di `public/manifest.json`.

## Breakdown File

### Root dan Config

| File | Fungsi |
| --- | --- |
| `README.md` | Dokumentasi repo petugas. |
| `.env.example` | Template API URL. |
| `package.json` | Dependency dan script npm. |
| `package-lock.json` | Lock dependency. |
| `vite.config.ts` | Konfigurasi Vite. |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | Konfigurasi TypeScript. |
| `eslint.config.js` | Konfigurasi ESLint. |
| `postcss.config.js` | Konfigurasi PostCSS. |
| `tailwind.config.js` | Konfigurasi Tailwind. |
| `index.html` | Entry HTML Vite. |
| `components.json` | Konfigurasi komponen UI. |
| `capacitor.config.ts` | Konfigurasi Capacitor. |
| `NGINX-CONFIG.md` | Catatan deploy Nginx. |
| `QUICK-DEPLOY.md`, `deploy.sh` | Catatan/script deploy. |

### `src/` Inti

| File | Fungsi |
| --- | --- |
| `src/main.tsx` | Bootstrap React. |
| `src/App.tsx` | Definisi route dan role protected. |
| `src/index.css` | CSS global dan Tailwind. |
| `src/vite-env.d.ts` | Type declaration Vite. |
| `src/contexts/AuthContext.tsx` | State auth petugas, login, logout, lokasi. |
| `src/lib/api.ts` | Wrapper fetch dengan bearer token dan handler 401. |
| `src/lib/utils.ts` | Utility umum. |
| `src/hooks/use-mobile.tsx` | Deteksi viewport mobile. |
| `src/hooks/use-toast.ts` | Helper toast. |
| `src/services/qrScannerService.ts` | Parsing hasil QR, validasi format, helper scanner. |

### Components

| File/Folder | Fungsi |
| --- | --- |
| `src/components/Layout.tsx` | Shell aplikasi petugas. |
| `src/components/MobileLayout.tsx` | Layout khusus mobile. |
| `src/components/BottomNavigation.tsx` | Navigasi bawah. |
| `src/components/ProtectedRoute.tsx` | Guard auth/role. |
| `src/components/AuthProvider.tsx` | Provider auth kompatibilitas. |
| `src/components/QRScanner.tsx` | Komponen scanner QR. |
| `src/components/InteractiveMap.tsx` | Komponen peta. |
| `src/components/InstallPrompt.tsx` | Prompt install PWA. |
| `src/components/NetworkStatus.tsx` | Status koneksi. |
| `src/components/PWAInstallButton.tsx` | Tombol install PWA. |
| `src/components/PWAStatus.tsx` | Status PWA. |
| `src/components/AccessibilityPanel.tsx` | Pengaturan aksesibilitas. |
| `src/components/DataTable.tsx`, `SortableTable.tsx`, `SearchableSelect.tsx` | Komponen data reusable. |
| `src/components/ui/*` | Button, input, dialog, table, tabs, card, badge, toast, form, dan komponen UI dasar. |

### Pages

| File | Fungsi |
| --- | --- |
| `src/pages/Welcome.tsx` | Intro/onboarding. |
| `src/pages/LoginPage.tsx` | Login petugas. |
| `src/pages/RegisterPage.tsx` | Registrasi bila diaktifkan. |
| `src/pages/Dashboard.tsx` | Dashboard operasional. |
| `src/pages/PetaLapangan.tsx` | Peta potensi dan pembayaran lapangan. |
| `src/pages/FieldScanner.tsx` | Scanner QR lapangan. |
| `src/pages/PaymentConfirmation.tsx` | Konfirmasi pembayaran. |
| `src/pages/FieldInspection.tsx` | Pemeriksaan/enforcement lapangan. |
| `src/pages/DaftarTugas.tsx` | Daftar dan update tugas petugas. |
| `src/pages/PaymentVerification.tsx` | Verifikasi pembayaran pending. |
| `src/pages/BillingManagement.tsx` | Kelola tagihan dan pembayaran. |
| `src/pages/TaxpayerManagement.tsx` | Kelola wajib pajak. |
| `src/pages/TaxpayerDetail.tsx` | Detail wajib pajak. |
| `src/pages/MasterData.tsx` | Master jenis, klasifikasi, zona, tarif. |
| `src/pages/Reporting.tsx` | Laporan. |
| `src/pages/CreateSKPD.tsx` | Buat SKPD dari objek/formula. |
| `src/pages/PbbBapenda.tsx` | Inquiry dan pembayaran PBB. |
| `src/pages/Profile.tsx` | Profil dan password. |
| `src/pages/DownloadPage.tsx` | Download aplikasi/dokumen. |
| `src/pages/UserGuide.tsx` | Panduan penggunaan. |
| `src/pages/PresentationPage.tsx` | Materi presentasi. |
| `src/pages/About.tsx` | Informasi aplikasi. |
| `src/pages/NotFound.tsx` | Halaman 404. |

### Native dan Public

| File/Folder | Fungsi |
| --- | --- |
| `android/` | Project Android hasil Capacitor. |
| `android/app/src/main/AndroidManifest.xml` | Permission camera/geolocation dan activity Android. |
| `android/app/build.gradle`, `android/build.gradle`, `android/settings.gradle` | Build config Android/Gradle. |
| `ios/` | Project iOS hasil Capacitor. |
| `ios/App/App/Info.plist` | Permission iOS untuk camera/geolocation bila dipakai. |
| `public/manifest.json` | Manifest PWA. |
| `public/sw.js` | Service worker PWA bila dipakai. |
| `public/icons/*` | Icon PWA. |
| `public/screenshots/*` | Screenshot install/store. |
| `public/user-guide/*` | Asset panduan petugas. |

## Dependensi Penting

| Dependency | Fungsi |
| --- | --- |
| `react`, `react-dom` | UI framework. |
| `react-router-dom` | Routing. |
| `@capacitor/core`, `@capacitor/android`, `@capacitor/ios` | Shell native. |
| `@capacitor/camera`, `@capacitor/geolocation`, `@capacitor/filesystem`, `@capacitor/share` | Plugin native. |
| `leaflet`, `react-leaflet` | Peta lapangan. |
| `lucide-react` | Icon. |
| `tailwindcss` | Styling. |
| `zod`, `react-hook-form` | Form/validasi. |

## Catatan Maintenance

- Pastikan `VITE_API_URL` mengarah ke backend yang sama dengan CORS API.
- Untuk scanner dan geolocation di device, gunakan HTTPS atau native Capacitor.
- Role route di `App.tsx` harus sinkron dengan policy backend.
- Modul peta membutuhkan data koordinat valid dari tax object/petugas.
- Setelah build web untuk native, jalankan `npx cap sync`.
- Hindari mengedit file generated native kecuali perubahan memang khusus platform.
