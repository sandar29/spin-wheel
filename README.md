# SpinFlow – Fair. Fast. Offline.

Roda undian tanpa framework dan tanpa server. Semua data disimpan lokal di browser (`localStorage`) dan tidak pernah diunggah.

## Menjalankan
- **Lokal:** buka `index.html` langsung di browser.
- **Hosting statis / PWA:** taruh semua file di hosting (GitHub Pages, Netlify, dll.). Service worker (`sw.js`) akan menyimpan cache sehingga aplikasi bisa dipakai offline dan di-install. Saat menambah/menghapus file, naikkan `VERSION` di `sw.js`.

## Fitur
- Pemenang dipilih dengan `crypto.getRandomValues` (bebas modulo bias) **sebelum** animasi; roda hanya diarahkan ke pemenang tersebut.
- Impor TXT / CSV / JSON, ekspor peserta dan hasil, penanganan nama duplikat.
- Mode berurutan atau acak instan, banyak pemenang, kategori hadiah, riwayat.
- Tema (termasuk kustom), suara, konfeti, mode presentasi.

## Pintasan
`Space` / `Enter` putar · `F` / `F11` layar penuh · `Esc` keluar presentasi

## Batasan
Maksimal 10.000 peserta (batas kuota `localStorage`). Nama di roda hanya digambar jika ≤ 150 peserta aktif.
