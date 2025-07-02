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
    closeBtn.addEventListener("click", () => {
      popup.style.display = "none";
      overlay.style.display = "none";
      document.body.classList.remove("popup-active");

      loadContent("productlist");

      if (!isOpen) {
        alert(`⚠️ Layanan saat ini sedang tutup.\nJam buka: ${jamBuka} - ${jamTutup}`);
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
      </div>

      <!-- Catatan Tambahan -->
      <div class="catatan-box">
        <label for="catatan-pesanan" class="catatan-label">📝 Catatan Tambahan</label>
        <textarea id="catatan-pesanan" rows="3" placeholder="Contoh: Tolong jangan pakai sambal."></textarea>
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
    const saldoDriver = dataDriver?.saldo || 0;
    let statusDriver = dataDriver?.status || "nonaktif";
    let forceNonaktif = false;

    if (saldoDriver < 3000) {
      forceNonaktif = true;
      if (statusDriver !== "nonaktif") {
        await driverRef.update({ status: "nonaktif" });
        statusDriver = "nonaktif";
      }
      alert(`🚫 Saldo kamu hanya Rp ${saldoDriver.toLocaleString()}. Sistem menonaktifkan akun sementara. Silakan isi saldo.`);
    } else if (saldoDriver >= 6000 && saldoDriver < 10000) {
      alert(`⚠️ Saldo kamu hanya Rp ${saldoDriver.toLocaleString()}. Disarankan untuk isi ulang agar tetap bisa menerima pesanan.`);
    }

    // Hitung penghasilan hari ini dari riwayat_driver
    const awalHari = new Date();
    awalHari.setHours(0, 0, 0, 0);

    const riwayatSnap = await db.collection("riwayat_driver")
      .where("idDriver", "==", driverId)
      .where("waktuSelesai", ">=", awalHari)
      .get();

    let jumlahHariIni = 0;
    let totalHariIni = 0;

    riwayatSnap.forEach(doc => {
      const data = doc.data();
      jumlahHariIni += 1;
      totalHariIni += data.penghasilanBersih || 0;
    });

    // Ambil pesanan aktif
    const pesananSnap = await db.collection("pesanan_driver")
      .where("idDriver", "==", driverId)
      .get();

    const daftarPesanan = [];

    for (const doc of pesananSnap.docs) {
      const data = doc.data();
      const pesananDoc = await db.collection("pesanan").doc(data.idPesanan).get();
      if (!pesananDoc.exists) continue;
      const pesanan = pesananDoc.data();

      if (["Menunggu Ambil", "Diterima", "Menuju Resto", "Pickup Pesanan", "Menuju Customer"].includes(data.status)) {
        const lokasiCustomer = (await db.collection("alamat").doc(pesanan.userId).get()).data()?.lokasi || null;
        const lokasiToko = (await db.collection("toko").doc(pesanan.produk?.[0]?.idToko || "").get()).data()?.koordinat || null;

        daftarPesanan.push({
          id: doc.id,
          idPesanan: data.idPesanan,
          statusDriver: data.status,
          plat: dataDriver.nomorPlat || "-",
          namaDriver: dataDriver.nama || "-",
          metode: pesanan.metode,
          pengiriman: pesanan.pengiriman,
          total: pesanan.total || 0,
          createdAt: pesanan.createdAt?.toDate?.() || new Date(),
          lokasiToko,
          lokasiCustomer,
        });
      }
    }

    daftarPesanan.sort((a, b) => a.createdAt - b.createdAt);

    let html = `
      <div class="driver-header">
        <p><strong>Nama:</strong> ${dataDriver.nama || "-"}</p>
        <p><strong>Saldo:</strong> Rp ${saldoDriver.toLocaleString()}</p>
        <p><strong>Status:</strong>
          <select id="driver-status" ${forceNonaktif ? "disabled" : ""}>
            <option value="aktif" ${statusDriver === "aktif" ? "selected" : ""}>Aktif</option>
            <option value="nonaktif" ${statusDriver === "nonaktif" ? "selected" : ""}>Nonaktif</option>
          </select>
        </p>
        <p><strong>📆 Riwayat Hari Ini:</strong> ${jumlahHariIni} pesanan</p>
        <p><strong>💵 Penghasilan Hari Ini:</strong> Rp ${totalHariIni.toLocaleString()}</p>
      </div>

      <h3>📦 Pesanan Aktif</h3>
      ${daftarPesanan.length === 0 ? "<p>Tidak ada pesanan saat ini.</p>" : ""}
      <ul class="driver-pesanan-list">
    `;

    const sedangProses = daftarPesanan.some(p =>
      ["Diterima", "Menuju Resto", "Pickup Pesanan", "Menuju Customer"].includes(p.statusDriver)
    );

    for (const p of daftarPesanan) {
      html += `
        <li class="pesanan-item">
          <p><strong>${p.namaDriver}</strong> - ${p.plat}</p>
          <p>🕒 Masuk: ${p.createdAt.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</p>
          <p>📦 Pengiriman: ${p.pengiriman}</p>
          <p>💰 Pembayaran: ${p.metode}</p>
          <p>📌 Status: ${p.statusDriver}</p>
          <p><strong>Total:</strong> Rp ${p.total.toLocaleString()}</p>
          <div class="btn-group">
            ${p.statusDriver === "Menunggu Ambil" && !sedangProses
              ? `<button onclick="terimaPesananDriver('${p.id}', '${p.idPesanan}')">✅ Terima Pesanan</button>
                 <button onclick="tolakPesananDriver('${p.id}')">❌ Tolak Pesanan</button>`
              : `<button onclick="bukaDetailPesananDriver('${p.idPesanan}')">🔍 Detail Pesanan</button>`
            }
          </div>
        </li>
      `;
    }

    html += "</ul>";
    container.innerHTML = html;

    const statusSelect = document.getElementById("driver-status");
    if (statusSelect && !forceNonaktif) {
      statusSelect.addEventListener("change", async (e) => {
        const newStatus = e.target.value;
        await driverRef.update({ status: newStatus });
        alert("✅ Status diperbarui");
        if (newStatus === "aktif") loadContent("driver-dashboard");
      });
    }
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

    const [usersSnapshot, pesananSnapshot, depositSnapshot, withdrawSnapshot] = await Promise.all([
      db.collection("users").get(),
      db.collection("pesanan").get(),
      db.collection("topup_request").where("status", "==", "Menunggu").get(),
      db.collection("withdraw_request").where("status", "==", "Menunggu").get()
    ]);

    let totalUser = 0;
    let totalDriver = 0;
    let totalNominal = 0;
    let totalPesananAktif = 0;

    usersSnapshot.forEach(doc => {
      const r = (doc.data().role || "").toLowerCase();
      if (r === "user") totalUser++;
      if (r === "driver") totalDriver++;
    });

    pesananSnapshot.forEach(doc => {
      const d = doc.data();
      const nominal = Number(d.total || 0);
      const status = d.status || "";
      totalNominal += nominal;
      if (status !== "Selesai") totalPesananAktif++;
    });

    const totalDepositMenunggu = depositSnapshot.size;
    const totalWithdrawMenunggu = withdrawSnapshot.size;

    container.innerHTML = `
      <div class="admin-user-dashboard">
        <h2>📊 Dashboard Admin</h2>
        <div class="pyramid-grid-2">

          <div class="pyramid-button">
            <div class="label-with-badge">
              👤 Users <span class="badge">${totalUser}</span>
            </div>
            <button onclick="loadContent('users-management')" class="detail-btn">Lihat Detail</button>
          </div>


          <div class="pyramid-button">
            <div class="label-with-badge">
              🛵 Driver <span class="badge">${totalDriver}</span>
            </div>
            <button onclick="loadContent('admin-driver')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">💳 Transaksi</div>
            <div style="font-size:13px;">Rp${totalNominal.toLocaleString()}</div>
            <button onclick="loadContent('riwayat')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">
              📦 Pesanan <span class="badge">${totalPesananAktif}</span>
            </div>
            <button onclick="loadContent('pesanan-admin')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">
              💰 Permintaan Deposit <span class="badge">${totalDepositMenunggu}</span>
            </div>
            <button onclick="loadContent('permintaan-deposit')" class="detail-btn">Lihat Detail</button>
          </div>

          <div class="pyramid-button">
            <div class="label-with-badge">
              💸 Permintaan Withdraw <span class="badge">${totalWithdrawMenunggu}</span>
            </div>
            <button onclick="loadContent('permintaan-withdraw')" class="detail-btn">Lihat Detail</button>
          </div>

	<div class="pyramid-button">
            <div class="label-with-badge">
              💳 Rekening Deposit <span class="badge">${totalWithdrawMenunggu}</span>
            </div>
            <button onclick="loadContent('setting-rekening')" class="detail-btn">Lihat Detail</button>
          </div>

	
          <div class="pyramid-button">
            <div class="label-with-badge">⏰ Layanan</div>
            <button onclick="loadContent('jam-layanan')" class="detail-btn">Lihat Detail</button>
          </div>

	<div class="pyramid-button">
  <div class="label-with-badge">
    🏪 Toko <span class="badge" id="badge-total-toko">...</span>
  </div>
  <button onclick="loadContent('admin-toko')" class="detail-btn">Kelola Toko</button>
</div>

        </div>
      </div>
    `;
  } catch (error) {
    container.innerHTML = `<p style="color:red;">Terjadi kesalahan: ${error.message}</p>`;
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
            <button onclick="riwayatDriver('${driver.id}')">📜 Riwayat</button>
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
  container.innerHTML = `<p>Memuat permintaan withdraw...</p>`;

  const db = firebase.firestore();
  const snapshot = await db.collection("withdraw_request").orderBy("timestamp", "desc").get();

  let html = `<div class="user-container"><h2>💸 Permintaan Withdraw</h2><ul style="padding-left:0;">`;

  if (snapshot.empty) {
    html += `<li>Tidak ada permintaan.</li>`;
  } else {
    snapshot.forEach(doc => {
      const d = doc.data();
      const waktu = d.timestamp?.toDate()?.toLocaleString("id-ID") || "-";
      const status = d.status || "Menunggu";

      html += `
        <li style="border:1px solid #ccc;padding:12px;border-radius:8px;margin-bottom:1rem;list-style:none;">
          <strong>UserID:</strong> ${d.userId}<br/>
          <strong>Nominal:</strong> Rp${d.jumlah?.toLocaleString() || "0"}<br/>
          <strong>Tujuan:</strong> ${d.tujuan || "-"}<br/>
          <strong>Status:</strong> ${status}<br/>
          <small>🕒 ${waktu}</small><br/>
          ${status === "Menunggu" ? `
            <button class="btn-mini" onclick="konfirmasiWithdraw('${doc.id}', '${d.userId}', ${d.jumlah})">✅ Konfirmasi</button>
            <button class="btn-mini" onclick="tolakWithdraw('${doc.id}')">❌ Tolak</button>
          ` : ''}
        </li>
      `;
    });
  }

  html += `</ul><button class="btn-mini" onclick="loadContent('admin-user')">⬅️ Kembali</button></div>`;
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

          <div class="info-grid" id="info-view">
            <div class="info-label">Username:</div>
            <div class="info-value" id="view-username">${username}</div>

            <div class="info-label">Nama Lengkap:</div>
            <div class="info-value" id="view-nama">${namaLengkap}</div>

            <div class="info-label">Alamat:</div>
            <div class="info-value" id="view-alamat">${alamat}</div>
          </div>

          <div class="info-grid" id="info-edit" style="display:none;">
            <div class="info-label">Username:</div>
            <div class="info-value"><input id="edit-username" value="${username}" /></div>

            <div class="info-label">Nama Lengkap:</div>
            <div class="info-value"><input id="edit-nama" value="${namaLengkap}" /></div>

            <div class="info-label">Alamat:</div>
            <div class="info-value"><textarea id="edit-alamat" rows="3" style="width:100%;">${alamat}</textarea></div>
          </div>

          <div class="info-grid">
            <div class="info-label">Saldo:</div>
            <div class="info-value">
              <i class="fas fa-wallet"></i> ${saldo}
              <button onclick="topupSaldoUser()" class="btn-mini">🔼 Top Up</button>
            </div>

            <div class="info-label">Role:</div>
            <div class="info-value"><i class="fas fa-id-badge"></i> ${role}</div>

            <div class="info-label">Email:</div>
            <div class="info-value"><i class="fas fa-envelope"></i> ${email}</div>

            <div class="info-label">Nomor HP:</div>
            <div class="info-value"><i class="fas fa-phone-alt"></i> ${nomorHp}</div>

            <div class="info-label">PIN:</div>
            <div class="info-value">
              <i class="fas fa-key"></i> 
              <button onclick="loadContent('ubah-pin')" class="btn-mini">Ubah PIN</button>
            </div>

            <div class="info-label">Dibuat:</div>
            <div class="info-value"><i class="fas fa-calendar-alt"></i> ${createdAt}</div>
          </div>

          <button id="btn-edit-profil" class="btn-mini" style="margin-top: 1rem;">
            ✏️ Ubah Profil
          </button>

          <button id="btn-simpan-profil" class="btn-mini" style="margin-top: 1rem; display: none;">
            💾 Simpan Perubahan
          </button>

          <button id="btn-logout" class="btn-mini logout-btn" style="margin-top: 1rem;">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
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
  if (!user) {
    container.innerHTML = `<p>❌ Harap login terlebih dahulu.</p>`;
    return;
  }

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

    const produkSnap = await db.collection("produk").where("idToko", "==", idToko).get();
    const totalProduk = produkSnap.size;

    // Template awal dashboard
    container.innerHTML = `
      <div class="seller-dashboard">
        <h2>📦 Seller Dashboard</h2>

        <div class="tabel-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nama Toko</th>
                <th>Jam Buka</th>
                <th>Jam Tutup</th>
                <th>Saldo</th>
                <th>Produk</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${toko.namaToko}</td>
                <td>${toko.jamBuka || "-"}</td>
                <td>${toko.jamTutup || "-"}</td>
                <td>Rp${(toko.saldo || 0).toLocaleString()}</td>
                <td>${totalProduk}</td>
                <td>
                  <button onclick="kelolaProduk('${idToko}')" class="btn-mini">🛒 Produk</button>
                  <button onclick="editToko('${idToko}')" class="btn-mini">✏️ Edit</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 style="margin-top:30px;">📬 Pesanan Masuk</h3>
        <div class="tabel-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID Pesanan</th>
                <th>Pembeli</th>
                <th>Status</th>
                <th>Produk</th>
                <th>Driver</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody id="pesanan-penjual-list">
              <tr><td colspan="6">⏳ Memuat...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Real-time listener pesanan_penjual
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

          // Ambil status dari pesanan_driver
          let statusDriver = "Menunggu Driver";
          const driverSnap = await db.collection("pesanan_driver").where("idPesanan", "==", p.idPesanan).limit(1).get();
          if (!driverSnap.empty) {
            const driverData = driverSnap.docs[0].data();
            statusDriver = driverData.status || statusDriver;
          }

          // Tampilkan driver info
          let driverInfo = `<span class="badge abu">Mencari Driver...</span>`;
          if (!driverSnap.empty) {
            const driverData = driverSnap.docs[0].data();
            const driverId = driverData.idDriver;
            const driverDoc = await db.collection("driver").doc(driverId).get();
            if (driverDoc.exists) {
              const driver = driverDoc.data();
              driverInfo = `<b>${driver.nama}</b><br><small>${driver.noPlat}</small>`;
            }
          }

          html += `
            <tr>
              <td>${p.idPesanan}</td>
              <td>${p.namaPembeli}<br><small>${p.noHpPembeli}</small></td>
              <td>${statusDriver}</td>
              <td>${p.produk.map(i => `${i.nama} x${i.jumlah}`).join("<br>")}</td>
              <td>${driverInfo}</td>
              <td>${new Date(p.waktuPesan).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })}</td>
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
    const stepsLog = driverData.stepsLog || [];

    const urutanStatus = ["Menunggu Ambil", "Menuju Resto", "Pickup Pesanan", "Menuju Customer", "Pesanan Diterima"];
    const currentIndex = urutanStatus.indexOf(driverData.status);
    const nextStatus = urutanStatus[currentIndex + 1];

    let tombolStatus = "";
    if (nextStatus) {
      tombolStatus = `
        <div class="btn-group">
          <button class="btn-next-status"
            onclick="updateStatusDriver('${driverDocId}', '${nextStatus}', '${idPesanan}')">
            ${{
              "Menuju Resto": "🔜 Menuju Resto",
              "Pickup Pesanan": "📦 Pickup Pesanan",
              "Menuju Customer": "🛵 Menuju Customer",
              "Pesanan Diterima": "✅ Pesanan Diterima"
            }[nextStatus]}
          </button>
        </div>
      `;
    } else if (driverData.status === "Pesanan Diterima") {
      tombolStatus = `
        <div class="btn-group">
          <button class="btn-next-status btn-success"
            onclick="selesaikanPesanan('${idPesanan}')">
            🎉 Selesaikan Pesanan
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="detail-pesanan-wrapper">
        <h2>📦 Detail Pesanan</h2>
        <div class="detail-pesanan-info">
          <p><strong>Nama Pembeli:</strong> ${data.nama || "-"}</p>
          <p><strong>Alamat:</strong> ${data.alamat || "-"}</p>
          <p><strong>Pembayaran:</strong> ${data.metode || "-"}</p>
          <p><strong>Status Driver:</strong> ${driverData.status || "-"}</p>
        </div>

        <h3>📜 Riwayat Proses:</h3>
        <ul class="steps-log">
          ${stepsLog.length ? stepsLog.map(s => `<li>${s}</li>`).join("") : "<li>(Belum ada log)</li>"}
        </ul>

        <h3>🗺️ Rute:</h3>
        <div id="map-detail" class="map-detail"></div>

        ${tombolStatus}
      </div>
    `;

    // Delay render peta
    setTimeout(() => {
      const toko = driverData.lokasiToko || {};
      const cust = driverData.lokasiCustomer || {};

      if (toko.lat && toko.lng && cust.lat && cust.lng) {
        const map = L.map("map-detail").setView([cust.lat, cust.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([toko.lat, toko.lng]).addTo(map).bindPopup("📍 Toko");
        L.marker([cust.lat, cust.lng]).addTo(map).bindPopup("📦 Customer");
      } else {
        document.getElementById("map-detail").innerHTML = `<p style="padding:10px;">📍 Lokasi belum lengkap.</p>`;
      }
    }, 100);

  } catch (err) {
    console.error("❌ Gagal membuka detail pesanan:", err);
    container.innerHTML = `<p style="color:red;">❌ Terjadi kesalahan teknis.</p>`;
  }
}



async function autoAmbilPendingPesanan(driverId, lokasiDriver) {
  const db = firebase.firestore();

  // Cek jika driver sudah punya pesanan yang sedang diproses
  const aktifSnap = await db.collection("pesanan_driver")
    .where("idDriver", "==", driverId)
    .where("status", "in", ["Diterima", "Menuju Resto", "Pickup Pesanan", "Menuju Customer"])
    .get();

  if (!aktifSnap.empty) return; // Sudah ada pesanan aktif, jangan assign

  // Ambil pesanan pending tanpa driver
  const pendingSnap = await db.collection("pesanan_driver")
    .where("status", "==", "Menunggu Ambil")
    .where("idDriver", "==", null) // belum ditugaskan
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
    const lokasiToko = lokasiTokoGeo
      ? { lat: lokasiTokoGeo.latitude, lng: lokasiTokoGeo.longitude }
      : null;

    const jarak = hitungJarakKM(lokasiDriver, lokasiToko);

    if (jarak < jarakTerdekat) {
      jarakTerdekat = jarak;
      pesananTerdekat = {
        idDok: doc.id,
        idPesanan: data.idPesanan
      };
    }
  }

  if (pesananTerdekat) {
    // Assign driver ke pesanan
    await db.collection("pesanan_driver").doc(pesananTerdekat.idDok).update({
      idDriver: driverId,
      status: "Menunggu Ambil",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Auto-assign pesanan ${pesananTerdekat.idPesanan} ke driver ${driverId}`);
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
  if (!pesananDoc.exists) return alert("❌ Data pesanan tidak ditemukan.");

  const data = pesananDoc.data();
  const metode = data.metode;
  const totalBayar = data.total || 0;
  const totalOngkir = data.totalOngkir || 0;
  const biayaLayanan = data.biayaLayanan || 0;

  // Ambil data driver dari pesanan_driver
  const driverSnap = await db.collection("pesanan_driver")
    .where("idPesanan", "==", idPesanan)
    .limit(1)
    .get();

  if (driverSnap.empty) return alert("❌ Data driver untuk pesanan ini tidak ditemukan.");
  const driverDoc = driverSnap.docs[0];
  const driverData = driverDoc.data();
  const idDriver = driverData.idDriver;
  const driverRef = db.collection("driver").doc(idDriver);

  // Ambil nama driver
  const driverDetailDoc = await driverRef.get();
  const namaDriver = driverDetailDoc.exists ? (driverDetailDoc.data().nama || "-") : "-";

  // Timestamp log
  const waktu = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit"
  });

  // Update stepsLog dengan format baru
  const stepsLogUpdate = {
    timestamp: Date.now(),
    label: `${waktu} Pesanan selesai dan dikonfirmasi customer`
  };

  // Update status pesanan
  await pesananRef.update({
    status: "Selesai",
    stepsLog: firebase.firestore.FieldValue.arrayUnion(stepsLogUpdate),
    waktuSelesai: new Date()
  });

  // Hitung penghasilan driver
  let penghasilanBersih = 0;
  const totalFee = Math.round((totalOngkir + biayaLayanan) * 0.05);

  if (metode === "saldo") {
    penghasilanBersih = totalOngkir - totalFee;
  } else if (metode === "cod") {
    penghasilanBersih = totalOngkir + biayaLayanan - totalFee;
  }

  // Tambah ke saldo driver
  await driverRef.update({
    saldo: firebase.firestore.FieldValue.increment(penghasilanBersih)
  });

  // Simpan ke riwayat_driver
  await db.collection("riwayat_driver").add({
    idPesanan,
    idDriver,
    namaDriver,
    namaCustomer: data.nama || "-",
    alamatCustomer: data.alamat || "-",
    metode,
    total: totalBayar,
    totalOngkir,
    biayaLayanan,
    penghasilanBersih,
    waktuSelesai: new Date(),
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Hapus pesanan_driver (bukan idPesanan, tapi id dokumennya)
  await db.collection("pesanan_driver").doc(driverDoc.id).delete();

  alert("✅ Pesanan berhasil diselesaikan dan penghasilan driver telah ditambahkan.");
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
    // 🔍 Ambil data toko
    const tokoDoc = await db.collection("toko").doc(idToko).get();
    if (!tokoDoc.exists) {
      container.innerHTML = `<p style="color:red;">❌ Toko tidak ditemukan.</p>`;
      return;
    }

    const toko = tokoDoc.data();

    // 🔄 Ambil semua produk berdasarkan idToko
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
                <th>Deskripsi</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
    `;

    produkSnap.forEach(doc => {
      const p = doc.data();
      html += `
        <tr>
          <td>${p.namaProduk}</td>
          <td>Rp ${p.harga?.toLocaleString() || 0}</td>
          <td>${p.stok || 0}</td>
          <td>${p.deskripsi || '-'}</td>
          <td>
            <button onclick="editProduk('${doc.id}', '${idToko}')" class="btn-mini">✏️</button>
            <button onclick="hapusProduk('${doc.id}', '${idToko}')" class="btn-mini">🗑️</button>
          </td>
        </tr>
      `;
    });

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
  const alamatToko = document.getElementById("alamatToko").value.trim();
  const jamBuka = parseInt(document.getElementById("jamBuka").value);
  const jamTutup = parseInt(document.getElementById("jamTutup").value);
  const koordinatString = document.getElementById("koordinat").value.trim();

  if (!namaPemilik || !namaToko || !alamatToko || isNaN(jamBuka) || isNaN(jamTutup)) {
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
    alamatToko,
    jamBuka,
    jamTutup,
    koordinat,
    saldo: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await db.collection("toko").add(dataToko);
    const tokoId = docRef.id;

    alert("✅ Toko berhasil dibuat!");

    // Simpan idToko di localStorage agar bisa dipakai saat tambah produk
    localStorage.setItem("idToko", tokoId);

    // Arahkan ke halaman tambah produk langsung (opsional)
    formTambahProduk(tokoId);

    // Atau arahkan ulang ke dashboard untuk menampilkan tombol tambah produk
    // loadSellerDashboard();
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
      <form onsubmit="return simpanToko(event)">
        <label>Nama Pemilik</label>
        <input required id="namaPemilik" placeholder="Nama pemilik toko" />

        <label>Nama Toko</label>
        <input required id="namaToko" placeholder="Nama toko" />

        <label>Alamat Toko</label>
        <textarea required id="alamatToko" placeholder="Alamat lengkap toko"></textarea>

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

  let riwayat = [];
  try {
    const snapshot = await firebase.firestore()
      .collection("pesanan")
      .orderBy("waktuPesan", "desc")
      .get();

    riwayat = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching pesanan:", error);
    list.innerHTML = `<p class="riwayat-kosong">Gagal memuat riwayat pesanan.</p>`;
    return;
  }

  const now = Date.now();
  list.innerHTML = "";

  if (riwayat.length === 0) {
    list.innerHTML = `<p class="riwayat-kosong">Belum ada pesanan sebelumnya.</p>`;
    return;
  }

  riwayat.forEach((item, i) => {
    const waktuPesan = new Date(item.waktuPesan || now);
    const waktuPesanMs = waktuPesan.getTime();
    const stepLog = Array.isArray(item.stepsLog) ? item.stepsLog : [];

    const waktuFormatted = waktuPesan.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const statusClass = {
      Pending: "status-pending",
      Diproses: "status-diproses",
      Selesai: "status-selesai",
      Berhasil: "status-selesai",
      Dibatalkan: "status-dibatalkan",
      "Menunggu Pembayaran": "status-pending",
    }[item.status] || "status-pending";

    const historyList = stepLog
      .filter(log => log.timestamp <= now)
      .map(log => {
        const jam = new Date(log.timestamp).toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `<li>🕒 ${jam} - ${log.label}</li>`;
      })
      .join("") || "<li><i>Belum ada langkah berjalan</i></li>";

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

    const box = document.createElement("div");
    box.className = "riwayat-box";

    let tombolChat = "";
    if (item.idDriver && item.status !== "Dibatalkan") {
      tombolChat = `
        <button class="btn-chat-driver" onclick="loadContent('chat-driver', { idPesanan: '${item.id}', idDriver: '${item.idDriver}' })">💬 Chat Driver</button>
        <button class="btn-laporkan-driver" onclick="laporkanDriver('${item.id}', '${item.idDriver}')">⚠️ Laporkan Driver</button>
      `;
    }

    box.innerHTML = `
      <div class="riwayat-header">
        <h4 class="riwayat-id">🆔 ${item.id}</h4>
        <span class="riwayat-status ${statusClass}">${item.status}</span>
      </div>
      <div class="riwayat-produk-list">${produkList}</div>
      <p class="riwayat-subtotal"><strong>Subtotal:</strong> Rp${item.total?.toLocaleString() || 0}</p>
      <p class="riwayat-metode"><strong>Metode Pembayaran:</strong> ${item.metode?.toUpperCase() || "-"}</p>
      <p class="riwayat-tanggal"><small>Waktu Pesan: ${waktuFormatted}</small></p>

      <button class="btn-lihat-detail" onclick="toggleDetail(${i})">Lihat Detail</button>
      ${tombolChat}
      <div class="riwayat-detail" id="detail-${i}" style="display: none;">
        <p><strong>History Waktu:</strong></p>
        <ul class="riwayat-steps">${historyList}</ul>
      </div>
    `;

    list.appendChild(box);
  });
}

// ⏱️ Auto-refresh setiap 1 detik
setInterval(() => {
  const list = document.getElementById("riwayat-list");
  const page = localStorage.getItem("pageAktif") || "";

  if (page === "riwayat" && list && typeof renderRiwayat === "function") {
    renderRiwayat();
  }
}, 1000);

// Fungsi laporan driver
async function laporkanDriver(idPesanan, idDriver) {
  const alasan = prompt("Masukkan alasan laporan:");
  if (!alasan) return;

  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  await firebase.firestore().collection("laporan_driver").add({
    idPesanan,
    idDriver,
    idUser: user.uid,
    alasan,
    waktu: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("✅ Laporan berhasil dikirim.");
}




function toggleDetail(index) {
  const el = document.getElementById(`detail-${index}`);
  if (!el) return;

  const isHidden = el.style.display === "none" || el.style.display === "";

  // Sembunyikan semua detail lain
  document.querySelectorAll(".riwayat-detail").forEach(detail => {
    detail.style.display = "none";
  });

  // Tampilkan hanya jika sedang disembunyikan
  if (isHidden) {
    el.style.display = "block";
    // Tidak ada auto-scroll
  }
}


function konfirmasiPembayaran(id) {
  const now = Date.now();
  let riwayat = JSON.parse(localStorage.getItem("riwayat") || "[]");

  const updated = riwayat.map(item => {
    if (item.id === id && item.status === "Menunggu Pembayaran") {
      const estimasiMenit = 30; // atur sesuai sistemmu
      const estimasiMs = estimasiMenit * 60 * 1000;
      const waktuSelesai = now + estimasiMs;

      // Log aktivitas
      const stepsLog = [
        { label: "Pembayaran dikonfirmasi", timestamp: now },
        { label: "Driver menghubungi", timestamp: now + 0.05 * estimasiMs },
        { label: "Driver menuju resto", timestamp: now + 0.13 * estimasiMs },
        { label: "Pesanan diproses resto", timestamp: now + 0.63 * estimasiMs },
        { label: "Pesanan di-pickup", timestamp: now + 0.70 * estimasiMs },
        { label: "Driver menuju lokasi kamu", timestamp: now + 1.0 * estimasiMs },
      ];

      // ✅ Simpan codProgressState ke localStorage
      const codProgressState = stepsLog.map(log => ({
        label: log.label,
        timestamp: log.timestamp,
        status: "Pending"
      }));

      localStorage.setItem("codProgressState", JSON.stringify(codProgressState));

      return {
        ...item,
        status: "Diproses",
        waktuSelesai,
        stepsLog
      };
    }
    return item;
  });

  localStorage.setItem("riwayat", JSON.stringify(updated));
  renderRiwayat();
}


async function batalPesanan(id) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");

  const uid = user.uid;
  const db = firebase.firestore();

  // Ambil data user untuk cek role
  const userDoc = await db.collection("users").doc(uid).get();
  const userData = userDoc.exists ? userDoc.data() : null;
  if (!userData) return alert("User tidak ditemukan.");

  if (!["user", "driver", "admin"].includes(userData.role)) {
    return alert("Kamu tidak memiliki izin membatalkan pesanan.");
  }

  // Ambil data pesanan
  const pesananRef = db.collection("pesanan").doc(id);
  const pesananDoc = await pesananRef.get();
  if (!pesananDoc.exists) return alert("Pesanan tidak ditemukan.");

  const pesananData = pesananDoc.data();

  // Cek status pesanan, hanya bisa batal jika status masih memungkinkan
  if (["Dibatalkan", "Berhasil", "Selesai"].includes(pesananData.status)) {
    return alert("Pesanan sudah tidak bisa dibatalkan.");
  }

  // Konfirmasi pembatalan
  if (!confirm(`Batalkan pesanan ${id} atas kesepakatan bersama user?`)) return;

  const now = Date.now();
  const newLog = {
    label: userData.role === "driver" 
      ? "Pesanan dibatalkan oleh driver atas kesepakatan dengan user" 
      : "Pesanan dibatalkan oleh user",
    timestamp: now
  };

  const updatedStepsLog = Array.isArray(pesananData.stepsLog)
    ? [...pesananData.stepsLog, newLog]
    : [newLog];

  // Update status di Firestore
  await pesananRef.update({
    status: "Dibatalkan",
    stepsLog: updatedStepsLog,
    waktuSelesai: now
  });

  alert("❌ Pesanan berhasil dibatalkan.");
  renderRiwayat();
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
  const auth = firebase.auth();
  const user = auth.currentUser;

  if (!user) {
    container.innerHTML = "<p>Silakan login terlebih dahulu.</p>";
    return;
  }

  try {
    // ✅ Ambil koordinat user dari koleksi "alamat"
    const alamatDoc = await db.collection("alamat").doc(user.uid).get();
    if (!alamatDoc.exists || !alamatDoc.data().lokasi) {
      container.innerHTML = "<p>Koordinat pengguna tidak ditemukan.</p>";
      return;
    }

    const lokasiUser = alamatDoc.data().lokasi;  // Ini adalah GeoPoint
    const userLat = lokasiUser.latitude;
    const userLng = lokasiUser.longitude;

    // ✅ Ambil data toko berdasarkan namaToko
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

    // ✅ Ambil koordinat toko dari koleksi "toko"
    const koordinatToko = toko.koordinat;  // Asumsikan ini adalah GeoPoint
    if (!koordinatToko) {
      container.innerHTML = "<p>Koordinat toko tidak ditemukan.</p>";
      return;
    }

    const tokoLat = koordinatToko.latitude;
    const tokoLng = koordinatToko.longitude;

    // ✅ Hitung jarak toko ↔ user
    const jarakKm = hitungJarak(userLat, userLng, tokoLat, tokoLng);

    // ✅ Ambil produk berdasarkan sellerId (idUserToko)
    const produkSnapshot = await db.collection("produk")
      .where("sellerId", "==", toko.uid)  // Menggunakan sellerId yang disimpan di toko
      .get();

    const produkToko = produkSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      buka: toko.jamBuka,
      tutup: toko.jamTutup,
      tokoNama: toko.namaToko,
      jarak: `${jarakKm.toFixed(2)} km`
    }));

    const now = new Date();
    const jamSekarang = now.getHours();
    const deliveryAktif = jamSekarang >= 8 && jamSekarang < 20;

    let html = `
      <div class="toko-page">
        <div class="toko-header">
          <img src="${toko.foto || '/img/icon.png'}" alt="${toko.namaToko}" class="toko-foto">
          <div class="toko-detail">
            <h2>${toko.namaToko}</h2>
            <div class="toko-lokasi">📍 ${toko.lokasi || '-'}</div>
            <div class="toko-deskripsi">${toko.deskripsi || ''}</div>
            <div class="toko-jarak">📏 Jarak dari kamu: <strong>${jarakKm.toFixed(2)} km</strong></div>
          </div>
        </div>

        <hr class="toko-separator">
        <h2 class="produk-judul">🍽️ Daftar Produk</h2>
        <div id="produk-container">
    `;

    if (produkToko.length === 0) {
      html += `<p>Belum ada produk di toko ini.</p>`;
    } else {
      produkToko.forEach((produk, index) => {
        const buka = jamSekarang >= produk.buka && jamSekarang < produk.tutup;
        const tombolAktif = buka && deliveryAktif;
        const labelTombol = tombolAktif ? 'Tambah ke Keranjang' : (!deliveryAktif ? 'Delivery Tutup' : 'Toko Tutup');
        const disabledAttr = tombolAktif ? '' : 'disabled';

        html += `
          <div class="produk-horizontal">
            <div class="produk-body">
              <img src="${produk.gambar}" alt="${produk.nama}" class="produk-img" />
              <div class="produk-info">
                <h3 class="produk-nama">${produk.nama}</h3>
                <p class="produk-meta">Kategori: ${produk.kategori || '-'}</p>
                <p class="produk-meta">⭐ ${produk.rating || '-'} | ${produk.jarak} | ${produk.estimasi || '-'}</p>
                <div class="produk-action">
                  <strong>Rp ${Number(produk.harga || 0).toLocaleString()}</strong>
                  <button class="beli-btn"
                          data-index="${index}"
                          ${disabledAttr}>
                    ${labelTombol}
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

    // Event tombol beli
    document.querySelectorAll('.beli-btn').forEach((button, i) => {
      if (!button.disabled) {
        button.addEventListener('click', () => {
          tambahKeKeranjang(produkToko[i]);
        });
      }
    });

  } catch (err) {
    console.error("❌ Gagal memuat toko:", err);
    container.innerHTML = `<p style="color:red;">Terjadi kesalahan saat memuat halaman toko. Error: ${err.message}</p>`;
  }
}




// 🔁 Fungsi bantu untuk hitung jarak
function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius bumi (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function toRad(value) {
  return value * Math.PI / 180;
}




function setupStarRating() {
  const stars = document.querySelectorAll("#rating-stars span");
  const ratingInput = document.getElementById("review-rating");
  const label = document.getElementById("rating-label");

  const keterangan = {
    1: "😠 Sangat Buruk",
    2: "😕 Buruk",
    3: "😐 Biasa",
    4: "🙂 Bagus",
    5: "🤩 Sangat Bagus"
  };

  function updateStars(val) {
    stars.forEach(s => {
      const starVal = parseInt(s.getAttribute("data-value"));
      s.textContent = starVal <= val ? "⭐" : "☆";
    });
    label.textContent = keterangan[val];
    ratingInput.value = val;
  }

  stars.forEach(star => {
    star.addEventListener("click", () => {
      const val = parseInt(star.getAttribute("data-value"));
      updateStars(val);
    });
  });

  // Set nilai default 5
  updateStars(5);
}


function tampilkanReview() {
  const container = document.getElementById("review-display-container");
  const list = document.getElementById("review-list");

  const dataReview = [
    { nama: "Fajar", rating: 5, komentar: "Driver ramah dan cepat 👍" },
    { nama: "Lindy", rating: 4.9, komentar: "Makanan masih hangat sampai rumah" },
    { nama: "Nadine", rating: 4.8, komentar: "Recommended banget 🥰" }
  ];

  list.innerHTML = dataReview.map(r => `
    <div style="padding: 10px; border-bottom: 1px solid #ddd;">
      <strong>👤 ${r.nama}</strong> - ⭐ ${r.rating}<br/>
      <small style="color:#444;">"${r.komentar}"</small>
    </div>
  `).join("");

  container.style.display = "block";
}



function updateDriverRating() {
  const ratingEl = document.getElementById("driver-rating");
  const countEl = document.getElementById("rating-count");

  if (!ratingEl || !countEl) return;

  const startWaktu = new Date("2025-06-29T15:00:00+07:00"); // Waktu awal penilaian
  const sekarang = new Date();

  // Hitung berapa jam berlalu sejak 29/06 jam 15:00
  const selisihJam = Math.floor((sekarang - startWaktu) / (1000 * 60 * 60));
  const ratingCount = Math.max(1, selisihJam); // Minimal 1 rating

  // Rating tetap antara 4.9 s/d 5.0 dibulatkan ke .1 terdekat
  let ratingBulat = 4.9 + ((ratingCount % 4) * 0.1); // akan berulang 4.7–5
  if (ratingBulat > 5) ratingBulat = 5;

  // Pembulatan rating ke 1 desimal tetap 4.7, 4.8, 4.9, 5.0
  ratingBulat = Math.min(5, Math.round(ratingBulat * 10) / 10);

  // Update ke elemen HTML
  ratingEl.textContent = ratingBulat.toFixed(1);
  countEl.textContent = ratingCount.toLocaleString();
}


function kirimReviewKeTelegram() {
  const rating = document.getElementById("review-rating").value;
  const komentar = document.getElementById("review-comment").value.trim();

  if (!komentar) {
    alert("Tolong isi komentar terlebih dahulu.");
    return;
  }

  const nama = localStorage.getItem("nama") || "-";
  const wa = localStorage.getItem("wa") || "-";

  const pesan = `
📬 *Review Pesanan*

👤 Nama: ${nama}
📱 WA: wa.me/${wa}

⭐ Rating: ${rating}/5
🗣️ Komentar:
${komentar}
`.trim();

  fetch(`https://api.telegram.org/bot8012881635:AAEBqLZZz0jaA4Ek0GsvFkzuEXoknxiq8Rg/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: "6046360096",
      text: pesan,
      parse_mode: "Markdown"
    })
  })
  .then(res => {
    if (!res.ok) throw new Error("Gagal kirim review");
    alert("🎉 Terima kasih atas penilaian Anda!");
    document.getElementById("review-form-container").style.display = "none";
  })
  .catch(err => {
    alert("❌ Gagal mengirim ulasan.");
    console.error(err);
  });
}


function updatePengirimanInfo() {
  const toko = { lat: -1.6409437, lng: 105.7686011 };
  const custStr = localStorage.getItem("customerLocation");
  const cust = custStr ? JSON.parse(custStr) : toko;
  console.log("Lokasi pelanggan:", cust);

  const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, cust.lat, cust.lng);
  console.log("Jarak:", jarak);

  ["standard", "priority"].forEach(metode => {
    const ongkir = hitungOngkirDenganTipe(metode, jarak);
    const estimasi = estimasiWaktu(metode, jarak);
    console.log(metode, ongkir, estimasi);

    const elOngkir = document.getElementById(`ongkir-${metode}`);
    const elJarak = document.getElementById(`jarak-${metode}`);
    const elEstimasi = document.getElementById(`estimasi-${metode}`);

    if (elOngkir) elOngkir.textContent = `Rp${ongkir.toLocaleString()}`;
    if (elJarak) elJarak.textContent = `Jarak: ${jarak.toFixed(2)} km`;
    if (elEstimasi) elEstimasi.textContent = `Estimasi: ±${estimasi} menit`;
  });
}



let state = null;

function startCODProcess() {
  const searchingEl = document.getElementById("searching-driver");
  const driverFoundEl = document.getElementById("driver-found");
  const timelineContainer = document.getElementById("cod-timeline");
  const estimasiAkhirTibaEl = document.getElementById("estimasi-akhir-tiba");

  if (!searchingEl || !driverFoundEl || !timelineContainer || !estimasiAkhirTibaEl) {
    console.warn("Elemen halaman COD belum siap.");
    return;
  }

  const getSelectedDeliveryMethod = () => {
    const selected = document.querySelector('input[name="pengiriman"]:checked');
    return selected ? selected.value : "standard";
  };

  const estimasiMenit = parseInt(localStorage.getItem("estimasiMenit") || "0", 10);
  const estimasiTotalDetik = estimasiMenit * 60;
  const estimasiEndTimestamp = Date.now() + estimasiTotalDetik * 1000;

  const stepLabels = [
    "Driver Menghubungi kamu untuk melakukan konfirmasi",
    "Driver Menuju Resto",
    "Pesanan diproses Resto",
    "Pesanan di Pickup Driver",
    "Driver Menuju alamatmu"
  ];

  const stepRelativeDurations = getSelectedDeliveryMethod() === "priority"
    ? [0.05, 0.08, 0.4, 0.07, 0.4]
    : [0.07, 0.12, 0.5, 0.07, 0.24];

  const timelineData = stepLabels.map((label, i) => ({
    label,
    duration: Math.floor(stepRelativeDurations[i] * estimasiTotalDetik),
  }));

  function updateEstimasiAkhir() {
    const now = Date.now();
    const remainingMs = estimasiEndTimestamp - now;

    if (remainingMs <= 0) {
      estimasiAkhirTibaEl.textContent = "Pesanan diperkirakan sudah tiba.";
      clearInterval(countdownInterval);
      return;
    }

    const sisa = Math.floor(remainingMs / 1000);
    const jam = Math.floor(sisa / 3600);
    const menit = Math.floor((sisa % 3600) / 60);
    const detik = sisa % 60;
    const waktuTiba = new Date(estimasiEndTimestamp);
    const h = waktuTiba.getHours().toString().padStart(2, "0");
    const m = waktuTiba.getMinutes().toString().padStart(2, "0");

    estimasiAkhirTibaEl.textContent = `Estimasi tiba sekitar pukul ${h}:${m} (${jam ? `${jam}j ` : ""}${menit}m ${detik}d tersisa)`;
  }

  updateEstimasiAkhir();
  const countdownInterval = setInterval(updateEstimasiAkhir, 1000);

  searchingEl.style.display = "block";
  driverFoundEl.style.display = "none";
  localStorage.removeItem("codProgressState");

  const searchDuration = 10000 + Math.random() * 10000;

  setTimeout(() => {
    searchingEl.style.display = "none";
    driverFoundEl.style.display = "block";
    startTimeline(timelineData, timelineContainer, countdownInterval);
  }, searchDuration);
}


function kirimNotifikasiStep(label) {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    new Notification("🚚 Update Pengiriman", {
      body: label,
      icon: "https://i.ibb.co/gR3qQFt/driver-icon.png",
    });
  }
}

function startTimeline(timeline, container, countdownInterval) {
  let timelineState = JSON.parse(localStorage.getItem("codProgressState"));

  if (timelineState && Date.now() - timelineState.startTimestamp > 3600000) {
    state = null;
    localStorage.removeItem("codProgressState");
  }

  if (!timelineState) {
    timelineState = {
      startTimestamp: Date.now(),
      currentStep: 0,
      stepStartTimestamp: Date.now(),
      stepsLog: []
    };
    localStorage.setItem("codProgressState", JSON.stringify(timelineState));
  }

  function renderStep(stepIndex, progressPercent, stepStartTime) {
    const step = timeline[stepIndex];
    const isCompleted = stepIndex < timelineState.currentStep;
    const isCurrent = stepIndex === timelineState.currentStep;
    const waktu = new Date(stepStartTime);
    const h = waktu.getHours().toString().padStart(2, "0");
    const m = waktu.getMinutes().toString().padStart(2, "0");

    const icons = [
      '<i class="fa-solid fa-phone fa-shake"></i>',
      '<i class="fa-solid fa-truck-fast fa-bounce"></i>',
      '<i class="fa-solid fa-utensils fa-shake"></i>',
      '<i class="fa-solid fa-box fa-bounce"></i>',
      '<i class="fa-solid fa-house-person-return"></i>'
    ];

    return `
      <li class="${isCompleted ? "completed" : isCurrent ? "active" : "pending"}">
        <div class="status-label">${step.label}</div>
        <div class="step-bottom-row">
          <span class="status-icon"><i class="fa-solid fa-motorcycle"></i></span>
          <div class="progress-bar-wrapper">
            <div class="progress-bar"><div style="width: ${Math.min(100, progressPercent)}%;"></div></div>
          </div>
          <span class="step-icon">${icons[stepIndex]}</span>
          <span class="realtime-time">(${h}:${m})</span>
        </div>
      </li>`;
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





let countdownStarted = false;

function startTransferCountdown() {
  const start = parseInt(localStorage.getItem("transferStart"));
  const duration = 5 * 60 * 1000;
  const end = start + duration;
  const enableTime = start + 2 * 60 * 1000; // Tombol aktif setelah 2 menit

  const interval = setInterval(() => {
    const now = Date.now();
    const remaining = end - now;

    const el = document.getElementById("transfer-countdown");
    const btn = document.getElementById("btn-konfirmasi-transfer");

    if (!el) return clearInterval(interval);

    // Aktifkan tombol setelah 2 menit
    if (btn && now >= enableTime && btn.disabled) {
      btn.disabled = false;
      btn.textContent = "✅ Saya Sudah Bayar";
    }

    if (remaining <= 0) {
      el.textContent = "⏱️ Waktu transfer habis!";
      clearInterval(interval);
      setTimeout(() => {
        localStorage.removeItem("transferStart");
        countdownStarted = false;
        loadContent('home');
      }, 3000);
      return;
    }

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    el.textContent = `⏱️ Sisa waktu transfer: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, 1000);
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

  // ✅ Update status riwayat pembayaran
  const riwayat = JSON.parse(localStorage.getItem("riwayat") || "[]");
  const latest = riwayat[0];

  if (latest && latest.metode === "transfer" && latest.status === "Menunggu Pembayaran") {
    latest.status = "Diproses";

    const now = Date.now();
    const newLog = {
      label: "Pembayaran dikonfirmasi",
      timestamp: now
    };

    latest.stepsLog = Array.isArray(latest.stepsLog) ? [...latest.stepsLog, newLog] : [newLog];
    latest.waktuPesan = now;

    riwayat[0] = latest;
    localStorage.setItem("riwayat", JSON.stringify(riwayat));

    alert("✅ Pembayaran dikonfirmasi. Status pesanan sekarang Diproses.");
    if (document.getElementById("riwayat-list")) renderRiwayat();
  }
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

  // Ambil total checkout
  let nominal = parseInt(localStorage.getItem("checkoutTotal") || "0");
  if (isNaN(nominal) || nominal <= 0) {
    console.warn("❌ checkoutTotal tidak valid. Nominal diset 0.");
    nominal = 0;
  }

  // Tambahkan biaya tambahan jika ada
  if (method === "dana") {
    nominal += 1000;
  } else if (method === "qris") {
    nominal += Math.round(nominal * 0.01);
  }

  // Buat kode unik 3 digit
  const kodeUnik = Math.floor(Math.random() * 900 + 100);
  const nominalFinal = nominal + kodeUnik;

  // Simpan nominal final ke localStorage untuk konfirmasi WA
  localStorage.setItem("transferNominalFinal", nominalFinal.toString());

  // HTML builder
  let html = `
    <div class="transfer-alert">
      ⚠️ <strong>Transfer sesuai nominal sampai 3 digit terakhir!</strong><br/>
      Admin akan memverifikasi berdasarkan nominal unik.
    </div>
  `;

  if (method === "qris") {
    html += `
      <div class="qris-box">
        <img src="${info.img}" alt="QRIS" class="qris-img" />
        <p><strong>Silakan scan QRIS untuk membayar</strong></p>
        <p>Nominal: <span class="nominal-copy" onclick="copyNominal(${nominalFinal})">Rp ${nominalFinal.toLocaleString()}</span></p>
      </div>
    `;
  } else {
    html += `
      <div class="rekening-box">
        <p><strong>${info.bank}</strong></p>
        <p><strong>${info.nama}</strong></p>
        <p>No. Rekening: <strong class="rekening-copy" onclick="copyRekening('${info.norek}')">${info.norek}</strong></p>
        <p>Nominal Transfer (termasuk kode unik): <span class="nominal-copy" onclick="copyNominal(${nominalFinal})">Rp ${nominalFinal.toLocaleString()}</span></p>
        <p class="kode-unik-info">Kode unik kamu: <b>${kodeUnik}</b></p>
      </div>
    `;
  }

  // Render ke elemen
  const container = document.getElementById("transfer-info");
  if (container) container.innerHTML = html;
}



  navigator.clipboard.writeText(norek).then(() => {
    alert("✅ Nomor rekening berhasil disalin!");
  });
}


async function prosesCheckout() {
  const user = firebase.auth().currentUser;
  if (!user) return alert("Silakan login terlebih dahulu.");
  const uid = user.uid;
  const db = firebase.firestore();

  const metodePembayaran = document.getElementById("metode-pembayaran")?.value || "saldo";

  const alamatDoc = await db.collection("alamat").doc(uid).get();
  if (!alamatDoc.exists) return alert("❌ Alamat belum tersedia.");
  const { nama, noHp, alamat, lokasi } = alamatDoc.data();

  const keranjangDoc = await db.collection("keranjang").doc(uid).get();
  const items = keranjangDoc.exists ? keranjangDoc.data().items || [] : [];
  if (items.length === 0) return alert("❌ Keranjang kosong.");

  const produk = items;
  const estimasiTotalMenit = produk.reduce((total, item) => total + (parseInt(item.estimasi) || 10), 0);
  const subtotalProduk = produk.reduce((total, item) => total + (item.harga * item.jumlah), 0);
  const totalOngkir = [...new Set(produk.map(i => i.idToko))].reduce((sum, idToko) => {
    const produkDariToko = produk.filter(i => i.idToko === idToko);
    return sum + (produkDariToko[0]?.ongkir || 0);
  }, 0);

  const metodePengiriman = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  const catatanPesanan = document.getElementById("catatan-pesanan")?.value.trim() || "-";

  const potongan = 0;
  const biayaLayanan = Math.round((subtotalProduk + totalOngkir - potongan) * 0.01);
  const totalBayar = subtotalProduk + totalOngkir + biayaLayanan - potongan;
  if (totalBayar <= 0) return alert("❌ Total bayar tidak valid.");

  let wa = noHp;
  if (wa.startsWith("08")) wa = "628" + wa.slice(2);

  if (metodePembayaran === "saldo") {
    const userDoc = await db.collection("users").doc(uid).get();
    const saldo = userDoc.exists ? userDoc.data().saldo || 0 : 0;
    if (saldo < totalBayar) return alert(`❌ Saldo tidak cukup. Saldo kamu: Rp ${saldo.toLocaleString()}`);
  }

  const random = Math.floor(Math.random() * 100000);
  const now = Date.now();
  const today = new Date();
  const idPesanan = `ORD-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${random}`;
  const waktuTiba = new Date(now + estimasiTotalMenit * 60000);
  const statusAwal = "Pending";
  const waktuPesanStr = new Date(now).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
  const stepsLog = [`${waktuPesanStr} Pesanan dibuat (${statusAwal})`];

  const dataPesanan = {
    id: idPesanan,
    userId: uid,
    nama,
    noHp: wa,
    alamat,
    lokasi: lokasi || null,
    produk,
    catatan: catatanPesanan,
    metode: metodePembayaran,
    pengiriman: metodePengiriman,
    estimasiMenit: estimasiTotalMenit,
    status: statusAwal,
    stepsLog,
    waktuPesan: now,
    waktuTiba: waktuTiba.getTime(),
    subtotalProduk,
    totalOngkir,
    biayaLayanan,
    potongan,
    total: totalBayar,
    sudahDiprosesPembayaran: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("pesanan").doc(idPesanan).set(dataPesanan);
  await db.collection("keranjang").doc(uid).delete();

  const groupedByToko = {};
  produk.forEach(item => {
    if (!groupedByToko[item.idToko]) groupedByToko[item.idToko] = [];
    groupedByToko[item.idToko].push(item);
  });

  for (const idToko in groupedByToko) {
    const produkToko = groupedByToko[idToko];
    const subtotalToko = produkToko.reduce((sum, item) => sum + (item.harga * item.jumlah), 0);
    const ongkirToko = produkToko[0].ongkir || 0;
    const estimasiToko = produkToko.reduce((sum, item) => sum + (parseInt(item.estimasi) || 10), 0);

    await db.collection("pesanan_penjual").add({
      idPesanan,
      idToko,
      namaPembeli: nama,
      noHpPembeli: wa,
      alamat,
      metode: metodePembayaran,
      pengiriman: metodePengiriman,
      status: statusAwal,
      produk: produkToko,
      subtotalProduk: subtotalToko,
      ongkir: ongkirToko,
      estimasiMenit: estimasiToko,
      waktuPesan: now,
      waktuTiba: new Date(now + estimasiToko * 60000).getTime(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  function geoPointToLatLng(geo) {
    if (!geo) return null;
    if (geo.latitude !== undefined && geo.longitude !== undefined) {
      return { lat: geo.latitude, lng: geo.longitude };
    } else if (geo.lat !== undefined && geo.lng !== undefined) {
      return { lat: geo.lat, lng: geo.lng };
    }
    return null;
  }

  function hitungJarakKM(pos1Raw, pos2Raw) {
    const pos1 = geoPointToLatLng(pos1Raw);
    const pos2 = geoPointToLatLng(pos2Raw);
    if (!pos1 || !pos2) return NaN;

    const R = 6371;
    const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const dLng = (pos2.lng - pos1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(pos1.lat * Math.PI / 180) * Math.cos(pos2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  const driverSnap = await db.collection("driver").get();

  let nearestDriver = null;
  let minJarak = Infinity;

  const idTokoPertama = produk[0]?.idToko;
  const tokoDoc = await db.collection("toko").doc(idTokoPertama).get();
  const lokasiTokoGeo = tokoDoc.exists ? tokoDoc.data().koordinat : null;

  if (!lokasiTokoGeo) {
    alert("❌ Lokasi toko belum tersedia.");
    return;
  }

  for (const doc of driverSnap.docs) {
    const idDriver = doc.id;
    const data = doc.exists ? doc.data() : {};

    if (data.status !== "aktif") continue;
    if (!data.lokasi || !data.lokasi.lat || !data.lokasi.lng) continue;

    const pesananAktif = await db.collection("pesanan_driver")
      .where("idDriver", "==", idDriver)
      .get();

    const sedangProses = pesananAktif.docs.some(d => {
      const s = d.data().status;
      return ["Diterima", "Menuju Resto", "Pickup Pesanan", "Menuju Customer"].includes(s);
    });

    if (sedangProses) continue;

    const jarak = hitungJarakKM(data.lokasi, lokasiTokoGeo);
    if (jarak < minJarak) {
      nearestDriver = { id: idDriver, lokasi: data.lokasi };
      minJarak = jarak;
    }
  }

  if (!nearestDriver) {
    alert("❌ Tidak ada driver aktif & bebas saat ini. Silakan coba lagi nanti.");
    await db.collection("pesanan").doc(idPesanan).delete();
    return;
  }

  await db.collection("pesanan_driver").doc(idPesanan).set({
    idDriver: nearestDriver.id,
    idPesanan,
    status: "Menuju Resto",
    waktuAmbil: null,
    produk,
    lokasiDriver: nearestDriver.lokasi,
    lokasiToko: lokasiTokoGeo,
    lokasiCustomer: lokasi,
    jarakDriverKeToko: hitungJarakKM(nearestDriver.lokasi, lokasiTokoGeo),
    jarakTokoKeCustomer: hitungJarakKM(lokasiTokoGeo, lokasi),
    metode: metodePembayaran,
    total: totalBayar,
    totalOngkir,
    biayaLayanan,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

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

  produkContainer.innerHTML = '<p>Memuat produk...</p>';

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

    const produkSnapshot = await db.collection("produk").get();
    const produkList = produkSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (produkList.length === 0) {
      produkContainer.innerHTML = '<p>Produk tidak tersedia.</p>';
      return;
    }

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
        koordinat: geo
      };
    });

    const produkGabung = produkList.map(produk => {
      const tokoInfo = tokoMap[produk.idToko] || {
        namaToko: 'Unknown Toko',
        buka: 0,
        tutup: 0,
        koordinat: { lat: 0, lng: 0 }
      };

      const lat2 = tokoInfo.koordinat.lat;
      const lon2 = tokoInfo.koordinat.lng;

      if ([lat1, lon1, lat2, lon2].some(coord => isNaN(coord) || coord === 0)) {
        return {
          ...produk,
          tokoNama: tokoInfo.namaToko,
          buka: tokoInfo.buka,
          tutup: tokoInfo.tutup,
          jarak: "N/A"
        };
      }

      const jarakKm = hitungJarak(lat1, lon1, lat2, lon2);
      const jarak = `${jarakKm.toFixed(2)} km`;

      return {
        ...produk,
        tokoNama: tokoInfo.namaToko,
        buka: tokoInfo.buka,
        tutup: tokoInfo.tutup,
        jarak
      };
    });

    const parseRating = (r) => {
      const rating = parseFloat(r);
      return isNaN(rating) ? 0 : rating;
    };

    const produkUrut = [...produkGabung].sort((a, b) => parseRating(b.rating) - parseRating(a.rating));

    const jamSekarang = new Date().getHours();
    let html = '';

    produkUrut.forEach((produk, index) => {
      const tokoBuka = cekTokoBuka(jamSekarang, produk.buka, produk.tutup);
      const tombolAktif = tokoBuka;
      const labelTombol = tombolAktif ? 'Tambah ke Keranjang' : 'Toko Tutup';
      const disabledAttr = tombolAktif ? '' : 'disabled';
      const tokoSafe = (produk.tokoNama || '').replace(/'/g, "\\'");
      const gambarProduk = produk.urlGambar || './img/toko-pict.png';

      console.log({
        namaProduk: produk.namaProduk,
        toko: produk.tokoNama,
        jamBuka: produk.buka,
        jamTutup: produk.tutup,
        jamSekarang,
        tokoBuka
      });

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
                <button class="beli-btn"
                        data-index="${index}"
                        ${disabledAttr}>
                  ${labelTombol}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    produkContainer.innerHTML = html;

    document.querySelectorAll('.beli-btn').forEach(button => {
      if (!button.disabled) {
        button.addEventListener('click', () => {
          const index = button.getAttribute('data-index');
          tambahKeKeranjang(produkUrut[index]);
        });
      }
    });

  } catch (error) {
    console.error("❌ Gagal memuat produk:", error);
    produkContainer.innerHTML = `<p style="color:red;">Gagal memuat produk.</p>`;
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
    const map = L.map('leafletMap').setView(toko.koordinat ? [toko.koordinat.latitude, toko.koordinat.longitude] : [-1.63, 105.77], 13);
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



async function tambahKeKeranjang(produk) {
  const user = firebase.auth().currentUser;
  if (!user) return alert("❌ Harap login terlebih dahulu.");

  const db = firebase.firestore();
  const keranjangRef = db.collection("keranjang").doc(user.uid);

  try {
    // Ambil lokasi user dari alamat (GeoPoint)
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

    // Validasi produk memiliki idToko
    if (!produk.idToko) throw new Error("Produk tidak memiliki idToko");

    // Ambil lokasi toko dari GeoPoint
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

    // Hitung jarak dalam km
    const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, cust.lat, cust.lng);

    // Estimasi waktu
    const estimasiMasak = parseInt(produk.estimasi) || 10;
    const estimasiKirim = Math.ceil(jarak * 4); // 4 menit/km
    const totalEstimasi = estimasiMasak + estimasiKirim;

    // Hitung ongkir
    let ongkir = 8000;
    if (jarak > 2) ongkir += Math.ceil(jarak - 2) * 1500;

    // Ambil isi keranjang
    const snap = await keranjangRef.get();
    let items = snap.exists ? snap.data().items || [] : [];

    const index = items.findIndex(i => i.nama === produk.namaProduk && i.idToko === produk.idToko);

    if (index !== -1) {
      items[index].jumlah += 1;
    } else {
      items.push({
        nama: produk.namaProduk,
        idToko: produk.idToko,
        harga: produk.harga,
        gambar: produk.urlGambar || produk.gambar || './img/toko-pict.png',
        jumlah: 1,
        estimasi: totalEstimasi,
        ongkir: ongkir,
        jarak: jarak.toFixed(2),
        status: "menunggu",
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
  } catch (e) {
    console.error("❌ Gagal tambah ke keranjang:", e.message);
    alert("❌ Gagal menambahkan ke keranjang: " + e.message);
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



