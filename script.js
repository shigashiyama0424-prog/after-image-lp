"use strict";
// 初回接続時に、GASの「ウェブアプリURL（/exec）」を貼り付けてください。
const GAS_WEB_APP_URL = "";
// 正式な規約・プライバシーポリシーURLが未設定のため、本番受付は開始しないでください。
const CONFIG = Object.freeze({ exhibitionStart: "2026-10-10", exhibitionEnd: "2026-10-26" });
const reservation = document.querySelector("#reservation");
const sticky = document.querySelector("#sticky");
if (reservation && sticky && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(entries => sticky.classList.toggle("hidden", entries[0].isIntersecting), {threshold: 0.05});
  observer.observe(reservation);
}
const form = document.querySelector("#reservation-form");
const dateInput = document.querySelector("#visit-date");
const timeInput = document.querySelector("#time");
const submitButton = form.querySelector("button.submit");
const message = document.querySelector("#form-message");
const notice = document.querySelector(".reserve-notice");
const dateHelp = document.querySelector("#date-help");
const jpDate = d => new Intl.DateTimeFormat("en-CA", {timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const today = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());
const pad = n => String(n).padStart(2,"0");
function populateDates(){
  dateInput.innerHTML='<option value="">来場日を選択</option>';
  for(let day=10;day<=26;day++){
    const val=`2026-10-${pad(day)}`;
    const dt=new Date(`${val}T12:00:00+09:00`);
    // [課題用] 過去日も選べるよう「val<today」の判定を外しています。本番では元に戻してください：if(dt.getUTCDay()===2 || val<today) continue;
    if(dt.getUTCDay()===2) continue; // 2 = 火曜日（火曜休廊）
    const opt=document.createElement("option");opt.value=val;opt.textContent=`10月${day}日`;dateInput.append(opt);
  }
  dateHelp.textContent = dateInput.options.length===1 ? "受付可能な日程はありません。" : "2026年10月26日まで・火曜休廊";
}
function populateTimes(){
  timeInput.innerHTML='<option value="">時間を選択</option>';
  for(let hour=12;hour<19;hour++) for(const minute of [0,30]){
    const val=`${pad(hour)}:${pad(minute)}`;
    const opt=document.createElement("option");opt.value=val;opt.textContent=val;timeInput.append(opt);
  }
}
populateDates();populateTimes();
const configured = /^https:\/\/script\.google\.com\/macros\/s\/[^\s/]+\/exec$/.test(GAS_WEB_APP_URL);
submitButton.disabled = !configured || dateInput.options.length===1;
if(configured){form.action=GAS_WEB_APP_URL;notice.textContent="ご予約は日時指定制です。送信後に予約番号が表示されたら、受付完了です。";}
else notice.textContent="GAS接続先URLが未設定です。script.js にウェブアプリURLを設定するまで送信できません。";
function showFieldError(input, text) {
  const error = document.getElementById(`error-${input.id}`);
  if (!error) return;

  error.textContent = text;
  input.setAttribute("aria-invalid", "true");
}
function clearFieldError(input) {
  const error = document.getElementById(`error-${input.id}`);
  if (error) error.textContent = "";

  input.removeAttribute("aria-invalid");
}
function showMessage(text, success){message.style.display="block";message.textContent=text;message.classList.toggle("success",success);message.classList.toggle("error",!success);}
let pending=null;
// [修正] タイムアウト後に遅れて届いた結果も受け取るため、そのトークンを覚えておく
let lateToken=null;

window.addEventListener("message", event=>{
  // Google Apps Script HtmlServiceからの結果だけ受け取る
  const origin=event.origin;
  console.log("予約結果の通知:", event.origin, event.data); // 確認用（個人情報は含まれません）。動作確認後は削除可
  if (
  origin !== "https://script.google.com" &&
  !/^https:\/\/([a-z0-9-]+\.)*googleusercontent\.com$/.test(origin)
) return;
  const data=event.data;
  if(!data || data.type!=="GALLERY_DOT_RESERVATION_RESULT") return;
  const isCurrent = !!pending && data.token===pending.token;
  const isLate = !isCurrent && lateToken!==null && data.token===lateToken;
  if(!isCurrent && !isLate) return;
  if(isCurrent){clearTimeout(pending.timeout);pending=null;}
  lateToken=null;
  submitButton.disabled=false;
  if(data.success===true && typeof data.reservationId==="string" && data.reservationId.startsWith("GD-")){
    showMessage(`予約データを保存しました。予約番号：${data.reservationId}`,true);form.reset();
  } else showMessage(`保存できませんでした：${data.message || "通信エラー"}`,false);
});
form.addEventListener("submit",event=>{
  event.preventDefault();
  if(!configured){showMessage("GASのURLが未設定です。",false);return;}
  if(pending || lateToken)return; // [修正] 結果が未確定の間は再送信させない（重複登録防止）
  const nameInput = form.elements.name;
clearFieldError(nameInput);

if (!nameInput.value.trim()) {
  showFieldError(nameInput, "お名前を入力してください。");
}
const emailInput = form.elements.email;
clearFieldError(emailInput);

if (!emailInput.value.trim()) {
  showFieldError(emailInput, "メールアドレスを入力してください。");
} else if (!emailInput.validity.valid) {
  showFieldError(emailInput, "正しいメールアドレスを入力してください。");
}
const phoneInput = form.elements.phone;
clearFieldError(phoneInput);

if (!phoneInput.value.trim()) {
  showFieldError(phoneInput, "電話番号を入力してください。");
} else if (!/^[0-9+()\-\s]{8,20}$/.test(phoneInput.value.trim())) {
  showFieldError(phoneInput, "正しい電話番号を入力してください。");
}
clearFieldError(dateInput);

if (!dateInput.value) {
  showFieldError(dateInput, "来場日を選択してください。");
}  
clearFieldError(timeInput);

if (!timeInput.value) {
  showFieldError(timeInput, "来場時間を選択してください。");
}
if(!form.checkValidity()){form.reportValidity();showMessage("必須項目と入力内容をご確認ください。",false);return;}
  const email=form.elements.email.value.trim();
  const phone=form.elements.phone.value.trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showMessage("メールアドレスを確認してください。",false);return;}
  if(!/^[0-9+()\-\s]{8,20}$/.test(phone)){showMessage("電話番号を確認してください。",false);return;}
  const token=crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  for(const name of ["requestToken"]){const old=form.querySelector(`input[name="${name}"]`);if(old)old.remove();const el=document.createElement("input");el.type="hidden";el.name=name;el.value=token;form.append(el);}
  submitButton.disabled=true;showMessage("送信中です。保存結果を確認しています…",false);
  // [修正] 待ち時間を20秒→45秒に延長。タイムアウト後もボタンは押せないままにし、遅れて届いた結果は受け取る
  const timeout=setTimeout(()=>{if(pending?.token===token){pending=null;lateToken=token;showMessage("保存結果を確認できませんでした。二重予約を防ぐため再送信はせず、info@gallery-dot.jp までお問い合わせください。",false);}},45000);
  pending={token,timeout};
  HTMLFormElement.prototype.submit.call(form);
});
// スクロール時に要素をふわっと表示する
(() => {
  const revealElements = document.querySelectorAll(".reveal");

  if (!revealElements.length) return;

  if (!("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1,
    }
  );

  revealElements.forEach((element) => observer.observe(element));

  document.documentElement.classList.add("js-reveal-ready");
})();

/* FV画像スライドショー */
(() => {
  const slides = document.querySelectorAll(".hero-art .hero-slide");

  if (slides.length < 2) return;

  let current = 0;

  // 5秒ごとに次の画像へ切り替える
  setInterval(() => {
    slides[current].classList.remove("is-active");

    current = (current + 1) % slides.length;

    slides[current].classList.add("is-active");
  }, 5000);
})();
