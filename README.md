# 📍 TrackLokasi - Next.js Real-time Geolocation Dashboard

Aplikasi pelacak & pemantau lokasi real-time berbasis **Next.js 16 (App Router)**, **Leaflet.js**, dan **OpenStreetMap Nominatim Reverse Geocoding**.

---

## ⚡ Cara Menjalankan di Komputer Lokal

Cukup jalankan satu perintah standar:
```bash
npm run dev
```

Buka di browser Anda:
👉 **[http://localhost:3000/dashboard](http://localhost:3000/dashboard)**

---

## 🚀 Cara Hosting Gratis ke Vercel (Online Permanen + HTTPS Resmi)

Karena sudah menggunakan **Next.js**, Anda dapat langsung men-deploy aplikasi ini ke **Vercel** tanpa konfigurasi rumit, tanpa tunneling, dan langsung mendapatkan domain HTTPS resmi gratis.

### Cara 1: Menggunakan Vercel CLI (Paling Cepat dari Terminal)
1. Di terminal proyek, jalankan:
   ```bash
   npx vercel
   ```
2. Ikuti panduan singkat di layar:
   - Login / verifikasi email akun Vercel Anda.
   - Tekan `Enter` untuk setiap pertanyaan konfirmasi default.
3. Tunggu ~1 menit, Vercel akan langsung memberikan link publik, contoh:
   👉 **`https://tracklokasi.vercel.app`**

### Cara 2: Menggunakan GitHub + Dashboard Vercel (Otomatis Update)
1. Upload folder proyek ini ke repositori akun **GitHub** Anda.
2. Buka [https://vercel.com](https://vercel.com), login, lalu klik **"Add New Project"**.
3. Pilih repositori GitHub Anda dan klik **"Deploy"**.
4. Website langsung aktif dan siap digunakan secara global!

---

## 🧭 Cara Penggunaan

1. **Buat Link Pelacak**:
   - Di dashboard, klik **"➕ Buat Link Baru"**.
   - Pilih tema (Navigasi Peta / Kurir / Titik Kumpul).
   - Klik **"Generate Link 🚀"** (Link otomatis tersalin ke clipboard).
2. **Kirim Link ke Target**:
   - Bagikan link ke target (misal: `https://domain-anda.vercel.app/view/loc-xxxx`).
3. **Target Membuka Link & Menekan Tombol**:
   - Target membuka link dan menekan **"📍 Izinkan & Bagikan Lokasi Saya"**.
   - Pop-up izin browser muncul &rarr; Target memilih **Allow / Izinkan**.
4. **Hasil Masuk ke Dashboard**:
   - Dashboard admin akan otomatis berbunyi *"Chime"* dan titik peta langsung terfokus ke posisi target.
   - Menampilkan alamat lengkap: **Nama Jalan, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos**.
   - Tombol **"🗺️ Google Maps ↗"** untuk melihat langsung di Google Maps asli.
