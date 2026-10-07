const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw7hH6XrQlBvalOi0aMIi1lnPd5suatD4XBwAvlcWlV_lMqdEgRH93jlClEuET0IbpsDA/exec";

const NEWS = [
  {
    tag: "Qəbul",
    title: "Yeni tədris ili üçün qeydiyyat açıqdır",
    text: "Abituriyent, təkmilləşmə və ibtidai qruplarda yerlər məhduddur. Gəl, yerini indi tut."
  },
  {
    tag: "Nəticə",
    title: "9 nəfər 700 bal — Qala yenə danışır",
    text: "Son qəbulda 15+ şagird 600+, 35+ şagird isə 500+ bal toplayıb."
  },
  {
    tag: "İT",
    title: "Beynəlxalq İT yarışlarında medal yağışı",
    text: "2 qızıl, 4 gümüş, 7 bürünc. Proqramlaşdırma və süni intellekt qrupları iş başındadır."
  },
  {
    tag: "Sınaq",
    title: "OTK.az və MQM sınaqları davam edir",
    text: "Həftəlik sınaqlarla zəif nöqtə dərsdən əvvəl görünür, imtahanda yox."
  },
  {
    tag: "Lisey",
    title: "100-dən çox şagird liseylərə qəbul olundu",
    text: "Olimpiada uğurları isə 47 şagirdlə Qalanın divarına yazıldı."
  },
  {
    tag: "Valideyn",
    title: "Valideyn görüşü: nəticə şəffaf olacaq",
    text: "Davamiyyət, ev tapşırığı və sınaq göstəriciləri panel üzərindən izləniləcək."
  }
];

const state = {
  role: null,
  teacher: null,
  parent: null,
  lessons: [],
  lesson: null,
  students: [],
  step: 1,
  extraOpen: false
};

function $(id) { return document.getElementById(id); }
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function todaySheetDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}
function autoGunTipi() {
  return new Date().getDate() % 2 === 1 ? "Tək" : "Cüt";
}
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 3200);
}
function showMsg(el, text, ok) {
  el.hidden = false;
  el.textContent = text;
  el.className = "form-msg " + (ok ? "ok" : "err");
}

async function apiGet(params) {
  const url = `${SCRIPT_URL}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  return res.json();
}
async function apiPost(payload) {
  const res = await fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload)
  });
  return res.json();
}

function renderNews() {
  $("newsGrid").innerHTML = NEWS.map(n => `
    <article class="card">
      <span class="headline-tag">${escapeHtml(n.tag)}</span>
      <h3>${escapeHtml(n.title)}</h3>
      <p>${escapeHtml(n.text)}</p>
    </article>
  `).join("");
}

function initHeadline() {
  let i = 0;
  const dots = $("headlineDots");
  dots.innerHTML = NEWS.map((_, idx) => `<button type="button" data-i="${idx}"></button>`).join("");
  const paint = () => {
    const n = NEWS[i];
    $("headlineTag").textContent = n.tag;
    $("headlineTitle").textContent = n.title;
    $("headlineText").textContent = n.text;
    [...dots.children].forEach((b, idx) => b.classList.toggle("active", idx === i));
  };
  paint();
  dots.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    i = Number(b.dataset.i);
    paint();
  });
  setInterval(() => {
    i = (i + 1) % NEWS.length;
    paint();
  }, 7000);
}

function closeLoginPanel() {
  $("loginPanel").hidden = true;
  $("girisBtn").setAttribute("aria-expanded", "false");
}

function openAuth(role) {
  state.role = role;
  $("authModal").hidden = false;
  $("authTitle").textContent = role === "muellim" ? "Müəllim girişi" : "Valideyn girişi";
  $("loginLabel").firstChild.textContent = role === "muellim" ? "Login" : "Telefon";
  $("authLogin").placeholder = role === "muellim" ? "Müəllim login" : "055...";
  $("authHint").textContent = role === "muellim"
    ? "Login və parol «Müəllimlər» vərəqindən yoxlanır."
    : "Telefon nömrəsi «Müraciətlər» vərəqindəki əlaqə ilə uyğun gəlməlidir. Parol: şagirdin adı.";
  $("authMsg").hidden = true;
  $("authForm").reset();
}

function hideApps() {
  $("publicSite").hidden = false;
  $("teacherApp").hidden = true;
  $("lessonApp").hidden = true;
  $("parentApp").hidden = true;
  $("userChip").hidden = true;
  $("loginWrap").hidden = false;
}

function setLoggedIn(name) {
  $("userChipName").textContent = name;
  $("userChip").hidden = false;
  $("loginWrap").hidden = true;
}

async function handleAuth(e) {
  e.preventDefault();
  const login = $("authLogin").value.trim();
  const parol = $("authParol").value.trim();
  $("authSubmit").disabled = true;
  try {
    if (state.role === "muellim") {
      const data = await apiGet({ action: "login", login, parol });
      if (data.status !== "success") throw new Error(data.message || "Giriş alınmadı");
      state.teacher = data;
      $("authModal").hidden = true;
      $("publicSite").hidden = true;
      $("teacherApp").hidden = false;
      setLoggedIn(`${data.ad} ${data.soyad || ""}`.trim());
      $("teacherMeta").textContent = `${data.fenn || ""} · ${data.sektor || ""}`;
      await loadSchedule();
    } else {
      const data = await apiGet({ action: "parentLogin", telefon: login, parol });
      if (data.status !== "success") throw new Error(data.message || "Giriş alınmadı");
      state.parent = data;
      $("authModal").hidden = true;
      $("publicSite").hidden = true;
      $("parentApp").hidden = false;
      setLoggedIn(data.adSoyad || "Valideyn");
      $("parentMeta").textContent = `${data.adSoyad} · ${data.sinif || ""} · ${data.telefon}`;
      $("parentResults").innerHTML = renderParent(data);
    }
  } catch (err) {
    showMsg($("authMsg"), err.message, false);
  } finally {
    $("authSubmit").disabled = false;
  }
}

function renderParent(data) {
  const dav = (data.davamiyyet || []).map(r =>
    `<li>${escapeHtml(r.tarix)} ${escapeHtml(r.saat)} — ${escapeHtml(r.dg)} (${escapeHtml(r.fenn)})</li>`
  ).join("") || "<li>Davamiyyət tapılmadı.</li>";
  const st = (data.statistika || []).map(r =>
    `<li>${escapeHtml(r.tarix)} · mövzu: ${escapeHtml(r.movzu)} · doğru %: ${escapeHtml(r.faiz)}</li>`
  ).join("") || "<li>Statistika tapılmadı.</li>";
  return `
    <article class="card"><h3>Davamiyyət</h3><ul>${dav}</ul></article>
    <article class="card"><h3>Statistika</h3><ul>${st}</ul></article>
  `;
}

function currentGunTipi() {
  const v = $("gunTipiSelect").value;
  return v === "auto" ? autoGunTipi() : v;
}

async function loadSchedule() {
  const list = $("scheduleList");
  list.innerHTML = "<p>Cədvəl yüklənir...</p>";
  try {
    const gunTipi = currentGunTipi();
    const t = state.teacher;
    const res = await apiGet({
      action: "getSchedule",
      muellimAdi: `${t.ad || ""} ${t.soyad || ""}`.trim(),
      ad: t.ad || "",
      soyad: t.soyad || "",
      sektor: t.sektor || "",
      fenn: t.fenn || "",
      gunTipi
    });
    if (res.status !== "success") throw new Error(res.message || "Cədvəl oxunmadı");
    state.lessons = res.data || [];
    if (!state.lessons.length) {
      list.innerHTML = `<p class="hint">${gunTipi} günlər üçün dərs tapılmadı. «Tək» və «Cüt» vərəqində müəllim adı dəqiq yazılmalıdır.</p>`;
      return;
    }
    list.innerHTML = state.lessons.map((d, i) => `
      <article class="card schedule-item" data-lesson="${i}">
        <h3>${escapeHtml(d.saat || "Saat yoxdur")}</h3>
        <p>${escapeHtml(d.fenn || t.fenn || "")} · ${escapeHtml(d.sinif || "")} ${escapeHtml(d.bolme || "")}</p>
        <p>${(d.sagirdler || []).length} şagird (10 sətir)</p>
      </article>
    `).join("");
  } catch (err) {
    list.innerHTML = `<p class="form-msg err">${escapeHtml(err.message)}</p>`;
  }
}

function startLesson(index) {
  state.lesson = state.lessons[index];
  const names = (state.lesson.sagirdler || []).slice(0, 10);
  state.students = names.map(s => typeof s === "string" ? { adSoyad: s, ad: s, soyad: "", ata: "", sinif: state.lesson.sinif || "", bolme: state.lesson.bolme || "" } : {
    adSoyad: s.adSoyad || [s.ad, s.soyad, s.ata].filter(Boolean).join(" "),
    ad: s.ad || "",
    soyad: s.soyad || "",
    ata: s.ata || s.ataAdi || "",
    sinif: s.sinif || state.lesson.sinif || "",
    bolme: s.bolme || state.lesson.bolme || ""
  });
  $("teacherApp").hidden = true;
  $("lessonApp").hidden = false;
  $("lessonTitle").textContent = `Saat ${state.lesson.saat || ""}`;
  $("lessonMeta").textContent = `${state.teacher.ad} · ${state.lesson.fenn || state.teacher.fenn || ""}`;
  renderLessonForms();
  goStep(1);
}

function renderLessonForms() {
  $("attList").innerHTML = state.students.map((s, i) => `
    <div class="student-row">
      <b>${escapeHtml(s.adSoyad)}</b>
      <select data-i="${i}" class="att">
        <option value="Gəlib">Dərsə gəlib</option>
        <option value="Gəlməyib">Dərsə gəlməyib</option>
      </select>
    </div>
  `).join("");

  $("statList").innerHTML = state.students.map((s, i) => `
    <div class="student-row">
      <b>${escapeHtml(s.adSoyad)}</b>
      <input data-i="${i}" class="verilen" type="number" min="0" placeholder="Evə verilən">
      <input data-i="${i}" class="islenen" type="number" min="0" placeholder="İşlənilən">
      <input data-i="${i}" class="dogru" type="number" min="0" placeholder="Doğru">
    </div>
  `).join("");

  $("actList").innerHTML = state.students.map((s, i) => `
    <div class="student-row">
      <b>${escapeHtml(s.adSoyad)}</b>
      <input data-i="${i}" class="emosiya" placeholder="Emosional durum">
      <input data-i="${i}" class="aktivlik" placeholder="Dərsdə aktivlik">
      <input data-i="${i}" class="faiz" type="number" min="0" max="100" placeholder="Sual-cavab %">
    </div>
  `).join("");

  $("extraList").innerHTML = state.students.map((s, i) => `
    <div class="student-row">
      <b>${escapeHtml(s.adSoyad)}</b>
      <input data-i="${i}" class="ex-islenen" type="number" min="0" placeholder="İşlənilən test">
      <input data-i="${i}" class="ex-dogru" type="number" min="0" placeholder="Doğru test">
    </div>
  `).join("");

  $("hwList").innerHTML = state.students.map((s, i) => `
    <div class="student-row">
      <b>${escapeHtml(s.adSoyad)}</b>
      <input data-i="${i}" class="hw" placeholder="Ev tapşırığı">
      <input data-i="${i}" class="qeyd" placeholder="Qeyd">
    </div>
  `).join("");
}

function goStep(n) {
  state.step = n;
  for (let i = 1; i <= 6; i++) {
    const el = $(`step${i}`);
    if (el) el.hidden = i !== n;
  }
}

function collectStudentsExtra() {
  return state.students.map((s, i) => ({
    ...s,
    dg: document.querySelector(`.att[data-i="${i}"]`)?.value || "",
    verilen: document.querySelector(`.verilen[data-i="${i}"]`)?.value || "",
    islenen: document.querySelector(`.islenen[data-i="${i}"]`)?.value || "",
    dogru: document.querySelector(`.dogru[data-i="${i}"]`)?.value || "",
    emosiya: document.querySelector(`.emosiya[data-i="${i}"]`)?.value || "",
    aktivlik: document.querySelector(`.aktivlik[data-i="${i}"]`)?.value || "",
    faiz: document.querySelector(`.faiz[data-i="${i}"]`)?.value || "",
    elaveIslenen: document.querySelector(`.ex-islenen[data-i="${i}"]`)?.value || "",
    elaveDogru: document.querySelector(`.ex-dogru[data-i="${i}"]`)?.value || "",
    tapsiriq: document.querySelector(`.hw[data-i="${i}"]`)?.value || "",
    qeyd: document.querySelector(`.qeyd[data-i="${i}"]`)?.value || ""
  }));
}

function lessonPayload(action) {
  return {
    action,
    tarix: todaySheetDate(),
    saat: state.lesson.saat || "",
    muellim: `${state.teacher.ad || ""} ${state.teacher.soyad || ""}`.trim(),
    sektor: state.teacher.sektor || "",
    fenn: state.lesson.fenn || state.teacher.fenn || "",
    sinif: state.lesson.sinif || "",
    bolme: state.lesson.bolme || "",
    statMovzu: $("statMovzu").value.trim(),
    actMovzu: $("actMovzu").value.trim(),
    elaveNovu: $("elaveNovu").value,
    elaveMovzu: $("elaveMovzu").value.trim(),
    sagirdler: collectStudentsExtra()
  };
}

async function completeStep(step, skipExtra) {
  const btn = document.querySelector(`[data-complete="${step}"]:not([data-skip])`) || document.querySelector(`[data-complete="${step}"]`);
  const buttons = document.querySelectorAll(`[data-complete="${step}"]`);
  buttons.forEach(b => { b.disabled = true; });
  try {
    let action = "attendance";
    if (step === 2) action = "statisticsHomework";
    if (step === 3) action = "statisticsActivity";
    if (step === 4) action = skipExtra ? "skipExtra" : "statisticsExtra";
    if (step === 5) action = "homework";
    if (!(step === 4 && skipExtra)) {
      const res = await apiPost(lessonPayload(action));
      if (res.status !== "success") throw new Error(res.message || "Yazı alınmadı");
    }
    toast("Məlumat Sheet-ə yazıldı.");
    goStep(step + 1);
  } catch (err) {
    toast(err.message);
  } finally {
    buttons.forEach(b => { b.disabled = false; });
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  $("registerBtn").disabled = true;
  try {
    const res = await apiPost({
      action: "register",
      adSoyad: fd.get("adSoyad"),
      sinif: fd.get("sinif"),
      bolge: fd.get("bolme"),
      bolme: fd.get("bolme"),
      xidmet: fd.get("xidmet"),
      telefon: fd.get("telefon")
    });
    if (res.status !== "success") throw new Error(res.message || "Göndərilmədi");
    showMsg($("registerMsg"), "Müraciət «Müraciətlər» vərəqinə yazıldı.", true);
    form.reset();
  } catch (err) {
    showMsg($("registerMsg"), err.message + " (Google skript URL-ni yeniləyin)", false);
  } finally {
    $("registerBtn").disabled = false;
  }
}

function bind() {
  $("year").textContent = new Date().getFullYear();
  renderNews();
  initHeadline();

  $("girisBtn").addEventListener("click", () => {
    const open = $("loginPanel").hidden;
    $("loginPanel").hidden = !open;
    $("girisBtn").setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", e => {
    if (!e.target.closest("#loginWrap")) closeLoginPanel();
  });
  $("loginPanel").addEventListener("click", e => {
    const b = e.target.closest(".login-choice");
    if (!b) return;
    closeLoginPanel();
    openAuth(b.dataset.role);
  });
  $("authClose").addEventListener("click", () => { $("authModal").hidden = true; });
  $("authForm").addEventListener("submit", handleAuth);
  $("logoutBtn").addEventListener("click", () => {
    state.teacher = null;
    state.parent = null;
    hideApps();
  });
  $("navToggle").addEventListener("click", () => $("mainNav").classList.toggle("open"));
  $("mainNav").addEventListener("click", e => {
    if (e.target.tagName === "A") $("mainNav").classList.remove("open");
  });
  $("registerForm").addEventListener("submit", handleRegister);
  $("gunTipiSelect").addEventListener("change", loadSchedule);
  $("scheduleList").addEventListener("click", e => {
    const card = e.target.closest("[data-lesson]");
    if (card) startLesson(Number(card.dataset.lesson));
  });
  $("backDashBtn").addEventListener("click", () => {
    $("lessonApp").hidden = true;
    $("teacherApp").hidden = false;
  });
  $("extraToggle").addEventListener("click", () => {
    state.extraOpen = !state.extraOpen;
    $("extraBox").hidden = !state.extraOpen;
  });
  document.querySelectorAll("[data-complete]").forEach(btn => {
    btn.addEventListener("click", () => completeStep(Number(btn.dataset.complete), btn.dataset.skip === "1"));
  });
  $("finishBtn").addEventListener("click", () => {
    $("lessonApp").hidden = true;
    $("teacherApp").hidden = false;
    toast("Dərs bitdi.");
    loadSchedule();
  });

  document.querySelectorAll('.main-nav a, .brand').forEach(a => {
    a.addEventListener("click", e => {
      const href = a.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

bind();
