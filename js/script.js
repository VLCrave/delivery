document.addEventListener("DOMContentLoaded", () => {
  // ✅ Notifikasi
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        new Notification("🔔 Notifikasi Diaktifkan!", {
          body: "Kami akan memberi tahu jika pesanan kamu dikirimkan.",
          icon: "./img/icon.png"
        });
      }
    });
  }

  // ✅ Setup Popup
  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");
  const closeBtn = document.getElementById("close-popup");
  const popupImg = document.getElementById("popup-img");

  const checkoutBtn = document.querySelector(".checkout-btn-final");

  if (!popup || !overlay || !closeBtn || !popupImg) return;

  const now = new Date();
  const hour = now.getHours();
  const isOpen = hour >= 8 && hour < 22;

  // ✅ Tampilkan popup dan blur background
  popup.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("popup-active");

  // ✅ Ganti gambar berdasarkan status layanan
  popupImg.src = isOpen ? "./img/open.png" : "./img/close.png";
  closeBtn.textContent = "Tutup";

  // ✅ Tutup popup dan muat konten utama
  closeBtn.addEventListener("click", () => {
    popup.style.display = "none";
    overlay.style.display = "none";
    document.body.classList.remove("popup-active");

    loadContent("productlist");

    if (!isOpen) {
      alert("Layanan sedang tutup. Silakan kembali antara pukul 08:00 - 22:00.");
    }
  });

  // ✅ Nonaktifkan tombol checkout jika layanan tutup
  if (!isOpen && checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Layanan Tutup";
    checkoutBtn.style.opacity = "0.6";
    checkoutBtn.style.cursor = "not-allowed";
  }

  // ✅ Update cart badge jika fungsi tersedia
  if (typeof updateCartBadge === "function") {
    updateCartBadge();
  }

  // ✅ Auto refresh renderRiwayat jika halaman aktif adalah 'riwayat'
  const page = localStorage.getItem("pageAktif") || "";
  if (page === "riwayat" && typeof renderRiwayat === "function") {
    renderRiwayat();
    setInterval(() => {
      if (document.getElementById("riwayat-list")) {
        renderRiwayat();
        console.log("🔁 Riwayat diperbarui otomatis");
      }
    }, 1000); // 1 detik
  }
});



const tokoList = [
  {
    nama: "Warung Basoku",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Asin Minimart",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Toko Sinar Matahari",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Warung Padang",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Roocky Rooster",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Waluyo",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Bakso Ojolali",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Warung Sate & Soto Madura",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Sate Padang Athar",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
{
    nama: "Fried Chicken Amanda",
    foto: "./img/toko-pict.png",
    lokasi: "Kuto Panji, Belinyu, Kabupaten Bangka, Kepulauan Bangka Belitung 33253",
    deskripsi: ""
  },
];

function getUpdatedRating(originalRatingStr, startDateStr = '2025-06-20') {
  let baseRating = parseFloat(originalRatingStr.replace('RB', '')) * 1000;
  const startDate = new Date(startDateStr);
  const now = new Date();
  const diffDays = Math.floor((now - startDate) / (1000 * 60 * 60 * 24));

  const seed = Math.abs(originalRatingStr.length + baseRating % 13);
  const growthPerDay = 20 + (seed % 31);

  const finalRating = baseRating + (growthPerDay * diffDays);
  return (finalRating / 1000).toFixed(1) + 'RB';
}

const produkData = [
  {
    "nama": "Ayam Geprek Dada",
    "kategori": "Makanan",
    "rating": "4.8RB",
    "jarak": "2.3 km",
    "estimasi": "20 mnt",
    "harga": 15000,
    "gambar": "./img/ayam-geprek.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Ayam Geprek Paha",
    "kategori": "Makanan",
    "rating": "3.7RB",
    "jarak": "2.3 km",
    "estimasi": "20 mnt",
    "harga": 15000,
    "gambar": "./img/ayam-geprek.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Ayam Geprek Sayap",
    "kategori": "Makanan",
    "rating": "2.1RB",
    "jarak": "2.3 km",
    "estimasi": "20 mnt",
    "harga": 15000,
    "gambar": "./img/ayam-geprek.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Fried Chicken Dada",
    "kategori": "Makanan",
    "rating": "3.5RB",
    "jarak": "2.3 km",
    "estimasi": "20 mnt",
    "harga": 13000,
    "gambar": "./img/fried-chicken.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Fried Chicken Paha",
    "kategori": "Makanan",
    "rating": "2.8RB",
    "jarak": "2.3 km",
    "estimasi": "20 mnt",
    "harga": 13000,
    "gambar": "./img/fried-chicken.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Fried Chicken Sayap",
    "kategori": "Makanan",
    "rating": "2.3RB",
    "jarak": "2.3 km",
    "estimasi": "20 mnt",
    "harga": 13000,
    "gambar": "./img/fried-chicken.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Sate Ayam Tanpa Kulit (isi 10)",
    "kategori": "Makanan",
    "rating": "1.2RB",
    "jarak": "1.9 km",
    "estimasi": "15 mnt",
    "harga": 15000,
    "gambar": "./img/sate-ayam.png",
    "buka": 16,
    "tutup": 22,
    "toko": "Warung Sate & Soto Madura"
  },
  {
    "nama": "Soto Madura",
    "kategori": "Makanan",
    "rating": "2.5RB",
    "jarak": "1.9 km",
    "estimasi": "15 mnt",
    "harga": 15000,
    "gambar": "./img/soto-madura.png",
    "buka": 16,
    "tutup": 22,
    "toko": "Warung Sate & Soto Madura"
  },
  {
    "nama": "Nasi Putih",
    "kategori": "Tambahan",
    "rating": "1.5RB",
    "jarak": "2 km",
    "estimasi": "15 mnt",
    "harga": 5000,
    "gambar": "./img/nasi-putih.png",
    "buka": 10,
    "tutup": 21,
    "toko": "Fried Chicken Amanda"
  },
  {
    "nama": "Sate Ayam (10 Tusuk)",
    "kategori": "Makanan",
    "rating": "1.5RB",
    "jarak": "2 km",
    "estimasi": "15 mnt",
    "harga": 13000,
    "gambar": "./img/sate-ayam2.png",
    "buka": 16,
    "tutup": 22,
    "toko": "Warung Sate & Soto Madura"
  },
  {
    "nama": "Sate Kambing (10 Tusuk)",
    "kategori": "Makanan",
    "rating": "1.5RB",
    "jarak": "2 km",
    "estimasi": "15 mnt",
    "harga": 25000,
    "gambar": "./img/sate-kambing.png",
    "buka": 16,
    "tutup": 22,
    "toko": "Warung Sate & Soto Madura"
  },
  {
    "nama": "Sate Sapi (10 Tusuk)",
    "kategori": "Makanan",
    "rating": "1.5RB",
    "jarak": "2 km",
    "estimasi": "15 mnt",
    "harga": 25000,
    "gambar": "./img/sate-sapi.png",
    "buka": 16,
    "tutup": 22,
    "toko": "Warung Sate & Soto Madura"
  },
  {
    "nama": "Lontong",
    "kategori": "Tambahan",
    "rating": "1.5RB",
    "jarak": "2 km",
    "estimasi": "15 mnt",
    "harga": 2000,
    "gambar": "./img/lontong.png",
    "buka": 16,
    "tutup": 22,
    "toko": "Warung Sate & Soto Madura"
  },
  {
    "nama": "Mie Ayam Ceker",
    "kategori": "Makanan",
    "rating": "3.6RB",
    "jarak": "2.3 km",
    "estimasi": "5 mnt",
    "harga": 13000,
    "gambar": "./img/mie-ayam-ceker.png",
    "buka": 10,
    "tutup": 20,
    "toko": "Warung Basoku"
  },
{
    "nama": "Mie Bakso Muncung Rusuk",
    "kategori": "Makanan",
    "rating": "3.7RB",
    "jarak": "2.3 km",
    "estimasi": "5 mnt",
    "harga": 20000,
    "gambar": "./img/muncung-rusuk.png",
    "buka": 10,
    "tutup": 20,
    "toko": "Warung Basoku"
  }
];

// ✅ Terapkan rating dinamis
produkData.forEach(produk => {
  produk.rating = getUpdatedRating(produk.rating);
});

// ✅ Urutkan dari rating tertinggi
produkData.sort((a, b) => {
  const ratingA = parseFloat(a.rating.replace('RB', ''));
  const ratingB = parseFloat(b.rating.replace('RB', ''));
  return ratingB - ratingA;
});

// === Inisialisasi ===
let customerLocation = null;
let map, customerMarker;

// === Fungsi Utama ===
function loadContent(page) {
  const main = document.getElementById("page-container");
  let content = '';

  if (page === 'alamat') {
    content = `
      <div class="alamat-wrapper">
        <section>
          <h2>📍 Alamat Pengiriman</h2>
          <div class="alamat-box address-box" id="address-display" style="display:none;">
            <h3>Alamat Pengiriman:</h3>
            <p id="saved-address">Alamat belum ditambahkan</p>
            <p><strong>Catatan:</strong> <span id="saved-note">Tidak ada catatan</span></p>
          </div>

          <div class="alamat-box address-form-box" id="address-form" style="display:none;">
            <h3>Tambah Alamat Pengiriman</h3>
            <input type="text" id="full-name" placeholder="Nama Lengkap" />
            <input type="text" id="phone-number" placeholder="Nomor HP" />
            <input type="text" id="full-address" placeholder="Alamat Lengkap" />
            <textarea id="courier-note" placeholder="Patokan" rows="3"></textarea>
            <button class="add-address-btn" onclick="saveAddress()">Simpan Alamat</button>
          </div>

          <div class="alamat-footer">
            <button class="add-address-btn" onclick="toggleAddressForm()">Tambah Alamat</button>
          </div>

          <div id="map-container" style="height: 300px; margin: 10px 0;"></div>
        </section>
      </div>`;
    
    main.innerHTML = content;
    loadSavedAddress();
    initMap();
  }

if (page === 'checkout') {
  content = `
    <div class="checkout-wrapper checkout-page">
      <h2>🧾 Checkout Pesanan</h2>

      <!-- Box Alamat -->
      <div class="alamat-box">
        <h3>📍 Alamat Pengiriman</h3>
        <div class="alamat-terpilih" id="alamat-terpilih">
          <p>Memuat alamat...</p>
        </div>
      </div>

     <!-- Box Keranjang -->
<div class="keranjang-box">
  <h3>🛒 Daftar Pesanan</h3>
  <ul id="cart-items-list"></ul>
  <div id="total-checkout"></div> <!-- Tambahkan ini -->
</div>

<!-- Box Catatan Tambahan -->
<div class="catatan-box">
  <label for="catatan-pesanan" class="catatan-label">
    📝 Catatan Tambahan
  </label>
  <textarea id="catatan-pesanan" rows="3" placeholder="Contoh: Tolong jangan pakai sambal."></textarea>
</div>

<!-- Box Pengiriman -->
<div class="pengiriman-wrapper">
  <label class="pengiriman-label">🚚 Metode Pengiriman:</label>
  <div class="pengiriman-box">
    
    <!-- Standard -->
    <input type="radio" name="pengiriman" id="standard" value="standard" checked>
    <label for="standard" class="pengiriman-card">
      <div class="pengiriman-judul">Standard</div>
      <div class="pengiriman-harga" id="ongkir-standard">Menghitung...</div>
      <div class="pengiriman-jarak" id="jarak-standard">Jarak: -</div>
      <div class="pengiriman-estimasi" id="estimasi-standard">Estimasi: -</div>
    </label>

    <!-- Priority -->
    <input type="radio" name="pengiriman" id="priority" value="priority">
    <label for="priority" class="pengiriman-card">
      <div class="pengiriman-judul">Priority</div>
      <div class="pengiriman-harga" id="ongkir-priority">Menghitung...</div>
      <div class="pengiriman-jarak" id="jarak-priority">Jarak: -</div>
      <div class="pengiriman-estimasi" id="estimasi-priority">Estimasi: -</div>
    </label>

  </div>
</div>


      <!-- Box Voucher -->
      <div class="pengiriman-boxs">
        <h3>🎟️ Voucher</h3>
        <div class="voucher-section-full">
          <input type="text" id="voucher" placeholder="Masukkan kode voucher...">
          <button id="cek-voucher-btn" onclick="cekVoucher()">Cek</button>
        </div>
        <small id="voucher-feedback" class="checkout-note"></small>
      </div>

      <!-- Box Pembayaran -->
      <div class="pembayaran-box">
        <label class="pembayaran-label">
          <i class="fas fa-wallet"></i> Metode Pembayaran
        </label>
        <select id="metode-pembayaran">
          <option value="cod">Bayar di Tempat (COD)</option>
          <option value="transfer">Transfer Bank</option>
        </select>
      </div>

      <!-- Box Rincian Pembayaran -->
      <div class="rincian-box">
        <h3>🧾 Rincian Pembayaran</h3>
        <div class="rincian-item">
          <span>Subtotal Pesanan</span>
          <span id="rincian-subtotal">Rp 0</span>
        </div>
        <div class="rincian-item">
          <span>Subtotal Pengiriman</span>
          <span id="rincian-ongkir">Rp 0</span>
        </div>
        <div class="rincian-item">
          <span>Biaya Layanan</span>
          <span>Rp 0</span>
        </div>
        <div class="rincian-item">
          <span>Total Diskon</span>
          <span id="rincian-diskon">- Rp 0</span>
        </div>
      </div>

<!-- Sticky Footer Checkout -->
<div class="checkout-footer-sticky">
  <div class="total-info">
    <strong>Total: Rp <span id="footer-total">0</span></strong>
    <small class="hemat-text">Hemat Rp <span id="footer-diskon">0</span></small>
  </div>
  <button class="checkout-btn-final" onclick="prosesCheckout()">Buat Pesanan</button>
</div>
    </div>
  `;

  main.innerHTML = content;

  // Panggil render alamat & isi keranjang
  renderAlamatCheckout();
  renderCheckoutItems();

  // Event listener untuk perubahan pengiriman
  document.querySelectorAll('input[name="pengiriman"]').forEach(radio => {
    radio.addEventListener('change', renderCheckoutItems);
  });
}

if (page === "transfer") {
  const content = `
    <div class="transfer-container">
      <h2>💳 Metode Pembayaran Transfer</h2>

      <div class="box-transfer-method">
        <label for="transfer-method">Pilih Bank / Metode:</label>
        <select id="transfer-method" onchange="updateTransferInfo()">
          <option value="bca">BANK BCA</option>
          <option value="seabank">SEABANK</option>
          <option value="dana">DANA (+Rp1.000)</option>
          <option value="qris">QRIS (+1%)</option>
        </select>
      </div>

      <div id="transfer-info" class="box-transfer-info">
        <!-- Info rekening / QRIS akan dimuat di sini -->
      </div>

      <hr style="margin: 2rem 0;" />

      <div class="upload-transfer-wrapper">
        <h4>Upload Bukti Transfer</h4>
        <input type="file" id="bukti-transfer-file" accept="image/*" />
        <div id="preview-transfer-img" style="margin-top: 1rem;"></div>
        <br />
        <button class="btn-kirim-bukti" onclick="kirimBuktiTransfer()">📤 Kirim ke Admin</button>
      </div>
    </div>
  `;

  const container = document.getElementById('page-container');
  if (container) {
    container.innerHTML = content;
    updateTransferInfo(); // Tampilkan info default

    // Pasang event preview setelah elemen dimasukkan ke DOM
    const input = document.getElementById("bukti-transfer-file");
    input.addEventListener("change", function () {
      const file = this.files[0];
      const preview = document.getElementById("preview-transfer-img");
      if (file && preview) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = "100%";
        img.style.borderRadius = "12px";
        img.style.boxShadow = "0 0 10px rgba(0,0,0,0.2)";
        preview.innerHTML = "";
        preview.appendChild(img);
      }
    });
  } else {
    console.error("❌ Elemen 'page-container' tidak ditemukan!");
  }
}



if (page === "cod") {
  const content = `
    <div class="cod-container">
      <!-- Status: Mencari Driver -->
      <div class="cod-header" id="searching-driver">
        <h3>🚚 Sedang Mencari Driver</h3>
        <div>
          <span class="spinner">🔍</span>
          <span class="dot-animate">Mencari Driver Terdekat...</span>
        </div>
      </div>

      <!-- Status: Driver Ditemukan -->
      <div id="driver-found" style="display:none;">
        <div class="driver-status-banner">✅ Driver telah ditemukan!</div>

        <div class="driver-card">
          <img src="https://i.pravatar.cc/150?img=12" alt="Driver" class="driver-img" />
          <div class="driver-info">
            <h4>Vicky Satria Lindyr</h4>
            <p>⭐ <span id="driver-rating">5.0</span> ( <span id="rating-count">0</span> rating )</p>
            <p>WA: <a href="https://wa.me/6285709458101" target="_blank">+62 812-3456-7890</a></p>
            <a href="https://wa.me/6285709458101" target="_blank" class="wa-button">Hubungi via WhatsApp</a>
          </div>
        </div>

        <div class="driver-contact-info">
          📞 Driver akan segera menghubungi kamu melalui WhatsApp!
        </div>

        <!-- Timeline Pengiriman -->
        <div class="timeline-separator"></div>
        <ul class="cod-timeline-list" id="cod-timeline"></ul>
        <div id="estimasi-akhir-tiba"></div>

        <!-- Form Ulasan -->
        <div id="review-form-container" style="display:none; margin-top: 2rem;">
          <h4>📝 Beri Penilaian Driver</h4>

          <div style="margin-bottom: 8px;">
            <label>Rating:</label><br>
            <div id="rating-stars" style="font-size: 1.6rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
              <div>
                <span data-value="1">☆</span>
                <span data-value="2">☆</span>
                <span data-value="3">☆</span>
                <span data-value="4">☆</span>
                <span data-value="5">☆</span>
              </div>
              <span id="rating-label" style="font-size: 1rem; color: #333;">🤩 Sangat Bagus</span>
            </div>
            <input type="hidden" id="review-rating" value="5" />
          </div>

          <div style="margin-bottom: 8px;">
            <label>Komentar:</label><br>
            <textarea id="review-comment" rows="4" style="width:100%; padding: 6px; border-radius: 5px;" placeholder="Tulis pengalaman kamu..."></textarea>
          </div>

          <button onclick="kirimReviewKeTelegram()" style="padding: 8px 16px; background:#25d366; color:white; border:none; border-radius:8px; font-weight:bold;">
            Kirim Penilaian
          </button>
        </div>

        <!-- Ulasan Pelanggan -->
        <div id="review-display-container" style="display:none; margin-top: 2rem;">
          <h4>🧾 Ulasan Pelanggan Lain</h4>
          <div id="review-list"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("page-container").innerHTML = content;

  startCODProcess();         // Mulai simulasi pengiriman dan timeline
  updateDriverRating?.();    // Update rating dari review yang tersimpan
  setupStarRating();         // Aktifkan interaksi bintang rating
}



if (page === "riwayat") {
  const content = `
    <div class="riwayat-container">
      <h2>📜 Riwayat Pesanan</h2>
      <div id="riwayat-list"></div>
    </div>
  `;
  document.getElementById("page-container").innerHTML = content;
  renderRiwayat();
}


 if (page === 'productlist') {
  content = `
    <div class="productlist-wrapper">
      <section>
        <div id="produk-container" class="produk-list-container"></div>
      </section>
    </div>`;
    
  main.innerHTML = content;
  renderProductList();
}
}
