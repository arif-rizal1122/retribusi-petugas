---
name: No Screenshot Verification
description: Instruksi untuk TIDAK menggunakan screenshot atau rekaman dari Antigravity browser action sebagai alat verifikasi. Gunakan metode alternatif seperti HTTP request, curl, atau read_url_content.
---

# No Screenshot Verification

## Aturan Utama

1. **DILARANG** menggunakan screenshot atau rekaman (recording) dari Antigravity browser subagent sebagai alat verifikasi halaman web.
2. **WAJIB** menggunakan CLI (Command Line Interface) seperti `curl`, `git`, `bash`, atau `artisan` untuk semua proses pengerjaan dan verifikasi teknis.
3. Seluruh interaksi dengan server (VPS) harus terdokumentasi via output terminal, bukan melalui visual browser.

## Alasan

1. Browser subagent berjalan di sandbox internal dan **bukan browser user yang sebenarnya**
2. Screenshot/recording dari browser subagent **tidak merepresentasikan** kondisi real yang dilihat user
3. Proses screenshot memakan waktu dan resource yang tidak perlu
4. User lebih membutuhkan **data teknis** (HTTP status, response body, console errors) daripada gambar

## Metode Verifikasi yang Diizinkan

### 1. HTTP Request (Prioritas Utama)
```
read_url_content → Cek status halaman, response body, title
```

### 2. cURL via Terminal
```bash
curl -I https://domain.com          # Cek HTTP headers
curl -s https://domain.com | head   # Cek HTML body
curl -o /dev/null -s -w "%{http_code}" https://domain.com  # Cek status code
```

### 3. Asset Verification
```bash
curl -I https://domain.com/assets/file.js  # Cek apakah asset tersedia
```

### 4. Browser Subagent (Hanya untuk Interaksi)
Browser subagent **BOLEH** digunakan hanya untuk:
- Mengisi form dan submit
- Klik navigasi yang memerlukan JavaScript
- Interaksi DOM yang tidak bisa dilakukan via HTTP

Tapi **JANGAN** gunakan untuk mengambil screenshot sebagai bukti verifikasi.

## Contoh Alur Verifikasi Website

```
1. read_url_content(url) → Cek apakah halaman bisa diakses
2. read_url_content(url/assets/main.js) → Cek apakah asset JS tersedia (bukan fallback HTML)
3. curl -I url → Cek HTTP status code dan headers
4. Laporkan temuan teknis ke user
```
