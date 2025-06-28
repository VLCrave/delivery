// === Session Popup & Load Page ===
window.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");
  const closeBtn = document.getElementById("close-popup");

  const sudahPernahMasuk = localStorage.getItem("sessionStartTime");

  if (!sudahPernahMasuk) {
    if (popup) popup.style.display = "block";
    if (overlay) overlay.style.display = "block";
  } else {
    if (popup) popup.style.display = "none";
    if (overlay) overlay.style.display = "none";
    document.body.classList.remove("popup-active");
    loadContent('productlist');
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      localStorage.setItem("sessionStartTime", Date.now().toString());
      if (popup) popup.style.display = "none";
      if (overlay) overlay.style.display = "none";
      document.body.classList.remove("popup-active");
      loadContent('productlist');
    });
  }

  updateCartBadge();
});

// === Data produk ===
const produkData = [
  { nama: "Ayam Geprek Pedas", kategori: "Makanan", rating: "4.8RB", jarak: "2.3 km", estimasi: "35 mnt", harga: 18000, gambar: "https://lifestyle.haluan.co/wp-content/uploads/2024/12/Ayam-Geprek-scaled.jpg", buka: 10, tutup: 21 },
  { nama: "Es Teh Manis Jumbo", kategori: "Minuman", rating: "3.9RB", jarak: "1.2 km", estimasi: "20 mnt", harga: 6000, gambar: "https://i.gojekapi.com/darkroom/gofood-indonesia/v2/images/uploads/fdd5e0d3-c27b-4a14-857b-64917d129343_Go-Biz_20241007_015511.jpeg", buka: 8, tutup: 18 },
  { nama: "Nasi Goreng Spesial", kategori: "Makanan", rating: "6.2RB", jarak: "3.8 km", estimasi: "40 mnt", harga: 22000, gambar: "https://www.masakapahariini.com/wp-content/uploads/2021/07/Nasi-Goreng-Spesial-Ayam-Kecombrang.jpg", buka: 17, tutup: 22 },
  { nama: "Kopi Susu Kekinian", kategori: "Minuman", rating: "6.4RB", jarak: "3.2 km", estimasi: "30 mnt", harga: 18000, gambar: "https://image.freepik.com/free-photo/coffee-cup-top-view-with-milk-foam-black-background_1150-10899.jpg", buka: 7, tutup: 23 },
  { nama: "Martabak Manis", kategori: "Makanan", rating: "8.0RB", jarak: "2.5 km", estimasi: "30 mnt", harga: 35000, gambar: "https://www.dapurkobe.co.id/wp-content/uploads/martabak-manis.jpg", buka: 16, tutup: 22 },
  { nama: "Sate Ayam Bumbu Kacang", kategori: "Makanan", rating: "9.0RB", jarak: "3.5 km", estimasi: "30 mnt", harga: 28000, gambar: "https://i.gojekapi.com/darkroom/gofood-indonesia/v2/images/uploads/7b247c96-5e1a-426d-91de-905a9730992e_Go-Biz_20230530_120214.jpeg", buka: 11, tutup: 22 }
];

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
        <h3>🎟️ Voucher Diskon Ongkir</h3>
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

      <div id="transfer-countdown" class="transfer-countdown"></div>
    </div>
  `;

  const container = document.getElementById('page-container');
  if (container) {
    container.innerHTML = content;
    updateTransferInfo(); // Tampilkan info default
  } else {
    console.error("❌ Elemen 'page-container' tidak ditemukan!");
  }
}

if (page === "cod") {
  const content = `
    <div class="cod-container">
      <div class="cod-header" id="searching-driver">
        <h3>🚚 Sedang Mencari Driver</h3>
        <div>
          <span class="spinner">🔍</span>
          <span class="dot-animate">Mencari Driver Terdekat...</span>
        </div>
      </div>

      <div id="driver-found" style="display:none;">
        <div class="driver-status-banner">✅ Driver telah ditemukan!</div>

        <div class="driver-card">
          <img src="https://i.pravatar.cc/150?img=12" alt="Driver" class="driver-img" />
          <div class="driver-info">
            <h4>Bang Andi Kurir</h4>
            <p>WA: <a href="https://wa.me/6281234567890" target="_blank">+62 812-3456-7890</a></p>
          </div>
        </div>

        <div class="driver-contact-info">
  📞 Driver akan segera menghubungi kamu melalui Whatsapp!
</div>
<div class="timeline-separator"></div>
        <ul class="cod-timeline-list" id="cod-timeline"></ul>
      </div>
    </div>
  `;

  document.getElementById("page-container").innerHTML = content;

  // Panggil fungsi timeline / proses driver (sesuaikan nama fungsi)
  startCODProcess();
}






  if (page === 'productlist') {
    content = `
      <div class="productlist-wrapper">
        <section>
          <div id="produk-container" class="produk-list-horizontal"></div>
        </section>
      </div>`;
    main.innerHTML = content;
    renderProductList();
  }
}


///  BATAS  ////


function startCODProcess() {
  const searchingEl = document.getElementById("searching-driver");
  const driverFoundEl = document.getElementById("driver-found");
  const timelineContainer = document.getElementById("cod-timeline");

  const timelineData = [
    { label: "Driver Menghubungi kamu untuk melakukan konfirmasi", duration: 3 * 60 },
    { label: "Driver Menuju Resto", duration: 3 * 60 },
    { label: "Pesanan diproses Resto", duration: 30 * 60 },
    { label: "Pesanan di Pickup Driver", duration: 3 * 60 },
    { label: "Driver Menuju alamatmu", duration: 10 * 60 },
  ];

  const searchDuration = 10000 + Math.random() * 10000;

  searchingEl.style.display = "block";
  driverFoundEl.style.display = "none";

  localStorage.removeItem("codProgressState");

  setTimeout(() => {
    searchingEl.style.display = "none";
    driverFoundEl.style.display = "block";
    startTimeline(timelineData, timelineContainer);
  }, searchDuration);

  function renderStep(stepIndex, progressPercent, stepStartTime) {
    const step = timelineData[stepIndex];
    const isCompleted = stepIndex < state.currentStep;
    const isCurrent = stepIndex === state.currentStep;

    const driverIcon = "🚚";
    const stepIcons = ["📞", "🏃‍♂️", "🍳", "📦", "🏠"];

    const dt = new Date(stepStartTime);
    const h = dt.getHours().toString().padStart(2, "0");
    const m = dt.getMinutes().toString().padStart(2, "0");
    const timeStr = `(${h}:${m})`;

    const progressWidth = Math.min(100, progressPercent);

    return `
      <li class="${isCompleted ? "completed" : isCurrent ? "active" : "pending"}">
        <div class="status-label">${step.label}</div>
        <div class="step-bottom-row">
          <span class="status-icon">${driverIcon}</span>
          <div class="progress-bar-wrapper">
            <div class="progress-bar">
              <div style="width: ${progressWidth}%;"></div>
            </div>
          </div>
          <span class="step-icon">${stepIcons[stepIndex] || "❓"}</span>
          <span class="realtime-time">${timeStr}</span>
        </div>
      </li>
    `;
  }

  let state;

  function startTimeline(timeline, container) {
    let savedState = localStorage.getItem("codProgressState");
    if (savedState) {
      state = JSON.parse(savedState);
      if (Date.now() - state.startTimestamp > 60 * 60 * 1000) {
        state = null;
        localStorage.removeItem("codProgressState");
      }
    }

    if (!state) {
      state = {
        startTimestamp: Date.now(),
        currentStep: 0,
        stepStartTimestamp: Date.now(),
      };
    }

    function updateTimeline() {
      const now = Date.now();
      let stepElapsed = Math.floor((now - state.stepStartTimestamp) / 1000);
      const stepDuration = timeline[state.currentStep].duration;
      let progressPercent = (stepElapsed / stepDuration) * 100;

      if (stepElapsed >= stepDuration) {
        state.currentStep++;
        if (state.currentStep >= timeline.length) {
          container.innerHTML = `<p style="color:green; font-weight:bold;">🎉 Pesanan telah selesai dikirim!</p>`;
          localStorage.removeItem("codProgressState");
          clearInterval(intervalId);
          return;
        } else {
          state.stepStartTimestamp = now;
          stepElapsed = 0;
          progressPercent = 0;
        }
      }

      let html = "";
      let accDuration = 0;
      for (let i = 0; i <= state.currentStep; i++) {
        let barPercent = 0;
        if (i < state.currentStep) barPercent = 100;
        else if (i === state.currentStep) barPercent = progressPercent;

        const stepStartTime = state.startTimestamp + accDuration * 1000;
        html += renderStep(i, barPercent, stepStartTime);
        accDuration += timeline[i].duration;
      }

      container.innerHTML = html;
      localStorage.setItem("codProgressState", JSON.stringify(state));
    }

    updateTimeline();
    var intervalId = setInterval(updateTimeline, 1000);
  }
}









function animateProgressBar(id, durationInSec) {
  const bar = document.getElementById(id);
  const total = durationInSec * 1000;
  const intervalTime = 1000;
  let elapsed = 0;

  const interval = setInterval(() => {
    elapsed += intervalTime;
    const percent = Math.min((elapsed / total) * 100, 100);
    bar.style.width = `${percent}%`;
    if (elapsed >= total) clearInterval(interval);
  }, intervalTime);
}

function getTimeNow() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function calculateJarakKeCustomer() {
  const lokasi = JSON.parse(localStorage.getItem("customerLocation"));
  const toko = { lat: -1.6409437, lng: 105.7686011 };
  const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, lokasi.lat, lokasi.lng);
  return Math.ceil(jarak);
}

// Haversine Function
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}





function startTransferCountdown() {
  const start = parseInt(localStorage.getItem("transferStart"));
  const duration = 5 * 60 * 1000;
  const end = start + duration;

  const interval = setInterval(() => {
    const now = Date.now();
    const remaining = end - now;

    if (remaining <= 0) {
      document.getElementById("transfer-countdown").textContent = "⏱️ Waktu transfer habis!";
      clearInterval(interval);
      // Redirect ke beranda
      setTimeout(() => {
        localStorage.removeItem("transferStart");
        countdownStarted = false;
        loadContent('home');
      }, 3000);
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    document.getElementById("transfer-countdown").textContent =
      `⏱️ Sisa waktu transfer: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
}


function updateTransferInfo() {
  const method = document.getElementById("transfer-method").value;
  const rekening = {
    bca: { nama: "VICKY SATRIA LINDY", norek: "6455106421", bank: "BANK BCA", extra: 0 },
    seabank: { nama: "VICKY SATRIA LINDY", norek: "901424526250", bank: "SEABANK", extra: 0 },
    dana: { nama: "VICKY SATRIA LINDY", norek: "082181670112", bank: "DANA", extra: 1000 },
    qris: { nama: "QRIS", img: "/img/qris.jpg", extra: "1%" }
  };

  const info = rekening[method];
  let nominal = parseInt(localStorage.getItem("checkoutTotal") || "0");

  if (method === "dana") {
    nominal += 1000;
  } else if (method === "qris") {
    nominal += Math.round(nominal * 0.01);
  }

  // Simpan waktu mulai transfer jika belum ada
  if (!localStorage.getItem("transferStart")) {
    localStorage.setItem("transferStart", Date.now().toString());
  }

  // Pesan peringatan
  let html = `
    <div class="transfer-alert">
      ⚠️ <strong>Mohon transfer sesuai nominal!</strong> Admin akan mengecek secara manual.
    </div>
  `;

  if (method === "qris") {
    html += `
      <div class="qris-box">
        <img src="${info.img}" alt="QRIS" class="qris-img"/>
        <p><strong>Silakan scan QRIS untuk membayar</strong></p>
        <p>Nominal: <span class="nominal-copy" onclick="copyNominal(${nominal})">Rp ${nominal.toLocaleString()}</span></p>
      </div>
    `;
  } else {
    html += `
      <div class="rekening-box">
        <p><strong>${info.bank}</strong></p>
        <p><strong>${info.nama}</strong></p>
        <p>No. Rekening: <strong class="rekening-copy" onclick="copyRekening('${info.norek}')">${info.norek}</strong></p>
        <p>Nominal Transfer: <span class="nominal-copy" onclick="copyNominal(${nominal})">Rp ${nominal.toLocaleString()}</span></p>
      </div>
    `;
  }

  html += `
    <div id="transfer-countdown" class="countdown-box"></div>
    <button onclick="konfirmasiTransfer(${nominal})" class="btn-konfirmasi">✅ Saya Sudah Bayar</button>
  `;

  document.getElementById("transfer-info").innerHTML = html;

  // Jalankan countdown hanya sekali
  if (!countdownStarted) {
    startTransferCountdown();
    countdownStarted = true;
  }
}



function copyNominal(nominal) {
  navigator.clipboard.writeText(nominal.toString()).then(() => {
    alert("✅ Nominal berhasil disalin!");
  });
}

function copyRekening(norek) {
  navigator.clipboard.writeText(norek).then(() => {
    alert("✅ Nomor rekening berhasil disalin!");
  });
}

function konfirmasiTransfer(nominal) {
  const nama = localStorage.getItem("nama") || "-";
  const wa = localStorage.getItem("wa") || "-";
  const alamat = localStorage.getItem("address") || "-";
  const noAdmin = "085709458101";
  const noWA = noAdmin.replace(/^0/, "62");

  const msg = encodeURIComponent(
    `Halo Admin,\nSaya sudah melakukan transfer.\n\n👤 Nama: ${nama}\n📱 WA: ${wa}\n🏠 Alamat: ${alamat}\n💸 Nominal: Rp ${nominal.toLocaleString()}`
  );

  window.open(`https://wa.me/${noWA}?text=${msg}`, "_blank");
}



function startDriverLoading() {
  const loadingBar = document.getElementById('loading-bar');
  const loadingLabel = document.getElementById('loading-label');
  const countdownLabel = document.getElementById('countdown-label');

  let totalTime = 120; // detik
  let progress = 0;

  const interval = setInterval(() => {
    totalTime--;
    progress = Math.min(100, progress + (100 / 120)); // Naik per detik

    loadingBar.style.width = `${progress}%`;
    loadingLabel.textContent = `Mencari Driver... ${Math.floor(progress)}%`;
    countdownLabel.textContent = `Sisa waktu: ${totalTime} detik`;

    if (totalTime <= 0 || progress >= 100) {
      clearInterval(interval);
      loadingLabel.textContent = `✅ Driver Ditemukan!`;
      countdownLabel.style.display = "none";

      // TODO: lanjutkan ke card driver atau animasi selanjutnya
      showDriverCard();
    }
  }, 1000);
}



async function prosesCheckout() {
  const nama = localStorage.getItem('nama');
  const wa = localStorage.getItem('wa');
  const alamat = localStorage.getItem('address');
  const note = localStorage.getItem('catatan') || '-';
  const lokasi = JSON.parse(localStorage.getItem('customerLocation'));
  const keranjang = JSON.parse(localStorage.getItem('cart')) || [];

  if (!nama || !wa || !alamat || !lokasi || !lokasi.lat || !lokasi.lng) {
    alert("⚠️ Alamat pengiriman belum lengkap.");
    loadContent('alamat');
    return;
  }

  if (keranjang.length === 0) {
    alert("🛒 Keranjang masih kosong.");
    return;
  }

  const metodePengiriman = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  const metodePembayaran = document.getElementById("metode-pembayaran")?.value || "COD";
  localStorage.setItem("metodePengiriman", metodePengiriman);
  localStorage.setItem("metodePembayaran", metodePembayaran);

  const toko = { lat: -1.6409437, lng: 105.7686011 };
  const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, lokasi.lat, lokasi.lng).toFixed(2);

  if (jarak > 25) {
    alert("⚠️ Maaf, jarak pengiriman melebihi 25 km.");
    return;
  }

  const ongkir = hitungOngkirDenganTipe(metodePengiriman);
  const diskon = (ongkir * (currentDiskon || 0)).toFixed(0);
  const totalProduk = keranjang.reduce((t, item) => t + item.harga * item.jumlah, 0);
  const totalBayar = totalProduk + (ongkir - diskon);
  localStorage.setItem("checkoutTotal", totalBayar); // simpan untuk halaman transfer

  let estimasiText = document.getElementById(`estimasi-${metodePengiriman}`)?.textContent || "Estimasi: 0 menit";
  let estimasiMenit = parseInt(estimasiText.replace(/\D/g, '')) || 0;

  const waktuSekarang = new Date();
  waktuSekarang.setMinutes(waktuSekarang.getMinutes() + estimasiMenit);
  const jam = waktuSekarang.getHours().toString().padStart(2, '0');
  const menit = waktuSekarang.getMinutes().toString().padStart(2, '0');
  const batasWaktuAntar = `${jam}:${menit}`;

  const mapsLink = `https://www.google.com/maps?q=${lokasi.lat},${lokasi.lng}`;

  let listProduk = "";
  keranjang.forEach(item => {
    listProduk += `• ${item.nama} x ${item.jumlah} = Rp ${(item.harga * item.jumlah).toLocaleString()}\n`;
  });

  const waClean = wa.replace(/^0/, "62").replace(/\D/g, "");
  const teksWA = encodeURIComponent(
    `Halo ${nama},\nPesanan kamu sudah kami terima:\n\n${listProduk}- Pengiriman: ${metodePengiriman.toUpperCase()}\n- Total: Rp ${totalBayar.toLocaleString()}\n- Alamat: ${alamat}\n\nApakah sudah sesuai titik aplikasi untuk pengantarannya?`
  );
  const waLink = `https://wa.me/${waClean}?text=${teksWA}`;

  const judul = metodePengiriman === 'priority'
    ? '🛒 *PESANAN PRIORITAS BARU*'
    : '🛒 *PESANAN STANDARD BARU*';

  let pesan = `${judul}\n\n`;
  pesan += `📍 *Data Pelanggan:*\n`;
  pesan += `👤 *Nama:* ${nama}\n`;
  pesan += `📱 *WhatsApp:* ${wa}\n`;
  pesan += `🏠 *Alamat:* ${alamat}\n`;
  pesan += `📦 *Catatan:* ${note}\n`;
  pesan += `🌍 *Titik Lokasi:*\n${mapsLink}\n\n`;

  pesan += `📦 *Pesanan:*\n${listProduk}\n`;
  pesan += `📏 *Jarak:* ${jarak} km\n`;
  pesan += `🚚 *Ongkir:* Rp ${ongkir.toLocaleString()}\n`;
  pesan += `🎟️ *Diskon Ongkir:* Rp ${diskon.toLocaleString()}\n`;
  pesan += `💰 *Pembayaran:* ${metodePembayaran.toUpperCase()}\n`;
  pesan += `💸 *Total Bayar:* Rp ${totalBayar.toLocaleString()}\n`;
  pesan += `🕓 *Batas Waktu Antar:* ${batasWaktuAntar}\n`;
  pesan += `\n📞 *Klik untuk Hubungi via WhatsApp:*\n${waLink}`;

  const BOT_TOKEN = '8012881635:AAEBqLZZz0jaA4Ek0GsvFkzuEXoknxiq8Rg';
  const CHAT_ID = '6046360096';

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: pesan,
        parse_mode: "Markdown"
      })
    });

    localStorage.removeItem("cart");

    // Arahkan ke halaman sesuai metode pembayaran
    if (metodePembayaran.toLowerCase() === "transfer") {
      loadContent("transfer");
    } else {
      loadContent("cod");
    }

  } catch (err) {
    console.error(err);
    alert("❌ Gagal mengirim ke Telegram. Coba lagi.");
  }
}







// === Daftar Voucher ===
const voucherList = {
  "ONGKIR10": 0.10,
  "ONGKIR20": 0.20,
  "ONGKIR50": 0.50,
  "GRATISONGKIR": 1.00
};

let currentDiskon = 0;

// === Cek Voucher ===
function cekVoucher() {
  const kode = document.getElementById('voucher')?.value.trim().toUpperCase();
  const feedback = document.getElementById('voucher-feedback');

  if (voucherList[kode]) {
    currentDiskon = voucherList[kode];
    if (feedback) {
      feedback.textContent = `✅ Voucher aktif! Diskon ${(currentDiskon * 100).toFixed(0)}% untuk ongkir.`;
    }
  } else {
    currentDiskon = 0;
    if (feedback) {
      feedback.textContent = kode ? '❌ Kode voucher tidak berlaku.' : '';
    }
  }

  renderCheckoutItems();
}

// === Rumus Haversine (menghitung jarak) ===
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// === Hitung Ongkir ===
function hitungOngkirDenganTipe(tipe) {
  const toko = { lat: -1.6409437, lng: 105.7686011 };
  const cust = JSON.parse(localStorage.getItem("customerLocation")) || toko;
  const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, cust.lat, cust.lng);

  let ongkir = 8000;
  if (jarak > 2) ongkir += Math.ceil(jarak - 2) * 1500;
  if (tipe === "priority") ongkir += 3500;

  return ongkir;
}

function hitungOngkir() {
  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  return hitungOngkirDenganTipe(metode);
}



// === Update Jumlah Produk ===
function updateJumlah(namaProduk, change) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const index = cart.findIndex(item => item.nama === namaProduk);
  if (index !== -1) {
    cart[index].jumlah += change;
    if (cart[index].jumlah <= 0) {
      cart.splice(index, 1);
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCheckoutItems();
    updateCartBadge?.();
  }
}

// === Inisialisasi Setelah DOM Siap ===
window.addEventListener("DOMContentLoaded", () => {
  // Update saat metode pengiriman diubah
  document.querySelectorAll('input[name="pengiriman"]').forEach(radio => {
    radio.addEventListener('change', renderCheckoutItems);
  });

  // Pertama kali render
  renderCheckoutItems();
});

// === Integrasi dengan Peta: Panggil dari Leaflet saat marker digeser ===
// Contoh:
if (typeof marker !== "undefined") {
  marker.on("dragend", function (e) {
    const newPos = marker.getLatLng();
    const lokasiBaru = { lat: newPos.lat, lng: newPos.lng };
    localStorage.setItem("customerLocation", JSON.stringify(lokasiBaru));
    renderCheckoutItems();
  });
}
// === Render Checkout Items ===
function renderCheckoutItems() {
  const cartItems = JSON.parse(localStorage.getItem("cart")) || [];
  const cartList = document.getElementById("cart-items-list");
  const totalEl = document.getElementById("total-checkout");
  const footerTotal = document.getElementById("footer-total");
  const footerDiskon = document.getElementById("footer-diskon");

  if (!cartList || !totalEl) return;

  cartList.innerHTML = "";
  let totalProduk = 0;

  if (cartItems.length === 0) {
    cartList.innerHTML = `<li style="padding: 12px; color: #999;">🛒 TIDAK ADA PRODUK DALAM KERANJANG</li>`;
  } else {
    cartItems.forEach(item => {
      const namaProduk = item.nama || "Produk";
      const totalPerItem = item.harga * item.jumlah;
      totalProduk += totalPerItem;

      cartList.innerHTML += `
        <li style="display: flex; gap: 12px; margin-bottom: 10px;">
          <img src="${item.gambar}" alt="${namaProduk}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
          <div style="flex: 1;">
            <strong>${namaProduk}</strong><br/>
            Jumlah:
            <button onclick="updateJumlah('${namaProduk}', -1)">➖</button>
            ${item.jumlah}
            <button onclick="updateJumlah('${namaProduk}', 1)">➕</button><br/>
            Total: Rp ${totalPerItem.toLocaleString()}
          </div>
        </li>
      `;
    });
  }

  const ongkir = hitungOngkir();
  const potonganOngkir = ongkir * (currentDiskon || 0);
  const totalBayar = totalProduk + (ongkir - potonganOngkir);

  totalEl.innerHTML = `
    <div>Subtotal Produk: <strong>Rp ${totalProduk.toLocaleString()}</strong></div>
    <div>Ongkir: <strong>Rp ${ongkir.toLocaleString()}</strong></div>
    ${currentDiskon > 0 ? `<div>Diskon Ongkir: <strong>-Rp ${potonganOngkir.toLocaleString()}</strong></div>` : ''}
    <div style="border-top: 1px dashed #ccc; margin-top: 8px; padding-top: 8px;">
      <strong>Total Bayar: Rp ${totalBayar.toLocaleString()}</strong>
    </div>
  `;

  if (footerTotal) footerTotal.textContent = totalBayar.toLocaleString();
  if (footerDiskon) footerDiskon.textContent = potonganOngkir.toLocaleString();

  // Ongkir dan jarak per metode
  const ongkirStandard = hitungOngkirDenganTipe("standard");
  const ongkirPriority = hitungOngkirDenganTipe("priority");
  const elStandard = document.getElementById("ongkir-standard");
  const elPriority = document.getElementById("ongkir-priority");
  if (elStandard) elStandard.textContent = `Rp ${ongkirStandard.toLocaleString()}`;
  if (elPriority) elPriority.textContent = `Rp ${ongkirPriority.toLocaleString()}`;

  const toko = { lat: -1.6409437, lng: 105.7686011 };
  const cust = JSON.parse(localStorage.getItem("customerLocation")) || toko;
  const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, cust.lat, cust.lng).toFixed(2);

  // Estimasi & Jarak
  const estimasiStandard = document.getElementById("estimasi-standard");
  const estimasiPriority = document.getElementById("estimasi-priority");
  const jarakStandard = document.getElementById("jarak-standard");
  const jarakPriority = document.getElementById("jarak-priority");

  let estimasiWaktuStandard = "±" + Math.ceil(jarak * 5 + 30) + " menit";
  let estimasiWaktuPriority = "±" + Math.ceil(jarak * 3 + 20) + " menit";

  if (jarakStandard) jarakStandard.textContent = `Jarak: ${jarak} km`;
  if (jarakPriority) jarakPriority.textContent = `Jarak: ${jarak} km`;
  if (estimasiStandard) estimasiStandard.textContent = `Estimasi: ${estimasiWaktuStandard}`;
  if (estimasiPriority) estimasiPriority.textContent = `Estimasi: ${estimasiWaktuPriority}`;

  // Rincian di bawah
  const rincianSubtotal = document.getElementById("rincian-subtotal");
  const rincianOngkir = document.getElementById("rincian-ongkir");
  const rincianDiskon = document.getElementById("rincian-diskon");
  if (rincianSubtotal) rincianSubtotal.textContent = `Rp ${totalProduk.toLocaleString()}`;
  if (rincianOngkir) rincianOngkir.textContent = `Rp ${ongkir.toLocaleString()}`;
  if (rincianDiskon) rincianDiskon.textContent = `- Rp ${potonganOngkir.toLocaleString()}`;
}







function renderAlamatCheckout() {
  const alamatBox = document.getElementById('alamat-terpilih');
  const nama = localStorage.getItem('nama') || '-';
  const phone = localStorage.getItem('wa') || '-';
  const alamat = localStorage.getItem('address') || 'Alamat belum diisi';
  const note = localStorage.getItem('catatan') || '-';
  const lokasi = JSON.parse(localStorage.getItem('customerLocation'));

  let lokasiLink = '';
  if (lokasi) {
    lokasiLink = `<br/><a href="https://www.google.com/maps?q=${lokasi.lat},${lokasi.lng}" target="_blank">📍 Lihat Lokasi di Google Maps</a>`;
  }

  alamatBox.innerHTML = `
    <p>👤 ${nama}<br/>📱 ${phone}<br/>🏠 ${alamat}</p>
    <p class="checkout-note">📦 Catatan: ${note}</p>
    ${lokasiLink}
  `;
}

function toggleAddressForm() {
  const form = document.getElementById('address-form');
  form.style.display = (form.style.display === 'none') ? 'block' : 'none';
}

function saveAddress() {
  const name = document.getElementById('full-name').value.trim();
  const phone = document.getElementById('phone-number').value.trim();
  const addr = document.getElementById('full-address').value.trim();
  const note = document.getElementById('courier-note').value.trim();
  const pos = customerMarker.getLatLng();

  if (name && phone && addr) {
    localStorage.setItem('nama', name);
    localStorage.setItem('wa', phone);
    localStorage.setItem('address', addr);
    localStorage.setItem('catatan', note);
    localStorage.setItem('customerLocation', JSON.stringify({ lat: pos.lat, lng: pos.lng }));

    document.getElementById('saved-address').innerHTML = `
      👤 ${name}<br/>📱 ${phone}<br/>🏠 ${addr}
    `;
    document.getElementById('saved-note').textContent = note || '-';
    document.getElementById('address-display').style.display = 'block';
    document.getElementById('address-form').style.display = 'none';

    sendToTelegram(name, phone, addr, note, pos.lat, pos.lng);
  } else {
    alert('Harap isi semua informasi alamat');
  }
}

function sendToTelegram(name, phone, addr, note, latitude, longitude) {
  const botToken = "8012881635:AAEBqLZZz0jaA4Ek0GsvFkzuEXoknxiq8Rg";
  const chatId = "6046360096";

  const message = `
🏠 *Database Baru!*
👤 *Nama:* ${name}
📱 *Nomor HP:* ${phone}
🏠 *Alamat:* ${addr}
📦 *Catatan untuk kurir:* ${note || "-"}
📍 *Lokasi Pengiriman:*
https://www.google.com/maps?q=${latitude},${longitude}
`;

  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown"
    })
  })
    .then(response => response.json())
    .then(data => {
      if (data.ok) {
        alert("✅ Alamat berhasil disimpan dan dikirim ke Telegram!");
      } else {
        alert("❌ Gagal mengirim ke Telegram: " + data.description);
      }
    })
    .catch(error => {
      console.error("Terjadi kesalahan:", error);
      alert("Terjadi kesalahan saat mengirim ke Telegram.");
    });
}

function loadSavedAddress() {
  const nama = localStorage.getItem('nama');
  const wa = localStorage.getItem('wa');
  const alamat = localStorage.getItem('address');
  const note = localStorage.getItem('catatan');
  const lokasi = JSON.parse(localStorage.getItem('customerLocation'));

  const displayBox = document.getElementById('address-display');
  const displayText = document.getElementById('saved-address');
  const noteText = document.getElementById('saved-note');

  if (nama && wa && alamat) {
    displayBox.style.display = 'block';
    displayText.innerHTML = `
      👤 ${nama}<br/>
      📱 ${wa}<br/>
      🏠 ${alamat}
    `;
    if (noteText) noteText.textContent = note || '-';
  } else {
    displayBox.style.display = 'none';
    displayText.textContent = "Alamat belum ditambahkan.";
  }

  if (lokasi) {
    customerLocation = lokasi;
  }
}


function initMap() {
  const defaultLocation = { lat: -1.6409437, lng: 105.7686011 };
  const saved = JSON.parse(localStorage.getItem('customerLocation'));

  // Pakai lokasi dari localStorage jika ada
  customerLocation = saved || defaultLocation;

  map = L.map('map-container').setView([customerLocation.lat, customerLocation.lng], 17);
  L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  customerMarker = L.marker([customerLocation.lat, customerLocation.lng], {
    draggable: true
  }).addTo(map).bindPopup("📍 Lokasi Anda").openPopup();

  // Update posisi dan simpan ke localStorage saat marker dipindah
  customerMarker.on('dragend', function (e) {
    const pos = e.target.getLatLng();
    customerLocation = { lat: pos.lat, lng: pos.lng };
    localStorage.setItem('customerLocation', JSON.stringify(customerLocation));

    // Update ulang ongkir saat marker digeser
    renderCheckoutItems?.();
  });
}


function renderProductList() {
  const produkContainer = document.getElementById('produk-container');
  if (produkContainer && produkData.length > 0) {
    produkContainer.innerHTML = '';

    produkData.forEach((produk, index) => {
      const productCard = `
        <div class="produk-card">
          <img src="${produk.gambar}" alt="${produk.nama}" class="produk-img" />
          <div class="produk-info">
            <h3>${produk.nama}</h3>
            <div class="produk-meta">
              <p>Kategori: ${produk.kategori}</p>
              <p>Rating: ⭐${produk.rating}</p>
              <p>Jarak: ${produk.jarak} | Estimasi: ${produk.estimasi}</p>
            </div>
            <div class="produk-action">
              <strong>Rp ${produk.harga.toLocaleString()}</strong>
              <button class="beli-btn" data-index="${index}">Tambah ke Keranjang</button>
            </div>
          </div>
        </div>
      `;
      produkContainer.innerHTML += productCard;
    });

    // Pasang event listener setelah semua produk ditampilkan
    document.querySelectorAll('.beli-btn').forEach(button => {
      button.addEventListener('click', () => {
        const index = button.getAttribute('data-index');
        tambahKeKeranjang(produkData[index]);
      });
    });
  } else {
    produkContainer.innerHTML = '<p>Produk tidak tersedia.</p>';
  }
}



function tambahKeKeranjang(produk) {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  const index = cart.findIndex(item => item.nama === produk.nama);

  if (index !== -1) {
    cart[index].jumlah += 1;
  } else {
    cart.push({
      nama: produk.nama,
      harga: produk.harga,
      gambar: produk.gambar,
      jumlah: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();
}



function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((acc, item) => acc + item.jumlah, 0);
  const badge = document.querySelector('.cart-badge');
  if (badge) badge.textContent = total;
}

