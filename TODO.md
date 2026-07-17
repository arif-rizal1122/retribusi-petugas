# Petugas Backlog

Terakhir diperbarui: 2026-07-17

## Status

- `[x]` Selesai dan terverifikasi.
- `[ ]` Siap dikerjakan.
- `[BLOCKED]` Memerlukan kontrak atau keputusan lintas repo.

## Pembayaran

- [BLOCKED] **PAY-005** Putuskan peran petugas pada tagihan dengan payment request BRIVA aktif: hanya melihat status, membantu inquiry, atau tetap boleh menerima pembayaran manual.
- [BLOCKED] **PAY-005** Bila petugas tetap dapat memproses pembayaran manual, API harus mendefinisikan guard untuk membatalkan/menolak request BRIVA aktif agar tidak terjadi double settlement.

## Aturan Lanjutan

- Jangan membuat alur BRIVA petugas sebelum keputusan bisnis dan endpoint API tersedia.
- Catat kontrak dan keputusan yang disetujui di `../WORKBOARD.md`.
