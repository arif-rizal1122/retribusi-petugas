# Retribusi Petugas Instructions

`retribusi-petugas` adalah aplikasi operasional lapangan. API menentukan otorisasi, status tagihan, pembayaran, tugas, dan data lokasi.

## Mulai dari Ini

1. Baca `../AGENTS.md`, `../WORKBOARD.md`, dan `TODO.md`.
2. Audit `git status --short`, `src/App.tsx`, `src/components/Layout.tsx`, dan endpoint API terkait.
3. Periksa API lebih dahulu untuk scanner, pembayaran, verifikasi, geolocation, penugasan, atau perubahan role.

## Aturan

- Jangan menandai tagihan lunas dari aplikasi tanpa status sukses yang dikonfirmasi API.
- Alur scan, pembayaran manual, dan BRIVA tidak boleh menghasilkan pembayaran ganda.
- Data lokasi, kamera, scanner, dan native capability perlu diuji pada HTTPS/perangkat atau Capacitor; jangan mengklaimnya berhasil tanpa bukti.
- Perubahan role wajib sinkron dengan backend authorization serta route/menu petugas.

## Verifikasi

- Jalankan `npm run typecheck`, targeted `npm run lint`, dan `npm run build` untuk perubahan aplikasi.
- Perbarui `TODO.md` dan `../WORKBOARD.md` setelah handoff lintas repo berubah.
