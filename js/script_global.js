///  BATAS  ////

function startCountdownTimers() {
  const countdownElements = document.querySelectorAll(".countdown-time");

  countdownElements.forEach(el => {
    const end = parseInt(el.getAttribute("data-end"));
    const index = el.getAttribute("data-index");

    if (!end || isNaN(end)) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = end - now;

      if (remaining <= 0) {
        el.textContent = "00:00";
        clearInterval(interval);

        // Opsional: sembunyikan tombol jika waktu habis
        const detailBox = document.getElementById(`detail-${index}`);
        if (detailBox) {
          const btnBatal = detailBox.querySelector(".btn-batal-pesanan");
          if (btnBatal) btnBatal.style.display = "none";
        }

        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      el.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }, 1000);
  });
}



function nonaktifkanTombolCheckoutJikaTutup() {
  const btn = document.querySelector(".checkout-btn-final");
  const hour = new Date().getHours();
  const isOpen = hour >= 8 && hour < 22;

  if (btn) {
    if (!isOpen) {
      btn.disabled = true;
      btn.textContent = "Layanan Tutup";
      btn.style.opacity = "0.6";
      btn.style.cursor = "not-allowed";
    } else {
      btn.disabled = false;
      btn.textContent = "Buat Pesanan";
      btn.style.opacity = "1";
      btn.style.cursor = "pointer";
    }
  }
}

function renderDetailRiwayat(item) {
  const container = document.getElementById("riwayat-detail-container");
  if (!container) return;

  const now = Date.now();

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

  const visibleSteps = (item.stepsLog || []).filter(step => step.timestamp <= now);

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





function renderRiwayat() {
  const list = document.getElementById("riwayat-list");
  if (!list) return;

  const now = Date.now();
  let riwayat = JSON.parse(localStorage.getItem("riwayat") || "[]");

  let updated = false;

  riwayat = riwayat.map(item => {
    // ❌ Lewati update jika sudah dibatalkan, berhasil, atau selesai
    if (["Dibatalkan", "Berhasil", "Selesai"].includes(item.status)) return item;

    // ✅ Tandai selesai otomatis jika waktu selesai sudah lewat
    if (item.status === "Diproses" && now > (item.waktuSelesai || 0)) {
      updated = true;
      const newLog = { label: "Pesanan selesai", timestamp: now };
      const stepsLog = Array.isArray(item.stepsLog) ? [...item.stepsLog, newLog] : [newLog];
      return { ...item, status: "Berhasil", stepsLog };
    }

    // ✅ Batalkan otomatis jika metode transfer & tidak dibayar dalam 5 menit
    if (item.metode === "transfer" && item.status === "Menunggu Pembayaran" && now > (item.waktuPesan + 5 * 60 * 1000)) {
      updated = true;
      const newLog = { label: "Pesanan dibatalkan karena tidak dibayar", timestamp: now };
      const stepsLog = Array.isArray(item.stepsLog) ? [...item.stepsLog, newLog] : [newLog];
      return { ...item, status: "Dibatalkan", stepsLog, waktuSelesai: null };
    }

    return item;
  });

  if (updated) {
    localStorage.setItem("riwayat", JSON.stringify(riwayat));
  }

  // ✅ Urutkan dari terbaru ke lama
  riwayat.sort((a, b) => (b.waktuPesan || 0) - (a.waktuPesan || 0));
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
      hour: "2-digit", minute: "2-digit"
    });

    const statusClass = {
      Berhasil: "status-selesai",
      Diproses: "status-proses",
      Dibatalkan: "status-batal",
      "Menunggu Pembayaran": "status-menunggu"
    }[item.status] || "status-unknown";

    const historyList = stepLog
      .filter(log => log.timestamp <= now)
      .map(log => {
        const jam = new Date(log.timestamp).toLocaleTimeString("id-ID", {
          hour: "2-digit", minute: "2-digit"
        });
        return `<li>🕒 ${jam} - ${log.label}</li>`;
      }).join("") || "<li><i>Belum ada langkah berjalan</i></li>";

    const produkList = (item.produk || []).map(p => `
      <div class="riwayat-item-produk">
        <img src="${p.gambar || 'https://via.placeholder.com/60'}" alt="${p.nama}" class="riwayat-item-img" />
        <div class="riwayat-item-info">
          <div class="riwayat-item-nama">${p.nama}</div>
          <div class="riwayat-item-jumlah">Jumlah: x${p.jumlah}</div>
          <div class="riwayat-item-harga">Total: Rp${(p.harga * p.jumlah).toLocaleString()}</div>
        </div>
      </div>
    `).join("");

    const tampilCountdownCOD = item.metode === "cod" && item.status === "Diproses" && now <= (item.waktuPesan + 2 * 60 * 1000);
    const tampilCountdownTransfer = item.metode === "transfer" && item.status === "Menunggu Pembayaran" && now <= (item.waktuPesan + 5 * 60 * 1000);

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

      <button class="btn-lihat-detail" onclick="toggleDetail(${i})">Lihat Detail</button>
      <div class="riwayat-detail" id="detail-${i}" style="display: none;">
        <p><strong>History Waktu:</strong></p>
        ${historyList}

        ${tampilCountdownCOD ? `
          <div class="countdown-box">⏱️ Sisa waktu pembatalan:
            <span class="countdown-time" data-end="${waktuPesanMs + 2 * 60 * 1000}" data-index="${i}">--:--</span>
          </div>
          <button class="btn-batal-pesanan" onclick="batalPesanan('${item.id}')">❌ Batalkan Pesanan</button>
        ` : ""}

        ${tampilCountdownTransfer ? `
          <div class="countdown-box">⏱️ Sisa waktu pembayaran:
            <span class="countdown-time" data-end="${item.waktuPesan + 5 * 60 * 1000}" data-index="${i}">--:--</span>
          </div>
          <button class="btn-bayar-pesanan" onclick="konfirmasiPembayaran('${item.id}')">✅ Saya Sudah Bayar</button>
          <button class="btn-batal-pesanan" onclick="batalPesanan('${item.id}')">❌ Batalkan Pesanan</button>
        ` : ""}
      </div>
    `;

    list.appendChild(box);
  });

  startCountdownTimers();
}


// ✅ Auto-refresh renderRiwayat setiap 1 detik jika halaman aktif adalah 'riwayat'
setInterval(() => {
  const list = document.getElementById("riwayat-list");
  const page = localStorage.getItem("pageAktif") || "";

  if (page === "riwayat" && list && typeof renderRiwayat === "function") {
    renderRiwayat();
    // console.log("🔁 Auto-refresh riwayat aktif");
  }
}, 1000);

function hapusTransferStartJikaKadaluarsa() {
  const start = parseInt(localStorage.getItem("transferStart"));
  if (!start) return;
  const now = Date.now();
  const batas = 5 * 60 * 1000;
  if (now - start > batas) {
    localStorage.removeItem("transferStart");
    console.log("✅ transferStart dihapus karena sudah lebih dari 5 menit.");
  }
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
  const now = Date.now();
  let riwayat = JSON.parse(localStorage.getItem("riwayat") || "[]");

  const updated = riwayat.map(item => {
    if ((item.id === id) && (item.status === "Diproses" || item.status === "Menunggu Pembayaran")) {
      const newLog = { label: "Pesanan dibatalkan oleh user", timestamp: now };
      const stepsLog = Array.isArray(item.stepsLog) ? [...item.stepsLog, newLog] : [newLog];
      return {
        ...item,
        status: "Dibatalkan",
        stepsLog,
        waktuSelesai: null
      };
    }
    return item;
  });

  localStorage.setItem("riwayat", JSON.stringify(updated));

  const codState = JSON.parse(localStorage.getItem("codProgressState") || "[]");
  const newCodState = codState.filter(item => item.id !== id);
  localStorage.setItem("codProgressState", JSON.stringify(newCodState));

  const batal = updated.find(i => i.id === id);
  if (batal) {
    const waFixed = batal.wa.replace(/^0/, '62');
    const linkKonfirmasi = `https://wa.me/${waFixed}?text=${encodeURIComponent(
      `Halo ${batal.nama},\n\nPesanan kamu dengan ID *${batal.id}* telah berhasil dibatalkan atas permintaan kamu.` +
      `\n\nJika ini tidak disengaja atau kamu ingin membuat ulang pesanan, silakan hubungi kami kembali melalui link berikut:\n${"https://wa.me/" + waFixed}`
    )}`;

    const teks = `
🚫 *Pembatalan Pesanan oleh Pengguna*

📅 *Waktu Pembatalan:* ${new Date(now).toLocaleString("id-ID")}
🆔 *ID Pesanan:* ${batal.id}
👤 *Nama:* ${batal.nama}
📱 *WhatsApp:* [Hubungi User](https://wa.me/${waFixed})
🏠 *Alamat:* ${batal.alamat}
💬 *Catatan:* ${batal.catatan}
💰 *Total:* Rp${(batal.total || 0).toLocaleString()}
💳 *Metode Pembayaran:* ${batal.metode?.toUpperCase() || "-"}
🚚 *Jenis Pengiriman:* ${batal.pengiriman?.toUpperCase() || "-"}

📌 *Status:* DIBATALKAN oleh user sebelum pesanan diproses sepenuhnya.

🔗 *Balas/Follow up:* [Klik untuk Balas User](${linkKonfirmasi})
    `.trim();

    try {
      await fetch(`https://api.telegram.org/bot8012881635:AAEBqLZZz0jaA4Ek0GsvFkzuEXoknxiq8Rg/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "6046360096",
          text: teks,
          parse_mode: "Markdown"
        })
      });
    } catch (err) {
      console.error("❌ Gagal kirim pembatalan ke Telegram", err);
    }
  }

  renderRiwayat();
  alert("❌ Pesanan telah berhasil dibatalkan dan dicatat dalam sistem.");
}




function filterProduk() {
  const keyword = document.getElementById("search-input").value.trim().toLowerCase();
  const kategori = document.getElementById("filter-kategori").value;
  const produkContainer = document.getElementById("produk-container");

  produkContainer.innerHTML = "";

  const now = new Date();
  const jamSekarang = now.getHours();
  const deliveryAktif = jamSekarang >= 8 && jamSekarang < 22;

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



function renderTokoPage(namaToko) {
  const toko = tokoList.find(t => t.nama === namaToko);
  const produkToko = produkData.filter(p => p.toko === namaToko);

  if (!toko) {
    document.getElementById("page-container").innerHTML = `<p>Toko tidak ditemukan.</p>`;
    return;
  }

  const now = new Date();
  const jamSekarang = now.getHours();
  const deliveryAktif = jamSekarang >= 8 && jamSekarang < 22;
  const tokoBuka = jamSekarang >= toko.buka && jamSekarang < toko.tutup;

  const content = `
    <div class="toko-page">
      <div class="toko-header">
        <img src="${toko.foto}" alt="${toko.nama}" class="toko-foto">
        <div class="toko-detail">
          <h2>${toko.nama}</h2>
          <div class="toko-lokasi">📍 ${toko.lokasi}</div>
          <div class="toko-deskripsi">${toko.deskripsi}</div>
        </div>
      </div>

      <hr class="toko-separator">
      <h2 class="produk-judul">🍽️ Daftar Produk</h2>

      <div id="produk-container">
        ${produkToko.map((produk, index) => {
          const buka = jamSekarang >= produk.buka && jamSekarang < produk.tutup;
          const tombolAktif = buka && deliveryAktif;
          const labelTombol = tombolAktif ? 'Tambah ke Keranjang' : (!deliveryAktif ? 'Delivery Tutup' : 'Toko Tutup');
          const disabledAttr = tombolAktif ? '' : 'disabled';

          return `
            <div class="produk-horizontal">
              <div class="produk-body">
                <img src="${produk.gambar}" alt="${produk.nama}" class="produk-img" />
                <div class="produk-info">
                  <h3 class="produk-nama">${produk.nama}</h3>
                  <p class="produk-meta">Kategori: ${produk.kategori}</p>
                  <p class="produk-meta">⭐ ${produk.rating} | ${produk.jarak} | ${produk.estimasi}</p>
                  <div class="produk-action">
                    <strong>Rp ${produk.harga.toLocaleString()}</strong>
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
        }).join('')}
      </div>
    </div>
  `;

  document.getElementById("page-container").innerHTML = content;

  // Pasang event listener hanya untuk tombol aktif
  document.querySelectorAll('.beli-btn').forEach((button, i) => {
    if (!button.disabled) {
      button.addEventListener('click', () => {
        tambahKeKeranjang(produkToko[i]);
      });
    }
  });
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
  let state = JSON.parse(localStorage.getItem("codProgressState"));

  if (state && Date.now() - state.startTimestamp > 3600000) {
    state = null;
    localStorage.removeItem("codProgressState");
  }

  if (!state) {
    state = {
      startTimestamp: Date.now(),
      currentStep: 0,
      stepStartTimestamp: Date.now(),
      stepsLog: []
    };
    localStorage.setItem("codProgressState", JSON.stringify(state));
  }

  function renderStep(stepIndex, progressPercent, stepStartTime) {
    const step = timeline[stepIndex];
    const isCompleted = stepIndex < state.currentStep;
    const isCurrent = stepIndex === state.currentStep;
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

  function updateTimeline() {
    const now = Date.now();
    let stepElapsed = Math.floor((now - state.stepStartTimestamp) / 1000);
    const stepDuration = timeline[state.currentStep].duration;
    let progressPercent = (stepElapsed / stepDuration) * 100;

    if (stepElapsed >= stepDuration) {
      // Simpan log waktu
      state.stepsLog.push({
        step: timeline[state.currentStep].label,
        time: new Date().toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })
      });

      state.currentStep++;
      if (state.currentStep >= timeline.length) {
        container.innerHTML = `
          <p style="color:green; font-weight:bold; font-size: 1.1rem; margin-top: 1rem;">
            🎉 Pesanan telah selesai dikirim!
          </p>`;

        const reviewForm = document.getElementById("review-form-container");
        if (reviewForm) reviewForm.style.display = "block";
        if (typeof tampilkanReview === "function") tampilkanReview();

        new Notification("🎉 Pesanan Tiba!", {
          body: "Pesananmu telah sampai. Jangan lupa beri rating ya!",
          icon: "https://i.ibb.co/gR3qQFt/driver-icon.png"
        });

        localStorage.removeItem("codProgressState");
        localStorage.removeItem("estimasiMenit");
        localStorage.removeItem("ongkir");
        localStorage.removeItem("totalBayar");

        clearInterval(intervalId);
        clearInterval(countdownInterval);
        return;
      } else {
        state.stepStartTimestamp = now;
        stepElapsed = 0;
        progressPercent = 0;

        // Kirim notifikasi step baru
        kirimNotifikasiStep(timeline[state.currentStep].label);
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
  const intervalId = setInterval(updateTimeline, 1000);
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


function copyRekening(norek) {
  navigator.clipboard.writeText(norek).then(() => {
    alert("✅ Nomor rekening berhasil disalin!");
  });
}

async function kirimBuktiTransfer() {
  const fileInput = document.getElementById("bukti-transfer-file");
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    return alert("❌ Silakan upload bukti transfer terlebih dahulu.");
  }

  const file = fileInput.files[0];
  const nama = localStorage.getItem("nama") || "-";
  const wa = localStorage.getItem("wa") || "-";
  const alamat = localStorage.getItem("address") || "-";
  const metodePengiriman = localStorage.getItem("pengirimanTerakhir") || "-";
  const nominal = parseInt(localStorage.getItem("transferNominalFinal") || "0");
  const idPesanan = localStorage.getItem("idPesananTerakhir") || "-";
  const produkList = JSON.parse(localStorage.getItem("cart") || "[]");
  const lokasi = JSON.parse(localStorage.getItem("customerLocation") || "{}");
  const latitude = parseFloat(lokasi.lat || lokasi.latitude || "NaN");
  const longitude = parseFloat(lokasi.lng || lokasi.longitude || "NaN");

  const linkMaps = (!isNaN(latitude) && !isNaN(longitude))
    ? `https://maps.google.com/?q=${latitude},${longitude}`
    : "Lokasi tidak tersedia";

  // ✅ Kelompokkan produk berdasarkan toko
  const produkByToko = {};
  produkList.forEach(p => {
    if (!produkByToko[p.toko]) produkByToko[p.toko] = [];
    produkByToko[p.toko].push(p);
  });

  // ✅ Format isi produk per toko
  const isiProduk = Object.entries(produkByToko).map(([toko, items]) => {
    const list = items.map(p => `• ${p.nama} (x${p.jumlah})`).join("\n");
    return `🏪 <b>Toko:</b> ${toko}\n${list}`;
  }).join("\n\n");

  const pesanKonfirmasiUser = encodeURIComponent(`
Pembayaran Pesanan #${idPesanan} berhasil diterima ✅
Berikut detail pesanan anda:

${Object.entries(produkByToko).map(([toko, items]) => {
  const list = items.map(p => `• ${p.nama} (x${p.jumlah})`).join("\n");
  return `Toko: ${toko}\n${list}`;
}).join("\n\n")}

Total: Rp${nominal.toLocaleString()}

Terima kasih telah berbelanja! 🙌
  `);

  const linkKonfirmasiUser = `https://wa.me/${wa.replace(/^0/, "62")}?text=${pesanKonfirmasiUser}`;

  const formData = new FormData();
  formData.append("chat_id", "6046360096");
  formData.append("caption", `
📤 <b>Bukti Transfer Diterima</b>

🆔 <b>ID Pesanan:</b> ${idPesanan}
👤 <b>Nama:</b> ${nama}
🏠 <b>Alamat:</b> ${alamat}
🚚 <b>Pengiriman:</b> ${metodePengiriman}
📍 <b>Link Maps:</b> <a href="${linkMaps}">Lihat Lokasi</a>

🛍️ <b>Detail Pesanan:</b>
${isiProduk}

💸 <b>Total Transfer:</b> Rp${nominal.toLocaleString()}
🔗 <b>Konfirmasi User:</b> <a href="${linkKonfirmasiUser}">Klik untuk Hubungi</a>

📎 File bukti di bawah 👇
  `.trim());
  formData.append("photo", file);
  formData.append("parse_mode", "HTML");

  try {
    const res = await fetch(`https://api.telegram.org/bot8012881635:AAEBqLZZz0jaA4Ek0GsvFkzuEXoknxiq8Rg/sendPhoto`, {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Telegram Error:", errorText);
      throw new Error("Gagal kirim ke Telegram");
    }

    alert("✅ Bukti transfer berhasil dikirim ke admin!");
  } catch (err) {
    console.error("❌ Gagal upload bukti:", err);
    alert("❌ Gagal mengirim bukti transfer. Periksa koneksi atau coba lagi.");
  }
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
  const nama = localStorage.getItem("nama");
  let wa = localStorage.getItem("wa");
  if (wa?.startsWith("08")) {
    wa = "628" + wa.slice(2);
  }
  const alamat = localStorage.getItem("address");
  const lokasi = JSON.parse(localStorage.getItem("customerLocation") || "{}");
  const latitude = parseFloat(lokasi.lat || lokasi.latitude || "NaN");
  const longitude = parseFloat(lokasi.lng || lokasi.longitude || "NaN");
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const metodePembayaran = document.getElementById("metode-pembayaran")?.value || "cod";
  const metodePengiriman = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  const estimasiMenit = parseInt(localStorage.getItem("estimasiMenit") || "0", 10);
  const totalBayar = parseInt(document.getElementById("footer-total")?.textContent.replace(/\D/g, "") || "0");
  const catatan = document.getElementById("catatan-pesanan")?.value.trim() || "-";

  if (!nama || !wa || !alamat) return alert("Lengkapi data nama, alamat, dan nomor WhatsApp terlebih dahulu.");
  if (cart.length === 0) return alert("Keranjang masih kosong.");
  if (totalBayar <= 0) return alert("Total pembayaran tidak valid.");

  localStorage.setItem("checkoutTotal", totalBayar.toString());

  const random = Math.floor(Math.random() * 100000);
  const now = Date.now();
  const today = new Date();
  const idPesanan = `ORD-${today.toISOString().slice(0, 10).replace(/-/g, "")}-${random}`;
  localStorage.setItem("idPesananTerakhir", idPesanan);
  localStorage.setItem("pengirimanTerakhir", metodePengiriman);

  const isiProduk = cart.map(item =>
    `• ${item.nama} (x${item.jumlah}) = Rp${(item.harga * item.jumlah).toLocaleString()}`
  ).join("\n");

  const waktuTiba = new Date(now + estimasiMenit * 60000);
  const h = waktuTiba.getHours().toString().padStart(2, '0');
  const m = waktuTiba.getMinutes().toString().padStart(2, '0');
  const targetTiba = `${h}:${m}`;

  const linkMaps = (!isNaN(latitude) && !isNaN(longitude))
    ? `<a href="https://maps.google.com/?q=${latitude},${longitude}">Lihat di Google Maps</a>`
    : "Lokasi tidak tersedia";

  const konfirmasiPesan = encodeURIComponent(`
Halo *${nama}*! Kami menerima pesanan kamu:

- No. Pesanan: ${idPesanan}
- Total: Rp${totalBayar.toLocaleString()}
- Pembayaran: ${metodePembayaran.toUpperCase()}
- Pengiriman: ${metodePengiriman.toUpperCase()}
- Alamat: ${alamat}
- Catatan: ${catatan}

Apakah pesanan sudah sesuai titik alamat dan detail yang tampil di website?
  `);

  const linkKonfirmasiWA = `https://wa.me/${wa}?text=${konfirmasiPesan}`;

  const teksPesan = `
<b>🛒 Pesanan ${metodePengiriman.toUpperCase()} Baru Masuk!</b>
📦 <b>Data Pelanggan:</b>

🆔 ID Pesanan: ${idPesanan}
👤 Nama: ${nama}
📍 Lokasi: ${linkMaps}
📱 WhatsApp: https://wa.me/${wa}
💳 Pembayaran: ${metodePembayaran.toUpperCase()}
🚚 Pengiriman: ${metodePengiriman.toUpperCase()}
⏰ <b>ESTIMASI TIBA:</b> ±${estimasiMenit} menit ➔ ${targetTiba} WIB

📞 <b>Konfirmasi User:</b> <a href="${linkKonfirmasiWA}">Klik di sini</a>

🏍️ <b>Detail Produk:</b>
${isiProduk}
📄 Catatan: ${catatan}
💰 <b>Total Bayar:</b> Rp${totalBayar.toLocaleString()}
`.trim();

  try {
    if (metodePembayaran !== "transfer") {
      const response = await fetch(`https://api.telegram.org/bot8012881635:AAEBqLZZz0jaA4Ek0GsvFkzuEXoknxiq8Rg/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: "6046360096",
          text: teksPesan,
          parse_mode: "HTML"
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Telegram API Error:", errorText);
        throw new Error("Telegram API gagal: " + response.status);
      }
    }

    alert("✅ Pesanan anda telah dibuat!");

    const riwayat = JSON.parse(localStorage.getItem("riwayat") || "[]");
    const waktuSelesai = metodePembayaran === "transfer"
      ? now + 5 * 60 * 1000
      : now + estimasiMenit * 60 * 1000;

    const stepsLog = metodePembayaran === "transfer"
      ? [{ label: "Menunggu pembayaran", timestamp: now }]
      : (() => {
        const isPriority = metodePengiriman === "priority";
        const estimasiMs = estimasiMenit * 60 * 1000;
        const ratios = isPriority ? [0.05, 0.08, 0.4, 0.07, 0.4] : [0.07, 0.12, 0.5, 0.07, 0.24];
        const labels = ["Driver menghubungi", "Driver menuju resto", "Pesanan diproses resto", "Pesanan di-pickup", "Driver menuju lokasi kamu"];
        let acc = 0;
        return labels.map((label, i) => {
          const ts = now + acc;
          acc += ratios[i] * estimasiMs;
          return { label, timestamp: ts };
        });
      })();

    const statusAwal = metodePembayaran === "transfer" ? "Menunggu Pembayaran" : "Diproses";

    riwayat.unshift({
      id: idPesanan,
      waktuPesan: now,
      waktuSelesai,
      nama,
      wa,
      alamat,
      lokasi: { latitude, longitude },
      produk: cart,
      total: totalBayar,
      metode: metodePembayaran,
      pengiriman: metodePengiriman,
      catatan,
      status: statusAwal,
      stepsLog
    });
    localStorage.setItem("riwayat", JSON.stringify(riwayat));

    localStorage.removeItem("cart");
    renderCheckoutItems();
    if (document.getElementById("riwayat-list")) renderRiwayat();

    loadContent(metodePembayaran);

  } catch (err) {
    alert("❌ Gagal mengirim pesanan. Pastikan koneksi internet aktif dan bot Telegram aktif.");
    console.error("Gagal kirim ke Telegram:", err);
  }
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

// === Hitung ongkir dari pilihan radio
function hitungOngkir() {
  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || "standard";
  return hitungOngkirDenganTipe(metode);
}

// === Update Jumlah Produk di Keranjang ===
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

// === Render daftar item checkout dan update total ===
function renderCheckoutItems() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  const cartList = document.getElementById("cart-items-list");
  const customerLoc = JSON.parse(localStorage.getItem("customerLocation"));
  const footerTotal = document.getElementById("footer-total");
  const footerDiskon = document.getElementById("footer-diskon");
  const elSubtotal = document.getElementById("rincian-subtotal");
  const elOngkir = document.getElementById("rincian-ongkir");
  const elDiskon = document.getElementById("rincian-diskon");

  cartList.innerHTML = "";
  let totalProduk = 0;

  if (cart.length === 0) {
    cartList.innerHTML = `<li style="padding: 12px; color: #999;">🛒 TIDAK ADA PRODUK</li>`;
    ['standard', 'priority'].forEach(mode => {
      document.getElementById(`jarak-${mode}`).textContent = "Jarak: -";
      document.getElementById(`ongkir-${mode}`).textContent = "-";
      document.getElementById(`estimasi-${mode}`).textContent = "Estimasi: -";
    });
    if (footerTotal) footerTotal.textContent = "0";
    if (footerDiskon) footerDiskon.textContent = "0";
    if (elSubtotal) elSubtotal.textContent = "Rp 0";
    if (elOngkir) elOngkir.textContent = "Rp 0";
    if (elDiskon) elDiskon.textContent = "- Rp 0";
    return;
  }

  // Grup produk berdasarkan toko
  const grupToko = {};
  cart.forEach(item => {
    if (!grupToko[item.toko]) grupToko[item.toko] = [];
    grupToko[item.toko].push(item);
  });

  // Tampilkan produk per toko
  for (const namaToko in grupToko) {
    cartList.innerHTML += `<li><strong>🛍️ ${namaToko}</strong></li>`;
    grupToko[namaToko].forEach(item => {
      const totalPerItem = item.harga * item.jumlah;
      totalProduk += totalPerItem;

      cartList.innerHTML += `
        <li style="display: flex; gap: 12px; margin-bottom: 10px;">
          <img src="${item.gambar}" style="width: 60px; height: 60px; object-fit: cover;">
          <div>
            <strong>${item.nama}</strong><br/>
            Jumlah:
            <button onclick="updateJumlah('${item.nama}', -1)">➖</button>
            ${item.jumlah}
            <button onclick="updateJumlah('${item.nama}', 1)">➕</button><br/>
            <small>Total: Rp ${totalPerItem.toLocaleString()}</small>
          </div>
        </li>`;
    });

    cartList.innerHTML += `<hr style="margin: 8px 0;">`;
  }

  // Hitung total biaya
  const metode = document.querySelector('input[name="pengiriman"]:checked')?.value || 'standard';
  const ongkir = hitungOngkirDenganTipe(metode);
  const potonganOngkir = currentDiskon > 0 ? ongkir * currentDiskon : 0;
  const totalBayar = totalProduk + (ongkir - potonganOngkir);

  footerTotal.textContent = totalBayar.toLocaleString();
  footerDiskon.textContent = potonganOngkir.toLocaleString();
  elSubtotal.textContent = `Rp ${totalProduk.toLocaleString()}`;
  elOngkir.textContent = `Rp ${ongkir.toLocaleString()}`;
  elDiskon.textContent = `- Rp ${potonganOngkir.toLocaleString()}`;

  const toko = { lat: -1.6409437, lng: 105.7686011 };

  if (customerLoc?.lat && customerLoc?.lng) {
    const jarak = getDistanceFromLatLonInKm(toko.lat, toko.lng, customerLoc.lat, customerLoc.lng);
    const estimasiWaktu = {
      standard: 30 + jarak * 4,
      priority: 25 + jarak * 2
    };

    const estimasiAktif = Math.ceil(estimasiWaktu[metode]);
    localStorage.setItem("estimasiMenit", estimasiAktif);

    ['standard', 'priority'].forEach(mode => {
      const elJarak = document.getElementById(`jarak-${mode}`);
      const elOngkir = document.getElementById(`ongkir-${mode}`);
      const elEstimasi = document.getElementById(`estimasi-${mode}`);

      const ongkirX = hitungOngkirDenganTipe(mode);
      const estimasiMenit = Math.ceil(estimasiWaktu[mode]);

      elJarak.textContent = `Jarak: ${jarak.toFixed(2)} km`;
      elOngkir.textContent = `Rp ${ongkirX.toLocaleString()}`;
      elEstimasi.textContent = `Estimasi: ±${estimasiMenit} menit`;
    });
  }
}


function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
        alert("✅ Alamat berhasil disimpan");
      } else {
        alert("❌ Gagal menyimpan Alamat: " + data.description);
      }
    })
    .catch(error => {
      console.error("Terjadi kesalahan:", error);
      alert("Terjadi kesalahan, Silahkan hubungi admin!.");
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


function parseRating(ratingStr) {
  const angka = parseFloat(ratingStr);
  if (ratingStr.includes("RB")) return angka * 1000;
  return angka;
}

function renderProductList() {
  const produkContainer = document.getElementById('produk-container');
  if (!produkContainer || !Array.isArray(produkData) || produkData.length === 0) {
    produkContainer.innerHTML = '<p>Produk tidak tersedia.</p>';
    return;
  }

  produkContainer.innerHTML = '';

  const now = new Date();
  const jamSekarang = now.getHours();
  const deliveryAktif = jamSekarang >= 8 && jamSekarang < 22;

  // 🔽 Urutkan berdasarkan rating dari tinggi ke rendah
  const produkUrut = [...produkData].sort((a, b) => {
    return parseRating(b.rating) - parseRating(a.rating);
  });

  produkUrut.forEach((produk, index) => {
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
                      data-index="${index}"
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

  // Event listener tombol beli
  document.querySelectorAll('.beli-btn').forEach(button => {
    if (!button.disabled) {
      button.addEventListener('click', () => {
        const index = button.getAttribute('data-index');
        tambahKeKeranjang(produkUrut[index]);
      });
    }
  });
}





function tambahKeKeranjang(produk) {
  if (!produk || !produk.nama || !produk.toko) {
    console.warn("❌ Data produk tidak valid:", produk);
    return;
  }

  const cart = JSON.parse(localStorage.getItem('cart')) || [];

  // Cek berdasarkan nama + toko
  const index = cart.findIndex(item => item.nama === produk.nama && item.toko === produk.toko);

  if (index !== -1) {
    cart[index].jumlah += 1;
  } else {
    cart.push({
      nama: produk.nama,
      toko: produk.toko,
      harga: produk.harga,
      gambar: produk.gambar || "",
      jumlah: 1
    });
  }

  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartBadge();

  // Notifikasi
  const pesan = `✅ ${produk.nama} (${produk.toko}) ditambahkan ke keranjang`;
  if (window.toast) {
    toast(pesan);
  } else {
    console.log(pesan);
  }
}

function updateCartBadge() {
  const cart = JSON.parse(localStorage.getItem('cart')) || [];
  const total = cart.reduce((acc, item) => acc + item.jumlah, 0);

  const badge = document.querySelector('.cart-badge');
  const icon = document.querySelector('.footer-cart-icon');

  if (badge) {
    badge.textContent = total > 0 ? total : '';
    badge.style.display = total > 0 ? 'inline-block' : 'none';
  }

  if (icon) {
    icon.classList.toggle('fa-bounce', total > 0);
  }
}




