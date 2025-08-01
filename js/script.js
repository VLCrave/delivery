document.addEventListener("DOMContentLoaded", async () => {
  // === Script kamu yang sudah ada ===
  // ✅ Notifikasi awal
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

  // ✅ DOM Element
  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");
  const closeBtn = document.getElementById("close-popup");
  const popupImg = document.getElementById("popup-img");
  const popupText = document.getElementById("popup-text");
  const checkoutBtn = document.querySelector(".checkout-btn-final");

  if (!popup || !overlay || !closeBtn || !popupImg || !popupText) return;

  let isOpen = true;
  let jamBuka = "08:00", jamTutup = "22:00";

  try {
    const db = firebase.firestore();
    const doc = await db.collection("pengaturan").doc("jam_layanan").get();

    const data = doc.exists ? doc.data() : { buka: "08:00", tutup: "22:00", aktif: true, mode: "otomatis" };
    jamBuka = data.buka || "08:00";
    jamTutup = data.tutup || "22:00";
    const aktif = data.aktif !== false;
    const mode = data.mode || "otomatis";

    const now = new Date();
    const hour = now.getHours();

    if (mode === "otomatis") {
      const buka = parseInt(jamBuka.split(":")[0]);
      const tutup = parseInt(jamTutup.split(":")[0]);
      isOpen = aktif && hour >= buka && hour < tutup;
    } else {
      isOpen = aktif;
    }

    // ✅ Tampilkan popup
    popup.style.display = "block";
    overlay.style.display = "block";
    document.body.classList.add("popup-active");

    popupImg.src = isOpen ? "./img/open.png" : "./img/close.png";
    popupText.innerHTML = isOpen
      ? `<strong>✅ Layanan Aktif</strong><br>Selamat berbelanja!`
      : `<strong>⛔ Layanan Tutup</strong><br>Buka setiap ${jamBuka} - ${jamTutup}`;

    // ✅ Tutup popup
closeBtn.addEventListener("click", async () => {
  popup.style.display = "none";
  overlay.style.display = "none";
  document.body.classList.remove("popup-active");

  try {
    const user = firebase.auth().currentUser;
    if (user) {
      const userDoc = await firebase.firestore().collection("users").doc(user.uid).get();
      const role = userDoc.exists ? (userDoc.data().role || "").toLowerCase() : "";

      if (role === "seller") {
        loadContent("seller-dashboard");
      } else if (role === "driver") {
        loadContent("driver-dashboard");
      } else {
        loadContent("productlist");
      }
    } else {
      loadContent("productlist");
    }

    if (!isOpen) {
      alert(`⚠️ Layanan saat ini sedang tutup.\nJam buka: ${jamBuka} - ${jamTutup}`);
    }

  } catch (err) {
    console.error("❌ Gagal mendeteksi role user:", err);
    loadContent("productlist");
  }
});


    // ✅ Disable tombol checkout jika layanan tutup
    if (!isOpen && checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Layanan Tutup";
      checkoutBtn.style.opacity = "0.6";
      checkoutBtn.style.cursor = "not-allowed";
    }

  } catch (err) {
    console.error("❌ Gagal mengambil jam layanan:", err);
    alert("⚠️ Gagal memuat pengaturan layanan. Silakan refresh halaman.");
  }

  // ✅ Update badge keranjang jika ada
  if (typeof updateCartBadge === "function") {
    updateCartBadge();
  }

  // ✅ Auto-refresh riwayat jika di halaman riwayat
  const page = localStorage.getItem("pageAktif") || "";
  if (page === "riwayat" && typeof renderRiwayat === "function") {
    renderRiwayat();
    setInterval(() => {
      if (document.getElementById("riwayat-list")) {
        renderRiwayat();
        console.log("🔁 Riwayat diperbarui otomatis");
      }
    }, 1000);
  }

  // === Tambahan: Dropdown toggle handler ===
  document.addEventListener("click", function(event) {
    if (event.target.matches(".dropdown-toggle")) {
      const dropdownContainer = event.target.closest(".dropdown-container");
      if (!dropdownContainer) return;

      const dropdownMenu = dropdownContainer.querySelector(".dropdown-menu");
      if (!dropdownMenu) return;

      const isShown = dropdownMenu.style.display === "block";

      // Tutup semua dropdown menu lain
      document.querySelectorAll(".dropdown-menu").forEach(menu => {
        menu.style.display = "none";
      });

      // Toggle dropdown menu saat ini
      dropdownMenu.style.display = isShown ? "none" : "block";

      event.stopPropagation();
    } else {
      // Klik di luar tombol dropdown, tutup semua dropdown
      document.querySelectorAll(".dropdown-menu").forEach(menu => {
        menu.style.display = "none";
      });
    }
  });

});


// === Fungsi Utama ===
async function loadContent(page) {
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
          <div style="margin-top:10px;">
            <button onclick="toggleAddressForm(true)">✏️ Edit</button>
            <button onclick="deleteAddress()">🗑️ Hapus</button>
          </div>
        </div>

        <div class="alamat-box address-form-box" id="address-form" style="display:none;">
          <h3 id="form-title">Tambah Alamat Pengiriman</h3>
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
    </div>
  `;

  main.innerHTML = content;
  loadSavedAddress();
  initMap();
}


if (page === 'checkout') {
  content = `
    <div class="checkout-wrapper checkout-page">
      <h2>🧾 Checkout Pesanan</h2>

      <!-- Alamat Pengiriman -->
      <div class="alamat-box">
        <h3>📍 Alamat Pengiriman</h3>
        <div class="alamat-terpilih" id="alamat-terpilih">
          <p>Memuat alamat...</p>
        </div>
      </div>

      <!-- Daftar Keranjang -->
<div class="keranjang-box">
  <h3>🛒 Daftar Pesanan</h3>
  <ul id="cart-items-list"></ul>
  <div id="total-checkout"></div>

  <!-- Catatan Tambahan -->
  <div class="catatan-tambahan" style="margin-top: 15px;">
    <label for="catatan-pesanan"><strong>📝 Catatan Tambahan</strong></label>
    <textarea id="catatan-pesanan" placeholder="Tulis catatan untuk penjual... (opsional)" rows="3" style="width:100%; padding:10px; border-radius:8px; border:1px solid #ccc; margin-top:5px;"></textarea>
  </div>
</div>

      <!-- Metode Pengiriman -->
      <div class="pengiriman-wrapper">
        <label class="pengiriman-label">🚚 Metode Pengiriman:</label>
        <div class="pengiriman-box">
          <input type="radio" name="pengiriman" id="standard" value="standard" checked>
          <label for="standard" class="pengiriman-card">
            <div class="pengiriman-judul">Standard</div>
            <div class="pengiriman-harga" id="ongkir-standard">Menghitung...</div>
            <div class="pengiriman-jarak" id="jarak-standard">Jarak: -</div>
            <div class="pengiriman-estimasi" id="estimasi-standard">Estimasi: -</div>
          </label>

          <input type="radio" name="pengiriman" id="priority" value="priority">
          <label for="priority" class="pengiriman-card">
            <div class="pengiriman-judul">Priority</div>
            <div class="pengiriman-harga" id="ongkir-priority">Menghitung...</div>
            <div class="pengiriman-jarak" id="jarak-priority">Jarak: -</div>
            <div class="pengiriman-estimasi" id="estimasi-priority">Estimasi: -</div>
          </label>
        </div>
      </div>

      <!-- Voucher -->
      <div class="pengiriman-boxs">
        <h3>🎟️ Voucher</h3>
        <div class="voucher-section-full">
          <input type="text" id="voucher" placeholder="Masukkan kode voucher...">
          <button id="cek-voucher-btn" onclick="cekVoucher()">Cek</button>
        </div>
        <small id="voucher-feedback" class="checkout-note"></small>
      </div>

      <!-- Metode Pembayaran -->
      <div class="pembayaran-box">
        <label class="pembayaran-label"><i class="fas fa-wallet"></i> Metode Pembayaran</label>
        <select id="metode-pembayaran">
          <option value="cod">Bayar di Tempat (COD)</option>
          <option value="saldo">Saldo</option>
        </select>
      </div>

      <!-- Rincian Pembayaran -->
      <div class="rincian-box">
        <h3>🧾 Rincian Pembayaran</h3>
        <div class="rincian-item"><span>Subtotal Pesanan</span><span id="rincian-subtotal">Rp 0</span></div>
        <div class="rincian-item"><span>Subtotal Pengiriman</span><span id="rincian-ongkir">Rp 0</span></div>
        <div class="rincian-item biaya-layanan"><span>Biaya Layanan</span><span>Rp 0</span></div>
        <div class="rincian-item"><span>Total Diskon</span><span id="rincian-diskon">- Rp 0</span></div>
      </div>

      <!-- Sticky Footer -->
      <div class="checkout-footer-sticky">
        <div class="total-info">
          <strong>Total: Rp <span id="footer-total">0</span></strong>
          <small class="hemat-text">Hemat Rp <span id="footer-diskon">0</span></small>
        </div>
        <button class="checkout-btn-final" onclick="handleKlikCheckout()">Buat Pesanan</button>
      </div>
    </div>
  `;

  main.innerHTML = content;

  renderAlamatCheckout();
  renderCheckoutItems();
  cekSaldoUser();

  document.querySelectorAll('input[name="pengiriman"]').forEach(radio => {
    radio.addEventListener('change', renderCheckoutItems);
  });
}

else if (page === "driver-dashboard") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<h2>🚗 Dashboard Driver</h2><p>Memuat data...</p>";

  (async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const db = firebase.firestore();
    const driverId = user.uid;
    const driverRef = db.collection("driver").doc(driverId);

    mulaiUpdateLokasiDriver(driverId);

    const driverDoc = await driverRef.get();
    if (!driverDoc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Data driver tidak ditemukan.</p>`;
      return;
    }

    const dataDriver = driverDoc.data();
    const saldoDriver = dataDriver.saldo || 0;
    const lokasiDriver = dataDriver.lokasi || null;
    const plat = dataDriver.nomorPlat || "-";
    const namaDriver = dataDriver.nama || "-";
    let statusDriver = dataDriver.status || "nonaktif";
    let forceNonaktif = false;
    const pelanggaran = dataDriver.pelanggaran || 0;
    const nonaktifHingga = dataDriver.nonaktifHingga || 0;
    const now = Date.now();

    const dalamPembatasan = statusDriver === "nonaktif" && nonaktifHingga && now <= nonaktifHingga;

    if (statusDriver === "nonaktif" && nonaktifHingga && now > nonaktifHingga) {
      await driverRef.update({
        status: "aktif",
        nonaktifHingga: firebase.firestore.FieldValue.delete()
      });
      statusDriver = "aktif";
      alert("✅ Driver telah diaktifkan kembali otomatis karena masa nonaktif sudah berakhir.");
    }

    if (dalamPembatasan) {
      const sisaMenit = Math.ceil((nonaktifHingga - now) / 60000);
      alert(`🚫 Akun Anda sedang dinonaktifkan sementara karena pelanggaran.\n` +
            `Sisa waktu nonaktif: ${sisaMenit} menit.\n` +
            `Level pelanggaran: ${pelanggaran}`);
    }

    let multiOrderAktif = dataDriver.multiOrderAktif || false;
    let multiOrderExpired = dataDriver.multiOrderExpired?.toDate?.() || null;
    const masihLangganan = multiOrderExpired && multiOrderExpired > new Date();

    if (!masihLangganan && multiOrderAktif) {
      multiOrderAktif = false;
      await driverRef.update({ multiOrderAktif: false });
    }

    if (saldoDriver < 3000) {
      forceNonaktif = true;
      if (statusDriver !== "nonaktif") {
        await driverRef.update({ status: "nonaktif" });
        statusDriver = "nonaktif";
      }
      alert(`🛑 Saldo kamu hanya Rp ${saldoDriver.toLocaleString()}. Sistem menonaktifkan akun sementara.`);
    } else if (saldoDriver >= 6000 && saldoDriver < 10000) {
      alert(`⚠️ Saldo kamu hanya Rp ${saldoDriver.toLocaleString()}. Disarankan isi ulang.`);
    }

    const awalHari = new Date(); awalHari.setHours(0, 0, 0, 0);
    const riwayatSnap = await db.collection("riwayat_driver")
      .where("idDriver", "==", driverId).where("waktuSelesai", ">=", awalHari).get();
    const jumlahHariIni = riwayatSnap.size;
    const totalHariIni = riwayatSnap.docs.reduce((t, d) => t + (d.data().penghasilanBersih || 0), 0);

    const pesananSnap = await db.collection("pesanan_driver")
      .where("idDriver", "==", driverId).get();

    const daftarPesanan = [];

    const toLatLng = geo => {
      if (!geo) return null;
      if (geo.latitude !== undefined) return { lat: geo.latitude, lng: geo.longitude };
      if (geo.lat !== undefined) return geo;
      return null;
    };

    const hitungJarakKM = (a, b) => {
      a = toLatLng(a); b = toLatLng(b);
      if (!a || !b) return null;
      const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
      const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 100) / 100;
    };

    for (const doc of pesananSnap.docs) {
      const data = doc.data();
      const pesananDoc = await db.collection("pesanan").doc(data.idPesanan).get();
      if (!pesananDoc.exists) continue;
      const pesanan = pesananDoc.data();

      const lokasiCustomer = pesanan.lokasi || null;
      const idToko = pesanan.produk?.[0]?.idToko || "";
      const tokoDoc = await db.collection("toko").doc(idToko).get();
      const lokasiToko = tokoDoc.exists ? tokoDoc.data().koordinat : null;

      const jarakKeToko = hitungJarakKM(lokasiDriver, lokasiToko);
      const jarakKeCustomer = hitungJarakKM(lokasiToko, lokasiCustomer);

      let namaCustomer = "Customer";
      let nohpCustomer = "-";

      if (pesanan.userId) {
        const userDoc = await db.collection("users").doc(pesanan.userId).get();
        if (userDoc.exists) namaCustomer = userDoc.data().nama || namaCustomer;
      }

      try {
        const penjualDoc = await db.collection("pesanan_penjual").doc(data.idPesanan).get();
        if (penjualDoc.exists) nohpCustomer = penjualDoc.data().noHpPembeli || "-";
      } catch (err) {
        console.warn("Gagal ambil noHpPembeli:", err.message);
      }

      daftarPesanan.push({
        id: doc.id,
        idPesanan: data.idPesanan,
        idCustomer: pesanan.userId || "-",
        namaCustomer,
        nohpCustomer,
        namaDriver,
        plat,
        statusDriver: data.status,
        metode: pesanan.metode,
        pengiriman: pesanan.pengiriman,
        total: pesanan.total || 0,
        createdAt: pesanan.createdAt?.toDate?.() || new Date(),
        jarakKeToko,
        jarakKeCustomer,
        stepsLog: pesanan.stepsLog || [],
        produk: pesanan.produk || []
      });
    }

    daftarPesanan.sort((a, b) => a.createdAt - b.createdAt);

    let html = `
      <div class="driver-header">
        <p><strong>Nama:</strong> ${namaDriver}</p>
        <p><strong>Saldo:</strong> Rp ${saldoDriver.toLocaleString()}</p>

        <div style="display:flex; flex-direction:column; gap:6px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <strong>Status:</strong>
            <label class="switch-wrap">
              <input type="checkbox" id="status-toggle" ${statusDriver === "aktif" ? "checked" : ""} ${forceNonaktif || dalamPembatasan ? "disabled" : ""}>
              <span class="slider-ball"></span>
            </label>
            <span id="status-label">${statusDriver === "aktif" ? "Bekerja" : "Tidak Bekerja"}</span>
          </div>
          ${(forceNonaktif || dalamPembatasan) ? `<small style="color:red;">🔒 Status tidak bisa diubah saat ini</small>` : ""}
          ${
            dalamPembatasan
              ? `<small style="color:#c00;">⏳ Aktif kembali: ${new Date(nonaktifHingga).toLocaleString("id-ID", {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</small>`
              : ""
          }
        </div>

        <p><strong>🔥 Level Pelanggaran:</strong> ${pelanggaran}</p>

        <div style="display: flex; align-items: center; gap: 10px;">
          <strong><span>Multi Order</span></strong>
          <label class="switch-wrap">
            <input type="checkbox" id="multi-order-toggle" ${multiOrderAktif ? "checked" : ""} ${!masihLangganan ? "disabled" : ""}>
            <span class="slider-ball"></span>
          </label>
          <button id="multi-info-btn" title="Apa itu Multi Order?">❓</button>
        </div>

        <div id="multi-info-popup" class="popup-info" style="display:none;">
          <p><strong>Multi Order</strong> memungkinkan driver menerima lebih dari satu pesanan sekaligus, meningkatkan efisiensi dan penghasilan.</p>
          <button onclick="document.getElementById('multi-info-popup').style.display = 'none'">Tutup</button>
        </div>

        <small>Masa Aktif: ${multiOrderExpired ? multiOrderExpired.toLocaleString("id-ID", {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : "Tidak Aktif"}</small>

        <p><strong>📆 Riwayat Hari Ini:</strong> ${jumlahHariIni} pesanan</p>
        <p><strong>💵 Penghasilan Hari Ini:</strong> Rp ${totalHariIni.toLocaleString()}</p>
        <button onclick="loadContent('driver-riwayat')" class="btn-riwayat">📊 Lihat Riwayat Detail</button>
      </div>

      <h3>📦 Pesanan Aktif</h3>
      ${daftarPesanan.length === 0 ? "<p>Tidak ada pesanan aktif.</p>" : ""}
      <ul class="driver-pesanan-list">
    `;

    for (const p of daftarPesanan) {
  // Tentukan tampilan metode pengiriman
  const metodePengiriman = (p.pengiriman || "standard").toLowerCase();
  let metodeLabel = "";
  let metodeStyle = "";

  if (metodePengiriman === "priority") {
    metodeLabel = "⚡ Priority (Pengiriman Kilat)";
    metodeStyle = "color: #d9534f; font-weight: bold;";
  } else {
    metodeLabel = metodePengiriman.charAt(0).toUpperCase() + metodePengiriman.slice(1);
    metodeStyle = "color: #333;";
  }

  html += `
    <li class="pesanan-item">
      <p><strong>${p.namaCustomer}</strong> - ${p.nohpCustomer}</p>
      <p>🕒 Masuk: ${p.createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</p>
      ${p.jarakKeToko !== null ? `<p>📍 Jarak ke Toko: ${p.jarakKeToko} km</p>` : ""}
      ${p.jarakKeCustomer !== null ? `<p>🚚 Jarak ke Customer: ${p.jarakKeCustomer} km</p>` : ""}
      <p>💰 Pembayaran: ${p.metode?.toUpperCase?.() || "-"}</p>
      <p style="${metodeStyle}">🚚 Metode Pengiriman: ${metodeLabel}</p>
      <p>📌 Status: ${p.statusDriver}</p>
      <p><strong>Total:</strong> Rp ${p.total.toLocaleString()}</p>

      <div class="btn-group">
        <button onclick="bukaDetailPesananDriver('${p.idPesanan}')">🔍 Detail</button>
        <button onclick="renderChatDriver({
          idPesanan: '${p.idPesanan}',
          idDriver: '${driverId}',
          idCustomer: '${p.idCustomer}',
          namaDriver: '${p.namaDriver}',
          namaCustomer: '${p.namaCustomer}'
        })">💬 Chat Customer</button>
      </div>
    </li>
  `;
}


    html += "</ul>";
    container.innerHTML = html;

    document.getElementById("status-toggle")?.addEventListener("change", async (e) => {
      const aktif = e.target.checked;
      const newStatus = aktif ? "aktif" : "nonaktif";
      const label = document.getElementById("status-label");

      try {
        await driverRef.update({ status: newStatus });
        label.textContent = aktif ? "Bekerja" : "Tidak Bekerja";
        alert(`✅ Status diubah menjadi "${label.textContent}"`);
      } catch (err) {
        e.target.checked = !aktif;
        label.textContent = !aktif ? "Bekerja" : "Tidak Bekerja";
        alert("❌ Gagal memperbarui status.");
      }
    });

    document.getElementById("multi-order-toggle")?.addEventListener("change", async (e) => {
      const aktif = e.target.checked;
      try {
        await driverRef.update({ multiOrderAktif: aktif });
        alert(`✅ Multi Order ${aktif ? "diaktifkan" : "dinonaktifkan"}`);
      } catch (error) {
        console.error("Gagal update multiOrderAktif:", error);
        alert("❌ Gagal mengubah Multi Order. Coba lagi.");
      }
    });

    document.getElementById("multi-info-btn")?.addEventListener("click", () => {
      document.getElementById("multi-info-popup").style.display = "block";
    });
  })();
}






else if (page === "driver-riwayat") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<h2>📊 Riwayat Driver</h2><p>Memuat data...</p>`;

  (async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    const db = firebase.firestore();
    const driverId = user.uid;

    const snap = await db.collection("riwayat_driver_admin")
      .where("idDriver", "==", driverId)
      .orderBy("waktu", "desc")
      .limit(100)
      .get();

    let html = `
      <div class="riwayat-driver-container">
        <h2>📊 Riwayat Pesanan Driver</h2>
        <button onclick="loadContent('driver-dashboard')" class="btn-kembali">⬅️ Kembali ke Dashboard</button>

        <div class="table-wrapper">
          <table class="tabel-riwayat-driver">
            <thead>
              <tr>
                <th>ID Pesanan</th>
                <th>Waktu</th>
                <th>Status</th>
                <th>Ongkir</th>
                <th>Fee</th>
                <th>Total</th>
                <th>Rating</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (snap.empty) {
      html += `<tr><td colspan="8">Belum ada riwayat pesanan.</td></tr>`;
    } else {
      for (const doc of snap.docs) {
        const d = doc.data();
        const waktu = new Date(d.waktu).toLocaleString("id-ID");
        const idPesanan = d.idPesanan || d.orderId || "-";

        // Ambil data dari pesanan_driver berdasarkan idPesanan
        const driverSnap = await db.collection("pesanan_driver")
          .where("idPesanan", "==", idPesanan)
          .limit(1)
          .get();

        let totalOngkir = 0;
        let subtotal = 0;
        let status = d.status || "-";

        if (!driverSnap.empty) {
          const dataDriver = driverSnap.docs[0].data();
          totalOngkir = dataDriver.totalOngkir || 0;
          subtotal = dataDriver.subtotal || 0;
          status = dataDriver.status || "-";
        }

        // Hitung fee dan penghasilan bersih
        const biayaLayanan = Math.round(subtotal * 0.01);
        const biayaOngkir = Math.round(totalOngkir * 0.05);
        const totalFee = biayaLayanan + biayaOngkir;
        const penghasilanBersih = (subtotal + totalOngkir) - totalFee;

        // Ambil rating dari rating_driver
        let ratingText = "-";
        try {
          const ratingSnap = await db.collection("rating_driver")
            .where("idPesanan", "==", idPesanan)
            .limit(1)
            .get();

          if (!ratingSnap.empty) {
            const rating = ratingSnap.docs[0].data().rating || 0;
            ratingText = `⭐ ${rating}/5`;
          }
        } catch (err) {
          console.warn(`❌ Gagal ambil rating untuk ${idPesanan}:`, err.message);
        }

        html += `
          <tr>
            <td>${idPesanan}</td>
            <td>${waktu}</td>
            <td>${status}</td>
            <td>Rp ${totalOngkir.toLocaleString("id-ID")}</td>
            <td>Rp ${totalFee.toLocaleString("id-ID")}</td>
            <td>Rp ${penghasilanBersih.toLocaleString("id-ID")}</td>
            <td>${ratingText}</td>
            <td>
              <button onclick="lihatLogPesananDriver('${idPesanan}')" class="btn-riwayat">📄</button>
            </td>
          </tr>
        `;
      }
    }

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
  })();
}














if (page === "riwayat-driver") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<h2>📋 Riwayat Pengantaran</h2><p>Memuat data...</p>";

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = "<p>❌ Harap login terlebih dahulu.</p>");

  const uid = user.uid;
  const db = firebase.firestore();

  db.collection("riwayat_driver")
    .where("idDriver", "==", uid)
    .orderBy("createdAt", "desc")
    .get()
    .then((snap) => {
      if (snap.empty) {
        container.innerHTML = "<p>🚫 Belum ada riwayat pengantaran.</p>";
        return;
      }

      let html = `
        <h2>📦 Riwayat Pengantaran</h2>
        <ul class="riwayat-driver-list">
      `;

      snap.forEach(doc => {
        const d = doc.data();
        const waktu = d.createdAt?.toDate().toLocaleString("id-ID") || "-";
        html += `
          <li class="riwayat-driver-item">
            🧾 <strong>${d.idPesanan}</strong><br>
            💵 Pendapatan: <strong>Rp ${d.pendapatanBersih?.toLocaleString() || 0}</strong><br>
            📅 ${waktu}
          </li>
        `;
      });

      html += "</ul>";
      container.innerHTML = html;
    })
    .catch(err => {
      console.error("❌ Gagal memuat riwayat driver:", err);
      container.innerHTML = "<p style='color:red;'>❌ Gagal memuat data riwayat.</p>";
    });
}



if (page === "admin-user") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data admin...</p>`;

  const user = firebase.auth().currentUser;
  if (!user) {
    container.innerHTML = `<p>Silakan login ulang.</p>`;
    return;
  }

  const db = firebase.firestore();

  try {
    const adminDoc = await db.collection("users").doc(user.uid).get();
    const role = adminDoc.exists ? (adminDoc.data().role || "").toLowerCase() : "";

    if (role !== "admin") {
      container.innerHTML = `<p style="color:red;text-align:center;">❌ Akses ditolak. Hanya admin.</p>`;
      return;
    }

    const [usersSnapshot, pesananSnapshot, depositSnapshot, withdrawSnapshot, laporanSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("pesanan").get(),
      db.collection("topup_request").where("status", "==", "Menunggu").get(),
      db.collection("withdraw_request").where("status", "==", "Menunggu").get(),
      db.collection("laporan_driver").get()
    ]);

    let totalUser = 0;
    let totalDriver = 0;
    let totalNominal = 0;
    let totalPesananAktif = 0;
    let totalFeePerusahaan = 0;

    usersSnapshot.forEach(doc => {
      const r = (doc.data().role || "").toLowerCase();
      if (r === "user") totalUser++;
      if (r === "driver") totalDriver++;
    });

    pesananSnapshot.forEach(doc => {
      const d = doc.data();
      const status = (d.status || "").toLowerCase();

      if (status === "selesai") {
        const subtotal = d.subtotalProduk || 0;
        const ongkir = d.totalOngkir || 0;
        const biayaLayanan = d.biayaLayanan || 0;
        const totalPembayaran = d.total || 0;

        const feeOngkir = ongkir * 0.05;
        const feeLayanan = biayaLayanan * 0.01;
        const feeToko = subtotal * 0.05;

        const totalFee = feeOngkir + feeLayanan + feeToko;
        totalFeePerusahaan += totalFee;
        totalNominal += totalPembayaran;
      } else {
        totalPesananAktif++;
      }
    });

    const totalDepositMenunggu = depositSnapshot.size;
    const totalWithdrawMenunggu = withdrawSnapshot.size;
    const totalLaporanDriver = laporanSnapshot.size;

    container.innerHTML = `
      <div class="admin-user-dashboard">
        <h2>📊 Dashboard Admin</h2>
        <div class="pyramid-grid-2">

          <div class="pyramid-button">
            <div class="label-with-badge">👤 Users <span class="badge">${totalUser}</span></div>
            <button onclick="loadContent('users-management')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">🛵 Driver <span class="badge">${totalDriver}</span></div>
            <button onclick="loadContent('admin-driver')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">💳 Voucher</div>
            <button onclick="loadContent('admin-voucher')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">💳 Transaksi</div>
            <div style="font-size:13px;">Rp${totalNominal.toLocaleString("id-ID")}</div>
            <button onclick="loadContent('riwayat')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">💼 Fee Perusahaan</div>
            <div style="font-size:13px;">Rp${totalFeePerusahaan.toLocaleString("id-ID")}</div>
            <button onclick="loadContent('riwayat-admin')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">📦 Pesanan <span class="badge">${totalPesananAktif}</span></div>
            <button onclick="loadContent('pesanan-admin')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">💰 Permintaan Deposit <span class="badge">${totalDepositMenunggu}</span></div>
            <button onclick="loadContent('permintaan-deposit')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">💸 Permintaan Withdraw <span class="badge">${totalWithdrawMenunggu}</span></div>
            <button onclick="loadContent('permintaan-withdraw')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">🏦 Rekening Deposit</div>
            <button onclick="loadContent('setting-rekening')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">⏰ Layanan</div>
            <button onclick="loadContent('jam-layanan')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">🏪 Toko <span class="badge" id="badge-total-toko">...</span></div>
            <button onclick="loadContent('admin-toko')" class="detail-btn">Kelola Toko</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">🚨 Laporan Driver <span class="badge">${totalLaporanDriver}</span></div>
            <button onclick="loadContent('laporan-driver-admin')" class="detail-btn">Tinjau Laporan</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">📣 Pengumuman <span class="badge">${totalLaporanDriver}</span></div>
            <button onclick="loadContent('admin-notif')" class="detail-btn">Kelola Pengumuman</button>
          </div>

        </div>
      </div>
    `;
  } catch (error) {
    console.error("❌ Error admin-user:", error);
    container.innerHTML = `<p style="color:red;">Terjadi kesalahan: ${error.message}</p>`;
  }
}


else if (page === "admin-voucher") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat voucher...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = `<p style="color:red;">❌ Silakan login ulang.</p>`;
    return;
  }

  const userDoc = await db.collection("users").doc(user.uid).get();
  const role = userDoc.exists ? (userDoc.data().role || "").toLowerCase() : "";

  if (role !== "admin") {
    container.innerHTML = `<p style="color:red;">❌ Akses ditolak.</p>`;
    return;
  }

  const snapshot = await db.collection("voucher").orderBy("expired", "desc").get();
  const voucherList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const rows = voucherList.map((v, i) => {
    const expiredDate = v.expired?.toDate?.();
    const expiredStr = expiredDate instanceof Date
      ? expiredDate.toLocaleDateString("id-ID")
      : "-";

    const potonganStr = v.tipe === "persen"
      ? `${v.potongan}%`
      : `Rp${parseInt(v.potongan).toLocaleString("id-ID")}`;

    return `
      <tr>
        <td>${i + 1}</td>
        <td>${v.kode || "-"}</td>
        <td>Rp${(v.minimal || 0).toLocaleString("id-ID")}</td>
        <td>${potonganStr}</td>
        <td>${v.kuota || 0}</td>
        <td>${expiredStr}</td>
        <td>${(v.digunakanOleh || []).length} user</td>
        <td>
          <button onclick="editVoucher('${v.id}')">✏️</button>
          <button onclick="hapusVoucher('${v.id}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join("");

  container.innerHTML = `
    <div class="admin-voucher-page">
      <h2>🎟️ Kelola Voucher</h2>

      <form onsubmit="return simpanVoucher(event)" id="form-voucher" style="margin-bottom:20px;">
        <input type="hidden" id="voucher-id" />
        <input required type="text" id="voucher-kode" placeholder="Kode Voucher (huruf besar)" />
        <select id="voucher-tipe">
          <option value="nominal">Nominal (Rp)</option>
          <option value="persen">Persen (%)</option>
        </select>
        <input required type="number" id="voucher-potongan" placeholder="Potongan" />
        <input required type="number" id="voucher-minimal" placeholder="Minimal Order" />
        <input required type="number" id="voucher-kuota" placeholder="Kuota" />
        <input required type="date" id="voucher-expired" />
        <button type="submit">💾 Simpan Voucher</button>
      </form>

      <table class="voucher-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Kode</th>
            <th>Minimal</th>
            <th>Diskon</th>
            <th>Kuota</th>
            <th>Expired</th>
            <th>Dipakai</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}



else if (page === "riwayat-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<p>Memuat transaksi...</p>";

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("pesanan")
      .where("status", "==", "Selesai") // gunakan huruf besar
      .orderBy("waktu", "desc") // pastikan ada index, jika error, hapus ini dulu
      .limit(100)
      .get();

    if (snapshot.empty) {
      container.innerHTML = "<p>✅ Tidak ada transaksi selesai.</p>";
      return;
    }

    let html = `
      <h2>💳 Riwayat Transaksi</h2>
      <div style="overflow-x:auto;">
        <table border="1" cellspacing="0" cellpadding="8" style="width:100%; border-collapse:collapse; font-size:14px;">
          <thead style="background:#f3f3f3;">
            <tr>
              <th>ID ORDER</th>
              <th>Subtotal Pesanan</th>
              <th>Total Ongkir</th>
              <th>Biaya Layanan</th>
              <th>Fee Ongkir + Layanan + Toko</th>
              <th>Total Fee</th>
              <th>Saldo (Akhir + Fee)</th>
            </tr>
          </thead>
          <tbody>
    `;

    let totalNominal = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const orderId = doc.id;
      const subtotal = data.totalHarga || 0;
      const ongkir = data.ongkir || 0;
      const biayaLayanan = data.biayaLayanan || 0;

      const feeOngkir = ongkir * 0.05;
      const feeLayanan = biayaLayanan * 0.01;
      const feeToko = subtotal * 0.05;
      const totalFee = feeOngkir + feeLayanan + feeToko;
      const saldoFinal = (data.totalPembayaran || 0) + totalFee;

      totalNominal += saldoFinal;

      html += `
        <tr>
          <td>${orderId}</td>
          <td>Rp ${subtotal.toLocaleString()}</td>
          <td>Rp ${ongkir.toLocaleString()}</td>
          <td>Rp ${biayaLayanan.toLocaleString()}</td>
          <td>
            Ongkir (5%): Rp ${feeOngkir.toLocaleString()}<br>
            Layanan (1%): Rp ${feeLayanan.toLocaleString()}<br>
            Fee Toko (5%): Rp ${feeToko.toLocaleString()}
          </td>
          <td><strong>Rp ${totalFee.toLocaleString()}</strong></td>
          <td><strong>Rp ${saldoFinal.toLocaleString()}</strong></td>
        </tr>
      `;
    }

    html += `
          </tbody>
        </table>
        <p style="margin-top:12px;font-weight:bold;">💰 Total Saldo + Fee: Rp ${totalNominal.toLocaleString()}</p>
      </div>
      <button onclick="loadContent('admin-user')" class="btn-kembali">⬅️ Kembali</button>
    `;

    container.innerHTML = html;

  } catch (err) {
    console.error("Gagal memuat transaksi:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat transaksi: ${err.message}</p>`;
  }
}



if (page === "admin-driver") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<p>Memuat data driver...</p>";

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = "<p>Silakan login ulang.</p>");

  const db = firebase.firestore();

  try {
    const userDoc = await db.collection("users").doc(user.uid).get();
    const role = (userDoc.data()?.role || "").toLowerCase();

    if (role !== "admin") {
      container.innerHTML = `<p style="color:red;text-align:center;">❌ Akses ditolak. Hanya admin.</p>`;
      return;
    }

    const driversSnapshot = await db.collection("driver").orderBy("createdAt", "desc").get();
    const drivers = driversSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let html = `
      <h2>🛵 Manajemen Driver</h2>
      <div style="margin-bottom:20px;">
        <input type="text" id="input-uid-driver" placeholder="Masukkan UID Driver"
          style="padding:6px;width:60%;max-width:400px;border:1px solid #ccc;border-radius:5px;" />
        <button onclick="tambahDriver()" style="padding:6px 12px;">➕ Tambah Driver</button>
      </div>
      <ul style="padding-left:0; list-style:none;">`;

    for (const driver of drivers) {
      const saldoRef = db.collection("driver").doc(driver.id).collection("saldo").doc("data");
      const saldoDoc = await saldoRef.get();
      const saldo = saldoDoc.exists ? saldoDoc.data().jumlah || 0 : 0;

      html += `
        <li style="border:1px solid #ccc; padding:12px; margin-bottom:10px; border-radius:8px;">
          <strong>👤 ${driver.nama || 'Tanpa Nama'}</strong><br>
          🏍️ Nomor Plat: <strong>${driver.nomorPlat || '-'}</strong><br>
          ⚙️ Status: <span style="color:${driver.status === 'aktif' ? 'green' : 'red'}">${driver.status}</span><br>
          💰 Saldo: <strong id="saldo-${driver.id}">Rp ${saldo.toLocaleString()}</strong><br>
          📄 KTP: ${driver.urlKTP ? `<a href="${driver.urlKTP}" target="_blank">Lihat</a>` : 'Tidak tersedia'}<br><br>

          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button onclick="promptTransferSaldo('${driver.id}')">💸 Transfer</button>
            <button onclick="editDriver('${driver.id}')">✏️ Edit</button>
            <button onclick="hapusDriver('${driver.id}')">🗑️ Hapus</button>
            <button onclick="loadContent('riwayat-driver-admin', '${driver.id}')">📜 Riwayat</button>
          </div>
        </li>`;
    }

    html += "</ul>";
    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="color:red;">Gagal memuat data driver: ${err.message}</p>`;
  }
}



else if (page === "laporan-driver-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat laporan driver...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("laporan_driver").orderBy("waktu", "desc").get();
    if (snapshot.empty) {
      container.innerHTML = `<p>✅ Tidak ada laporan saat ini.</p>`;
      return;
    }

    let html = `<h2>🚨 Laporan Driver</h2><ul style="list-style:none;padding:0;">`;

    snapshot.forEach(doc => {
      const data = doc.data();
      const waktu = new Date(data.waktu).toLocaleString("id-ID");
      const docId = doc.id;

      html += `
        <li style="border:1px solid #f44336;background:#fff5f5;padding:12px;border-radius:8px;margin-bottom:12px;">
          <strong>📄 ID Pesanan:</strong> ${data.idPesanan}<br>
          <strong>🛵 ID Driver:</strong> ${data.idDriver}<br>
          <strong>👤 ID Pelapor:</strong> ${data.idPelapor}<br>
          <strong>🕒 Waktu:</strong> ${waktu}<br>
          <strong>❗ Alasan:</strong> ${data.alasan}<br><br>

          <input type="number" id="durasi-${docId}" placeholder="Durasi nonaktif (menit)" style="width:60%;padding:6px;margin-bottom:6px;"><br>

          <button onclick="nonaktifkanDriverSementara('${data.idDriver}', '${docId}', 'durasi-${docId}')" style="background:#e53935;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
            🚫 Nonaktifkan Sementara
          </button>

          <button onclick="hapusLaporanDriver('${docId}')" style="margin-left:10px;background:#999;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
            🗑️ Hapus Laporan
          </button>

          <div style="margin-top:10px;">
            <textarea id="pesan-${docId}" rows="2" placeholder="Kirim pesan peringatan ke driver..." style="width:100%;resize:vertical;"></textarea>
            <button onclick="kirimPeringatanManual('${data.idDriver}', 'pesan-${docId}')" style="margin-top:5px;background:#f57c00;color:#fff;border:none;padding:6px 12px;border-radius:4px;">
              📩 Kirim Peringatan
            </button>
          </div>
        </li>`;
    });

    html += `</ul>`;
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = `<p style="color:red;">Gagal memuat laporan: ${e.message}</p>`;
  }
}




else if (page === "riwayat-driver-admin") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat riwayat driver...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("riwayat_driver_admin")
      .orderBy("waktu", "desc")
      .limit(100)
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p>✅ Belum ada riwayat tersedia.</p>`;
      return;
    }

    let html = `<h2>📚 Riwayat Driver (Admin)</h2><ul style="list-style:none;padding:0;">`;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const waktu = data.waktu
        ? new Date(data.waktu).toLocaleString("id-ID")
        : "-";
      const orderId = data.orderId || "-";
      const idDriver = data.idDriver || "-";
      const stepsLog = Array.isArray(data.stepsLog) ? data.stepsLog : [];

      // Ambil detail tambahan dari koleksi pesanan
      let metodePengiriman = "-";
      let estimasiMenit = "-";
      let selesaiDalam = "-";

      try {
        const pesananSnap = await db.collection("pesanan").doc(orderId).get();
        if (pesananSnap.exists) {
          const pesananData = pesananSnap.data();
          metodePengiriman = pesananData.metodePengiriman || "-";
          estimasiMenit = pesananData.estimasiMenit ? `${pesananData.estimasiMenit} menit` : "-";

          // Hitung selesai dalam: waktu langkah terakhir - waktu langkah pertama
          const timeExtract = s => {
            const match = s.match(/^(\d{1,2})\.(\d{2})/);
            if (match) {
              const [_, jam, menit] = match;
              const date = new Date();
              date.setHours(+jam, +menit, 0, 0);
              return date;
            }
            return null;
          };

          const timeFirst = timeExtract(stepsLog[0]);
          const timeLast = timeExtract(stepsLog[stepsLog.length - 1]);

          if (timeFirst && timeLast) {
            const diffMs = timeLast - timeFirst;
            const diffMenit = Math.round(diffMs / 60000);
            selesaiDalam = `${diffMenit} menit`;
          }
        }
      } catch (e) {
        console.warn(`Gagal ambil data pesanan: ${orderId}`, e);
      }

      // Gabungkan stepsLog menjadi HTML list tanpa nomor
      const stepHtml = stepsLog.length > 0
        ? `<ul style="margin-top:6px;padding-left:1rem;">` +
          stepsLog.map(step => {
            const match = step.match(/^(\d{1,2})\.(\d{2})\s+(.*)$/);
            if (match) {
              const jam = `${match[1]}:${match[2]}`;
              const isi = match[3];
              return `<li><strong>${jam}</strong> — ${isi}</li>`;
            }
            return `<li>${step}</li>`;
          }).join("") +
          `</ul>`
        : `<p style="color:#888;font-style:italic;">(Tidak ada log langkah)</p>`;

      html += `
        <li style="margin-bottom:20px;padding:12px;border:1px solid #ccc;border-radius:10px;">
          <b>🆔 Order:</b> ${orderId}<br/>
          <b>🚗 Driver:</b> ${idDriver}<br/>
          <b>📦 Metode Pengiriman:</b> ${metodePengiriman}<br/>
          <b>⏳ Estimasi Waktu:</b> ${estimasiMenit}<br/>
          <b>✅ Selesai Dalam:</b> ${selesaiDalam}<br/>
          <b>📋 Steps Log:</b> ${stepHtml}
        </li>
      `;
    }

    html += `</ul>`;
    container.innerHTML = html;

  } catch (error) {
    console.error("Gagal memuat riwayat driver:", error);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan saat memuat data.</p>`;
  }
}






if (page.startsWith("edit-driver")) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data driver...</p>`;

  const params = new URLSearchParams(window.location.search);
  const driverId = params.get("id");

  if (!driverId) {
    container.innerHTML = `<p style="color:red;">❌ ID driver tidak ditemukan.</p>`;
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) return (container.innerHTML = `<p>Silakan login ulang.</p>`);

  const db = firebase.firestore();
  const adminDoc = await db.collection("users").doc(user.uid).get();
  const role = adminDoc.exists ? (adminDoc.data().role || "").toLowerCase() : "";

  if (role !== "admin") {
    container.innerHTML = `<p style="color:red;">❌ Akses ditolak. Hanya admin.</p>`;
    return;
  }

  const driverDoc = await db.collection("driver").doc(driverId).get();
  if (!driverDoc.exists) {
    container.innerHTML = `<p style="color:red;">Driver tidak ditemukan.</p>`;
    return;
  }

  const data = driverDoc.data();
  const {
    nama = "",
    nomorPlat = "",
    status = "nonaktif",
    fotoProfil = "",
    urlKTP = ""
  } = data;

  // Ambil saldo dari subkoleksi
  const saldoRef = db.collection("driver").doc(driverId).collection("saldo").doc("data");
  const saldoDoc = await saldoRef.get();
  const saldoDriver = saldoDoc.exists ? saldoDoc.data().jumlah || 0 : 0;

  container.innerHTML = `
    <h2>✏️ Edit Driver</h2>
    <form id="edit-driver-form" onsubmit="submitEditDriver(event, '${driverId}')">
      <label>Nama Lengkap:<br/>
        <input type="text" id="driver-nama" value="${nama}" required>
      </label><br/><br/>

      <label>Nomor Plat:<br/>
        <input type="text" id="driver-plat" value="${nomorPlat}" required>
      </label><br/><br/>

      <label>Status:<br/>
        <select id="driver-status">
          <option value="aktif" ${status === "aktif" ? "selected" : ""}>Aktif</option>
          <option value="nonaktif" ${status === "nonaktif" ? "selected" : ""}>Nonaktif</option>
        </select>
      </label><br/><br/>

      <label>URL Foto Profil:<br/>
        <input type="url" id="driver-foto" value="${fotoProfil}">
      </label><br/><br/>

      <label>URL KTP (opsional):<br/>
        <input type="url" id="driver-ktp" value="${urlKTP}">
      </label><br/><br/>

      <button type="submit">💾 Simpan Perubahan</button>
      <button type="button" onclick="loadContent('admin-driver')">⬅️ Batal</button>
    </form>
  `;
}




else if (page === "admin-toko") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data toko...</p>`;

  const db = firebase.firestore();
  const tokoRef = db.collection("toko");

  try {
    const snapshot = await tokoRef.get();
    const dataToko = [];
    let htmlTabel = '';

    for (const doc of snapshot.docs) {
      const toko = doc.data();
      const produkSnap = await db.collection("produk").where("toko", "==", toko.namaToko).get();
      const transaksiSnap = await db.collection("pesanan").where("toko", "==", toko.namaToko).get();

      dataToko.push({
        id: doc.id,
        ...toko,
        totalProduk: produkSnap.size,
        totalTransaksi: transaksiSnap.size
      });

      htmlTabel += `
        <tr>
          <td>${dataToko.length}</td>
          <td>${toko.namaToko}</td>
          <td>${toko.jamBuka}</td>
          <td>${toko.jamTutup}</td>
          <td>${produkSnap.size}</td>
          <td>${transaksiSnap.size}</td>
          <td><button class="btn-mini btn-detail" onclick="lihatRiwayatTransaksi('${toko.namaToko}')">📄</button></td>
          <td>Rp${(toko.saldo || 0).toLocaleString()}</td>
          <td>
            <button class="btn-mini btn-edit" onclick="editToko('${doc.id}')">✏️</button>
            <button class="btn-mini btn-delete" onclick="hapusToko('${doc.id}')">🗑️</button>
            <button class="btn-mini btn-topup" onclick="tambahSaldoToko('${doc.id}', '${toko.namaToko}')">➕</button>
          </td>
        </tr>
      `;
    }

    container.innerHTML = `
      <div class="admin-toko-container">
        <div class="admin-toko-header">
          <h2>🏪 Manajemen Toko</h2>
          <button class="btn-tambah" onclick="formTambahToko()">➕ Tambah Toko</button>
        </div>
        <div class="tabel-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Toko</th>
                <th>Jam Buka</th>
                <th>Jam Tutup</th>
                <th>Total Produk</th>
                <th>Total Transaksi</th>
                <th>Riwayat</th>
                <th>Saldo</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>${htmlTabel}</tbody>
          </table>
        </div>
      </div>
    `;

    const badge = document.getElementById("badge-total-toko");
    if (badge) badge.textContent = dataToko.length;

  } catch (e) {
    container.innerHTML = `<p style="color:red;">Gagal memuat data: ${e.message}</p>`;
  }
}



if (page === "setting-rekening") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data rekening...</p>`;

  const db = firebase.firestore();
  const docRef = db.collection("pengaturan").doc("rekening");

  async function loadRekening() {
    const doc = await docRef.get();
    if (!doc.exists) return [];
    const data = doc.data();
    return Array.isArray(data.list) ? data.list : [];
  }

  function renderRekeningList(items) {
    container.innerHTML = `
      <h2>⚙️ Kelola Rekening Deposit</h2>
      <button id="btn-tambah" class="detail-btn" style="margin-bottom:15px;">➕ Tambah Rekening Baru</button>

      <table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#f4f4f4;">
            <th>Nama Bank</th>
            <th>Nama Rekening</th>
            <th>Nomor Rekening</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item, i) => `
            <tr data-index="${i}">
              <td>${item.bank || "-"}</td>
              <td>${item.nama || "-"}</td>
              <td>${item.nomor || "-"}</td>
              <td>${item.aktif ? "Aktif" : "Nonaktif"}</td>
              <td>
                <button class="btn-edit detail-btn" data-index="${i}">Edit</button>
                <button class="btn-hapus detail-btn" data-index="${i}" style="background:#e74c3c; margin-left:6px;">Hapus</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div id="form-container" style="margin-top:20px;"></div>
    `;

    document.getElementById("btn-tambah").addEventListener("click", () => showForm());

    container.querySelectorAll(".btn-edit").forEach(btn =>
      btn.addEventListener("click", e => {
        const index = Number(e.target.dataset.index);
        const item = items[index];
        showForm(item, index);
      })
    );

    container.querySelectorAll(".btn-hapus").forEach(btn =>
      btn.addEventListener("click", async e => {
        const index = Number(e.target.dataset.index);
        if (confirm("Yakin ingin menghapus rekening ini?")) {
          try {
            items.splice(index, 1);
            await docRef.set({ list: items });
            alert("Rekening berhasil dihapus.");
            init();
          } catch (err) {
            alert("Gagal menghapus rekening.");
            console.error(err);
          }
        }
      })
    );
  }

  function showForm(data = null, index = null) {
    const formContainer = document.getElementById("form-container");
    formContainer.innerHTML = `
      <h3>${data ? "Edit" : "Tambah"} Rekening</h3>
      <form id="rekening-form">
        <label>Nama Bank:</label><br/>
        <input type="text" name="bank" value="${data ? data.bank : ""}" required style="width:100%; padding:8px; margin-bottom:10px;"/><br/>

        <label>Nama Rekening:</label><br/>
        <input type="text" name="nama" value="${data ? data.nama : ""}" required style="width:100%; padding:8px; margin-bottom:10px;"/><br/>

        <label>Nomor Rekening:</label><br/>
        <input type="text" name="nomor" value="${data ? data.nomor : ""}" required style="width:100%; padding:8px; margin-bottom:10px;"/><br/>

        <label>Status Aktif:</label>
        <input type="checkbox" name="aktif" ${data && data.aktif ? "checked" : ""} /><br/><br/>

        <button type="submit" class="detail-btn">${data ? "Simpan Perubahan" : "Tambah Rekening"}</button>
        <button type="button" id="btn-batal" class="detail-btn" style="background:#999; margin-left:8px;">Batal</button>
        <div id="form-message" style="margin-top:10px; font-weight:600;"></div>
      </form>
    `;

    const form = document.getElementById("rekening-form");
    const messageDiv = document.getElementById("form-message");

    form.addEventListener("submit", async e => {
      e.preventDefault();
      messageDiv.textContent = "";

      const formData = new FormData(form);
      const bank = formData.get("bank").trim();
      const nama = formData.get("nama").trim();
      const nomor = formData.get("nomor").trim();
      const aktif = formData.get("aktif") === "on";

      if (!bank || !nama || !nomor) {
        messageDiv.style.color = "red";
        messageDiv.textContent = "Semua kolom harus diisi.";
        return;
      }

      try {
        const items = await loadRekening();

        if (data) {
          // edit existing
          items[index] = { bank, nama, nomor, aktif };
        } else {
          // add new
          items.push({ bank, nama, nomor, aktif });
        }

        await docRef.set({ list: items });
        messageDiv.style.color = "green";
        messageDiv.textContent = `✅ Rekening berhasil ${data ? "diperbarui" : "ditambahkan"}.`;

        setTimeout(() => {
          formContainer.innerHTML = "";
          init();
        }, 1000);
      } catch (err) {
        messageDiv.style.color = "red";
        messageDiv.textContent = "❌ Gagal menyimpan rekening.";
        console.error(err);
      }
    });

    document.getElementById("btn-batal").addEventListener("click", () => {
      formContainer.innerHTML = "";
    });
  }

  async function init() {
    try {
      const items = await loadRekening();
      renderRekeningList(items);
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Gagal memuat data rekening.</p>`;
      console.error(err);
    }
  }

  init();
}


if (page === "permintaan-deposit") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat permintaan deposit...</p>`;

  const db = firebase.firestore();
  const snapshot = await db.collection("topup_request").orderBy("timestamp", "desc").get();

  let html = `
    <div class="user-container">
      <h2>💰 Permintaan Deposit</h2>
      <ul style="padding-left:0;">
  `;

  if (snapshot.empty) {
    html += `<li>Tidak ada permintaan.</li>`;
  } else {
    snapshot.forEach(doc => {
      const d = doc.data();
      const waktu = d.timestamp?.toDate()?.toLocaleString("id-ID") || "-";
      const isExpired = d.expiredAt && d.expiredAt < Date.now();
      const status = isExpired && d.status === "Menunggu" ? "Dibatalkan (Expired)" : d.status;

      html += `
        <li style="border:1px solid #ccc; padding:12px; border-radius:8px; margin-bottom:1rem; list-style:none;">
          <strong>UserID:</strong> ${d.userId}<br/>
          <strong>Metode:</strong> ${d.metode}<br/>
          <strong>Nominal:</strong> Rp${d.jumlah.toLocaleString()}<br/>
          <strong>Total:</strong> Rp${d.total.toLocaleString()}<br/>
          <strong>Catatan:</strong> ${d.catatan || "-"}<br/>
          <strong>Status:</strong> ${status}<br/>
          <small>🕒 ${waktu}</small><br/>
          ${
            d.status === "Menunggu" && !isExpired
              ? `
                <button class="btn-mini" onclick="konfirmasiTopup('${doc.id}', '${d.userId}', ${d.jumlah})">✅ Konfirmasi</button>
                <button class="btn-mini" onclick="tolakTopup('${doc.id}')">❌ Tolak</button>
              `
              : ""
          }
        </li>
      `;
    });
  }

  html += `
      </ul>
      <button class="btn-mini" onclick="loadContent('admin-user')">⬅️ Kembali</button>
    </div>
  `;

  container.innerHTML = html;
}


if (page === "permintaan-withdraw") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat permintaan withdraw...</p>`;

  const db = firebase.firestore();
  const snapshot = await db.collection("withdraw_request").orderBy("waktu", "desc").get();

  let html = `
    <div class="container-withdrawal">
      <h2 class="title-withdrawal">💸 Daftar Permintaan Withdraw</h2>
      <div class="list-withdrawal">
  `;

  if (snapshot.empty) {
    html += `<p class="empty-withdrawal">Tidak ada permintaan withdraw.</p>`;
  } else {
    snapshot.forEach(doc => {
      const d = doc.data();
      const waktu = new Date(d.waktu || Date.now()).toLocaleString("id-ID");
      const status = d.status || "Menunggu";

      html += `
        <div class="item-withdrawal">
          <p><strong>ID Toko:</strong> ${d.idToko || "-"}</p>
          <p><strong>Nominal:</strong> Rp${d.nominal?.toLocaleString("id-ID") || 0}</p>
          <p><strong>Bank:</strong> ${d.bank || "-"}</p>
          <p><strong>Rekening:</strong> ${d.norek || "-"}</p>
          <p><strong>Atas Nama:</strong> ${d.atasNama || "-"}</p>
          <p><span class="status-withdrawal ${status}">Status: ${status}</span></p>
          <small>🕒 ${waktu}</small><br/>
          ${status === "Pending" ? `
            <div class="actions-withdrawal">
              <button class="btn-withdrawal btn-approve-withdrawal" onclick="konfirmasiWithdraw('${doc.id}', '${d.idToko}', ${d.nominal})">✅ Konfirmasi</button>
              <button class="btn-withdrawal btn-reject-withdrawal" onclick="tolakWithdraw('${doc.id}')">❌ Tolak</button>
            </div>` : ""
          }
        </div>
      `;
    });
  }

  html += `
      </div>
      <center><button class="btn-withdrawal" onclick="loadContent('admin-user')">⬅️ Kembali</button></center>
    </div>
  `;

  container.innerHTML = html;
}



if (page === "users-management") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat data pengguna...</p>`;

  const user = firebase.auth().currentUser;
  if (!user) return container.innerHTML = `<p>Silakan login ulang.</p>`;

  const db = firebase.firestore();
  const adminDoc = await db.collection("users").doc(user.uid).get();
  const isAdmin = adminDoc.exists && (adminDoc.data().role || "").toLowerCase() === "admin";

  if (!isAdmin) {
    container.innerHTML = `<p style="color:red;text-align:center;">❌ Akses ditolak. Hanya admin.</p>`;
    return;
  }

  const snapshot = await db.collection("users").get();

  let html = `
    <div class="users-management-page">
      <h2>👥 Manajemen Pengguna</h2>
      <div class="users-table-container">
        <table class="users-table">
          <thead>
            <tr>
              <th>UID</th>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Saldo</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
  `;

  snapshot.forEach(doc => {
    const d = doc.data();
    const uid = doc.id;
    const shortUid = uid.slice(0, 5) + "...";

    html += `
      <tr>
        <td style="font-family: monospace; font-size: 0.9em;">
          ${shortUid} 
          <button onclick="copyToClipboard('${uid}')" title="Salin UID" style="margin-left:4px; cursor:pointer;">📋</button>
        </td>
        <td>${d.namaLengkap || '-'}</td>
        <td>${d.email || '-'}</td>
        <td>${d.role || '-'}</td>
        <td>Rp${(d.saldo || 0).toLocaleString()}</td>
        <td>
          <div class="dropdown-container">
            <button class="btn-mini dropdown-toggle">⚙️ Aksi</button>
            <div class="dropdown-menu">
              <a onclick="gantiRole('${uid}', '${d.role || ''}')">🔁 Ganti Role</a>
              <a onclick="resetPin('${uid}')">🔐 Reset PIN</a>
              <a onclick="transferSaldo('${uid}')">💰 Transfer Saldo</a>
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  html += `
          </tbody>
        </table>
      </div>
      <br/>
      <button onclick="loadContent('admin-user')" class="btn-mini">⬅️ Kembali</button>
    </div>
  `;

  container.innerHTML = html;
}


if (page === "user") {
  const user = firebase.auth().currentUser;
  const container = document.getElementById("page-container");

  if (!user) {
    container.innerHTML = "<p>Memuat data user...</p>";
    return;
  }

  const db = firebase.firestore();
  const docRef = db.collection("users").doc(user.uid);
  const alamatRef = db.collection("alamat").doc(user.uid);

  Promise.all([docRef.get(), alamatRef.get()])
    .then(([userDoc, alamatDoc]) => {
      if (!userDoc.exists) {
        container.innerHTML = "<p>Data user tidak ditemukan.</p>";
        return;
      }

      const data = userDoc.data();
      const alamatData = alamatDoc.exists ? alamatDoc.data() : {};

      const profilePic = data.photoURL || "https://via.placeholder.com/150?text=Foto+Profil";
      const username = data.username || "";
      const namaLengkap = data.namaLengkap || "";
      const email = data.email || user.email || "-";
      const nomorHp = data.nomorHp ? data.nomorHp.toString() : "-";
      const saldoValue = typeof data.saldo === "number" ? data.saldo : 0;
      const saldo = `Rp${saldoValue.toLocaleString("id-ID")}`;
      const role = data.role?.toUpperCase() || "-";
      const createdAt = data.createdAt?.toDate?.().toLocaleString("id-ID", {
        dateStyle: "long", timeStyle: "short"
      }) || "-";
      const alamat = alamatData.alamat || "";

      const content = `
        <div class="user-container">
  <h2><i class="fas fa-user-circle"></i> Profil Akun</h2>

  <div style="text-align: center; margin-bottom: 1rem;">
    <img src="${profilePic}" alt="Foto Profil" style="width:120px;height:120px;border-radius:50%;object-fit:cover;">
  </div>

  <!-- Tampilan View -->
  <div class="info-grid" id="info-view">
    <div class="info-label">Username</div>
    <div class="info-value" id="view-username">${username}</div>

    <div class="info-label">Nama Lengkap</div>
    <div class="info-value" id="view-nama">${namaLengkap}</div>

    <div class="info-label">Alamat</div>
    <div class="info-value" id="view-alamat">${alamat}</div>
  </div>

  <!-- Tampilan Edit -->
  <div class="info-grid" id="info-edit" style="display:none;">
    <div class="info-label">Username</div>
    <div class="info-value"><input id="edit-username" value="${username}" /></div>

    <div class="info-label">Nama Lengkap</div>
    <div class="info-value"><input id="edit-nama" value="${namaLengkap}" /></div>

    <div class="info-label">Alamat</div>
    <div class="info-value"><textarea id="edit-alamat" rows="3">${alamat}</textarea></div>
  </div>

  <!-- Informasi Lain -->
  <div class="info-grid">
    <div class="info-label">Saldo</div>
    <div class="info-value">
      <i class="fas fa-wallet"></i> ${saldo}
      <button onclick="topupSaldoUser()" class="btn-mini">🔼 Top Up</button>
    </div>

    <div class="info-label">Role</div>
    <div class="info-value"><i class="fas fa-id-badge"></i> ${role}</div>

    <div class="info-label">Email</div>
    <div class="info-value"><i class="fas fa-envelope"></i> ${email}</div>

    <div class="info-label">Nomor HP</div>
    <div class="info-value"><i class="fas fa-phone-alt"></i> ${nomorHp}</div>

    <div class="info-label">PIN</div>
    <div class="info-value">
      <i class="fas fa-key"></i>
      <button onclick="loadContent('ubah-pin')" class="btn-mini">Ubah PIN</button>
    </div>

    <div class="info-label">Dibuat</div>
    <div class="info-value"><i class="fas fa-calendar-alt"></i> ${createdAt}</div>
  </div>

  <!-- Tombol Aksi -->
  <button id="btn-edit-profil" class="ubah-btn">
    ✏️ Ubah Profil
  </button>

  <button id="btn-simpan-profil" class="ubah-btn" style="display: none;">
    💾 Simpan Perubahan
  </button>

  <button id="btn-logout" class="logout-btn">
    <i class="fas fa-sign-out-alt"></i> Logout
  </button>
</div>

        </div>
      `;

      container.innerHTML = content;

      document.getElementById("btn-edit-profil").addEventListener("click", () => {
        document.getElementById("info-view").style.display = "none";
        document.getElementById("info-edit").style.display = "grid";
        document.getElementById("btn-edit-profil").style.display = "none";
        document.getElementById("btn-simpan-profil").style.display = "inline-block";
      });

      document.getElementById("btn-simpan-profil").addEventListener("click", async () => {
        const newUsername = document.getElementById("edit-username").value.trim();
        const newNama = document.getElementById("edit-nama").value.trim();
        const newAlamat = document.getElementById("edit-alamat").value.trim();

        try {
          await Promise.all([
            db.collection("users").doc(user.uid).update({
              username: newUsername,
              namaLengkap: newNama
            }),
            db.collection("alamat").doc(user.uid).set({ alamat: newAlamat }, { merge: true })
          ]);

          alert("✅ Profil berhasil diperbarui!");
          loadContent("user");
        } catch (err) {
          alert("❌ Gagal menyimpan perubahan: " + err.message);
        }
      });

      document.getElementById("btn-logout").addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          window.location.href = "login.html";
        });
      });

    })
    .catch(error => {
      container.innerHTML = `<p style="color:red;">Terjadi kesalahan: ${error.message}</p>`;
    });
}



if (page === "ubah-pin") {
  const container = document.getElementById("page-container");

  container.innerHTML = `
    <div class="ubah-pin-wrapper">
      <h2 style="text-align:center; margin-bottom: 10px;"><i class="fas fa-key"></i> Ubah PIN</h2>
      <p style="text-align:center; margin-bottom: 20px;">Masukkan PIN lama dan PIN baru (6 digit).</p>

      <div class="form-group">
        <label for="pin-lama">🔐 PIN Lama</label>
        <input type="password" id="pin-lama" maxlength="6" placeholder="••••••" />
      </div>

      <div class="form-group">
        <label for="pin-baru">🔐 PIN Baru</label>
        <input type="password" id="pin-baru" maxlength="6" placeholder="••••••" />
      </div>

      <div class="form-group">
        <label for="pin-baru2">🔐 Ulangi PIN Baru</label>
        <input type="password" id="pin-baru2" maxlength="6" placeholder="••••••" />
      </div>

      <button onclick="simpanPINBaru()" style="width: 100%; padding: 10px; margin-top: 10px; background: #007bff; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
        💾 Simpan PIN
      </button>
    </div>
  `;
}



if (page === "jam-layanan") {
  const container = document.getElementById("page-container");
  container.innerHTML = "<p>Memuat pengaturan jam layanan...</p>";

  const db = firebase.firestore();
  const snap = await db.collection("pengaturan").doc("jam_layanan").get();
  const data = snap.exists ? snap.data() : {
    buka: "08:00",
    tutup: "22:00",
    aktif: true,
    mode: "otomatis"
  };

  container.innerHTML = `
    <div class="user-container" style="padding:1rem;">
      <h2>⏰ Pengaturan Jam Layanan</h2>

      <label>Mode Layanan</label>
      <select id="mode-layanan">
        <option value="otomatis" ${data.mode === "otomatis" ? 'selected' : ''}>⏱ Otomatis</option>
        <option value="manual" ${data.mode === "manual" ? 'selected' : ''}>🖐 Manual</option>
      </select>

      <div id="jam-otomatis">
        <label>Jam Buka</label>
        <input type="time" id="jam-buka" value="${data.buka}" />

        <label>Jam Tutup</label>
        <input type="time" id="jam-tutup" value="${data.tutup}" />
      </div>

      <label>Status (Manual)</label>
      <select id="status-layanan" ${data.mode === "manual" ? '' : 'disabled'}>
        <option value="true" ${data.aktif ? "selected" : ""}>✅ Aktif</option>
        <option value="false" ${!data.aktif ? "selected" : ""}>❌ Nonaktif</option>
      </select>

      <br/><br/>
      <button onclick="simpanJamLayanan()" class="btn-mini">💾 Simpan</button>
      <button onclick="loadContent('admin-user')" class="btn-mini">⬅️ Kembali</button>
    </div>
  `;

  // ✅ Tampilkan/sembunyikan jam sesuai mode
  const modeSelect = document.getElementById("mode-layanan");
  const jamDiv = document.getElementById("jam-otomatis");
  const statusLayanan = document.getElementById("status-layanan");

  modeSelect.addEventListener("change", () => {
    const mode = modeSelect.value;
    if (mode === "manual") {
      jamDiv.style.display = "none";
      statusLayanan.disabled = false;
    } else {
      jamDiv.style.display = "block";
      statusLayanan.disabled = true;
    }
  });

  // Inisialisasi tampilan berdasarkan mode awal
  if (data.mode === "manual") {
    jamDiv.style.display = "none";
    statusLayanan.disabled = false;
  } else {
    jamDiv.style.display = "block";
    statusLayanan.disabled = true;
  }
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





else if (page === "seller-dashboard") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat dashboard seller...</p>`;
  const user = firebase.auth().currentUser;
  if (!user) return container.innerHTML = `<p>❌ Harap login terlebih dahulu.</p>`;

  const db = firebase.firestore();

  try {
    const tokoQuery = await db.collection("toko").where("uid", "==", user.uid).limit(1).get();
    if (tokoQuery.empty) {
      container.innerHTML = `
        <div class="seller-dashboard">
          <h2>📦 Seller Dashboard</h2>
          <p>⚠️ Kamu belum memiliki toko.</p>
          <button onclick="formTambahToko()" class="tambah-btn">➕ Buat Toko Baru</button>
        </div>
      `;
      return;
    }

    const tokoDoc = tokoQuery.docs[0];
    const toko = tokoDoc.data();
    const idToko = tokoDoc.id;

    const jamBuka = toko.jamBuka ?? 8;
    const jamTutup = toko.jamTutup ?? 21;
    const autoOpenNow = isTokoSedangBuka(jamBuka, jamTutup);

    if (!toko.statusManual) {
      await db.collection("toko").doc(idToko).update({ isOpen: autoOpenNow });
      toko.isOpen = autoOpenNow;
    }

    const produkSnap = await db.collection("produk").where("idToko", "==", idToko).get();
    const totalProduk = produkSnap.size;

    container.innerHTML = `
      <div class="seller-dashboard">
        <h2>📦 Seller Dashboard</h2>

        <div class="info-box">
          <p><strong>Nama Toko:</strong> ${toko.namaToko}</p>
          <p><strong>Saldo:</strong> Rp${(toko.saldo || 0).toLocaleString()}</p>
          <p><strong>Total Produk:</strong> ${totalProduk}</p>

          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
  <strong>Status Toko:</strong>
  <label class="switch-wrap">
    <input type="checkbox" id="toggle-buka-toko" ${toko.isOpen ? "checked" : ""}>
    <span class="slider-ball"></span>
  </label>
  <span id="status-toko">${toko.isOpen ? "Toko Buka" : "Toko Tutup"}</span>
</div>

<small id="auto-note" style="display:block;margin-bottom:5px;color:gray;">
  ${toko.statusManual
    ? `🛠 Manual aktif. Jadwal: ${jamBuka}:00 - ${jamTutup}:00`
    : `⏱ Otomatis buka/tutup sesuai jadwal: ${jamBuka}:00 - ${jamTutup}:00`}
</small>
<center><button onclick="resetManualStatus('${idToko}')" class="btn-mini" style="margin-bottom:10px;">
  🔁 Otomatis Buka/Tutup
</button>
          <div class="aksi-box" style="margin-top:10px;">
            <button onclick="kelolaProduk('${idToko}')" class="btn-mini">🛒 Kelola Produk</button>
            <button onclick="editToko('${idToko}')" class="btn-mini">✏️ Edit Toko</button>
            <button onclick="formTarikSaldo('${idToko}', ${toko.saldo || 0})" class="btn-mini">💸 Tarik Saldo</button></center>
          </div>
        </div>

        <h3 style="margin-top:30px;">📬 Pesanan Masuk</h3>
        <div class="tabel-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID Pesanan</th>
                <th>Pembeli</th>
                <th>Pesanan</th>
                <th>Status</th>
                <th>Driver</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody id="pesanan-penjual-list">
              <tr><td colspan="6">⏳ Memuat...</td></tr>
            </tbody>
          </table>
        </div>

        <h3 style="margin-top:30px;">📊 Riwayat Keuangan</h3>
        <div id="riwayat-keuangan"></div>
      </div>
    `;

   document.getElementById("toggle-buka-toko").addEventListener("change", async (e) => {
  const isOpen = e.target.checked;

  try {
    await firebase.firestore().collection("toko").doc(idToko).update({
      isOpen,
      statusManual: true
    });

    document.getElementById("status-toko").innerText = isOpen ? "Toko Buka" : "Toko Tutup";
    document.getElementById("auto-note").innerText = `🛠 Manual aktif. Toko akan tetap ${isOpen ? "buka" : "tutup"} hingga di-reset.`;
  } catch (err) {
    console.error("Gagal update status toko:", err);
    alert("❌ Gagal mengubah status toko.");
    e.target.checked = !isOpen;
  }
});


    // Riwayat Keuangan
    const riwayatBox = document.getElementById("riwayat-keuangan");
    const riwayatSnap = await db.collection("withdraw_request")
      .where("idToko", "==", idToko).orderBy("waktu", "desc").get();

    if (riwayatSnap.empty) {
      riwayatBox.innerHTML = `<p>Belum ada riwayat penarikan.</p>`;
    } else {
      let riwayatHTML = "<ul>";
      riwayatSnap.forEach(doc => {
        const r = doc.data();
        riwayatHTML += `<li>💸 Rp${r.nominal?.toLocaleString()} ke ${r.bank} (${r.atasNama}) - ${new Date(r.waktu).toLocaleString("id-ID")}</li>`;
      });
      riwayatHTML += "</ul>";
      riwayatBox.innerHTML = riwayatHTML;
    }

    // Pesanan Masuk
db.collection("pesanan_penjual")
  .where("idToko", "==", idToko)
  .orderBy("createdAt", "desc")
  .onSnapshot(async (snap) => {
    const tbody = document.getElementById("pesanan-penjual-list");
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="6">Tidak ada pesanan masuk.</td></tr>`;
      return;
    }

    let html = "";
    for (const doc of snap.docs) {
      const p = doc.data();
      const idPesanan = p.idPesanan;
      const metodePengiriman = p.pengiriman || "-";

      let statusDriver = "Menunggu Driver";
      let driverInfo = `<span class="badge abu">Mencari Driver...</span>`;
      const sudahDitambahkan = p.rewardDitambahkan || false;

      const driverSnap = await db.collection("pesanan_driver")
        .where("idPesanan", "==", idPesanan)
        .limit(1)
        .get();

      if (!driverSnap.empty) {
        const driverData = driverSnap.docs[0].data();
        const driverId = driverData.idDriver;
        statusDriver = driverData.status || statusDriver;

        if (statusDriver === "Pesanan Diterima" && !sudahDitambahkan) {
          const total = p.total || 0;
          const pendapatan = Math.round(total * 0.95);

          await db.collection("toko").doc(idToko).update({
            saldo: firebase.firestore.FieldValue.increment(pendapatan)
          });

          await db.collection("pesanan_penjual").doc(doc.id).update({
            rewardDitambahkan: true
          });

          console.log(`✅ Saldo toko ditambah Rp${pendapatan} dari pesanan ${idPesanan}`);
        }

        const driverDoc = await db.collection("driver").doc(driverId).get();
        if (driverDoc.exists) {
          const driver = driverDoc.data();
          const namaDriver = driver.nama || "Driver";
          const platNomor = driver.nomorPlat || "-";
          driverInfo = `<b>${namaDriver}</b><br><small>${platNomor}</small>`;
        }
      }

      // Ambil jam:menit dari createdAt
      const waktu = p.createdAt?.toDate();
      const jamMenit = waktu
        ? waktu.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
        : "-";

      html += `
        <tr>
          <td>${idPesanan}<br><small>${jamMenit}</small></td>
          <td>${p.namaPembeli}<br><small>${p.noHpPembeli}</small></td>
          <td>${metodePengiriman}</td>
          <td>${statusDriver}</td>
          <td>${driverInfo}</td>
          <td><button onclick="lihatLogPesananSeller('${idPesanan}')" class="btn-mini">📄</button></td>
        </tr>
      `;
    }

    tbody.innerHTML = html;
  });


   } catch (e) {
    console.error("❌ Gagal memuat dashboard seller:", e);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan saat memuat dashboard seller.</p>`;
  }
}




if (page === "riwayat") {
    const content = `
      <div class="riwayat-container">
        <h2>📜 Riwayat Pesanan</h2>
        <div id="riwayat-list"></div>
      </div>
    `;
    container.innerHTML = content;
    renderRiwayat(); // tidak perlu params
  }

 else if (page === "chat") {
  const container = document.getElementById("page-container");
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = "<p>❌ Harap login terlebih dahulu.</p>";
    return;
  }

  const adminUid = data?.uid || "JtD1wA2wkzVg6SWwWSFTxFZMhxO2";
  const chatRef = db.collection("chat");
  const chatId = [user.uid, adminUid].sort().join("_");

  container.innerHTML = `
    <div class="chat-box">
      <div class="chat-messages" id="chat-messages">Memuat pesan...</div>
      <div class="chat-input">
        <input type="text" id="pesan" placeholder="Tulis pesan..." />
        <button onclick="kirimPesanChat('${chatId}', '${user.uid}', '${adminUid}')">Kirim</button>
      </div>
    </div>
  `;

  // Tampilkan chat real-time
  chatRef.where("chatId", "==", chatId).orderBy("timestamp")
    .onSnapshot((snap) => {
      const pesanBox = document.getElementById("chat-messages");
      if (snap.empty) {
        pesanBox.innerHTML = "<p>Belum ada pesan.</p>";
        return;
      }

      let html = "";
      snap.forEach(doc => {
        const p = doc.data();
        const align = p.from === user.uid ? "right" : "left";
        html += `
          <div class="chat-bubble ${align}">
            <div class="bubble">${p.pesan}</div>
            <small>${new Date(p.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</small>
          </div>
        `;
      });
      pesanBox.innerHTML = html;
      pesanBox.scrollTop = pesanBox.scrollHeight;
    });
}

if (page === "form-tariksaldo") {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>⏳ Memuat form penarikan saldo...</p>`;

  const user = firebase.auth().currentUser;
  if (!user) return container.innerHTML = `<p class="error-text">❌ Harap login terlebih dahulu.</p>`;

  const db = firebase.firestore();
  const tokoQuery = await db.collection("toko").where("uid", "==", user.uid).limit(1).get();

  if (tokoQuery.empty) {
    container.innerHTML = `<p>⚠️ Kamu belum memiliki toko.</p>`;
    return;
  }

  const tokoDoc = tokoQuery.docs[0];
  const idToko = tokoDoc.id;
  const toko = tokoDoc.data();
  const saldoSekarang = toko.saldo || 0;

  const html = `
    <div class="form-tariksaldo-wrapper">
      <h2 class="form-tariksaldo-title">💸 Formulir Penarikan Saldo</h2>
      <p><strong>Saldo tersedia:</strong> Rp${saldoSekarang.toLocaleString("id-ID")}</p>

      <form id="formTarikSaldo" class="form-tariksaldo">
        <label for="nominal">Nominal Penarikan (Rp)</label>
        <input type="number" id="nominal" placeholder="Contoh: 50000" required />

        <label for="bank">Nama Bank</label>
        <input type="text" id="bank" placeholder="Contoh: BCA / BRI" required />

        <label for="norek">Nomor Rekening</label>
        <input type="text" id="norek" placeholder="Contoh: 1234567890" required />

        <label for="atasNama">Atas Nama Rekening</label>
        <input type="text" id="atasNama" placeholder="Contoh: Vicky Satria" required />

        <div style="margin-top:20px;display:flex;gap:10px;">
          <button type="submit" class="btn-tariksaldo">Ajukan Penarikan</button>
          <button type="button" onclick="loadContent('seller-dashboard')" class="btn-batal-tariksaldo">Batal</button>
        </div>
      </form>
    </div>
  `;

  container.innerHTML = html;

  document.getElementById("formTarikSaldo").addEventListener("submit", async function (e) {
    e.preventDefault();

    const nominal = parseInt(document.getElementById("nominal").value.trim());
    const bank = document.getElementById("bank").value.trim();
    const norek = document.getElementById("norek").value.trim();
    const atasNama = document.getElementById("atasNama").value.trim();

    if (isNaN(nominal) || nominal <= 0 || nominal > saldoSekarang) {
      return alert(`❌ Nominal tidak valid atau melebihi saldo.\nSaldo kamu: Rp${saldoSekarang.toLocaleString("id-ID")}`);
    }

    if (!bank || !norek || !atasNama) {
      return alert("❌ Semua data wajib diisi.");
    }

    if (!/^\d+$/.test(norek) || norek.length < 6 || norek.length > 20) {
      return alert("❌ Nomor rekening harus angka dan panjangnya 6–20 digit.");
    }

    try {
      await db.collection("withdraw_request").add({
        idToko,
        nominal,
        bank,
        norek,
        atasNama,
        status: "Pending",
        waktu: Date.now()
      });

      await db.collection("toko").doc(idToko).update({
        saldo: firebase.firestore.FieldValue.increment(-nominal)
      });

      alert(`✅ Penarikan sebesar Rp${nominal.toLocaleString("id-ID")} berhasil diajukan.`);
      loadContent("seller-dashboard");

    } catch (err) {
      console.error("❌ Gagal tarik saldo:", err);
      alert("❌ Gagal mengirim permintaan. Silakan coba lagi.");
    }
  });
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


///  BATAS  ////

async function renderChatDriver({ idPesanan, idDriver, idCustomer, namaDriver = "Anda", namaCustomer = "Customer" }) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user || user.uid !== idDriver) return alert("❌ Anda tidak memiliki akses.");

  const container = document.getElementById("page-container");

  // Ambil status driver berdasarkan idPesanan
  const driverSnap = await db.collection("pesanan_driver").where("idPesanan", "==", idPesanan).limit(1).get();
  let statusDriver = "";
  if (!driverSnap.empty) {
    const driverData = driverSnap.docs[0].data();
    statusDriver = driverData.status;
  }

  // Template berdasarkan status
  const statusTemplates = {
    "Menuju Resto": "Saya sedang menuju ke restoran.",
    "Menunggu Pesanan": "Saya sudah tiba di resto dan sedang menunggu pesanan.",
    "Pickup Pesanan": "Pesanan sudah saya ambil dan saya segera berangkat.",
    "Menuju Customer": "Saya sedang dalam perjalanan menuju lokasi Anda.",
    "Pesanan Diterima": "Pesanan berhasil dikirim, terima kasih!"
  };

  const templatePesan = statusTemplates[statusDriver] || "";

  container.innerHTML = `
    <div class="chat-container">
      <h2>💬 Chat dengan ${namaCustomer}</h2>
      <p><strong>Order ID:</strong> ${idPesanan}</p>
      <div class="chat-info">
        <p><strong>Anda:</strong> ${namaDriver}</p>
        <p><strong>Customer:</strong> ${namaCustomer}</p>
        <p><strong>Status Lokasi:</strong> ${statusDriver || "-"}</p>
      </div>

      <div class="chat-box" id="chat-box"></div>

      <div class="chat-form">
        <input type="text" id="chat-input" placeholder="Ketik pesan..." />
        <button onclick="kirimPesanDriver('${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">Kirim</button>
      </div>

      <div class="chat-templates">
        <p><strong>📋 Template Cepat:</strong></p>
        <div class="template-buttons">
   <button onclick="isiPesanDanKirim('${templatePesan}', '${idPesanan}', '${idDriver}', '${idCustomer}', '${namaDriver}')">
  🧭 Status Otomatis
</button>
          <button onclick="isiPesan('Mohon ditunggu sebentar ya.')">⏳ Mohon Tunggu</button>
          <button onclick="isiPesan('Saya sudah tiba di lokasi Anda.')">📍 Sudah Sampai</button>
	<button onclick="isiPesan('Lokasi sudah sesuai titik ya?.')">📍 Konfirmasi Titik</button>
        </div>
      </div>
    </div>
  `;

  const chatBox = document.getElementById("chat-box");

  db.collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .orderBy("waktu", "asc")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";

      snapshot.forEach(doc => {
        const data = doc.data();
        const isSenderDriver = data.dari === idDriver;
        const posisi = isSenderDriver ? "chat-right" : "chat-left";
        const namaPengirim = isSenderDriver ? "Anda" : namaCustomer;
        const waktu = data.waktu?.toDate?.() || new Date();

        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${posisi}`;
        bubble.innerHTML = `
          <div class="chat-nama">${namaPengirim}</div>
          <div class="chat-teks">${data.pesan}</div>
          <div class="chat-waktu">${waktu.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
          })}</div>
        `;
        chatBox.appendChild(bubble);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// Fungsi bantu untuk isi input chat
function isiPesan(teks) {
  const input = document.getElementById("chat-input");
  if (input) input.value = teks;
}



function isiPesanDanKirim(pesan, idPesanan, idDriver, idCustomer, namaDriver) {
  const input = document.getElementById("chat-input");
  if (input) input.value = pesan;

  // Otomatis kirim
  kirimPesanDriver(idPesanan, idDriver, idCustomer, namaDriver);
}


async function kirimPesanDriver(idPesanan, idDriver, idCustomer, namaDriver) {
  const input = document.getElementById("chat-input");
  const isiPesan = input.value.trim();
  if (!isiPesan) return;

  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  await pesanRef.add({
    dari: idDriver,
    ke: idCustomer,
    nama: namaDriver,
    pesan: isiPesan,
    waktu: new Date()
  });

  input.value = "";
}




async function laporkanDriver(idPesanan, idDriver) {
  const alasan = prompt("Masukkan alasan Anda melaporkan driver:");
  if (!alasan) return alert("⚠️ Alasan wajib diisi.");

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  await db.collection("laporan_driver").add({
    idPesanan,
    idDriver,
    idPelapor: user.uid,
    alasan,
    waktu: Date.now()
  });

  alert("✅ Laporan telah dikirim. Terima kasih atas kontribusinya.");
}



async function kirimPesanChat(idPesanan, idDriver, idCustomer) {
  const input = document.getElementById("chat-input");
  const pesan = input.value.trim();
  if (!pesan) return;

  const db = firebase.firestore();
  const waktu = Date.now();

  const data = {
    sender: "driver",
    pesan,
    waktu
  };

  await db.collection("chat_pesanan").doc(idPesanan).collection("pesan").add(data);
  input.value = "";
  renderChatDriver({ idPesanan, idDriver, idCustomer }); // Refresh chat
}

async function renderChatCustomer({ idPesanan, idDriver, idCustomer, namaDriver = "Driver", namaCustomer = "Anda" }) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user || user.uid !== idCustomer) return alert("❌ Anda tidak memiliki akses.");

  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="chat-container">
      <h2>💬 Chat dengan ${namaDriver}</h2>
      <p><strong>Order ID:</strong> ${idPesanan}</p>
      <div class="chat-info">
        <p><strong>Anda:</strong> ${namaCustomer}</p>
        <p><strong>Driver:</strong> ${namaDriver}</p>
      </div>

      <div class="chat-box" id="chat-box"></div>

      <div class="chat-form">
        <input type="text" id="chat-input" placeholder="Ketik pesan..." />
        <button onclick="kirimPesanCustomer('${idPesanan}', '${idCustomer}', '${idDriver}', '${namaCustomer}')">Kirim</button>
      </div>

      <div class="chat-templates">
        <p><strong>📋 Template Cepat:</strong></p>
        <div class="template-buttons">
          <button onclick="isiPesan('Lokasi saya ada di sini, apakah sudah dekat?')">📍 Lokasi Saya</button>
          <button onclick="isiPesan('Berapa lama lagi sampai?')">🕒 Lama Sampai</button>
          <button onclick="isiPesan('Tolong letakkan di depan pintu ya')">🚪 Taruh di Depan</button>
          <button onclick="isiPesan('Terima kasih ya, pesanannya sudah saya terima.')">✅ Sudah Diterima</button>
        </div>
      </div>
    </div>
  `;

  const chatBox = document.getElementById("chat-box");

  db.collection("chat_driver")
    .doc(idPesanan)
    .collection("pesan")
    .orderBy("waktu", "asc")
    .onSnapshot(snapshot => {
      chatBox.innerHTML = "";

      snapshot.forEach(doc => {
        const data = doc.data();
        const isSenderCustomer = data.dari === idCustomer;
        const posisi = isSenderCustomer ? "chat-right" : "chat-left";
        const namaPengirim = isSenderCustomer ? "Anda" : namaDriver;
        const waktu = data.waktu?.toDate?.() || new Date();

        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${posisi}`;
        bubble.innerHTML = `
          <div class="chat-nama">${namaPengirim}</div>
          <div class="chat-teks">${data.pesan}</div>
          <div class="chat-waktu">${waktu.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
          })}</div>
        `;
        chatBox.appendChild(bubble);
      });

      chatBox.scrollTop = chatBox.scrollHeight;
    });
}

function isiPesan(teks) {
  const input = document.getElementById("chat-input");
  if (input) input.value = teks;
}


async function kirimPesanCustomer(idPesanan, idCustomer, idDriver, namaCustomer) {
  const input = document.getElementById("chat-input");
  const isiPesan = input.value.trim();
  if (!isiPesan) return;

  const db = firebase.firestore();
  const pesanRef = db.collection("chat_driver").doc(idPesanan).collection("pesan");

  await pesanRef.add({
    dari: idCustomer,
    ke: idDriver,
    nama: namaCustomer,
    pesan: isiPesan,
    waktu: new Date()
  });

  input.value = "";
}

async function formRatingRestoDriver(idPesanan) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");

  const pesananRef = db.collection("pesanan").doc(idPesanan);
  const pesananDoc = await pesananRef.get();
  if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");

  const data = pesananDoc.data();
  if (data.ratingDiberikan) return alert("✅ Kamu sudah memberi rating.");

  // Ambil data tambahan: resto & driver
  const userDoc = await db.collection("users").doc(user.uid).get();
  const namaUser = userDoc.exists ? userDoc.data().nama || "Pengguna" : "Pengguna";

  const idResto = data.idToko || "-";
  const idDriver = data.idDriver || "-";

  // Render popup rating
  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");

  popup.innerHTML = `
    <div class="popup-container-rating">
      <div class="popup-header-rating">
        <span class="popup-close-rating" onclick="tutupPopup()">✕</span>
        <h3>Beri Rating Pesanan</h3>
      </div>

      <div class="rating-section">
        <p><strong>Rating Driver:</strong></p>
        <div class="star-container" id="rating-driver"></div>
        <textarea id="ulasan-driver" placeholder="Ulasan untuk driver..." rows="2"></textarea>
      </div>

      <div class="rating-section">
        <p><strong>Rating Makanan:</strong></p>
        <div class="star-container" id="rating-resto"></div>
        <textarea id="ulasan-resto" placeholder="Ulasan makanan atau resto..." rows="2"></textarea>
      </div>

      <button class="btn-submit-rating" onclick="kirimRating('${idPesanan}', '${idDriver}', '${idResto}', '${namaUser}')">Kirim</button>
    </div>
  `;

  popup.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("popup-active");

  renderBintang("rating-driver");
  renderBintang("rating-resto");
}

function renderBintang(divId) {
  const container = document.getElementById(divId);
  if (!container) return;
  container.innerHTML = "";

  for (let i = 1; i <= 5; i++) {
    const bintang = document.createElement("span");
    bintang.textContent = "☆";
    bintang.classList.add("star");
    bintang.dataset.value = i;

    bintang.addEventListener("click", () => {
      const semua = container.querySelectorAll(".star");
      semua.forEach((el, idx) => {
        el.textContent = idx < i ? "★" : "☆";
      });
      container.dataset.rating = i;
    });

    container.appendChild(bintang);
  }
}

async function kirimRating(idPesanan, idDriver, idResto, namaUser) {
  const db = firebase.firestore();

  const ratingDriver = parseInt(document.getElementById("rating-driver")?.dataset?.rating || "0");
  const ratingResto = parseInt(document.getElementById("rating-resto")?.dataset?.rating || "0");
  const ulasanDriver = document.getElementById("ulasan-driver")?.value.trim();
  const ulasanResto = document.getElementById("ulasan-resto")?.value.trim();

  if (!ratingDriver || !ratingResto) {
    return alert("❌ Harap beri rating untuk driver dan makanan.");
  }

  const waktu = Date.now();

  try {
    // Simpan ke rating_driver
    await db.collection("rating_driver").add({
      idDriver,
      idPesanan,
      namaUser,
      rating: ratingDriver,
      komentar: ulasanDriver,
      waktu
    });

    // Simpan ke rating_seller
    await db.collection("rating_seller").add({
      idResto,
      idPesanan,
      namaUser,
      rating: ratingResto,
      komentar: ulasanResto,
      waktu
    });

    // Tandai sebagai sudah diberi rating
    await db.collection("pesanan").doc(idPesanan).update({
      ratingDiberikan: true
    });

    alert("✅ Terima kasih atas rating kamu!");
    tutupPopup();
    renderRiwayat(); // refresh list
  } catch (e) {
    console.error("❌ Gagal mengirim rating:", e);
    alert("❌ Gagal mengirim rating.");
  }
}





async function konfirmasiWithdraw(docId, idToko, nominal) {
  const db = firebase.firestore();
  const konfirmasi = confirm("Yakin ingin menyetujui permintaan withdraw ini?");
  if (!konfirmasi) return;

  try {
    await db.collection("withdraw_request").doc(docId).update({
      status: "Selesai"
    });

    alert("✅ Permintaan withdraw disetujui.");
    loadPage("permintaan-withdraw");
  } catch (e) {
    console.error("❌ Gagal konfirmasi withdraw:", e);
    alert("❌ Gagal menyetujui permintaan.");
  }
}

async function tolakWithdraw(docId) {
  const alasan = prompt("Masukkan alasan penolakan:");
  if (!alasan) return;

  try {
    await firebase.firestore().collection("withdraw_request").doc(docId).update({
      status: "Ditolak",
      alasan
    });

    alert("❌ Permintaan withdraw ditolak.");
    loadPage("permintaan-withdraw");
  } catch (e) {
    console.error("❌ Gagal tolak withdraw:", e);
    alert("❌ Gagal menolak permintaan.");
  }
}



async function lihatLogPesananDriver(idPesanan) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat log pesanan driver...</p>`;

  const db = firebase.firestore();

  try {
    // Ambil data dari pesanan_driver
    const driverSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (driverSnap.empty) {
      container.innerHTML = `<p>❌ Tidak ditemukan data driver untuk pesanan ini.</p>`;
      return;
    }

    const data = driverSnap.docs[0].data();
    const idDriver = data.idDriver || "-";
    const status = data.status || "-";
    const stepsLog = data.stepsLog || [];

    // Ambil totalOngkir dari pesanan > doc(idPesanan)
    const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
    let totalOngkir = 0;
    if (pesananDoc.exists) {
      const pesananData = pesananDoc.data();
      totalOngkir = pesananData.totalOngkir || 0;
    }

    // Hitung Fee Driver 5% dan Penghasilan Bersih
    const feeDriver = Math.round(totalOngkir * 0.05);
    const penghasilanBersih = totalOngkir - feeDriver;

    // Format rupiah
    const formatRupiah = (angka) =>
      "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const logHTML = stepsLog.map((step, i) => `
      <li>
        <span class="step-index">${i + 1}.</span>
        <span class="step-text">${step.label || step}</span>
      </li>
    `).join("");

    // Ambil rating driver
    let ratingHTML = "<p>Belum ada rating dari customer.</p>";
    try {
      const ratingSnap = await db.collection("rating_driver")
        .where("idPesanan", "==", idPesanan)
        .limit(1)
        .get();

      if (!ratingSnap.empty) {
        const r = ratingSnap.docs[0].data();
        const bintang = "⭐".repeat(r.rating || 0);
        ratingHTML = `
          <div class="rating-customer" style="margin-top: 20px; padding: 10px; border: 1px solid #ddd; border-radius: 8px;">
            <h3>⭐ Rating dari Customer:</h3>
            <p><strong>Rating:</strong> ${bintang} (${r.rating}/5)</p>
            <p><strong>Komentar:</strong> "${r.komentar || "-"}"</p>
            <p><strong>Dari:</strong> ${r.namaUser || "-"}</p>
          </div>
        `;
      }
    } catch (e) {
      console.warn("❌ Gagal mengambil rating driver:", e.message);
    }

    container.innerHTML = `
      <div class="log-pesanan-container">
        <h2>📄 Log Pesanan Driver</h2>
        <p><strong>ID Pesanan:</strong> ${idPesanan}</p>
        <p><strong>ID Driver:</strong> ${idDriver}</p>
        <p><strong>Status:</strong> ${status}</p>

        <div class="perhitungan-keuangan" style="margin-top:20px;">
          <p><strong>Total Ongkir:</strong> ${formatRupiah(totalOngkir)}</p>
          <p><strong>Fee Driver 5%:</strong> ${formatRupiah(feeDriver)}</p>
          <p><strong>Penghasilan Bersih:</strong> ${formatRupiah(penghasilanBersih)}</p>
        </div>

        <h3>📝 Steps Log:</h3>
        <ul class="steps-log-list">${logHTML}</ul>

        ${ratingHTML}

        <div class="btn-group" style="margin-top: 20px;">
          <button onclick="loadContent('driver-riwayat')" class="btn btn-secondary">⬅️ Kembali</button>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Gagal lihat log driver:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat log: ${err.message}</p>`;
  }
}


async function lihatLogPesananSeller(idPesanan) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat log pesanan...</p>`;

  const db = firebase.firestore();

  try {
    // Ambil data driver
    const driverSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    let idDriver = "-";
    let status = "-";
    let stepsLog = [];

    if (!driverSnap.empty) {
      const driverData = driverSnap.docs[0].data();
      idDriver = driverData.idDriver || "-";
      status = driverData.status || "-";
      stepsLog = driverData.stepsLog || [];
    }

    // Ambil subtotal dari pesanan
    const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
    let subtotalProduk = 0;

    if (pesananDoc.exists) {
      subtotalProduk = pesananDoc.data().subtotalProduk || 0;
    }

    // Ambil pesanan + catatan + produk dari pesanan_penjual
    const pesananPenjualSnap = await db.collection("pesanan_penjual")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    let daftarPesananHTML = `<p>Tidak ada data pesanan.</p>`;
    let catatanPembeli = "-";

    if (!pesananPenjualSnap.empty) {
      const pesananPenjual = pesananPenjualSnap.docs[0].data();
      const produkList = pesananPenjual.produk || [];
      catatanPembeli = pesananPenjual.catatan || "-";

      if (produkList.length > 0) {
        daftarPesananHTML = "<ul>";
        produkList.forEach((item, i) => {
          const nama = item.nama || "-";
          const qty = item.qty || 1;
          const total = item.total || 0;
          const addOn = item.addOn ? `<br><small>Add-on: ${item.addOn}</small>` : "";

          daftarPesananHTML += `
            <li>
              <b>${i + 1}. ${nama}</b> x${qty} - Rp${total.toLocaleString("id-ID")}
              ${addOn}
            </li>
          `;
        });
        daftarPesananHTML += "</ul>";
      }
    }

    // Ambil review dari review_seller
    const reviewSnap = await db.collection("review_seller")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    let ratingText = "Belum ada";
    let komentarText = "-";

    if (!reviewSnap.empty) {
      const review = reviewSnap.docs[0].data();
      ratingText = `${review.rating || 0} ⭐`;
      komentarText = review.komentar || "-";
    }

    // Hitung fee dan penghasilan
    const feeToko = Math.round(subtotalProduk * 0.05);
    const penghasilanBersih = subtotalProduk - feeToko;

    // Format rupiah
    const formatRupiah = (angka) =>
      "Rp " + angka.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const logHTML = stepsLog.map((step, i) => `
      <li>
        <span class="step-index">${i + 1}.</span>
        <span class="step-text">${step}</span>
      </li>
    `).join("");

    // FINAL OUTPUT
    container.innerHTML = `
      <div class="log-pesanan-container">
        <h2>📄 Log Pesanan</h2>
        <p><strong>ID Pesanan:</strong> ${idPesanan}</p>
        <p><strong>ID Driver:</strong> ${idDriver}</p>
        <p><strong>Status:</strong> ${status}</p>

        <div style="margin: 20px 0;">
          <h3>📦 Daftar Pesanan:</h3>
          ${daftarPesananHTML}
          <p><strong>Catatan Pembeli:</strong> ${catatanPembeli}</p>
        </div>

        <div class="perhitungan-keuangan">
          <p><strong>Subtotal Produk:</strong> ${formatRupiah(subtotalProduk)}</p>
          <p><strong>Fee (5%):</strong> ${formatRupiah(feeToko)}</p>
          <p><strong>Penghasilan Bersih:</strong> ${formatRupiah(penghasilanBersih)}</p>
        </div>

        <div style="margin-top: 20px;">
          <h3>⭐ Review & Komentar</h3>
          <p><strong>Rating:</strong> ${ratingText}</p>
          <p><strong>Komentar:</strong> ${komentarText}</p>
        </div>

        <div style="margin-top: 20px;">
          <h3>📝 Steps Log:</h3>
          <ul class="steps-log-list">${logHTML}</ul>
        </div>

        <div class="btn-group" style="margin-top: 20px;">
          <button onclick="kembaliKeDashboardSeller()" class="btn btn-secondary">⬅️ Kembali</button>
          <button onclick="laporkanPesananSeller('${idPesanan}')" class="btn btn-danger">🚨 Laporkan masalah</button>
        </div>
      </div>
    `;
  } catch (err) {
    console.error("Gagal lihat log:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat log pesanan: ${err.message}</p>`;
  }
}






function kembaliKeDashboardSeller() {
  loadContent("seller-dashboard");
}

async function laporkanPesananSeller(idPesanan) {
  const alasan = prompt("Jelaskan laporan permasalahanmu:");
  if (!alasan || alasan.length < 5) return alert("⚠️ Alasan terlalu pendek.");

  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  const db = firebase.firestore();

  try {
    const pesananSnap = await db.collection("pesanan_penjual")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (pesananSnap.empty) return alert("❌ Data pesanan tidak ditemukan.");

    const data = pesananSnap.docs[0].data();
    const namaToko = data.namaToko || "-";
    const idToko = data.idToko || "-";
    const waktu = new Date().toLocaleString("id-ID");

    await db.collection("laporan_driver").add({
      idPesanan,
      idToko,
      namaToko,
      alasan,
      dilaporkanOleh: "seller",
      waktu: Date.now(),
      waktuString: waktu,
      status: "Menunggu Tinjauan"
    });

    alert("✅ Laporan berhasil dikirim ke admin.");
    kembaliKeDashboardSeller();
  } catch (err) {
    console.error("Laporan gagal:", err);
    alert("❌ Gagal mengirim laporan.");
  }
}



async function tambahSaldoToko(docId, namaToko) {
  const nominal = prompt(`Masukkan jumlah saldo yang ingin ditambahkan untuk toko "${namaToko}":`);

  if (!nominal || isNaN(nominal)) {
    alert("Input tidak valid.");
    return;
  }

  const db = firebase.firestore();
  const tokoRef = db.collection("toko").doc(docId);

  try {
    const docSnap = await tokoRef.get();
    if (!docSnap.exists) {
      alert("Toko tidak ditemukan.");
      return;
    }

    const currentSaldo = docSnap.data().saldo || 0;
    const newSaldo = currentSaldo + Number(nominal);

    await tokoRef.update({ saldo: newSaldo });
    alert(`✅ Saldo toko berhasil ditambahkan. Saldo sekarang: Rp${newSaldo.toLocaleString()}`);
    loadContent("admin-toko"); // refresh
  } catch (err) {
    console.error(err);
    alert("❌ Gagal menambah saldo.");
  }
}


async function hapusLaporanDriver(idLaporan) {
  if (!confirm("Yakin ingin menghapus laporan ini?")) return;
  try {
    await firebase.firestore().collection("laporan_driver").doc(idLaporan).delete();
    alert("✅ Laporan berhasil dihapus.");
    loadContent("laporan-driver-admin");
  } catch (err) {
    console.error("❌ Gagal menghapus laporan:", err);
    alert("Terjadi kesalahan saat menghapus laporan.");
  }
}

async function kirimPeringatanManual(idDriver, inputId) {
  const db = firebase.firestore();
  const isi = document.getElementById(inputId)?.value.trim();
  if (!isi) return alert("Masukkan isi pesan terlebih dahulu.");

  try {
    await db.collection("peringatan_driver").add({
      idDriver,
      waktu: Date.now(),
      pesan: isi,
      dariAdmin: true
    });
    alert("✅ Peringatan berhasil dikirim.");
    document.getElementById(inputId).value = "";
  } catch (e) {
    console.error("❌ Gagal kirim peringatan:", e);
    alert("Terjadi kesalahan saat mengirim pesan.");
  }
}

async function nonaktifkanDriverSementara(idDriver, idLaporan, inputId) {
  const input = document.getElementById(inputId);
  const menit = parseInt(input.value);

  if (isNaN(menit) || menit <= 0) {
    alert("Masukkan durasi nonaktif dalam menit (minimal 1).");
    return;
  }

  const db = firebase.firestore();
  const admin = firebase.auth().currentUser;
  if (!admin) return alert("Silakan login ulang.");

  try {
    const waktuSekarang = Date.now();
    const waktuAktifLagi = waktuSekarang + menit * 60 * 1000;

    // Ambil data laporan
    const laporanDoc = await db.collection("laporan_driver").doc(idLaporan).get();
    const data = laporanDoc.data() || {};
    const alasan = data.alasan || "Tidak disebutkan";

    // Ambil data driver untuk update level pelanggaran
    const driverRef = db.collection("driver").doc(idDriver);
    const driverDoc = await driverRef.get();
    const pelanggaran = (driverDoc.data()?.pelanggaran || 0) + 1;

    // Update status driver ke nonaktif & tambah level pelanggaran
    await driverRef.update({
      status: "nonaktif",
      nonaktifHingga: waktuAktifLagi,
      pelanggaran: pelanggaran
    });

    // Kirim notifikasi ke driver
    await db.collection("notifikasi_driver").add({
      idDriver,
      pesan: `Akun Anda dinonaktifkan selama ${menit} menit karena: ${alasan}`,
      waktu: waktuSekarang,
      terbaca: false
    });

    // Catat log admin
    await db.collection("riwayat_tindakan_admin").add({
      oleh: admin.uid,
      tindakan: "Nonaktifkan Driver",
      idDriver,
      idLaporan,
      durasi: menit,
      waktu: waktuSekarang,
      keterangan: `Dinonaktifkan karena laporan: ${alasan}`,
      levelPelanggaran: pelanggaran
    });

    // Hapus laporan setelah ditindak
    await db.collection("laporan_driver").doc(idLaporan).delete();

    alert(`Driver dinonaktifkan selama ${menit} menit. (Total pelanggaran: ${pelanggaran})`);
    loadContent("laporan-driver-admin");

  } catch (err) {
    console.error(err);
    alert("❌ Gagal menonaktifkan driver: " + err.message);
  }
}


// Tambahkan di atas: fungsi bantu
function isTokoSedangBuka(jamBuka, jamTutup) {
  const now = new Date();
  const jam = now.getHours();
  if (jamBuka === jamTutup) return false;
  if (jamBuka < jamTutup) return jam >= jamBuka && jam < jamTutup;
  return jam >= jamBuka || jam < jamTutup;
}

function hitungJarakKM(loc1, loc2) {
  if (!loc1 || !loc2) return 999;

  const R = 6371; // Radius bumi (KM)
  const dLat = toRad(loc2.lat - loc1.lat);
  const dLng = toRad(loc2.lng - loc1.lng);
  const lat1 = toRad(loc1.lat);
  const lat2 = toRad(loc2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2); // KM, dibulatkan 2 angka
}

function toRad(value) {
  return (value * Math.PI) / 180;
}


function hitungJarakKM(pos1 = {}, pos2 = {}) {
  if (!pos1.lat || !pos2.lat) return "-";
  const R = 6371; // Radius bumi dalam KM
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // dibulatkan 1 angka di belakang koma
}

async function tolakPesananDriver(id) {
  const konfirmasi = confirm("Yakin ingin menolak pesanan?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  await db.collection("pesanan_driver").doc(id).delete();
  alert("❌ Pesanan ditolak");
  loadContent("driver-dashboard");
}


async function openCustomerChat(idPesanan) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<h2>💬 Chat dengan Customer</h2><p>Memuat chat...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return container.innerHTML = "<p>❌ Harap login.</p>";

  window.currentChatPesananId = idPesanan;

  const chatBoxId = "chat-messages";

  container.innerHTML = `
    <div class="chat-container">
      <div id="${chatBoxId}" class="chat-messages"></div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Tulis pesan..." />
        <button onclick="kirimPesanCustomer()">Kirim</button>
      </div>

      <div class="template-buttons">
        <p><strong>📋 Pesan Cepat:</strong></p>
        <button onclick="kirimTemplateChat('Saya sudah di titik lokasi, sesuai titik ya!')">📍 Sesuai Titik</button>
        <button onclick="kirimTemplateChat('Mohon ditunggu, saya sedang otw')">🛵 OTW</button>
        <button onclick="kirimTemplateChat('Pesanan kamu akan segera sampai')">📦 Segera Sampai</button>
        <button onclick="kirimTemplateChat('Tolong pastikan nomor rumah terlihat jelas ya!')">🏠 Nomor Rumah</button>
      </div>
    </div>
  `;

  db.collection("chat_driver")
    .where("idPesanan", "==", idPesanan)
    .orderBy("timestamp", "asc")
    .onSnapshot(snapshot => {
      const messages = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        const waktu = data.timestamp?.toDate().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }) || "-";
        const isDriver = data.sender === "driver";
        messages.push(`
          <div class="chat-message ${isDriver ? 'chat-driver' : 'chat-user'}">
            <div class="chat-bubble">
              <p>${data.teks}</p>
              <small>${waktu}</small>
            </div>
          </div>
        `);
      });
      document.getElementById(chatBoxId).innerHTML = messages.join("");
      document.getElementById(chatBoxId).scrollTop = 999999;
    });
}


function kirimPesanCustomer() {
  const input = document.getElementById("chat-input");
  const teks = input.value.trim();
  if (!teks) return;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user || !window.currentChatPesananId) return;

  db.collection("chat_driver").add({
    idPesanan: window.currentChatPesananId,
    sender: "driver",
    teks,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  input.value = "";
}

function kirimTemplateChat(teks) {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user || !window.currentChatPesananId) return;

  db.collection("chat_driver").add({
    idPesanan: window.currentChatPesananId,
    sender: "driver",
    teks,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });
}


async function promptTransferSaldo(driverId) {
  const nominalStr = prompt("Masukkan nominal saldo yang ingin ditransfer:");
  const nominal = parseInt(nominalStr);

  if (isNaN(nominal) || nominal <= 0) {
    alert("❌ Nominal tidak valid.");
    return;
  }

  const konfirmasi = confirm(`Yakin transfer Rp ${nominal.toLocaleString()} ke driver ini?`);
  if (!konfirmasi) return;

  try {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("User tidak ditemukan");
    const uid = user.uid;
    const db = firebase.firestore();

    // 🔐 Ambil saldo admin dari users/{uid}.saldo
    const userDoc = await db.collection("users").doc(uid).get();
    const saldoAdmin = userDoc.exists ? userDoc.data().saldo || 0 : 0;

    if (saldoAdmin < nominal) {
      alert(`❌ Saldo admin tidak cukup. Sisa saldo: Rp ${saldoAdmin.toLocaleString()}`);
      return;
    }

    // 🎯 Ambil saldo driver langsung dari driver/{id}.saldo
    const driverRef = db.collection("driver").doc(driverId);
    const driverDoc = await driverRef.get();
    if (!driverDoc.exists) throw new Error("Driver tidak ditemukan.");

    const dataDriver = driverDoc.data();
    const saldoDriver = dataDriver.saldo || 0;

    const newSaldoDriver = saldoDriver + nominal;
    const newSaldoAdmin = saldoAdmin - nominal;

    // 💾 Simpan saldo baru
    await Promise.all([
      driverRef.update({ saldo: newSaldoDriver, updatedAt: new Date() }),
      db.collection("users").doc(uid).update({ saldo: newSaldoAdmin }),
    ]);

    // 🖼️ Update DOM jika tersedia
    const saldoElem = document.getElementById(`saldo-${driverId}`);
    if (saldoElem) saldoElem.innerText = `Rp ${newSaldoDriver.toLocaleString()}`;

    alert(`✅ Transfer berhasil!\nSaldo Admin: Rp ${newSaldoAdmin.toLocaleString()}`);
  } catch (err) {
    console.error(err);
    alert("❌ Transfer gagal: " + err.message);
  }
}




async function bukaDetailPesananDriver(idPesanan) {
  const container = document.getElementById("page-container");
  const db = firebase.firestore();

  if (!idPesanan) {
    container.innerHTML = `<p style="color:red;">❌ ID Pesanan tidak valid.</p>`;
    return;
  }

  try {
    const pesananDoc = await db.collection("pesanan").doc(idPesanan).get();
    if (!pesananDoc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Pesanan tidak ditemukan (ID: ${idPesanan}).</p>`;
      return;
    }

    const data = pesananDoc.data();

    const driverSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1).get();

    if (driverSnap.empty) {
      container.innerHTML = `<p style="color:red;">❌ Belum ada driver yang menerima pesanan ini.</p>`;
      return;
    }

    const driverDoc = driverSnap.docs[0];
    const driverData = driverDoc.data();
    const driverDocId = driverDoc.id;

    const stepsLog = Array.isArray(driverData.stepsLog)
      ? driverData.stepsLog
      : Array.isArray(data.stepsLog)
        ? data.stepsLog
        : [];

    const statusStepMap = {
      "Menuju Resto": "🔜 Menuju Resto",
      "Menunggu Pesanan": "⏳ Menunggu Pesanan",
      "Pickup Pesanan": "📦 Pickup Pesanan",
      "Menuju Customer": "🛵 Menuju Customer",
      "Pesanan Diterima": "✅ Pesanan Diterima"
    };

    const urutanStatus = Object.keys(statusStepMap);
    const currentIndex = urutanStatus.indexOf(driverData.status);
    const nextStatus = urutanStatus[currentIndex + 1];

    let tombolStatus = "";
    if (nextStatus) {
      const bolehBatal = ["Menunggu Ambil", "Diterima", "Menuju Resto"].includes(driverData.status);
      tombolStatus = `
        <div class="btn-group">
          <button class="btn-next-status"
            onclick="updateStatusDriver('${driverDocId}', '${nextStatus}', '${idPesanan}')">
            ${statusStepMap[nextStatus]}
          </button>
          ${bolehBatal ? `
            <button class="btn-cancel" style="margin-left:10px; background-color:crimson;"
              onclick="batalkanPesananDriver('${driverDocId}', '${idPesanan}')">
              ❌ Batalkan Pesanan
            </button>
          ` : ""}
        </div>
      `;
    } else if (driverData.status === "Pesanan Diterima") {
      tombolStatus = `
        <div class="btn-group" style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
          <button class="btn-next-status btn-success" id="btn-selesaikan" disabled>
            🎉 Selesaikan Pesanan
          </button>
          <p id="jarak-info" style="font-size: 14px; margin-top: 8px; color: #333;"></p>
        </div>
      `;
    }

    let namaPembeli = "Customer";
    if (data.userId) {
      const userDoc = await db.collection("users").doc(data.userId).get();
      if (userDoc.exists) namaPembeli = userDoc.data().nama || namaPembeli;
    }

    const produkList = Array.isArray(data.produk)
      ? data.produk.map(p => `<li>${p.nama} (${p.jumlah}x) - Rp ${(p.harga * p.jumlah).toLocaleString()}</li>`).join("")
      : "<li>-</li>";

    container.innerHTML = `
      <div class="detail-pesanan-wrapper">
        <h2>📦 Detail Pesanan</h2>
        <div class="detail-pesanan-info">
          <p><strong>Nama Pembeli:</strong> ${namaPembeli}</p>
          <p><strong>Alamat:</strong> ${data.alamat || "-"}</p>
          <p><strong>Pembayaran:</strong> ${data.metode?.toUpperCase() || "-"}</p>
          <p><strong>Status Driver:</strong> ${driverData.status || "-"}</p>
        </div>

        <h3>🛍️ Daftar Produk:</h3>
        <ul style="margin-bottom: 30px;">${produkList}</ul>

        <h3 style="margin-top: 30px;">📶 Langkah Pengantaran:</h3>
        <div class="log-steps-wrapper">
          ${stepsLog.length ? stepsLog.map(s => `<div class="log-item">✅ ${s}</div>`).join("") : "<em>(Belum ada log)</em>"}
        </div>

        <h3>🗺️ Rute:</h3>
        <div id="map-detail" class="map-detail" style="height: 300px;"></div>

        ${tombolStatus}

        <br>
        <button onclick="loadContent('driver-dashboard')" class="btn-kembali">⬅️ Kembali ke Dashboard</button>
      </div>
    `;

    // Cek jarak ke customer jika status "Pesanan Diterima"
    if (driverData.status === "Pesanan Diterima" && data.lokasi) {
      navigator.geolocation.getCurrentPosition(pos => {
        const lat1 = pos.coords.latitude;
        const lng1 = pos.coords.longitude;
        const lat2 = data.lokasi.latitude;
        const lng2 = data.lokasi.longitude;

        const jarakMeter = getDistanceInMeters(lat1, lng1, lat2, lng2);

        const infoElem = document.getElementById("jarak-info");
        const btnSelesai = document.getElementById("btn-selesaikan");

        if (jarakMeter <= 50) {
          if (infoElem) infoElem.innerHTML = `<span style="color:green;">✅ Dalam radius, kamu bisa menyelesaikan pesanan!</span>`;
          if (btnSelesai) {
            btnSelesai.disabled = false;
            btnSelesai.onclick = () => updateStatusDriver(driverDocId, "Selesai", idPesanan);
            alert(`🎉 Selesaikan pesanan dan dapatkan pendapatan Rp ${data.total.toLocaleString("id-ID")}`);
          }
        } else {
          if (infoElem) infoElem.innerHTML = `<span style="color:red;">❌ Kamu harus berada dalam radius ±50m dari titik lokasi pembeli</span>`;
          if (btnSelesai) btnSelesai.disabled = true;
        }
      }, err => {
        alert("❌ Gagal mendapatkan lokasi saat ini. Pastikan GPS aktif.");
      });
    }

  } catch (err) {
    console.error("❌ Gagal membuka detail pesanan:", err);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan teknis.</p>`;
  }
}


async function updateStatusDriver(docId, status, idPesanan) {
  const db = firebase.firestore();
  const waktu = new Date().toLocaleTimeString("id-ID", {
    hour: '2-digit',
    minute: '2-digit'
  });

  const logBaru = `${waktu} ${status}`;

  try {
    // ✅ Update status dan tambah log ke pesanan_driver
    await db.collection("pesanan_driver").doc(docId).update({
      status,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(logBaru),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // ✅ Update log ke pesanan utama
    await db.collection("pesanan").doc(idPesanan).update({
      status,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(logBaru)
    });

    // ✅ Notifikasi dan render ulang detail
    alert(`✅ Status diubah ke: ${status}`);
    await bukaDetailPesananDriver(idPesanan);

  } catch (err) {
    console.error("❌ Gagal update status:", err);
    alert("❌ Terjadi kesalahan saat memperbarui status.");
  }
}






function tampilkanRute(id) {
  const mapData = window[`map_${id}`];
  if (!mapData) return;

  const { map, pesanan } = mapData;

  if (!pesanan.lokasiDriver || !pesanan.lokasiToko || !pesanan.lokasiCustomer) {
    alert("❌ Lokasi tidak lengkap.");
    return;
  }

  const route = [
    [pesanan.lokasiDriver.lat, pesanan.lokasiDriver.lng],
    [pesanan.lokasiToko.lat, pesanan.lokasiToko.lng],
    [pesanan.lokasiCustomer.lat, pesanan.lokasiCustomer.lng],
  ];

  L.polyline(route, { color: 'blue', weight: 5 }).addTo(map);
  map.fitBounds(route);
}

async function autoAmbilPendingPesanan(driverId, lokasiDriver) {
  const db = firebase.firestore();

  const sedangProses = await cekDriverSedangProses(driverId);
  if (sedangProses) return; // ❌ Driver sudah punya pesanan

  const pendingSnap = await db.collection("pending_driver_queue")
    .orderBy("createdAt")
    .get();

  if (pendingSnap.empty) return;

  let pesananTerdekat = null;
  let jarakTerdekat = Infinity;

  for (const doc of pendingSnap.docs) {
    const data = doc.data();

    const pesananDoc = await db.collection("pesanan").doc(data.idPesanan).get();
    if (!pesananDoc.exists) continue;

    const pesanan = pesananDoc.data();
    const tokoDoc = await db.collection("toko").doc(pesanan.produk[0]?.idToko).get();
    const lokasiTokoGeo = tokoDoc.exists ? tokoDoc.data().koordinat : null;
    const lokasiToko = lokasiTokoGeo ? {
      lat: lokasiTokoGeo.latitude,
      lng: lokasiTokoGeo.longitude
    } : null;

    const jarak = hitungJarakKM(lokasiDriver, lokasiToko);
    if (jarak < jarakTerdekat) {
      jarakTerdekat = jarak;
      pesananTerdekat = {
        idDokQueue: doc.id,
        idPesanan: data.idPesanan
      };
    }
  }

  if (pesananTerdekat) {
    // Update pesanan_driver
    const pesananDriverSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", pesananTerdekat.idPesanan)
      .get();

    if (!pesananDriverSnap.empty) {
      const docId = pesananDriverSnap.docs[0].id;
      await db.collection("pesanan_driver").doc(docId).update({
        idDriver: driverId,
        status: "Menunggu Ambil",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Hapus dari antrean pending
      await db.collection("pending_driver_queue").doc(pesananTerdekat.idDokQueue).delete();
    }
  }
}

async function terimaPesananDriver(idPesananDriver, idPesanan) {
  const user = firebase.auth().currentUser;
  const db = firebase.firestore();

  const sedangProses = await cekDriverSedangProses(user.uid);
  if (sedangProses) {
    alert("❌ Kamu masih punya pesanan yang sedang berjalan.");
    return;
  }

  await db.collection("pesanan_driver").doc(idPesananDriver).update({
    idDriver: user.uid,
    status: "Diterima",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("✅ Pesanan berhasil diambil!");
  loadContent("driver-dashboard");
}


async function cekDriverSedangProses(driverId) {
  const db = firebase.firestore();

  const snap = await db.collection("pesanan_driver")
    .where("idDriver", "==", driverId)
    .where("status", "in", ["Diterima", "Menuju Resto", "Pickup Pesanan", "Menuju Customer"])
    .get();

  return !snap.empty; // Jika ada → sedang proses
}


async function kirimPesananKeDriverAktif(idPesanan) {
  const db = firebase.firestore();

  try {
    // Ambil semua driver dengan status aktif
    const driverSnap = await db.collection("driver")
      .where("status", "==", "aktif")
      .get();

    if (driverSnap.empty) {
      alert("❌ Tidak ada driver aktif saat ini.");
      return;
    }

    // Pilih driver secara acak
    const drivers = driverSnap.docs;
    const driverTerpilih = drivers[Math.floor(Math.random() * drivers.length)];
    const idDriver = driverTerpilih.id;

    // Buat dokumen baru di pesanan_driver
    await db.collection("pesanan_driver").add({
      idDriver: idDriver,
      idPesanan: idPesanan,
      status: "Menunggu Ambil",
      waktuAmbil: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert(`✅ Pesanan berhasil diteruskan ke driver: ${driverTerpilih.data().nama || idDriver}`);
  } catch (error) {
    console.error("❌ Gagal kirim pesanan ke driver aktif:", error);
    alert("❌ Terjadi kesalahan saat mengirim pesanan ke driver.");
  }
}


async function ambilPesananDriverOtomatis(uidDriver) {
  const db = firebase.firestore();

  try {
    const queueSnap = await db.collection("pending_driver_queue")
                              .orderBy("createdAt", "asc")
                              .limit(1)
                              .get();

    if (!queueSnap.empty) {
      const queueDoc = queueSnap.docs[0];
      const { idPesanan } = queueDoc.data();

      // Cek apakah pesanan_driver sudah ada untuk idPesanan ini
      const checkSnap = await db.collection("pesanan_driver")
                                .where("idPesanan", "==", idPesanan)
                                .limit(1)
                                .get();

      if (checkSnap.empty) {
        await db.collection("pesanan_driver").add({
          idDriver: uidDriver,
          idPesanan,
          status: "Menunggu Ambil",
          waktuAmbil: null,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection("pending_driver_queue").doc(queueDoc.id).delete();
        console.log(`✅ Pesanan ${idPesanan} dikirim otomatis ke driver ${uidDriver}`);
      }
    }
  } catch (error) {
    console.error("❌ Gagal ambil pesanan otomatis:", error);
  }
}

async function ubahStatusPesananSeller(idPesanan, statusBaru) {
  const db = firebase.firestore();
  try {
    await db.collection("pesanan").doc(idPesanan).update({
      status: statusBaru,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(
        `${new Date().toLocaleTimeString("id-ID")} Seller mengubah status menjadi ${statusBaru}`
      )
    });

    const driverSnap = await db.collection("pesanan_driver")
                               .where("idPesanan", "==", idPesanan)
                               .limit(1)
                               .get();

    if (!driverSnap.empty) {
      const driverDocId = driverSnap.docs[0].id;
      await db.collection("pesanan_driver").doc(driverDocId).update({
        status: statusBaru
      });
    }

    alert("✅ Status pesanan diperbarui.");
    loadContent("seller-dashboard");
  } catch (e) {
    console.error("❌ Gagal ubah status:", e);
    alert("❌ Gagal mengubah status pesanan.");
  }
}



async function ubahStatusPesananSeller(idPesanan, statusBaru) {
  const db = firebase.firestore();
  try {
    await db.collection("pesanan").doc(idPesanan).update({
      status: statusBaru,
      stepsLog: firebase.firestore.FieldValue.arrayUnion(
        `${new Date().toLocaleTimeString("id-ID")} Seller mengubah status menjadi ${statusBaru}`
      )
    });

    const driverSnap = await db.collection("pesanan_driver").where("idPesanan", "==", idPesanan).limit(1).get();
    if (!driverSnap.empty) {
      const driverDocId = driverSnap.docs[0].id;
      await db.collection("pesanan_driver").doc(driverDocId).update({
        status: statusBaru
      });
    }

    alert("✅ Status pesanan diperbarui.");
    loadContent("seller-dashboard");
  } catch (e) {
    console.error("❌ Gagal ubah status:", e);
    alert("❌ Gagal mengubah status pesanan.");
  }
}



async function tambahDriver() {
  const uid = document.getElementById("input-uid-driver")?.value.trim();
  if (!uid) return alert("❌ UID tidak boleh kosong.");

  const db = firebase.firestore();

  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return alert("❌ UID tidak ditemukan di koleksi users.");

    const namaLengkap = userDoc.data().namaLengkap || "Tanpa Nama";

    const nomorPlat = prompt("Masukkan Nomor Plat Kendaraan:", "B 1234 ABC");
    if (!nomorPlat) return alert("❌ Nomor plat wajib diisi.");

    const urlKTP = prompt("Masukkan URL Foto KTP Driver:");
    if (!urlKTP) return alert("❌ URL KTP wajib diisi.");

    const dataDriver = {
      idDriver: uid,
      nama: namaLengkap,
      nomorPlat,
      urlKTP,
      status: "nonaktif",
      saldo: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("driver").doc(uid).set(dataDriver);

    alert("✅ Driver berhasil ditambahkan.");
    loadContent("admin-driver");

  } catch (error) {
    console.error("Gagal tambah driver:", error);
    alert("❌ Terjadi kesalahan saat menambahkan driver.");
  }
}




async function toggleStatusDriver(driverId, currentStatus) {
  const db = firebase.firestore();
  const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";
  await db.collection("driver").doc(driverId).update({ status: newStatus });
  alert(`✅ Status driver diubah menjadi ${newStatus}`);
  loadContent("admin-driver");
}


async function editDriver(driverId) {
  const db = firebase.firestore();
  try {
    const doc = await db.collection("driver").doc(driverId).get();
    if (!doc.exists) return alert("❌ Data driver tidak ditemukan.");

    const data = doc.data();
    const nama = prompt("Edit Nama:", data.nama || "");
    const plat = prompt("Edit Nomor Plat:", data.nomorPlat || "");
    const urlKTP = prompt("Edit URL Foto KTP:", data.urlKTP || "");
    const status = prompt("Status (aktif / nonaktif):", data.status || "nonaktif");

    if (!nama || !plat || !urlKTP || !["aktif", "nonaktif"].includes(status.toLowerCase()))
      return alert("❌ Data tidak valid.");

    await db.collection("driver").doc(driverId).update({
      nama,
      nomorPlat: plat,
      urlKTP,
      status: status.toLowerCase()
    });

    alert("✅ Data driver berhasil diperbarui.");
    loadContent("admin-driver");
  } catch (err) {
    console.error("Gagal edit driver:", err);
    alert("❌ Terjadi kesalahan saat mengedit driver.");
  }
}

async function hapusDriver(driverId) {
  if (!confirm("Yakin ingin menghapus driver ini?")) return;

  const db = firebase.firestore();
  try {
    await db.collection("driver").doc(driverId).delete();
    alert("✅ Driver berhasil dihapus.");
    loadContent("admin-driver");
  } catch (err) {
    console.error("Gagal hapus driver:", err);
    alert("❌ Terjadi kesalahan saat menghapus driver.");
  }
}

async function riwayatDriver(driverId) {
  const db = firebase.firestore();
  try {
    const snap = await db.collection("pesanan_driver")
      .where("idDriver", "==", driverId)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    if (snap.empty) return alert("🚫 Riwayat kosong untuk driver ini.");

    let pesan = `📜 Riwayat Driver (${driverId}):\n\n`;
    snap.forEach(doc => {
      const d = doc.data();
      pesan += `• ${d.idPesanan} [${d.status}]\n`;
    });

    alert(pesan);
  } catch (err) {
    console.error("Gagal ambil riwayat driver:", err);
    alert("❌ Gagal mengambil riwayat driver.");
  }
}

async function terimaPesananDriver(idPesanan) {
  const konfirmasi = confirm("Apakah kamu yakin ingin menerima pesanan ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Tidak dapat mengambil data driver.");
  const driverId = user.uid;

  try {
    // 🔍 Ambil dokumen pesanan_driver berdasarkan idPesanan
    const snap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan)
      .limit(1)
      .get();

    if (snap.empty) {
      alert("❌ Dokumen pesanan_driver tidak ditemukan.");
      return;
    }

    const docId = snap.docs[0].id;

    // 🔄 Update status pesanan_driver
    await db.collection("pesanan_driver").doc(docId).update({
      status: "Diterima",
      waktuAmbil: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 🔍 Ambil data pesanan utama
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");

    const dataPesanan = pesananDoc.data();
    const metode = dataPesanan.metode;
    const totalOngkir = dataPesanan.totalOngkir || 0;
    const biayaLayanan = dataPesanan.biayaLayanan || 0;
    const totalBayar = dataPesanan.total || 0;

    // 🔍 Ambil saldo driver langsung dari dokumen utama
    const driverRef = db.collection("driver").doc(driverId);
    const driverDoc = await driverRef.get();
    const saldoDriver = driverDoc.exists ? driverDoc.data().saldo || 0 : 0;

    // ⚠️ Jika metode COD, potong saldo driver 5% dari (ongkir + biaya layanan)
    if (metode === "cod") {
      const fee = Math.round((totalOngkir + biayaLayanan) * 0.05);
      if (saldoDriver < fee) {
        alert(`❌ Saldo kamu tidak cukup untuk menerima pesanan. Diperlukan Rp ${fee.toLocaleString()}`);
        return;
      }

      await driverRef.update({
        saldo: firebase.firestore.FieldValue.increment(-fee)
      });
    }

    // 🧠 Tambahkan log waktu
    const logSebelumnya = dataPesanan.stepsLog || [];
    const waktu = new Date().toLocaleTimeString("id-ID", {
      hour: '2-digit',
      minute: '2-digit'
    });
    const logBaru = `${waktu} Pesanan diterima oleh driver`;

    await pesananRef.update({
      status: "Diterima",
      stepsLog: [...logSebelumnya, logBaru]
    });

    alert("✅ Pesanan berhasil diterima.");
    loadContent("driver-dashboard");
  } catch (err) {
    console.error("❌ Gagal menerima pesanan:", err);
    alert("❌ Terjadi kesalahan saat menerima pesanan.");
  }
}

async function selesaikanPesanan(idPesanan) {
  const db = firebase.firestore();
  const pesananRef = db.collection("pesanan").doc(idPesanan);
  const pesananDoc = await pesananRef.get();
  if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");

  /* ========== DATA PESANAN ========== */
  const d             = pesananDoc.data();
  const metode        = d.metode;                 // 'cod' | 'saldo'
  const subtotal      = d.total        || 0;      // harga produk saja
  const ongkir        = d.totalOngkir  || 0;      // ongkir
  const feeOngkir     = Math.round(ongkir   * 0.05); // 5 % ongkir
  const feeSeller     = Math.round(subtotal * 0.05); // 5 % subtotal
  const biayaLayanan  = Math.round(subtotal * 0.01); // 1 % subtotal

  /* ========== DATA DRIVER ========== */
  const drvSnap = await db.collection("pesanan_driver")
      .where("idPesanan", "==", idPesanan).limit(1).get();
  if (drvSnap.empty) return alert("❌ Driver tidak ditemukan.");

  const drvDoc   = drvSnap.docs[0];
  const idDriver = drvDoc.data().idDriver;
  const driverRef= db.collection("driver").doc(idDriver);

  /* ========== DATA SELLER ========== */
  const idToko = d.idToko; // pastikan field ini ada di pesanan
  const tokoRef = db.collection("toko").doc(idToko);

  /* ========== UPDATE STATUS PESANAN ========== */
  const waktuLabel = new Date().toLocaleTimeString("id-ID",{hour:'2-digit',minute:'2-digit'});
  await pesananRef.update({
    status: "Selesai",
    waktuSelesai: new Date(),
    stepsLog: firebase.firestore.FieldValue.arrayUnion({
      timestamp: Date.now(),
      label: `${waktuLabel} Pesanan selesai & dikonfirmasi`
    })
  });

  /* ========== PERHITUNGAN PENGHASILAN ========== */
  let kreditDriver = 0;
  let kreditSeller = 0;
  let debetSeller  = 0;   // untuk potongan COD

  if (metode === "cod") {
    // Driver: terima 95 % ongkir (feeOngkir & biayaLayanan sudah dipotong lebih awal)
    kreditDriver = ongkir - feeOngkir;            // = 95 % ongkir
    // Seller: sudah menerima tunai 100 % subtotal ⇒ potong 5 %
    debetSeller  = feeSeller;                     // -5 % subtotal
  } else { // metode === 'saldo'
    kreditDriver = ongkir   - feeOngkir;          // 95 % ongkir
    kreditSeller = subtotal - feeSeller;          // 95 % subtotal
    // tidak ada debetSeller
  }

  /* ========== UPDATE SALDO DRIVER & SELLER ========== */
  await driverRef.update({
    saldo: firebase.firestore.FieldValue.increment(kreditDriver)
  });

  if (kreditSeller) {
    await tokoRef.update({
      saldo: firebase.firestore.FieldValue.increment(kreditSeller)
    });
  }
  if (debetSeller) {
    await tokoRef.update({
      saldo: firebase.firestore.FieldValue.increment(-debetSeller)
    });
  }

  /* ========== RIWAYAT DRIVER ========== */
  await db.collection("riwayat_driver").add({
    idPesanan,
    idDriver,
    totalProduk   : subtotal,
    ongkir,
    biayaLayanan,
    metode,
    penghasilanBersih: kreditDriver,
    waktuSelesai: new Date(),
    createdAt   : firebase.firestore.FieldValue.serverTimestamp()
  });

  /* ========== HAPUS DOKUMEN RELASI DRIVER ========== */
  await db.collection("pesanan_driver").doc(drvDoc.id).delete();

  alert("✅ Pesanan selesai & saldo diperbarui.");
  loadContent("driver-dashboard");
}






async function tolakPesananDriver(idPesananDriver, idPesanan) {
  const konfirmasi = confirm("Apakah kamu yakin ingin menolak pesanan ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();

  try {
    // 1. Hapus dari pesanan_driver
    await db.collection("pesanan_driver").doc(idPesananDriver).delete();

    // 2. Update pesanan utama: status dan log
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");

    const dataPesanan = pesananDoc.data();
    const logSebelumnya = dataPesanan.stepsLog || [];
    const waktu = new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
    const logBaru = `${waktu} Pesanan ditolak oleh driver`;

    await pesananRef.update({
      status: "Menunggu Driver",
      stepsLog: [...logSebelumnya, logBaru]
    });

    alert("❌ Pesanan telah ditolak.");
    loadContent("driver-dashboard"); // refresh dashboard
  } catch (err) {
    console.error("❌ Gagal menolak pesanan:", err);
    alert("❌ Terjadi kesalahan saat menolak pesanan.");
  }
}




function mulaiUpdateLokasiDriver(driverId) {
  if (!navigator.geolocation) {
    console.warn("❌ Geolocation tidak didukung.");
    return;
  }

  navigator.geolocation.watchPosition(async (pos) => {
    const { latitude, longitude } = pos.coords;

    try {
      const db = firebase.firestore();
      await db.collection("driver").doc(driverId).update({
        lokasi: {
          lat: latitude,
          lng: longitude
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      console.log("📍 Lokasi driver diperbarui:", latitude, longitude);
    } catch (err) {
      console.error("❌ Gagal update lokasi driver:", err);
    }
  }, (err) => {
    console.error("❌ Gagal mendapatkan lokasi driver:", err);
  }, {
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  });
}


function hentikanUpdateLokasiDriver() {
  if (lokasiWatchID !== null) {
    navigator.geolocation.clearWatch(lokasiWatchID);
    lokasiWatchID = null;
    console.log("⛔️ Update lokasi dihentikan.");
  }
}




// Fungsi salin UID ke clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => alert("UID berhasil disalin: " + text))
    .catch(() => alert("Gagal menyalin UID."));
}


async function simpanProduk(event, idToko) {
  event.preventDefault();

  // Mengambil nilai dari form
  const namaProduk = document.getElementById("namaProduk").value.trim();
  const harga = parseInt(document.getElementById("harga").value);
  const stok = parseInt(document.getElementById("stok").value);
  const deskripsi = document.getElementById("deskripsi").value.trim();
  const estimasi = parseInt(document.getElementById("estimasi")?.value || "10"); // default 10 menit
  const urlGambar = document.getElementById("urlGambar").value.trim(); // Ambil URL gambar
  const kategori = document.getElementById("kategori").value; // Ambil kategori

  // Validasi input
  if (!namaProduk || isNaN(harga) || isNaN(stok) || isNaN(estimasi) || !urlGambar) {
    return alert("❌ Harap isi semua data dengan benar.");
  }

  const db = firebase.firestore();
  try {
    // Menambahkan produk ke Firestore
    await db.collection("produk").add({
      idToko,
      namaProduk,
      harga,
      stok,
      deskripsi,
      estimasi,
      urlGambar,  // Menyimpan URL gambar
      kategori,    // Menyimpan kategori produk
      rating: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("✅ Produk berhasil ditambahkan.");
    kelolaProduk(idToko);  // Panggil fungsi untuk mengelola produk setelah berhasil menambahkan produk

  } catch (err) {
    console.error("❌ Gagal menambahkan produk:", err);
    alert("❌ Gagal menambahkan produk: " + err.message);
  }
}






async function editProduk(docId, idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat form edit produk...</p>`;

  const db = firebase.firestore();
  try {
    const doc = await db.collection("produk").doc(docId).get();
    if (!doc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Produk tidak ditemukan.</p>`;
      return;
    }

    const p = doc.data();

    container.innerHTML = `
      <div class="form-box">
        <h2>✏️ Edit Produk</h2>
        <form onsubmit="simpanEditProduk(event, '${docId}', '${idToko}')">
          <label>Nama Produk</label>
          <input id="namaProduk" type="text" value="${p.namaProduk}" required />

          <label>Harga (Rp)</label>
          <input id="harga" type="number" value="${p.harga}" required />

          <label>Stok</label>
          <input id="stok" type="number" value="${p.stok}" required />

          <label>Deskripsi</label>
          <textarea id="deskripsi">${p.deskripsi || ""}</textarea>

          <label>URL Gambar Produk</label>
          <input id="urlGambar" type="url" value="${p.urlGambar || ""}" />

          <label>Estimasi (menit)</label>
          <input id="estimasi" type="number" value="${p.estimasi || ""}" required />

          <!-- Dropdown untuk kategori -->
          <label>Kategori:</label>
          <select id="kategori" required>
            <option value="Makanan" ${p.kategori === "Makanan" ? "selected" : ""}>Makanan</option>
            <option value="Minuman" ${p.kategori === "Minuman" ? "selected" : ""}>Minuman</option>
            <option value="Snack" ${p.kategori === "Snack" ? "selected" : ""}>Snack</option>
            <option value="Dessert" ${p.kategori === "Dessert" ? "selected" : ""}>Dessert</option>
            <option value="Lainnya" ${p.kategori === "Lainnya" ? "selected" : ""}>Lainnya</option>
          </select>

          <button type="submit" class="btn-simpan">💾 Simpan Perubahan</button>
        </form>
        <button onclick="kelolaProduk('${idToko}')" class="btn-mini" style="margin-top:1rem;">⬅️ Kembali</button>
      </div>
    `;
  } catch (err) {
    console.error("❌ Gagal load produk:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat data produk.</p>`;
  }
}

async function simpanEditProduk(event, docId, idToko) {
  event.preventDefault();

  const namaProduk = document.getElementById("namaProduk").value.trim();
  const harga = parseInt(document.getElementById("harga").value);
  const stok = parseInt(document.getElementById("stok").value);
  const deskripsi = document.getElementById("deskripsi").value.trim();
  const urlGambar = document.getElementById("urlGambar").value.trim();
  const estimasi = parseInt(document.getElementById("estimasi").value);
  const kategori = document.getElementById("kategori").value; // Menambahkan kategori

  if (!namaProduk || isNaN(harga) || isNaN(stok) || isNaN(estimasi)) {
    return alert("❌ Harap isi semua data dengan benar.");
  }

  const db = firebase.firestore();
  try {
    await db.collection("produk").doc(docId).update({
      namaProduk,
      harga,
      stok,
      deskripsi,
      urlGambar,
      estimasi,
      kategori // Menyimpan kategori produk
    });

    alert("✅ Produk berhasil diperbarui.");
    kelolaProduk(idToko);
  } catch (err) {
    console.error("❌ Gagal update produk:", err);
    alert("❌ Gagal update produk: " + err.message);
  }
}


async function updateProduk(event, idProduk, idToko) {
  event.preventDefault();
  const db = firebase.firestore();

  // Mengambil data dari form
  const data = {
    nama: document.getElementById("namaProduk").value.trim(),
    harga: parseInt(document.getElementById("hargaProduk").value),
    estimasi: parseInt(document.getElementById("estimasiMasak").value),
    kategori: document.getElementById("kategoriProduk").value.trim(),  // Menambahkan kategori
    gambar: document.getElementById("gambarProduk").value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // Mengupdate data produk di Firestore
    await db.collection("produk").doc(idProduk).update(data);
    alert("✅ Produk berhasil diupdate");
    kelolaProduk(idToko);  // Kembali ke halaman kelola produk
  } catch (err) {
    alert("❌ Gagal update: " + err.message);
  }
}

async function hapusProduk(docId, idToko) {
  const konfirmasi = confirm("Apakah kamu yakin ingin menghapus produk ini?");
  if (!konfirmasi) return;

  const db = firebase.firestore();
  try {
    // Menghapus produk dari koleksi Firestore
    await db.collection("produk").doc(docId).delete();
    alert("🗑️ Produk berhasil dihapus.");
    kelolaProduk(idToko);  // Kembali ke halaman kelola produk
  } catch (err) {
    console.error("❌ Gagal hapus produk:", err);
    alert("❌ Gagal menghapus produk: " + err.message);
  }
}



async function kelolaProduk(idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat produk...</p>`;

  const db = firebase.firestore();

  try {
    const tokoDoc = await db.collection("toko").doc(idToko).get();
    if (!tokoDoc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Toko tidak ditemukan.</p>`;
      return;
    }

    const toko = tokoDoc.data();
    const produkSnap = await db.collection("produk").where("idToko", "==", idToko).get();

    let html = `
      <div class="kelola-produk">
        <h2>🛒 Produk: ${toko.namaToko}</h2>
        <button class="tambah-btn" onclick="formTambahProduk('${idToko}')">➕ Tambah Produk</button>
        <div class="tabel-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nama Produk</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Status</th>
                <th>Deskripsi</th>
                <th>Submenu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (produkSnap.empty) {
      html += `
        <tr>
          <td colspan="7" style="text-align:center; color:#999;">Belum ada produk</td>
        </tr>
      `;
    } else {
      produkSnap.forEach(doc => {
        const p = doc.data();
        const isAvailable = (p.stok || 0) > 0;
        const toggleId = `toggle-${doc.id}`;

        html += `
          <tr>
            <td>${p.namaProduk}</td>
            <td>Rp ${p.harga?.toLocaleString("id-ID") || 0}</td>
            <td>${p.stok || 0}</td>
            <td>
              <label class="switch">
                <input type="checkbox" id="${toggleId}" ${isAvailable ? "checked" : ""} onchange="toggleStatusProduk('${doc.id}', this.checked)">
                <span class="slider round"></span>
              </label>
            </td>
            <td>${p.deskripsi || '-'}</td>
            <td>
              <button class="btn-mini" onclick="kelolaAddonProduk('${doc.id}', '${idToko}')">⚙️ Add-On</button>
            </td>
            <td>
              <button onclick="editProduk('${doc.id}', '${idToko}')" class="btn-mini">✏️</button>
              <button onclick="hapusProduk('${doc.id}', '${idToko}')" class="btn-mini">🗑️</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
        <button onclick="loadContent('seller-dashboard')" class="btn-mini" style="margin-top:1rem;">⬅️ Kembali</button>
      </div>
    `;

    container.innerHTML = html;

  } catch (e) {
    console.error("❌ Gagal memuat produk:", e);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat produk toko.</p>`;
  }
}


async function toggleStatusProduk(idProduk, isChecked) {
  const db = firebase.firestore();
  try {
    const stokBaru = isChecked ? 10 : 0; // Default stok saat dinyalakan ulang
    await db.collection("produk").doc(idProduk).update({ stok: stokBaru });
    console.log(`Produk ${idProduk} diubah ke ${isChecked ? "Tersedia" : "Stok Habis"}`);
  } catch (error) {
    alert("❌ Gagal mengubah status produk.");
    console.error(error);
  }
}



function formTambahProduk(idToko) {
  const container = document.getElementById("page-container");

  container.innerHTML = `
    <div class="form-box">
      <h2>➕ Tambah Produk</h2>
      <form onsubmit="simpanProduk(event, '${idToko}')">
        <label for="namaProduk">Nama Produk:</label>
        <input id="namaProduk" type="text" required>

        <label for="harga">Harga (Rp):</label>
        <input id="harga" type="number" required>

        <label for="stok">Stok:</label>
        <input id="stok" type="number" required>

        <label for="estimasi">Estimasi Masak (menit):</label>
        <input id="estimasi" type="number" value="10" min="1" required>

        <label for="deskripsi">Deskripsi:</label>
        <textarea id="deskripsi"></textarea>

        <label for="urlGambar">URL Gambar Produk:</label>
        <input id="urlGambar" type="url" required placeholder="Masukkan URL gambar produk">

        <!-- Tambahkan kategori -->
        <label for="kategori">Kategori:</label>
        <select id="kategori" required>
          <option value="Makanan">Makanan</option>
          <option value="Minuman">Minuman</option>
          <option value="Snack">Snack</option>
          <option value="Dessert">Dessert</option>
          <option value="Lainnya">Lainnya</option>
        </select>

        <button type="submit">Simpan Produk</button>
      </form>
    </div>
  `;
}

function formTambahProduk(idToko) {
  const container = document.getElementById("page-container");

  container.innerHTML = `
    <div class="form-box">
      <h2>➕ Tambah Produk</h2>
      <form onsubmit="simpanProduk(event, '${idToko}')">
        <label for="namaProduk">Nama Produk:</label>
        <input id="namaProduk" type="text" required>

        <label for="harga">Harga (Rp):</label>
        <input id="harga" type="number" required>

        <label for="stok">Stok:</label>
        <input id="stok" type="number" required>

        <label for="estimasi">Estimasi Masak (menit):</label>
        <input id="estimasi" type="number" value="10" min="1" required>

        <label for="deskripsi">Deskripsi:</label>
        <textarea id="deskripsi"></textarea>

        <label for="urlGambar">URL Gambar Produk:</label>
        <input id="urlGambar" type="url" required placeholder="Masukkan URL gambar produk">

        <label for="kategori">Kategori:</label>
        <select id="kategori" required>
          <option value="Makanan">Makanan</option>
          <option value="Minuman">Minuman</option>
          <option value="Snack">Snack</option>
          <option value="Dessert">Dessert</option>
          <option value="Lainnya">Lainnya</option>
        </select>

        <hr>
        <h4>Tambah Add-On (Opsional)</h4>
        <div id="addon-container"></div>
        <button type="button" onclick="tambahFieldAddon()">➕ Tambah Add-On</button>

        <br><br>
        <button type="submit">💾 Simpan Produk</button>
      </form>
    </div>
  `;
}

function tambahFieldAddon() {
  const container = document.getElementById("addon-container");

  const index = container.children.length;

  const addonHTML = `
    <div class="addon-row" style="margin-bottom:10px;">
      <input type="text" placeholder="Nama Add-On" class="addon-nama" required />
      <input type="number" placeholder="Harga (Rp)" class="addon-harga" required />
      <button type="button" onclick="this.parentElement.remove()">🗑️</button>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', addonHTML);
}


async function simpanProduk(event, idToko) {
  event.preventDefault();

  const namaProduk = document.getElementById("namaProduk").value.trim();
  const harga = parseInt(document.getElementById("harga").value);
  const stok = parseInt(document.getElementById("stok").value);
  const deskripsi = document.getElementById("deskripsi").value.trim();
  const estimasi = parseInt(document.getElementById("estimasi")?.value || "10");
  const urlGambar = document.getElementById("urlGambar").value.trim();
  const kategori = document.getElementById("kategori").value;

  const addonNama = document.querySelectorAll(".addon-nama");
  const addonHarga = document.querySelectorAll(".addon-harga");

  // Validasi
  if (!namaProduk || isNaN(harga) || isNaN(stok) || isNaN(estimasi) || !urlGambar || !kategori) {
    return alert("❌ Harap isi semua data dengan benar.");
  }

  const db = firebase.firestore();

  try {
    // Tambah produk utama
    const produkRef = await db.collection("produk").add({
      idToko,
      namaProduk,
      harga,
      stok,
      deskripsi,
      estimasi,
      urlGambar,
      kategori,
      rating: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Tambah add-on (jika ada)
    for (let i = 0; i < addonNama.length; i++) {
      const nama = addonNama[i].value.trim();
      const harga = parseInt(addonHarga[i].value);
      if (nama && !isNaN(harga)) {
        await produkRef.collection("addons").add({ nama, harga });
      }
    }

    alert("✅ Produk berhasil ditambahkan.");
    kelolaProduk(idToko);

  } catch (err) {
    console.error("❌ Gagal menambahkan produk:", err);
    alert("❌ Gagal menambahkan produk: " + err.message);
  }
}

async function kelolaAddonProduk(docId, idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat add-on produk...</p>`;

  const db = firebase.firestore();

  try {
    const produkDoc = await db.collection("produk").doc(docId).get();
    if (!produkDoc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Produk tidak ditemukan.</p>`;
      return;
    }

    const p = produkDoc.data();
    const addonSnap = await db.collection("produk").doc(docId).collection("addons").get();

    let html = `
      <div class="form-box">
        <h2>⚙️ Kelola Add-On untuk: ${p.namaProduk}</h2>

        <form onsubmit="tambahAddon(event, '${docId}', '${idToko}')">
          <label>Nama Add-On:</label>
          <input type="text" id="addonNama" required>

          <label>Harga Add-On (Rp):</label>
          <input type="number" id="addonHarga" required>

          <button type="submit">➕ Tambah Add-On</button>
        </form>

        <div style="margin-top: 1rem;">
          <h4>📋 Daftar Add-On:</h4>
    `;

    if (addonSnap.empty) {
      html += `<p style="color: gray;">Belum ada add-on.</p>`;
    } else {
      addonSnap.forEach(addon => {
        const a = addon.data();
        html += `
          <div class="addon-item" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <span>${a.nama} - Rp ${a.harga?.toLocaleString("id-ID")}</span>
            <button onclick="hapusAddon('${docId}', '${addon.id}', '${idToko}')" class="btn-mini">🗑️ Hapus</button>
          </div>
        `;
      });
    }

    html += `
        </div>
        <button onclick="kelolaProduk('${idToko}')" class="btn-mini" style="margin-top:1rem;">⬅️ Kembali ke Produk</button>
      </div>
    `;

    container.innerHTML = html;

  } catch (err) {
    console.error("❌ Gagal memuat add-on:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat data add-on.</p>`;
  }
}

async function tambahAddon(event, docId, idToko) {
  event.preventDefault();
  const nama = document.getElementById("addonNama").value.trim();
  const harga = parseInt(document.getElementById("addonHarga").value);

  if (!nama || isNaN(harga)) {
    alert("❌ Nama dan harga add-on wajib diisi.");
    return;
  }

  const db = firebase.firestore();

  try {
    await db.collection("produk").doc(docId).collection("addons").add({ nama, harga });
    alert("✅ Add-on ditambahkan.");
    kelolaAddonProduk(docId, idToko); // refresh halaman
  } catch (err) {
    console.error("❌ Gagal tambah add-on:", err);
    alert("❌ Gagal menambahkan add-on.");
  }
}

async function hapusAddon(docId, addonId, idToko) {
  if (!confirm("Yakin ingin menghapus add-on ini?")) return;

  const db = firebase.firestore();

  try {
    await db.collection("produk").doc(docId).collection("addons").doc(addonId).delete();
    alert("✅ Add-on dihapus.");
    kelolaAddonProduk(docId, idToko);
  } catch (err) {
    console.error("❌ Gagal hapus add-on:", err);
    alert("❌ Gagal menghapus add-on.");
  }
}

async function updateToko(event, id) {
  event.preventDefault();
  const db = firebase.firestore();
  const data = {
    namaPemilik: document.getElementById("namaPemilik").value,
    namaToko: document.getElementById("namaToko").value,
    alamatToko: document.getElementById("alamatToko").value,
    jamBuka: parseInt(document.getElementById("jamBuka").value),
    jamTutup: parseInt(document.getElementById("jamTutup").value),
    koordinat: document.getElementById("koordinat").value
  };

  try {
    await db.collection("toko").doc(id).update(data);
    alert("✅ Toko berhasil diupdate");
    loadContent("admin-toko");
  } catch (e) {
    alert("❌ Gagal update: " + e.message);
  }
}

async function hapusToko(id) {
  if (!confirm("Yakin ingin menghapus toko ini?")) return;
  const db = firebase.firestore();
  try {
    await db.collection("toko").doc(id).delete();
    alert("✅ Toko berhasil dihapus");
    loadContent("admin-toko");
  } catch (e) {
    alert("❌ Gagal hapus: " + e.message);
  }
}


async function simpanToko(event) {
  event.preventDefault();

  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  const db = firebase.firestore();

  const namaPemilik = document.getElementById("namaPemilik").value.trim();
  const namaToko = document.getElementById("namaToko").value.trim();
  const deskripsiToko = document.getElementById("deskripsiToko").value.trim();
  const alamatToko = document.getElementById("alamatToko").value.trim();
  const jamBuka = parseInt(document.getElementById("jamBuka").value);
  const jamTutup = parseInt(document.getElementById("jamTutup").value);
  const koordinatString = document.getElementById("koordinat").value.trim();

  if (!namaPemilik || !namaToko || !deskripsiToko || !alamatToko || isNaN(jamBuka) || isNaN(jamTutup)) {
    return alert("❌ Semua data harus diisi dengan benar.");
  }

  if (jamBuka < 0 || jamBuka > 23 || jamTutup < 0 || jamTutup > 23 || jamTutup <= jamBuka) {
    return alert("❌ Jam buka dan tutup tidak valid (0–23 dan jam tutup harus > jam buka).");
  }

  if (!koordinatString.includes(",")) return alert("❌ Format koordinat tidak valid.");

  const [latStr, lngStr] = koordinatString.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return alert("❌ Koordinat tidak valid.");
  }

  const koordinat = new firebase.firestore.GeoPoint(lat, lng);

  const dataToko = {
    uid: user.uid,
    namaPemilik,
    namaToko,
    deskripsi: deskripsiToko,
    alamatToko,
    jamBuka,
    jamTutup,
    koordinat,
    saldo: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await db.collection("toko").add(dataToko);

    alert("✅ Toko berhasil dibuat!");

    // Langsung arahkan ke dashboard seller tanpa localStorage
    loadPage("seller-dashboard");  // atau fungsi navigasi yang kamu pakai

  } catch (err) {
    console.error("❌ Gagal simpan toko:", err.message);
    alert("❌ Gagal menyimpan toko: " + err.message);
  }
}



async function formTambahToko() {
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  const container = document.getElementById("page-container");
  container.innerHTML = `
    <div class="form-box">
      <h2><i class="fas fa-store"></i> Tambah Toko</h2>
      <form id="form-tambah-toko" onsubmit="return simpanToko(event)">
        <label>Nama Pemilik</label>
        <input required id="namaPemilik" placeholder="Nama pemilik toko" />

        <label>Nama Toko</label>
        <input required id="namaToko" placeholder="Nama toko" />

        <label>Deskripsi Toko</label>
        <textarea required id="deskripsiToko" placeholder="Deskripsi singkat tentang toko" rows="3"></textarea>

        <label>Alamat Toko</label>
        <textarea required id="alamatToko" placeholder="Alamat lengkap toko" rows="3"></textarea>

        <label>Jam Buka (0–23)</label>
        <input type="number" min="0" max="23" required id="jamBuka" placeholder="Contoh: 8" />

        <label>Jam Tutup (0–23)</label>
        <input type="number" min="0" max="23" required id="jamTutup" placeholder="Contoh: 21" />

        <label>Koordinat (klik peta untuk isi otomatis)</label>
        <input required id="koordinat" placeholder="Contoh: -6.12345,106.54321" />

        <button type="submit" class="btn-simpan">💾 Simpan</button>
      </form>

      <div id="leafletMap" style="height: 300px; margin-top: 20px; border-radius: 8px; overflow: hidden;"></div>
    </div>
  `;

  const map = L.map('leafletMap').setView([-1.63468, 105.77554], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker;
  map.on('click', function (e) {
    const { lat, lng } = e.latlng;
    document.getElementById("koordinat").value = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (marker) marker.remove();
    marker = L.marker([lat, lng]).addTo(map);
  });
}




async function lihatRiwayatTransaksi(idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat riwayat transaksi toko...</p>`;

  const db = firebase.firestore();

  try {
    const snapshot = await db.collection("pesanan")
      .where("idToko", "==", idToko)
      .orderBy("timestamp", "desc")
      .get();

    if (snapshot.empty) {
      container.innerHTML = `<p>Tidak ada riwayat transaksi untuk toko ini.</p>`;
      return;
    }

    let html = `
      <div class="riwayat-toko-wrapper">
        <h2>📄 Riwayat Transaksi Toko</h2>
        <button onclick="loadContent('admin-toko')" class="btn-kembali">⬅️ Kembali</button>
        <div class="tabel-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Waktu</th>
                <th>Produk</th>
                <th>Jumlah</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
    `;

    let no = 1;

    snapshot.forEach(doc => {
      const d = doc.data();
      const waktu = d.timestamp?.toDate().toLocaleString("id-ID") || "-";
      const produkList = (d.produk || []).map(p => `${p.nama} (${p.qty})`).join("<br>");
      html += `
        <tr>
          <td>${no++}</td>
          <td>${waktu}</td>
          <td>${produkList}</td>
          <td>${d.totalItem || '-'}</td>
          <td>Rp${Number(d.total || 0).toLocaleString()}</td>
          <td>${d.status || '-'}</td>
        </tr>
      `;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;

  } catch (error) {
    console.error(error);
    container.innerHTML = `<p style="color:red;">Gagal memuat riwayat: ${error.message}</p>`;
  }
}


async function topupSaldoUser() {
  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Kamu harus login terlebih dahulu.");

  const doc = await db.collection("pengaturan").doc("rekening").get();
  const data = doc.exists ? doc.data() : {};
  const listRekening = Array.isArray(data.list) ? data.list : [];
  const rekeningAktif = listRekening.filter(r => r.aktif);

  if (rekeningAktif.length === 0) return alert("❌ Tidak ada rekening aktif.");

  // Generate kode unik (3 digit)
  const kodeUnik = Math.floor(Math.random() * 900) + 100;

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🔼 Ajukan Top Up</h3>
      <input id="topup-nominal" type="number" placeholder="Nominal (min Rp10.000)" class="input-full" />

      <select id="topup-metode" class="input-full" onchange="tampilRekeningTujuan(this.value)">
        <option value="" disabled selected>🧾 Pilih Bank</option>
        ${rekeningAktif.map((r, i) => `<option value="${i}">${r.bank}</option>`).join("")}
      </select>

      <div id="rekening-tujuan" class="rekening-box" style="display:none;">
        <strong>Bank: <span id="rekening-bank">-</span></strong><br/>
        <strong>Nama: <span id="rekening-nama">-</span></strong><br/>
        <span id="rekening-nomor" class="copyable" title="Klik untuk salin">-</span><br/><br/>
        <span id="nominal-display" class="nominal-display" title="Klik untuk salin">-</span>
      </div>

      <input id="topup-catatan" type="text" placeholder="Catatan (opsional)" class="input-full" />
      <div id="modal-message" class="modal-message"></div>

      <div class="modal-actions">
        <button class="btn-mini" id="btn-batal">Batal</button>
        <button class="btn-mini" id="btn-kirim">Kirim</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Menampilkan rekening saat dipilih
  window.tampilRekeningTujuan = function(index) {
    const box = document.getElementById("rekening-tujuan");
    const nominalInput = document.getElementById("topup-nominal").value;
    const nominalDisplay = document.getElementById("nominal-display");

    if (!index) {
      box.style.display = "none";
      nominalDisplay.textContent = "-";
      return;
    }

    const rekening = rekeningAktif[Number(index)];
    document.getElementById("rekening-bank").textContent = rekening.bank || "-";
    document.getElementById("rekening-nama").textContent = rekening.nama || "-";
    document.getElementById("rekening-nomor").textContent = rekening.nomor || "-";

    const total = Number(nominalInput) + kodeUnik;
    nominalDisplay.textContent = Number(nominalInput) >= 10000 ? formatRupiah(total) : "-";
    box.style.display = "block";
  };

  // Salin nomor rekening
  modal.querySelector("#rekening-nomor").addEventListener("click", () => {
    const text = document.getElementById("rekening-nomor").innerText;
    if (text && text !== "-") {
      navigator.clipboard.writeText(text);
      setMessage("📋 Nomor rekening disalin.");
    }
  });

  // Format total nominal (termasuk kode unik)
  modal.querySelector("#topup-nominal").addEventListener("input", e => {
    const val = e.target.value.trim();
    const total = Number(val) + kodeUnik;
    const nominalDisplay = document.getElementById("nominal-display");
    nominalDisplay.textContent = Number(val) >= 10000 ? formatRupiah(total) : "-";
  });

  modal.querySelector("#btn-batal").addEventListener("click", () => {
    document.body.removeChild(modal);
  });

  modal.querySelector("#btn-kirim").addEventListener("click", () => {
    kirimTopupRequest(user, rekeningAktif, modal, kodeUnik);
  });

  function setMessage(msg, isError = false) {
    const msgDiv = document.getElementById("modal-message");
    msgDiv.textContent = msg;
    msgDiv.style.color = isError ? "#e74c3c" : "#2ecc71";
  }

  function formatRupiah(angka) {
    if (!angka) return "-";
    let number_string = angka.toString().replace(/[^,\d]/g, "");
    let split = number_string.split(",");
    let sisa = split[0].length % 3;
    let rupiah = split[0].substr(0, sisa);
    let ribuan = split[0].substr(sisa).match(/\d{3}/gi);
    if (ribuan) {
      let separator = sisa ? "." : "";
      rupiah += separator + ribuan.join(".");
    }
    rupiah = split[1] !== undefined ? rupiah + "," + split[1] : rupiah;
    return "Rp" + rupiah;
  }
}



async function simpanJamLayanan() {
  const buka = document.getElementById("jam-buka").value;
  const tutup = document.getElementById("jam-tutup").value;
  const aktif = document.getElementById("status-layanan").value === "true";
  const mode = document.getElementById("mode-layanan").value;

  await firebase.firestore().collection("pengaturan").doc("jam_layanan").set({
    buka,
    tutup,
    aktif,
    mode
  });

  alert("✅ Jam layanan berhasil diperbarui.");
  loadContent("jam-layanan");
}

async function kirimTopupRequest(user, rekeningAktif, modal) {
  const db = firebase.firestore();
  const nominalInput = document.getElementById("topup-nominal");
  const metodeSelect = document.getElementById("topup-metode");
  const catatan = document.getElementById("topup-catatan").value.trim();
  const setMessage = (msg, error) => {
    const msgDiv = document.getElementById("modal-message");
    msgDiv.textContent = msg;
    msgDiv.style.color = error ? "#e74c3c" : "#2ecc71";
  };

  const nominal = Number(nominalInput.value.trim());
  const metodeIndex = metodeSelect.value;

  if (!nominal || nominal < 10000) {
    setMessage("❌ Nominal minimal Rp10.000", true);
    nominalInput.focus();
    return;
  }

  if (!metodeIndex || !rekeningAktif[metodeIndex]) {
    setMessage("❌ Pilih metode bank", true);
    metodeSelect.focus();
    return;
  }

  const rekeningDipilih = rekeningAktif[metodeIndex];
  const unik = Math.floor(Math.random() * 900) + 100;
  const total = nominal + unik;
  const expiredAt = Date.now() + 30 * 60 * 1000;

  const topupData = {
    userId: user.uid,
    jumlah: nominal,
    unik,
    total,
    metode: rekeningDipilih.bank,
    rekening: {
      nama: rekeningDipilih.nama,
      nomor: rekeningDipilih.nomor
    },
    catatan: catatan || "",
    status: "Menunggu",
    expiredAt,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    await db.collection("topup_request").add(topupData);
    setMessage("✅ Permintaan top up berhasil dikirim.");
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 1200);
  } catch (err) {
    console.error("Gagal kirim topup:", err);
    setMessage("❌ Gagal mengirim permintaan. Coba lagi.", true);
  }
}


// ✅ Konfirmasi Topup
async function konfirmasiTopup(docId, uid, nominal) {
  const db = firebase.firestore();
  const userRef = db.collection("users").doc(uid);
  const topupRef = db.collection("topup_request").doc(docId);

  const userSnap = await userRef.get();
  const topupSnap = await topupRef.get();

  if (!userSnap.exists) return alert("❌ User tidak ditemukan.");
  if (!topupSnap.exists) return alert("❌ Permintaan topup tidak ditemukan.");

  const topupData = topupSnap.data();
  if (topupData.status !== "Menunggu") return alert("❌ Permintaan sudah diproses.");

  // Tambah saldo
  const saldoLama = parseInt(userSnap.data().saldo || 0);
  const saldoBaru = saldoLama + nominal;

  try {
    await userRef.update({ saldo: saldoBaru });
    await topupRef.update({ status: "Selesai" });

    alert("✅ Deposit berhasil dikonfirmasi.");
    loadContent("permintaan-deposit");
  } catch (err) {
    console.error("❌ Gagal konfirmasi:", err);
    alert("❌ Gagal konfirmasi topup.");
  }
}

// ❌ Tolak Topup
async function tolakTopup(docId) {
  const topupRef = firebase.firestore().collection("topup_request").doc(docId);
  const snap = await topupRef.get();
  if (!snap.exists) return alert("❌ Data tidak ditemukan.");

  const data = snap.data();
  if (data.status !== "Menunggu") return alert("❌ Permintaan sudah diproses.");

  try {
    await topupRef.update({ status: "Dibatalkan" });
    alert("❌ Permintaan deposit ditolak.");
    loadContent("permintaan-deposit");
  } catch (err) {
    console.error("❌ Gagal menolak:", err);
    alert("❌ Gagal menolak permintaan.");
  }
}


async function konfirmasiWithdraw(docId, uid, nominal) {
  const db = firebase.firestore();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    alert("❌ User tidak ditemukan.");
    return;
  }

  const saldoLama = parseInt(userSnap.data().saldo || 0);
  if (saldoLama < nominal) {
    alert("❌ Saldo tidak cukup.");
    return;
  }

  await userRef.update({ saldo: saldoLama - nominal });

  await db.collection("withdraw_request").doc(docId).update({
    status: "Selesai",
    approvedBy: firebase.auth().currentUser.uid,
    approvedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("✅ Withdraw dikonfirmasi.");
  loadContent("permintaan-withdraw");
}

async function tolakWithdraw(docId) {
  await firebase.firestore().collection("withdraw_request").doc(docId).update({
    status: "Dibatalkan",
    rejectedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("❌ Withdraw ditolak.");
  loadContent("permintaan-withdraw");
}



function toggleDropdown(button) {
  // Tutup semua dropdown yang lain
  document.querySelectorAll(".dropdown-menu").forEach(menu => {
    if (menu !== button.nextElementSibling) menu.style.display = "none";
  });

  const menu = button.nextElementSibling;
  const visible = menu.style.display === "block";
  menu.style.display = visible ? "none" : "block";
}

// Tutup dropdown saat klik di luar
document.addEventListener("click", function (e) {
  if (!e.target.closest(".dropdown-container")) {
    document.querySelectorAll(".dropdown-menu").forEach(menu => {
      menu.style.display = "none";
    });
  }
});


function gantiRole(uid, currentRole = '') {
  const pilihan = ['user', 'driver', 'admin'];
  const selectOptions = pilihan.map(role => {
    const selected = role === currentRole.toLowerCase() ? 'selected' : '';
    return `<option value="${role}" ${selected}>${role.charAt(0).toUpperCase() + role.slice(1)}</option>`;
  }).join('');

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🔁 Ganti Role Pengguna</h3>
      <select id="select-role" style="margin: 12px 0; padding: 8px 12px; width: 100%; font-size: 14px;">
        ${selectOptions}
      </select>
      <div style="display: flex; justify-content: space-between; gap: 10px;">
        <button class="btn-mini" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Batal</button>
        <button class="btn-mini" onclick="konfirmasiGantiRole('${uid}')">Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function konfirmasiGantiRole(uid) {
  const newRole = document.getElementById("select-role").value;
  const db = firebase.firestore();
  await db.collection("users").doc(uid).update({ role: newRole });
  alert("✅ Role berhasil diperbarui ke: " + newRole);
  document.querySelector(".modal-overlay").remove();
  loadContent("users-management"); // refresh halaman
}


function resetPin(uid) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>🔐 Reset PIN</h3>
      <input id="new-pin" type="text" maxlength="6" placeholder="PIN Baru (6 digit)" style="width:100%;padding:8px 10px;margin:10px 0;" />
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <button class="btn-mini" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Batal</button>
        <button class="btn-mini" onclick="konfirmasiResetPin('${uid}')">Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function konfirmasiResetPin(uid) {
  const pinBaru = document.getElementById("new-pin").value.trim();

  if (!/^\d{6}$/.test(pinBaru)) {
    alert("❌ PIN harus 6 digit angka.");
    return;
  }

  const db = firebase.firestore();
  await db.collection("users").doc(uid).update({ pin: pinBaru });

  alert("✅ PIN berhasil direset ke: " + pinBaru);
  document.querySelector(".modal-overlay").remove();
  loadContent("users-management"); // Refresh halaman
}


function transferSaldo(uid) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-box">
      <h3>💰 Transfer Saldo ke User</h3>
      <input id="jumlah-saldo" type="number" placeholder="Nominal (Rp)" style="width:100%;padding:8px 10px;margin:8px 0;" />
      <input id="catatan-saldo" type="text" placeholder="Catatan (Opsional)" style="width:100%;padding:8px 10px;margin-bottom:10px;" />
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <button class="btn-mini" onclick="document.body.removeChild(this.closest('.modal-overlay'))">Batal</button>
        <button class="btn-mini" onclick="konfirmasiTransferSaldo('${uid}')">Transfer</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

async function konfirmasiTransferSaldo(uid) {
  const jumlah = parseInt(document.getElementById("jumlah-saldo").value);
  const catatan = document.getElementById("catatan-saldo").value || "-";

  if (isNaN(jumlah) || jumlah <= 0) {
    alert("❌ Nominal tidak valid.");
    return;
  }

  const db = firebase.firestore();
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    alert("❌ Pengguna tidak ditemukan.");
    return;
  }

  const data = userDoc.data();
  const saldoLama = parseInt(data.saldo || 0);
  const saldoBaru = saldoLama + jumlah;

  await userRef.update({ saldo: saldoBaru });

  // Tambah ke log transaksi (opsional)
  await db.collection("transaksi_admin").add({
    userId: uid,
    jumlah,
    catatan,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("✅ Saldo berhasil ditransfer.");
  document.querySelector(".modal-overlay").remove();
  loadContent("users-management"); // refresh
}


function toggleStatus(uid) {
  alert("Suspend/Aktifkan/Banned UID: " + uid);
}

function lihatRiwayat(uid) {
  alert("Menampilkan riwayat transaksi UID: " + uid);
}


async function simpanPINBaru() {
  const pinLama = document.getElementById("pin-lama").value.trim();
  const pinBaru = document.getElementById("pin-baru").value.trim();
  const pinBaru2 = document.getElementById("pin-baru2").value.trim();

  // Validasi input dasar
  if (!pinLama || !pinBaru || !pinBaru2) {
    alert("⚠️ Semua field PIN wajib diisi.");
    return;
  }

  if (pinLama.length !== 6 || pinBaru.length !== 6 || pinBaru2.length !== 6 || isNaN(pinLama) || isNaN(pinBaru) || isNaN(pinBaru2)) {
    alert("⚠️ PIN harus 6 digit angka.");
    return;
  }

  if (pinBaru !== pinBaru2) {
    alert("❌ PIN baru tidak cocok.");
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    alert("⚠️ Silakan login ulang.");
    return;
  }

  const db = firebase.firestore();
  const userDocRef = db.collection("users").doc(user.uid);
  const doc = await userDocRef.get({ source: "server" });

  if (!doc.exists) {
    alert("❌ Data pengguna tidak ditemukan.");
    return;
  }

  const data = doc.data();
  const pinTersimpan = Number(data.pin || 0);
  const pinLamaInput = Number(pinLama);

  if (pinTersimpan !== pinLamaInput) {
    alert("❌ PIN lama salah.");
    return;
  }

  await userDocRef.update({ pin: Number(pinBaru) });

  alert("✅ PIN berhasil diperbarui.");
  loadContent("user");
}




function handleKlikCheckout() {
  prosesCheckout(); // langsung proses, tidak pakai PIN
}





async function renderDetailRiwayat(item) {
  const container = document.getElementById("riwayat-detail-container");
  if (!container) return;

  const now = Date.now();
  const db = firebase.firestore();

  // Ambil stepsLog terbaru dari Firestore
  let stepsLog = [];
  try {
    const doc = await db.collection("pesanan").doc(item.id).get();
    if (doc.exists) {
      const data = doc.data();
      stepsLog = Array.isArray(data.stepsLog) ? data.stepsLog : [];
    }
  } catch (err) {
    console.error("❌ Gagal mengambil data stepsLog dari Firestore:", err);
  }

  const waktuSelesaiFormatted = item.waktuSelesai
    ? new Date(item.waktuSelesai).toLocaleString("id-ID", {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : "-";

  const statusClass = {
    Berhasil: "status-selesai",
    Diproses: "status-proses",
    Dibatalkan: "status-batal",
    "Menunggu Pembayaran": "status-menunggu"
  }[item.status] || "status-unknown";

  let html = `
    <div class="riwayat-detail">
      <h3>Status: <span class="status-text ${statusClass}">${item.status}</span></h3>
      <p>🕐 Selesai pada: ${waktuSelesaiFormatted}</p>
      <h4>📋 Timeline Pengiriman:</h4>
      <ul class="timeline-log">
  `;

  const visibleSteps = stepsLog.filter(step => step.timestamp <= now);

  if (visibleSteps.length > 0) {
    visibleSteps.forEach(step => {
      const stepTime = new Date(step.timestamp).toLocaleTimeString("id-ID", {
        hour: '2-digit',
        minute: '2-digit'
      });
      html += `<li><strong>${stepTime}</strong> - ${step.label}</li>`;
    });
  } else {
    html += `<li><em>Belum ada log berjalan.</em></li>`;
  }

  html += `</ul></div>`;
  container.innerHTML = html;
}





async function renderRiwayat() {
  const list = document.getElementById("riwayat-list");
  if (!list) return;

  list.innerHTML = `<p>Memuat riwayat...</p>`;

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) return;

  let riwayat = [];
  try {
    const snapshot = await db.collection("pesanan")
      .where("userId", "==", user.uid)
      .orderBy("waktuPesan", "desc")
      .get();

    riwayat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching pesanan:", error);
    list.innerHTML = `<p class="riwayat-kosong">Gagal memuat riwayat pesanan.</p>`;
    return;
  }

  const driverSnapshot = await db.collection("pesanan_driver").get();
  const mapDriverByPesanan = {};
  driverSnapshot.forEach(doc => {
    const data = doc.data();
    if (data?.idPesanan && data?.idDriver) {
      mapDriverByPesanan[data.idPesanan] = data.idDriver;
    }
  });

  const userDoc = await db.collection("users").doc(user.uid).get();
  const namaCustomer = userDoc.exists ? userDoc.data().nama || "Anda" : "Anda";

  const now = Date.now();
  list.innerHTML = "";

  if (riwayat.length === 0) {
    list.innerHTML = `<p class="riwayat-kosong">Belum ada pesanan sebelumnya.</p>`;
    return;
  }

  for (let i = 0; i < riwayat.length; i++) {
    const item = riwayat[i];
    const waktuPesan = new Date(item.waktuPesan || now);
    const waktuFormatted = waktuPesan.toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit"
    });

    const statusClass = {
      Pending: "status-menunggu-pesanan",
      Menunggu_Pembayaran: "status-pending",
      Diproses: "status-diproses",
      Selesai: "status-pesanan-diterima",
      Berhasil: "status-pesanan-diterima",
      Dibatalkan: "status-dibatalkan",
      Menuju_Resto: "status-menuju-resto",
      Menunggu_Pesanan: "status-menunggu-pesanan",
      Pickup_Pesanan: "status-pickup-pesanan",
      Menuju_Customer: "status-menuju-customer",
      Pesanan_Diterima: "status-pesanan-diterima"
    }[item.status.replace(/\s/g, "_")] || "status-pending";

    const stepLog = Array.isArray(item.stepsLog) ? item.stepsLog : [];
    const historyList = stepLog.length > 0
      ? stepLog.map(log => `🕒 ${log.status || log.label || JSON.stringify(log)}<br>`).join("")
      : `<i>Belum ada langkah berjalan</i>`;

    const produkList = (item.produk || []).map(p => `
      <div class="riwayat-item-produk">
        <img src="${p.gambar || "https://via.placeholder.com/60"}" alt="${p.nama}" class="riwayat-item-img" />
        <div class="riwayat-item-info">
          <div class="riwayat-item-nama">${p.nama}</div>
          <div class="riwayat-item-jumlah">Jumlah: x${p.jumlah}</div>
          <div class="riwayat-item-harga">Total: Rp${(p.harga * p.jumlah).toLocaleString()}</div>
        </div>
      </div>
    `).join("");

    const idDriver = mapDriverByPesanan[item.id] || null;
    let namaDriver = "-";
    if (idDriver) {
      try {
        const driverDoc = await db.collection("driver").doc(idDriver).get();
        if (driverDoc.exists) {
          namaDriver = driverDoc.data().nama || "-";
        }
      } catch (e) {
        console.warn("Gagal mengambil nama driver:", e.message);
      }
    }

    const waktuSelesai = new Date(item.waktuPesan).getTime();
    const selisihWaktu = now - waktuSelesai;

    let showTombolChat = !((item.status === "Selesai" || item.status === "Berhasil") && selisihWaktu > 10 * 60 * 1000);

    const tombolChatLaporkan = (idDriver && showTombolChat) ? `
      <div class="riwayat-chat-actions" style="display: flex; gap: 8px; margin-top: 10px;">
        <button class="btn-chat-driver" onclick="renderChatCustomer({ 
          idPesanan: '${item.id}', 
          idDriver: '${idDriver}', 
          idCustomer: '${item.userId}',
          namaDriver: '${namaDriver}',
          namaCustomer: '${namaCustomer}'
        })">💬 Chat Driver</button>

        <button class="btn-laporkan-driver" onclick="laporkanDriver('${item.id}', '${idDriver}')">⚠️ Laporkan Driver</button>
      </div>
    ` : "";

    const tombolBeriRating = ((item.status === "Selesai" || item.status === "Berhasil") &&
      selisihWaktu > 10 * 60 * 1000 &&
      !item.ratingDiberikan) ? `
      <div class="riwayat-rating" style="margin-top:10px;">
        <button onclick="formRatingRestoDriver('${item.id}')" class="btn-rating-resto">🌟 Beri Rating</button>
      </div>
    ` : "";

    const box = document.createElement("div");
    box.className = "riwayat-box";
    box.innerHTML = `
      <div class="riwayat-header">
        <h4 class="riwayat-id">🆔 ${item.id}</h4>
        <span class="riwayat-status ${statusClass}">${item.status}</span>
      </div>
      <div class="riwayat-produk-list">${produkList}</div>
      <p class="riwayat-subtotal"><strong>Subtotal:</strong> Rp${item.total?.toLocaleString() || 0}</p>
      <p class="riwayat-metode"><strong>Metode Pembayaran:</strong> ${item.metode?.toUpperCase() || "-"}</p>
      <p class="riwayat-tanggal"><small>Waktu Pesan: ${waktuFormatted}</small></p>

      <div class="riwayat-btn-group">
        <button class="btn-lihat-detail" onclick="toggleDetail(${i})">Lihat Detail</button>
      </div>

      ${tombolChatLaporkan}
      ${tombolBeriRating}

      <div class="riwayat-detail" id="detail-${i}" style="display: none;">
        <p><strong>History Waktu:</strong></p>
        <ul class="riwayat-steps">${historyList}</ul>
      </div>
    `;

    list.appendChild(box);
  }
}


function toggleDetail(index) {
  const el = document.getElementById(`detail-${index}`);
  if (!el) return;
  const isHidden = el.style.display === "none" || el.style.display === "";
  document.querySelectorAll(".riwayat-detail").forEach(detail => detail.style.display = "none");
  if (isHidden) el.style.display = "block";
}




function filterProduk() {
  const keyword = document.getElementById("search-input").value.trim().toLowerCase();
  const kategori = document.getElementById("filter-kategori").value;
  const produkContainer = document.getElementById("produk-container");

  produkContainer.innerHTML = "";

  const now = new Date();
  const jamSekarang = now.getHours();
  const deliveryAktif = jamSekarang >= 8 && jamSekarang < 24;

  const hasilFilter = produkData.filter(produk => {
    const cocokKeyword =
      produk.nama.toLowerCase().includes(keyword) ||
      produk.toko.toLowerCase().includes(keyword);

    const cocokKategori =
      kategori === "all" ||
      (kategori === "open" && jamSekarang >= produk.buka && jamSekarang < produk.tutup) ||
      produk.kategori.toLowerCase() === kategori;

    return cocokKeyword && cocokKategori;
  });

  if (hasilFilter.length === 0) {
    produkContainer.innerHTML = "<p style='padding: 1rem; color: #999;'>Produk tidak ditemukan.</p>";
    return;
  }

  hasilFilter.forEach((produk, index) => {
    const tokoBuka = jamSekarang >= produk.buka && jamSekarang < produk.tutup;
    const tombolAktif = tokoBuka && deliveryAktif;

    const productCard = `
      <div class="produk-horizontal">
        <div class="produk-toko-bar" onclick="renderTokoPage('${produk.toko.replace(/'/g, "\\'")}')">
          <i class="fa-solid fa-shop"></i>
          <span class="produk-toko-nama">${produk.toko}</span>
          <span class="produk-toko-arrow">›</span>
        </div>
        <div class="produk-body">
          <img src="${produk.gambar}" alt="${produk.nama}" class="produk-img" />
          <div class="produk-info">
            <h3 class="produk-nama">${produk.nama}</h3>
            <p class="produk-meta">Kategori: ${produk.kategori}</p>
            <p class="produk-meta">⭐ ${produk.rating} | ${produk.jarak} | ${produk.estimasi}</p>
            <div class="produk-action">
              <strong>Rp ${produk.harga.toLocaleString()}</strong>
              <button class="beli-btn"
                      data-index="${produkData.indexOf(produk)}"
                      ${tombolAktif ? '' : 'disabled'}>
                ${tombolAktif 
                  ? 'Tambah ke Keranjang' 
                  : (!deliveryAktif ? 'Delivery Tutup' : 'Toko Tutup')}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    produkContainer.innerHTML += productCard;
  });

  // Event handler tombol beli
  document.querySelectorAll('.beli-btn').forEach(button => {
    if (!button.disabled) {
      const index = button.getAttribute('data-index');
      button.addEventListener('click', () => tambahKeKeranjang(produkData[index]));
    }
  });
}



async function renderTokoPage(namaToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = "<p>Memuat halaman toko...</p>";

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;

  if (!user) {
    container.innerHTML = "<p>Silakan login terlebih dahulu.</p>";
    return;
  }

  try {
    // Ambil lokasi user
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      container.innerHTML = "<p>Koordinat pengguna tidak ditemukan.</p>";
      return;
    }
    const lokasiUser = alamatDoc.data().lokasi;
    const lat1 = lokasiUser.latitude;
    const lon1 = lokasiUser.longitude;

    // Ambil data toko berdasar namaToko
    const tokoSnapshot = await db.collection("toko")
      .where("namaToko", "==", namaToko)
      .limit(1)
      .get();

    if (tokoSnapshot.empty) {
      container.innerHTML = "<p>Toko tidak ditemukan.</p>";
      return;
    }

    const tokoDoc = tokoSnapshot.docs[0];
    const toko = tokoDoc.data();
    const idToko = tokoDoc.id;

    // Ambil semua toko untuk map
    const tokoAllSnapshot = await db.collection("toko").get();
    const tokoMap = {};
    tokoAllSnapshot.docs.forEach(doc => {
      const data = doc.data();
      let geo = { lat: 0, lng: 0 };
      if (data.koordinat instanceof firebase.firestore.GeoPoint) {
        geo = { lat: data.koordinat.latitude, lng: data.koordinat.longitude };
      }
      tokoMap[doc.id] = {
        namaToko: data.namaToko || 'Unknown Toko',
        buka: typeof data.jamBuka === 'number' ? data.jamBuka : 0,
        tutup: typeof data.jamTutup === 'number' ? data.jamTutup : 0,
        isOpen: data.isOpen ?? false,
        koordinat: geo
      };
    });

    // Ambil semua produk, lalu filter berdasarkan idToko toko yang dicari
    const produkSnapshot = await db.collection("produk").get();
    const produkList = produkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const produkToko = produkList.filter(p => p.idToko === idToko);

    // Gabungkan data produk dengan info toko dan hitung jarak
    const produkGabung = produkToko.map(produk => {
      const tokoInfo = tokoMap[produk.idToko] || {
        namaToko: 'Unknown Toko',
        buka: 0,
        tutup: 0,
        isOpen: false,
        koordinat: { lat: 0, lng: 0 }
      };

      const lat2 = tokoInfo.koordinat.lat;
      const lon2 = tokoInfo.koordinat.lng;
      const jarakKm = (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2) && lat2 !== 0)
        ? hitungJarak(lat1, lon1, lat2, lon2)
        : 0;

      return {
        ...produk,
        tokoNama: tokoInfo.namaToko,
        buka: tokoInfo.buka,
        tutup: tokoInfo.tutup,
        isOpen: tokoInfo.isOpen,
        jarak: jarakKm ? `${jarakKm.toFixed(2)} km` : 'N/A'
      };
    });

    // Urutkan produk berdasarkan rating tertinggi
    const produkUrut = [...produkGabung].sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0));

    // Header toko
    const gambarToko = toko.foto || './img/toko-pict.png';
    const jarakToko = hitungJarak(lat1, lon1, toko.koordinat.latitude, toko.koordinat.longitude);

    let html = `
      <div class="toko-page">
        <div class="toko-header">
  <img src="${gambarToko}" alt="${toko.namaToko}" class="toko-foto" />
  <div class="toko-detail">
    <h2>${toko.namaToko}</h2>
    <p class="toko-deskripsi">${toko.deskripsiToko || ''}</p>
    <div class="toko-lokasi">📍 ${toko.alamatToko || '-'}</div>
  </div>
</div>


        <hr class="toko-separator" />
        <h2 class="produk-judul">🍽️ Daftar Produk</h2>
        <div id="produk-container">
    `;

    if (produkUrut.length === 0) {
      html += `<p>Belum ada produk di toko ini.</p>`;
    } else {
      const now = new Date();
      const jamSekarang = now.getHours();
      const deliveryAktif = jamSekarang >= 8 && jamSekarang < 20;

      produkUrut.forEach((produk, index) => {
        const tokoAktif = produk.isOpen;
        const stokHabis = (produk.stok || 0) <= 0;
        const disabledAttr = !tokoAktif || stokHabis ? 'disabled' : '';
        let btnText = 'Lihat Detail';

        if (!tokoAktif) btnText = 'Toko Tutup';
        else if (stokHabis) btnText = 'Stok Habis';

        const tokoSafe = (produk.tokoNama || '').replace(/'/g, "\\'");
        const gambarProduk = produk.urlGambar || './img/toko-pict.png';

        html += `
          <div class="produk-horizontal">
            <div class="produk-toko-bar" onclick="renderTokoPage('${tokoSafe}')">
              <i class="fa-solid fa-shop"></i>
              <span class="produk-toko-nama">${produk.tokoNama}</span>
              <span class="produk-toko-arrow">›</span>
            </div>
            <div class="produk-body">
              <img src="${gambarProduk}" alt="${produk.namaProduk || produk.nama}" class="produk-img" />
              <div class="produk-info">
                <h3 class="produk-nama">${produk.namaProduk || produk.nama}</h3>
                <p class="produk-meta">Kategori: ${produk.kategori || '-'}</p>
                <p class="produk-meta">⭐ ${produk.rating || '-'} | ${produk.jarak} | ${produk.estimasi || '-'}</p>
                <div class="produk-action">
                  <strong>Rp ${Number(produk.harga || 0).toLocaleString()}</strong>
                  <button class="beli-btn" data-index="${index}" ${disabledAttr}>
                    ${btnText}
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;

    // Pasang event listener tombol beli yang aktif
    document.querySelectorAll('.beli-btn').forEach(button => {
      if (!button.disabled) {
        button.addEventListener('click', () => {
          const index = button.getAttribute('data-index');
          tampilkanPopupDetail(produkUrut[index]);
        });
      }
    });

  } catch (err) {
    console.error("❌ Gagal memuat toko:", err);
    container.innerHTML = `<p style="color:red;">Terjadi kesalahan saat memuat halaman toko. Error: ${err.message}</p>`;
  }
}


async function prosesCheckout() {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");
  const uid = user.uid;
  const db = firebase.firestore();

  const metodePembayaran = document.getElementById("metode-pembayaran")?.value || "saldo";

  // Ambil alamat
  const alamatDoc = await db.collection("alamat").doc(uid).get();
  if (!alamatDoc.exists) return alert("❌ Alamat belum tersedia.");
  const { nama, noHp, alamat, lokasi } = alamatDoc.data() || {};

  // Ambil keranjang
  const keranjangDoc = await db.collection("keranjang").doc(uid).get();
  const produk = keranjangDoc.exists ? keranjangDoc.data().items || [] : [];
  if (produk.length === 0) return alert("❌ Keranjang kosong.");

  // Hitung total estimasi dan harga
  const estimasiTotalMenit = produk.reduce((t, i) => t + (parseInt(i.estimasi) || 10), 0);
  const subtotalProduk = produk.reduce((t, i) => t + (i.harga * i.jumlah), 0);
  const totalOngkir = [...new Set(produk.map(p => p.idToko))].reduce((sum, idToko) => {
    const item = produk.find(p => p.idToko === idToko);
    return sum + (item?.ongkir || 0);
  }, 0);

  // Validasi Voucher
  let kodeVoucher = null;
  let potongan = 0;
  const voucher = window.voucherTerpakai;

  if (voucher?.kode && voucher.potongan) {
    if (voucher.digunakanOleh?.includes(uid)) {
      return alert("❌ Voucher ini sudah pernah digunakan.");
    }

    const nowTime = new Date();
    if (voucher.expired?.toDate?.() && nowTime > voucher.expired.toDate()) {
      return alert("❌ Voucher sudah expired.");
    }

    if (voucher.kuota <= 0) {
      return alert("❌ Kuota voucher sudah habis.");
    }

    if (subtotalProduk < voucher.minimal) {
      return alert(`❌ Minimal order Rp${voucher.minimal.toLocaleString()} untuk menggunakan voucher ini.`);
    }

    kodeVoucher = voucher.kode;
    if (voucher.tipe === "persen") {
      potongan = Math.round(subtotalProduk * (parseFloat(voucher.potongan) / 100));
    } else {
      potongan = parseInt(voucher.potongan);
    }

    if (potongan > subtotalProduk) potongan = subtotalProduk;
  }

  const biayaLayanan = Math.round((subtotalProduk + totalOngkir - potongan) * 0.01);
  const totalBayar = subtotalProduk + totalOngkir + biayaLayanan - potongan;
  if (totalBayar <= 0) return alert("❌ Total bayar tidak valid.");

  const metodePengiriman = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  const catatanPesanan = document.getElementById("catatan-pesanan")?.value.trim() || "-";

  // Validasi saldo jika metode = saldo
  if (metodePembayaran === "saldo") {
    const userDoc = await db.collection("users").doc(uid).get();
    const saldo = userDoc.exists ? userDoc.data().saldo || 0 : 0;
    if (saldo < totalBayar) {
      return alert(`❌ Saldo tidak cukup. Saldo kamu: Rp ${saldo.toLocaleString()}`);
    }
  }

  // Persiapan ID pesanan
  const now = Date.now();
  const today = new Date();
  const random = Math.floor(Math.random() * 100000);
  const idPesanan = `ORD-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${random}`;
  const waktuTiba = new Date(now + estimasiTotalMenit * 60000);
  const waktuPesanStr = new Date(now).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
  const stepsLog = [`${waktuPesanStr} Pesanan dibuat (Pending)`];

  // Hitung Jarak
  const geoPointToLatLng = geo => {
    if (!geo) return null;
    return geo.latitude !== undefined ? { lat: geo.latitude, lng: geo.longitude } : geo;
  };

  const hitungJarakKM = (a, b) => {
    a = geoPointToLatLng(a); b = geoPointToLatLng(b);
    if (!a || !b) return Infinity;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const x = Math.sin(dLat / 2) ** 2 +
      Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 10) / 10;
  };

  // Ambil lokasi toko utama
  const idTokoUtama = produk[0].idToko;
  const tokoDoc = await db.collection("toko").doc(idTokoUtama).get();
  const lokasiToko = tokoDoc.exists ? tokoDoc.data().koordinat : null;
  if (!lokasiToko) return alert("❌ Lokasi toko belum tersedia.");

  const jarakTokoKeUser = hitungJarakKM(lokasiToko, lokasi);
  if (jarakTokoKeUser > 20) return alert("❌ Layanan tidak tersedia di lokasi Anda.");

  // Cari Driver
  const driverSnap = await db.collection("driver").get();
  let nearestDriver = null;
  let minJarak = Infinity;

  for (const doc of driverSnap.docs) {
    const driver = doc.data();
    if (driver.status !== "aktif" || !driver.lokasi) continue;

    const jarakDriverKeUser = hitungJarakKM(driver.lokasi, lokasi);
    if (jarakDriverKeUser > 20) continue;

    const pesananAktifSnap = await db.collection("pesanan_driver")
      .where("idDriver", "==", doc.id)
      .where("status", "in", ["Pickup Pesanan", "Menuju Customer"])
      .get();

    const langgananAktif = driver.multiOrderAktif === true &&
      driver.multiOrderExpired?.toDate?.() instanceof Date &&
      driver.multiOrderExpired.toDate() > new Date();

    if (!pesananAktifSnap.empty && !langgananAktif) continue;

    if (!pesananAktifSnap.empty && langgananAktif) {
      let cocok = false;
      for (const p of pesananAktifSnap.docs) {
        const lokasiTokoLama = p.data().lokasiToko;
        const jarak = hitungJarakKM(lokasiTokoLama, lokasiToko);
        if (jarak <= 1) {
          cocok = true;
          break;
        }
      }
      if (!cocok) continue;
    }

    const jarak = hitungJarakKM(driver.lokasi, lokasiToko);
    if (jarak < minJarak) {
      nearestDriver = { id: doc.id, lokasi: driver.lokasi };
      minJarak = jarak;
    }
  }

  if (!nearestDriver) return alert("❌ Tidak ada driver aktif & cocok saat ini.");

  // Simpan ke pesanan
  const wa = noHp.startsWith("08") ? "628" + noHp.slice(2) : noHp;

  const dataPesanan = {
    id: idPesanan,
    userId: uid,
    nama,
    noHp: wa,
    alamat,
    lokasi,
    produk,
    catatan: catatanPesanan,
    metode: metodePembayaran,
    pengiriman: metodePengiriman,
    estimasiMenit: estimasiTotalMenit,
    status: "Pending",
    stepsLog,
    waktuPesan: now,
    waktuTiba: waktuTiba.getTime(),
    subtotalProduk,
    totalOngkir,
    biayaLayanan,
    potongan,
    total: totalBayar,
    kodeVoucher: kodeVoucher || null,
    sudahDiprosesPembayaran: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("pesanan").doc(idPesanan).set(dataPesanan);
  await db.collection("keranjang").doc(uid).delete();

  // Simpan ke pesanan_driver
  await db.collection("pesanan_driver").doc(idPesanan).set({
    idDriver: nearestDriver.id,
    idPesanan,
    status: "Menunggu Ambil",
    waktuAmbil: null,
    produk,
    lokasiDriver: nearestDriver.lokasi,
    lokasiToko,
    lokasiCustomer: lokasi,
    jarakDriverKeToko: hitungJarakKM(nearestDriver.lokasi, lokasiToko),
    jarakTokoKeCustomer: hitungJarakKM(lokasiToko, lokasi),
    metode: metodePembayaran,
    total: totalBayar,
    totalOngkir,
    biayaLayanan,
    catatan: catatanPesanan,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Simpan ke pesanan_penjual per toko
  for (const item of produk) {
    await db.collection("pesanan_penjual").add({
      idPesanan,
      idToko: item.idToko,
      metode: metodePembayaran,
      namaPembeli: nama,
      noHpPembeli: wa,
      pengiriman: metodePengiriman,
      ongkir: item.ongkir || 0,
      catatan: catatanPesanan,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // Update Voucher
  if (voucher?.id) {
    await db.collection("voucher").doc(voucher.id).update({
      kuota: firebase.firestore.FieldValue.increment(-1),
      digunakanOleh: firebase.firestore.FieldValue.arrayUnion(uid)
    });
  }

  // Reset UI Voucher
  window.voucherTerpakai = null;
  const voucherInput = document.getElementById("voucher");
  if (voucherInput) voucherInput.value = "";
  const voucherFeedback = document.getElementById("voucher-feedback");
  if (voucherFeedback) voucherFeedback.innerText = "";

  // Update UI Pembayaran
  if (document.getElementById("rincian-subtotal")) {
    document.getElementById("rincian-subtotal").innerText = `Rp ${subtotalProduk.toLocaleString()}`;
    document.getElementById("rincian-ongkir").innerText = `Rp ${totalOngkir.toLocaleString()}`;
    document.querySelector(".biaya-layanan span:last-child").innerText = `Rp ${biayaLayanan.toLocaleString()}`;
    document.getElementById("rincian-diskon").innerText = `- Rp ${potongan.toLocaleString()}`;
  }

  if (document.getElementById("footer-total")) {
    document.getElementById("footer-total").innerText = totalBayar.toLocaleString();
    document.getElementById("footer-diskon").innerText = potongan.toLocaleString();
  }

  alert("✅ Pesanan berhasil dibuat dan driver ditugaskan!");
  renderCheckoutItems();
  if (document.getElementById("riwayat-list")) renderRiwayat();
  loadContent(metodePembayaran);
}






// === Daftar Voucher ===
const voucherList = {
  "VLCRAVE": 0.10,
  "ONGKIR20": 0.20
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

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam kilometer
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
    Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance; // dalam kilometer
}


// === Hitung Ongkir ===
function hitungOngkirDenganTipe(tipe, jarak = 0) {
  let ongkir = 8000;
  if (jarak > 2) ongkir += Math.ceil(jarak - 2) * 1500;
  if (tipe === "priority") ongkir += 3500;
  return ongkir;
}



// === Hitung ongkir dari pilihan radio
function hitungOngkir() {
  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  return hitungOngkirDenganTipe(metode);
}


// === Update Jumlah Produk di Keranjang ===
async function updateJumlah(namaProduk, change) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login dulu.");

  const db = firebase.firestore();
  const keranjangRef = db.collection("keranjang").doc(user.uid);

  try {
    const snap = await keranjangRef.get();
    let items = snap.exists ? snap.data().items || [] : [];

    const index = items.findIndex(item => item.nama === namaProduk);
    if (index === -1) return;

    items[index].jumlah += change;

    // Tambahkan log perubahan
    items[index].stepslog = items[index].stepslog || [];
    items[index].stepslog.push({
      waktu: new Date().toISOString(),
      pesan: `Jumlah diubah menjadi ${items[index].jumlah}`
    });

    if (items[index].jumlah <= 0) {
      items.splice(index, 1); // Hapus jika 0
    }

    await keranjangRef.set({ items }, { merge: true });

    if (typeof renderCheckoutItems === "function") renderCheckoutItems();
    if (typeof updateCartBadge === "function") updateCartBadge();
  } catch (error) {
    console.error("❌ Gagal update jumlah:", error.message);
  }
}


// === Render daftar item checkout dan update total ===
async function renderCheckoutItems() {
  const listEl = document.getElementById("cart-items-list");
  const totalEl = document.getElementById("total-checkout");
  const footerTotalEl = document.getElementById("footer-total");
  const footerDiskonEl = document.getElementById("footer-diskon");
  const elSubtotal = document.getElementById("rincian-subtotal");
  const elOngkir = document.getElementById("rincian-ongkir");
  const elDiskon = document.getElementById("rincian-diskon");
  const elLayanan = document.querySelector(".rincian-item.biaya-layanan span:last-child");

  const user = firebase.auth().currentUser;
  if (!user || !listEl || !totalEl) return;

  const db = firebase.firestore();
  const doc = await db.collection("keranjang").doc(user.uid).get();
  const cart = doc.exists ? (doc.data().items || []) : [];

  if (cart.length === 0) {
    listEl.innerHTML = "<p style='text-align:center;'>🛒 Keranjang kosong.</p>";
    ['standard', 'priority'].forEach(mode => {
      document.getElementById(`jarak-${mode}`).textContent = "Jarak: -";
      document.getElementById(`ongkir-${mode}`).textContent = "-";
      document.getElementById(`estimasi-${mode}`).textContent = "Estimasi: -";
    });
    footerTotalEl.textContent = "0";
    footerDiskonEl.textContent = "0";
    elSubtotal.textContent = "Rp 0";
    elOngkir.textContent = "Rp 0";
    elDiskon.textContent = "- Rp 0";
    if (elLayanan) elLayanan.textContent = "Rp 0";
    return;
  }

  // Ambil nama toko jika tidak tersedia
  const tokoCache = {};
  for (const item of cart) {
    if (!item.toko && item.idToko && !tokoCache[item.idToko]) {
      const tokoDoc = await db.collection("toko").doc(item.idToko).get();
      tokoCache[item.idToko] = tokoDoc.exists ? tokoDoc.data().namaToko || item.idToko : item.idToko;
    }
  }

  // Group by toko
  const grupToko = {};
  cart.forEach(item => {
    const namaToko = item.toko || tokoCache[item.idToko] || "Toko Tidak Diketahui";
    if (!grupToko[namaToko]) grupToko[namaToko] = [];
    grupToko[namaToko].push(item);
  });

  // Render pesanan
  listEl.innerHTML = "";
  let subtotal = 0;
  let totalOngkir = 0;
  const tokoUnik = new Set();

  for (const namaToko in grupToko) {
    listEl.innerHTML += `<li><strong>🛍️ ${namaToko}</strong></li>`;

    // Hanya ambil 1 ongkir dari setiap toko
    const firstItem = grupToko[namaToko][0];
    if (!tokoUnik.has(firstItem.idToko)) {
      tokoUnik.add(firstItem.idToko);
      totalOngkir += parseInt(firstItem.ongkir || 0);
    }

    grupToko[namaToko].forEach(item => {
      const hargaTotal = item.harga * item.jumlah;
      subtotal += hargaTotal;

      listEl.innerHTML += `
        <li style="display: flex; gap: 12px; margin-bottom: 10px;">
          <img src="${item.gambar}" style="width: 60px; height: 60px; object-fit: cover;">
          <div>
            <strong>${item.nama}</strong><br/>
            Jumlah:
            <button onclick="updateJumlahFirestore('${item.nama}', -1)">➖</button>
            ${item.jumlah}
            <button onclick="updateJumlahFirestore('${item.nama}', 1)">➕</button><br/>
            <small>Total: Rp ${hargaTotal.toLocaleString()}</small>
          </div>
        </li>`;
    });

    listEl.innerHTML += `<hr style="margin: 8px 0;">`;
  }

  // Estimasi pengiriman berdasarkan lokasi dan toko pertama
  const alamatDoc = await db.collection("alamat").doc(user.uid).get();
  const lokasi = alamatDoc.exists ? alamatDoc.data().lokasi : null;
  const tokoPertama = cart[0]?.idToko;

  let estimasiStandard = 0;
  let estimasiPriority = 0;
  let jarakToko = 0;

  if (lokasi?.latitude && tokoPertama) {
    const tokoDoc = await db.collection("toko").doc(tokoPertama).get();
    if (tokoDoc.exists && tokoDoc.data().koordinat instanceof firebase.firestore.GeoPoint) {
      const tokoGeo = tokoDoc.data().koordinat;
      const jarak = getDistanceFromLatLonInKm(
        tokoGeo.latitude,
        tokoGeo.longitude,
        lokasi.latitude,
        lokasi.longitude
      );
      jarakToko = jarak;

      estimasiStandard = Math.round(5 + jarak * 4);
      estimasiPriority = Math.round((5 * 0.8) + jarak * 3);

      await db.collection("keranjang").doc(user.uid).update({
        estimasiMenit: estimasiStandard
      });
    }
  }

  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || 'standard';
  let ongkir = totalOngkir;
  if (metode === 'priority') ongkir += 3500;

  const potongan = currentDiskon > 0 ? ongkir * currentDiskon : 0;
  const layanan = Math.round((subtotal + ongkir - potongan) * 0.01);
  const totalBayar = subtotal + ongkir - potongan + layanan;

  ['standard', 'priority'].forEach(mode => {
    const est = mode === 'standard' ? estimasiStandard : estimasiPriority;
    const ongkirX = totalOngkir + (mode === 'priority' ? 3500 : 0);
    document.getElementById(`jarak-${mode}`).textContent = `Jarak: ${jarakToko.toFixed(2)} km`;
    document.getElementById(`ongkir-${mode}`).textContent = `Rp ${ongkirX.toLocaleString()}`;
    document.getElementById(`estimasi-${mode}`).textContent = `Estimasi: ±${est} menit`;
  });

  totalEl.innerHTML = `<p><strong>Subtotal:</strong> Rp ${subtotal.toLocaleString()}</p>`;
  elSubtotal.textContent = `Rp ${subtotal.toLocaleString()}`;
  elOngkir.textContent = `Rp ${ongkir.toLocaleString()}`;
  elDiskon.textContent = `- Rp ${potongan.toLocaleString()}`;
  footerTotalEl.textContent = totalBayar.toLocaleString();
  footerDiskonEl.textContent = potongan.toLocaleString();
  if (elLayanan) elLayanan.textContent = `Rp ${layanan.toLocaleString()}`;

  if (cart.length > 8 || ongkir > 20000) {
    const notifBox = document.createElement('div');
    notifBox.className = "checkout-note";
    notifBox.style = "color:#d9534f; padding: 6px 12px;";
    notifBox.innerHTML = "⚠️ Pesanan mungkin akan telat karena antrian sedang tinggi di toko.";
    totalEl.appendChild(notifBox);
  }
}







async function updateJumlahFirestore(namaProduk, change) {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const db = firebase.firestore();
  const ref = db.collection("keranjang").doc(user.uid);
  const doc = await ref.get();
  if (!doc.exists) return;

  const items = doc.data().items || [];
  const index = items.findIndex(i => i.nama === namaProduk);
  if (index === -1) return;

  items[index].jumlah += change;
  if (items[index].jumlah <= 0) items.splice(index, 1);

  await ref.set({ items }, { merge: true });
  renderCheckoutItems();
  updateCartBadge?.();
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function cekSaldoUser() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const db = firebase.firestore();
  db.collection("users").doc(user.uid).get().then(doc => {
    if (doc.exists) {
      const saldo = doc.data().saldo || 0;
      window.userSaldo = saldo; // Simpan global

      const select = document.getElementById("metode-pembayaran");
      if (select) {
        // Cari opsi saldo, jika belum ada, tambahkan
        let optionSaldo = select.querySelector("option[value='saldo']");
        if (!optionSaldo) {
          optionSaldo = document.createElement("option");
          optionSaldo.value = "saldo";
          select.appendChild(optionSaldo);
        }

        // Perbarui teks opsi saldo dengan jumlah saldo
        optionSaldo.textContent = `Saldo (Rp ${saldo.toLocaleString()})`;
      }
    } else {
      console.warn("❌ Data user tidak ditemukan.");
    }
  }).catch(err => {
    console.error("❌ Gagal mengambil saldo:", err);
  });
}


async function renderAlamatCheckout() {
  const alamatBox = document.getElementById('alamat-terpilih');
  const user = firebase.auth().currentUser;

  if (!user) {
    alamatBox.innerHTML = `<p>🔒 Harap login terlebih dahulu untuk melihat alamat.</p>`;
    return;
  }

  try {
    const db = firebase.firestore();
    const docRef = db.collection("alamat").doc(user.uid);
    const doc = await docRef.get();

    if (!doc.exists) {
      alamatBox.innerHTML = `<p>⚠️ Alamat belum diisi. Silakan lengkapi di menu Alamat.</p>`;
      return;
    }

    const data = doc.data();
    const nama = data.nama || '-';
    const phone = data.noHp || '-';
    const alamat = data.alamat || 'Alamat belum diisi';
    const note = data.catatan || '-';
    const lokasi = data.lokasi;

    let lokasiLink = '';
    if (lokasi && lokasi.lat && lokasi.lng) {
      lokasiLink = `<br/><a href="https://www.google.com/maps?q=${lokasi.lat},${lokasi.lng}" target="_blank">📍 Lihat Lokasi di Google Maps</a>`;
    }

    // Simpan global jika diperlukan untuk hitung jarak
    window.customerLocation = lokasi;

    alamatBox.innerHTML = `
      <p>👤 ${nama}<br/>📱 ${phone}<br/>🏠 ${alamat}</p>
      <p class="checkout-note">📦 Catatan: ${note}</p>
      ${lokasiLink}
    `;
  } catch (error) {
    console.error("❌ Gagal mengambil alamat:", error);
    alamatBox.innerHTML = `<p style="color:red;">❌ Gagal memuat alamat pengguna.</p>`;
  }
}


// Fungsi cek apakah toko sedang buka
function cekTokoBuka(jamSekarang, buka, tutup) {
  if (buka === tutup) return true; // anggap buka 24 jam
  if (buka < tutup) return jamSekarang >= buka && jamSekarang < tutup;
  return jamSekarang >= buka || jamSekarang < tutup; // buka malam - tutup pagi
}


// Fungsi cek apakah toko sedang buka
function cekTokoBuka(jamSekarang, buka, tutup) {
  if (buka === tutup) return true; // anggap buka 24 jam
  if (buka < tutup) return jamSekarang >= buka && jamSekarang < tutup;
  return jamSekarang >= buka || jamSekarang < tutup; // buka malam - tutup pagi
}

async function renderProductList() {
  const produkContainer = document.getElementById('produk-container');
  if (!produkContainer) return;

  produkContainer.innerHTML = '<div class="loader">⏳ Memuat produk...</div>';

  const db = firebase.firestore();
  const user = firebase.auth().currentUser;
  if (!user) {
    produkContainer.innerHTML = `<p>❌ Harap login terlebih dahulu.</p>`;
    return;
  }

  try {
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      produkContainer.innerHTML = `<p>❌ Lokasi pengguna tidak ditemukan.</p>`;
      return;
    }

    const lokasiUser = alamatDoc.data().lokasi;
    const lat1 = lokasiUser.latitude;
    const lon1 = lokasiUser.longitude;

    // Ambil semua produk
    const produkSnapshot = await db.collection("produk").get();
    const produkList = produkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (produkList.length === 0) {
      produkContainer.innerHTML = '<p>Produk tidak tersedia.</p>';
      return;
    }

    // Ambil semua toko dan buat map berdasarkan id
    const tokoSnapshot = await db.collection("toko").get();
    const tokoMap = {};
    tokoSnapshot.docs.forEach(doc => {
      const data = doc.data();
      let geo = { lat: 0, lng: 0 };
      if (data.koordinat instanceof firebase.firestore.GeoPoint) {
        geo = {
          lat: data.koordinat.latitude,
          lng: data.koordinat.longitude
        };
      }

      tokoMap[doc.id] = {
        namaToko: data.namaToko || 'Unknown Toko',
        buka: typeof data.jamBuka === 'number' ? data.jamBuka : 0,
        tutup: typeof data.jamTutup === 'number' ? data.jamTutup : 0,
        isOpen: data.isOpen ?? false,
        koordinat: geo
      };
    });

    // Hitung jarak antar koordinat
    function hitungJarak(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // Gabungkan produk dengan info toko + hitung jarak
    const produkGabung = produkList.map(produk => {
      const tokoInfo = tokoMap[produk.idToko] || {
        namaToko: 'Unknown Toko',
        buka: 0,
        tutup: 0,
        isOpen: false,
        koordinat: { lat: 0, lng: 0 }
      };

      const lat2 = tokoInfo.koordinat.lat;
      const lon2 = tokoInfo.koordinat.lng;
      const jarakKm = (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2) && lat2 !== 0)
        ? hitungJarak(lat1, lon1, lat2, lon2)
        : 0;

      return {
        ...produk,
        tokoNama: tokoInfo.namaToko,
        buka: tokoInfo.buka,
        tutup: tokoInfo.tutup,
        isOpen: tokoInfo.isOpen,
        jarak: jarakKm ? `${jarakKm.toFixed(2)} km` : 'N/A',
        jarakNumber: jarakKm
      };
    });

    const produkUrut = [...produkGabung].sort((a, b) => (a.jarakNumber || Infinity) - (b.jarakNumber || Infinity));


    let html = '';
    produkUrut.forEach((produk, index) => {
      const tokoAktif = produk.isOpen;
      const stokHabis = (produk.stok || 0) <= 0;
      const layananTidakTersedia = produk.jarakNumber > 20;

      const disabledAttr = (!tokoAktif || stokHabis || layananTidakTersedia) ? 'disabled' : '';
      let btnText = 'Lihat Detail';

      if (layananTidakTersedia) {
        btnText = 'Layanan Tidak Tersedia';
      } else if (!tokoAktif) {
        btnText = 'Toko Tutup';
      } else if (stokHabis) {
        btnText = 'Stok Habis';
      }

      const tokoSafe = (produk.tokoNama || '').replace(/'/g, "\\'");
      const gambarProduk = produk.urlGambar || './img/toko-pict.png';

      html += `
        <div class="produk-horizontal">
          <div class="produk-toko-bar" onclick="renderTokoPage('${tokoSafe}')">
            <i class="fa-solid fa-shop"></i>
            <span class="produk-toko-nama">${produk.tokoNama}</span>
            <span class="produk-toko-arrow">›</span>
          </div>
          <div class="produk-body">
            <img src="${gambarProduk}" alt="${produk.namaProduk}" class="produk-img" />
            <div class="produk-info">
              <h3 class="produk-nama">${produk.namaProduk}</h3>
              <p class="produk-meta">Kategori: ${produk.kategori}</p>
              <p class="produk-meta"> 
                ⭐ ${produk.rating || '-'} | 
                ${produk.jarak || '-'} | 
                ${produk.estimasi ? produk.estimasi + ' Menit' : '-'}</p>
              <div class="produk-action">
                <strong>Rp ${Number(produk.harga || 0).toLocaleString()}</strong>
                <button class="beli-btn" data-index="${index}" ${disabledAttr}>
                  ${btnText}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    produkContainer.innerHTML = html;

    // Event listener
    document.querySelectorAll('.beli-btn').forEach(button => {
      const index = button.getAttribute('data-index');
      const produk = produkUrut[index];

      if (button.disabled) {
        button.addEventListener('click', () => {
          if (produk.jarakNumber > 20) {
            alert("❌ Layanan tidak tersedia untuk lokasi Anda.");
          } else if (!produk.isOpen) {
            alert("❌ Toko sedang tutup.");
          } else if ((produk.stok || 0) <= 0) {
            alert("❌ Stok produk habis.");
          }
        });
      } else {
        button.addEventListener('click', () => {
          tampilkanPopupDetail(produk);
        });
      }
    });

  } catch (error) {
    console.error("❌ Gagal memuat produk:", error);
    produkContainer.innerHTML = `<p style="color:red;">Gagal memuat produk.</p>`;
  }
}



async function tampilkanPopupDetail(produk) {
  const db = firebase.firestore();
  if (!produk.id) return alert("❌ Produk tidak memiliki ID.");

  // Ambil Add-ons
  let addons = [];
  try {
    const addonSnap = await db.collection("produk").doc(produk.id).collection("addons").get();
    addons = addonSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.warn("⚠️ Gagal mengambil addons:", e.message);
  }

  // Ambil Rating + Ulasan
  let totalRating = 0;
  let totalUlasan = 0;
  let daftarUlasan = [];

  try {
    const ratingSnap = await db
      .collection("produk")
      .doc(produk.id)
      .collection("rating")
      .orderBy("timestamp", "desc")
      .get();

    totalUlasan = ratingSnap.size;
    ratingSnap.forEach(doc => {
      const data = doc.data();
      totalRating += parseInt(data.rating || 0);
      if (daftarUlasan.length < 3) daftarUlasan.push(data); // ambil 3 terbaru
    });
  } catch (e) {
    console.warn("⚠️ Gagal mengambil rating:", e.message);
  }

  const rataRata = totalUlasan > 0 ? (totalRating / totalUlasan) : 0;
  const bintangHTML = "⭐".repeat(Math.round(rataRata)) || "Belum ada ulasan";

  const ulasanHTML = daftarUlasan.length > 0 ? `
    <div class="popup-review-list" style="margin-top: 8px;">
      <p><strong>Ulasan Terbaru:</strong></p>
      ${daftarUlasan.map(u => `
        <div style="border: 1px solid #ddd; border-radius: 6px; padding: 8px; margin-bottom: 6px;">
          <div>Rating: ${"⭐".repeat(u.rating || 0)} (${u.rating}/5)</div>
          <div style="font-style: italic; color: #555;">"${u.komentar || '-'}"</div>
        </div>
      `).join("")}
    </div>
  ` : "";

  const addonHtml = addons.length ? `
    <div class="popup-addon-list-detail-produk">
      <p><strong>Pilih Add-On:</strong></p>
      ${addons.map(addon => `
        <label class="addon-item-detail-produk">
          <input type="checkbox" class="addon-checkbox"
            data-nama="${addon.nama}" data-harga="${parseInt(addon.harga || 0)}" />
          ${addon.nama} (Rp ${parseInt(addon.harga || 0).toLocaleString("id-ID")})
        </label>
      `).join("")}
    </div>` : `<p><em>Tidak ada add-on tersedia.</em></p>`;

  const popup = document.getElementById("popup-greeting");
  const overlay = document.getElementById("popup-overlay");

  popup.innerHTML = `
    <div class="popup-container-detail-produk">
      <div class="popup-header-detail-produk">
        <span class="popup-close-detail-produk" onclick="tutupPopup()">✕</span>
      </div>

      <img class="popup-img-detail-produk" src="${produk.urlGambar || './img/toko-pict.png'}" alt="Gambar Produk" />

      <div class="popup-text-detail-produk">
        <h3 class="popup-nama-detail-produk">${produk.namaProduk}</h3>

        <div class="popup-info-detail-produk">
          <p><strong>Deskripsi:</strong> ${produk.deskripsi || 'Tidak ada deskripsi.'}</p>
          <p><strong>Estimasi:</strong> ${produk.estimasi || 10} menit</p>
          <p><strong>Kategori:</strong> ${produk.kategori}</p>
          <p><strong>Harga:</strong> Rp <span id="harga-utama">${produk.harga.toLocaleString("id-ID")}</span></p>
        </div>

        ${addonHtml}

        <div class="popup-rating-ulasan" style="margin-top: 16px; border-top: 1px solid #eee; padding-top: 10px;">
          <p><strong>Rating:</strong> ${bintangHTML} ${rataRata.toFixed(1)} (${totalUlasan})</p>
          ${totalUlasan > 0 ? `
            <button onclick="tampilkanSemuaUlasan('${produk.id}')" class="btn-mini" style="margin-bottom: 10px;">📋 Lihat Semua Ulasan</button>
            ${ulasanHTML}
          ` : "<p><em>Belum ada ulasan.</em></p>"}
        </div>
      </div>

      <div class="footer-checkout-detail-produk">
        <button id="tombol-tambah-keranjang" onclick='tambahKeKeranjangDenganAddon(${JSON.stringify(produk)}, ${JSON.stringify(addons)})'>
          <div style="font-size: 15px;">Tambah ke Keranjang</div>
          <div style="font-weight: bold;">Rp ${produk.harga.toLocaleString("id-ID")}</div>
        </button>
      </div>
    </div>
  `;

  popup.style.display = "block";
  overlay.style.display = "block";
  document.body.classList.add("popup-active");

  document.querySelectorAll(".addon-checkbox").forEach(cb => {
    cb.addEventListener("change", () => hitungSubtotal(produk.harga));
  });
}




async function tampilkanSemuaUlasan(idProduk) {
  const db = firebase.firestore();
  const snap = await db
    .collection("produk")
    .doc(idProduk)
    .collection("rating")
    .orderBy("waktuRating", "desc") // Urut dari terbaru
    .get();

  let html = `<h3 style="margin-bottom: 10px;">📋 Semua Ulasan Terbaru</h3>`;

  if (snap.empty) {
    html += `<p><em>Belum ada ulasan untuk produk ini.</em></p>`;
  } else {
    snap.forEach(doc => {
      const r = doc.data();
      const waktu = r.waktuRating
        ? new Date(r.waktuRating).toLocaleString("id-ID")
        : "-";
      const ratingBintang = "⭐".repeat(r.rating || 0);
      html += `
        <div style="border-top: 1px solid #ccc; margin-top: 10px; padding-top: 10px;">
          <p><strong>ID:</strong> ${doc.id}</p>
          <p><strong>Nama:</strong> ${r.nama || "Anonim"}</p>
          <p><strong>Ulasan:</strong> ${ratingBintang} ${r.komentar || "-"}</p>
          <small><i>🕒 ${waktu}</i></small>
        </div>
      `;
    });
  }

  document.getElementById("popup-greeting").innerHTML = `
    <div style="max-height: 70vh; overflow-y: auto;">${html}</div>
    <button onclick="tutupPopup()" class="btn-mini" style="margin-top: 20px;">Tutup</button>
  `;

  document.getElementById("popup-greeting").style.display = "block";
  document.getElementById("popup-overlay").style.display = "block";
  document.body.classList.add("popup-active");
}


function hitungSubtotal(hargaProduk) {
  const checkboxes = document.querySelectorAll(".addon-checkbox");
  let subtotal = hargaProduk;

  checkboxes.forEach(cb => {
    if (cb.checked) {
      subtotal += parseInt(cb.dataset.harga || "0");
    }
  });

  // Update tampilan subtotal jika ada
  const subtotalText = document.getElementById("subtotal");
  if (subtotalText) {
    subtotalText.innerText = subtotal.toLocaleString("id-ID");
  }

  // Update tombol dua baris
  const tombol = document.getElementById("tombol-tambah-keranjang");
  if (tombol) {
    tombol.innerHTML = `
      <div style="font-weight: 500;">Tambah ke Keranjang</div>
      <div style="font-weight: bold;">Rp ${subtotal.toLocaleString("id-ID")}</div>
    `;
  }
}






async function editToko(idToko) {
  const container = document.getElementById("page-container");
  container.innerHTML = `<p>Memuat form edit toko...</p>`;

  const db = firebase.firestore();
  try {
    const doc = await db.collection("toko").doc(idToko).get();
    if (!doc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Toko tidak ditemukan.</p>`;
      return;
    }

    const toko = doc.data();
    const koordinatValue = toko.koordinat && toko.koordinat.latitude
      ? `${toko.koordinat.latitude},${toko.koordinat.longitude}`
      : '';

    container.innerHTML = `
      <div class="form-box">
        <h2>✏️ Edit Toko</h2>
        <form onsubmit="simpanEditToko(event, '${idToko}')">
          <label>Nama Pemilik</label>
          <input id="namaPemilik" value="${toko.namaPemilik || ''}" required />

          <label>Nama Toko</label>
          <input id="namaToko" value="${toko.namaToko || ''}" required />

          <label>Deskripsi Toko</label>
          <textarea id="deskripsiToko" placeholder="Deskripsi singkat toko...">${toko.deskripsiToko || ''}</textarea>

          <label>Alamat Toko</label>
          <textarea id="alamatToko" required>${toko.alamatToko || ''}</textarea>

          <label>Jam Buka (0–23)</label>
          <input id="jamBuka" type="number" min="0" max="23" value="${toko.jamBuka || 0}" required />

          <label>Jam Tutup (0–23)</label>
          <input id="jamTutup" type="number" min="0" max="23" value="${toko.jamTutup || 23}" required />

          <label>Koordinat</label>
          <input id="koordinat" value="${koordinatValue}" required />

          <button type="submit" class="btn-simpan">💾 Simpan Perubahan</button>
        </form>

        <div id="leafletMap" style="height: 300px; margin-top: 20px; border-radius: 8px;"></div>
        <button onclick="loadContent('seller-dashboard')" class="btn-mini" style="margin-top:1rem;">⬅️ Kembali</button>
      </div>
    `;

    // Tampilkan peta jika ingin ubah koordinat
    const map = L.map('leafletMap').setView(
      toko.koordinat ? [toko.koordinat.latitude, toko.koordinat.longitude] : [-1.63, 105.77],
      13
    );
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = L.marker([toko.koordinat.latitude, toko.koordinat.longitude]).addTo(map);
    map.on('click', function (e) {
      const { lat, lng } = e.latlng;
      document.getElementById("koordinat").value = `${lat.toFixed(5)},${lng.toFixed(5)}`;
      if (marker) marker.remove();
      marker = L.marker([lat, lng]).addTo(map);
    });

  } catch (err) {
    console.error("❌ Gagal memuat toko:", err);
    container.innerHTML = `<p style="color:red;">❌ Gagal memuat data toko.</p>`;
  }
}

async function simpanEditToko(event, idToko) {
  event.preventDefault();

  const db = firebase.firestore();

  const namaPemilik = document.getElementById("namaPemilik").value.trim();
  const namaToko = document.getElementById("namaToko").value.trim();
  const deskripsiToko = document.getElementById("deskripsiToko").value.trim();
  const alamatToko = document.getElementById("alamatToko").value.trim();
  const jamBuka = parseInt(document.getElementById("jamBuka").value);
  const jamTutup = parseInt(document.getElementById("jamTutup").value);
  const koordinatString = document.getElementById("koordinat").value.trim();

  if (!namaPemilik || !namaToko || !alamatToko || isNaN(jamBuka) || isNaN(jamTutup)) {
    return alert("❌ Semua data harus diisi dengan benar.");
  }

  if (!koordinatString.includes(",")) return alert("❌ Format koordinat tidak valid.");

  const [latStr, lngStr] = koordinatString.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return alert("❌ Koordinat tidak valid.");
  }

  const koordinat = new firebase.firestore.GeoPoint(lat, lng);

  try {
    await db.collection("toko").doc(idToko).update({
      namaPemilik,
      namaToko,
      deskripsiToko,
      alamatToko,
      jamBuka,
      jamTutup,
      koordinat
    });

    alert("✅ Data toko berhasil diperbarui.");
    loadContent("seller-dashboard");

  } catch (err) {
    console.error("❌ Gagal update toko:", err);
    alert("❌ Gagal update toko: " + err.message);
  }
}


function parseGeoPointString(coordStr) {
  // Contoh input: "[1.63468° S, 105.77276° E]"
  if (!coordStr) return null;

  // Hilangkan kurung siku dan spasi berlebih
  coordStr = coordStr.replace(/[\[\]]/g, '').trim();

  // Pisah dengan koma
  const parts = coordStr.split(',');

  if (parts.length !== 2) return null;

  // Parsing lat
  let latPart = parts[0].trim(); // "1.63468° S"
  let latValue = parseFloat(latPart);
  if (latPart.toUpperCase().includes('S')) latValue = -Math.abs(latValue);
  else if (latPart.toUpperCase().includes('N')) latValue = Math.abs(latValue);
  else return null; // kalau gak ada N/S, error

  // Parsing lng
  let lngPart = parts[1].trim(); // "105.77276° E"
  let lngValue = parseFloat(lngPart);
  if (lngPart.toUpperCase().includes('W')) lngValue = -Math.abs(lngValue);
  else if (lngPart.toUpperCase().includes('E')) lngValue = Math.abs(lngValue);
  else return null; // kalau gak ada E/W, error

  return { lat: latValue, lng: lngValue };
}


function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius bumi dalam KM
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Fungsi untuk rating parsing
function parseRating(val) {
  return isNaN(parseFloat(val)) ? 0 : parseFloat(val);
}



async function tambahKeKeranjangDenganAddon(produk, addons = []) {
  try {
    const checkboxes = document.querySelectorAll(".addon-checkbox");
    const addonTerpilih = [];
    let totalAddon = 0;

    checkboxes.forEach(cb => {
      if (cb.checked) {
        const hargaAddon = parseInt(cb.dataset.harga || "0");
        addonTerpilih.push({
          nama: cb.dataset.nama,
          harga: hargaAddon
        });
        totalAddon += hargaAddon;
      }
    });

    // Ambil catatan dari textarea
    const catatanElem = document.querySelector(".popup-text-detail-produk textarea");
    const catatan = catatanElem ? catatanElem.value.trim() : "";

    // Pastikan fungsi tambahKeKeranjang tersedia
    if (typeof tambahKeKeranjang !== "function") {
      throw new Error("Fungsi tambahKeKeranjang tidak ditemukan.");
    }

    // Kirim catatan ke fungsi tambahKeKeranjang
    await tambahKeKeranjang(produk, addonTerpilih, catatan);
    tutupPopup();
    alert("✅ Produk berhasil ditambahkan ke keranjang.");
    
    // Setelah sukses, load halaman checkout
    if (typeof loadContent === "function") {
      loadContent('checkout');
    } else {
      console.warn("Fungsi loadContent tidak ditemukan, tidak dapat pindah ke checkout.");
    }
  } catch (err) {
    console.error("❌ Gagal proses keranjang:", err.message || err);
    alert("❌ Gagal menambahkan ke keranjang.");
  }
}

async function batalkanPesananDriver(idDocDriver, idPesanan) {
  const alasan = prompt("Tulis alasan pembatalan pesanan:");
  if (!alasan || alasan.trim() === "") return alert("❌ Alasan pembatalan wajib diisi.");

  const db = firebase.firestore();
  const now = Date.now();

  try {
    // Ambil data pesanan
    const pesananRef = db.collection("pesanan").doc(idPesanan);
    const pesananDoc = await pesananRef.get();
    if (!pesananDoc.exists) return alert("❌ Pesanan tidak ditemukan.");
    const dataPesanan = pesananDoc.data();
    const idUser = dataPesanan.userId;

    // Update status di pesanan_driver
    await db.collection("pesanan_driver").doc(idDocDriver).update({
      status: "Dibatalkan",
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: `❌ Dibatalkan - ${alasan}`,
        waktu: now
      })
    });

    // Update status di pesanan utama
    await pesananRef.update({
      status: "Dibatalkan",
      stepsLog: firebase.firestore.FieldValue.arrayUnion({
        status: `❌ Dibatalkan oleh driver - ${alasan}`,
        waktu: now
      })
    });

    // ✅ Kirim notifikasi ke chatbox (subkoleksi `chat`)
    await pesananRef.collection("chat").add({
      pengirim: "driver",
      pesan: `❌ Pesanan dibatalkan oleh driver. Alasan: ${alasan}`,
      waktu: firebase.firestore.FieldValue.serverTimestamp(),
      tipe: "notifikasi"
    });

    alert("✅ Pesanan berhasil dibatalkan dan notifikasi dikirim ke chat.");
    loadContent("driver-dashboard");

  } catch (err) {
    console.error("❌ Gagal membatalkan pesanan:", err);
    alert("❌ Terjadi kesalahan saat membatalkan pesanan.");
  }
}

function tutupPopup() {
  document.getElementById("popup-greeting").style.display = "none";
  document.getElementById("popup-overlay").style.display = "none";
  document.body.classList.remove("popup-active");
}


async function tambahKeKeranjang(produk, addonTerpilih = [], catatanPenjual = "") {
  const user = firebase.auth().currentUser;
  if (!user) {
    alert("❌ Harap login terlebih dahulu.");
    return;
  }

  const db = firebase.firestore();
  const keranjangRef = db.collection("keranjang").doc(user.uid);

  try {
    // Ambil lokasi user dari koleksi "alamat"
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      throw new Error("Lokasi belum lengkap");
    }

    const lokasiUser = alamatDoc.data().lokasi;
    if (typeof lokasiUser.latitude !== "number" || typeof lokasiUser.longitude !== "number") {
      throw new Error("Lokasi pengguna tidak valid");
    }

    const cust = {
      lat: lokasiUser.latitude,
      lng: lokasiUser.longitude
    };

    // Validasi produk punya idToko
    if (!produk.idToko) throw new Error("Produk tidak memiliki idToko");

    // Ambil lokasi toko
    const tokoDoc = await db.collection("toko").doc(produk.idToko).get();
    if (!tokoDoc.exists) throw new Error("Toko tidak ditemukan");

    const tokoData = tokoDoc.data();
    const koordinatToko = tokoData.koordinat;

    if (!koordinatToko || typeof koordinatToko.latitude !== "number" || typeof koordinatToko.longitude !== "number") {
      throw new Error("Koordinat toko tidak valid");
    }

    const toko = {
      lat: koordinatToko.latitude,
      lng: koordinatToko.longitude
    };

    // Hitung jarak (km)
    const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, cust.lat, cust.lng);

    // Estimasi waktu (masak + kirim)
    const estimasiMasak = parseInt(produk.estimasi) || 10;
    const estimasiKirim = Math.ceil(jarak * 4); // 4 menit/km
    const totalEstimasi = estimasiMasak + estimasiKirim;

    // Hitung ongkir
    let ongkir = 8000;
    if (jarak > 2) {
      ongkir += Math.ceil(jarak - 2) * 1500;
    }

    // Total harga add-on
    const totalAddon = addonTerpilih.reduce((sum, addon) => sum + parseInt(addon.harga || 0), 0);
    const totalHarga = (produk.harga || 0) + totalAddon;

    // Ambil isi keranjang
    const snap = await keranjangRef.get();
    let items = snap.exists ? snap.data().items || [] : [];

    // Gabungkan nama produk + add-on untuk pembeda
    const namaGabungan = produk.namaProduk + (addonTerpilih.length ? ` + ${addonTerpilih.map(a => a.nama).join(', ')}` : '');

    // Cek apakah produk ini sudah ada di keranjang (bandingkan nama + addons + catatan)
    const index = items.findIndex(item =>
      item.nama === namaGabungan &&
      item.idToko === produk.idToko &&
      JSON.stringify(item.addon || []) === JSON.stringify(addonTerpilih) &&
      (item.catatanPenjual || "") === catatanPenjual
    );

    if (index !== -1) {
      items[index].jumlah += 1;
    } else {
      items.push({
        nama: namaGabungan,
        idToko: produk.idToko,
        harga: totalHarga,
        gambar: produk.urlGambar || './img/toko-pict.png',
        jumlah: 1,
        estimasi: totalEstimasi,
        ongkir: ongkir,
        jarak: jarak.toFixed(2),
        addon: addonTerpilih,
        catatanPenjual: catatanPenjual, // simpan catatan
        status: "Menunggu Ambil",
        stepslog: [
          {
            waktu: new Date().toISOString(),
            pesan: "Produk dimasukkan ke keranjang"
          }
        ]
      });
    }

    await keranjangRef.set({ items }, { merge: true });

    if (typeof updateCartBadge === "function") updateCartBadge();
    if (window.toast) toast(`✅ ${produk.namaProduk} ditambahkan ke keranjang`);

  } catch (error) {
    console.error("❌ Gagal tambah ke keranjang:", error.message || error);
    alert("❌ Gagal menambahkan ke keranjang: " + (error.message || error));
  }
}

async function updateCartBadge() {
  const badge = document.querySelector('.cart-badge');
  const icon = document.querySelector('.footer-cart-icon');

  if (!badge || !icon) return;

  const user = firebase.auth().currentUser;
  if (!user) {
    badge.style.display = 'none';
    icon.classList.remove('fa-bounce');
    return;
  }

  try {
    const db = firebase.firestore();
    const doc = await db.collection("keranjang").doc(user.uid).get();
    const items = doc.exists ? (doc.data().items || []) : [];

    const total = items.reduce((sum, item) => sum + (parseInt(item.jumlah) || 0), 0);

    if (total > 0) {
      badge.textContent = total;
      badge.style.display = 'inline-block';
      icon.classList.add('fa-bounce');
    } else {
      badge.style.display = 'none';
      badge.textContent = '';
      icon.classList.remove('fa-bounce');
    }

  } catch (e) {
    console.error("❌ Gagal memperbarui badge keranjang:", e.message);
  }
}






