let games=[], selected=null, registrations=JSON.parse(localStorage.getItem('agrasen_regs')||'[]');
const $=id=>document.getElementById(id);
fetch('games.json').then(r=>r.json()).then(d=>{games=d;initGameFilters();renderFeatured();renderGames()});
function showPage(id){document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));$(id).classList.add('active');window.scrollTo(0,0);if(id==='registrations')renderRegistrations()}
function renderFeatured(){let picks=games.slice(0,5);$('featured').innerHTML=picks.map(g=>`<div class="mini-card" onclick="openDetails('${g.id}')"><img src="assets/${g.poster}"><div><b>${g.name}</b><br><small>₹50 • ${g.dateLabel}</small></div></div>`).join('')}
function initGameFilters(){
  const category=$('category'), age=$('ageFilter');
  if(category){
    const categories=[...new Set(games.map(g=>g.category))];
    category.innerHTML='<option value="">All categories</option>'+categories.map(v=>`<option value="${v}">${v}</option>`).join('');
  }
  if(age){
    const preferred=['0–5','5–15','10–15','15–30','16–30','16+','18+','Below 30','30+','All','Any','Not specified'];
    const available=new Set(games.flatMap(g=>g.ageGroups||[]));
    age.innerHTML='<option value="">All age groups</option>'+preferred.filter(v=>available.has(v)).map(v=>`<option value="${v}">${v}</option>`).join('');
  }
}
function renderGames(){
  let q=($('search')?.value||'').toLowerCase(), d=$('date')?.value||'', c=$('category')?.value||'', a=$('ageFilter')?.value||'';
  let list=games.filter(g=>(!q||g.name.toLowerCase().includes(q))&&(!d||g.date===d)&&(!c||g.category===c)&&(!a||(g.ageGroups||[]).includes(a)));
  $('grid').innerHTML=list.length?list.map(g=>`<article class="game"><img src="assets/${g.poster}"><div class="game-body"><h3>${g.name}</h3><div class="tags"><span class="tag">🎂 ${g.age}</span><span class="tag">👥 ${g.category}</span><span class="tag">📅 ${g.dateLabel}</span><span class="tag">₹50</span></div><button onclick="openDetails('${g.id}')">View & Register</button></div></article>`).join(''):'<div class="empty">No games match these filters.</div>';
}
$('search')?.addEventListener('input',renderGames);
$('date')?.addEventListener('change',renderGames);
$('category')?.addEventListener('change',renderGames);
$('ageFilter')?.addEventListener('change',renderGames);
function openDetails(id){selected=games.find(g=>g.id===id);$('detailsContent').innerHTML=`<div class="detail-card"><img src="assets/${selected.poster}"><div class="detail-body"><h2>${selected.name}</h2><div class="detail-meta"><div>📅 <b>${selected.dateLabel}</b></div><div>⏰ <b>${selected.time}</b></div><div>👥 <b>${selected.category}</b></div><div>🎂 <b>${selected.age}</b></div></div><div class="fee">Registration Fee: ₹50 / participant</div><p>No participant limit. No slot booking or slot duration.</p><button class="red-btn" onclick="openRegister()">Register for this Game →</button></div></div>`;showPage('details')}
function openRegister(){$('registerContent').innerHTML=`<div class="form-card"><div class="page-title"><span>REGISTRATION</span><h2>${selected.name}</h2></div><div class="summary">📅 ${selected.dateLabel} • ⏰ ${selected.time}<br>👥 ${selected.category} • 🎂 ${selected.age}<br><b>₹50 per participant</b></div><form class="form" onsubmit="goPayment(event)"><label>Participant Name<input id="pname" required placeholder="Enter full name"></label><label>Mobile / WhatsApp Number<input id="mobile" required type="tel" pattern="[0-9]{10}" placeholder="10-digit mobile number"></label><label>Age<input id="age" required type="number" min="0" max="100" placeholder="Age"></label><label>Guardian / Partner Name<input id="guardian" placeholder="If applicable"></label><button class="red-btn">Continue →</button></form></div>`;showPage('register')}
async function goPayment(e){
  e.preventDefault();
  const name=$('pname').value.trim(), mobile=$('mobile').value.trim(), age=$('age').value.trim(), guardian=$('guardian').value.trim();
  $('paymentContent').innerHTML=`<div class="payment-card"><div class="page-title"><span>SECURE PAYMENT</span><h2>₹50 Registration Fee</h2></div><div class="summary"><b>${selected.name}</b><br>${name}<br>${mobile}<br>Age: ${age}<br><br><strong>Total: ₹50</strong></div><div style="background:#f7f1e6;padding:22px;border-radius:15px;text-align:center">🔐<br><b>Razorpay Secure Checkout</b><br><small>UPI, cards and other enabled payment methods will appear in Razorpay Checkout.</small></div><button id="rzpPayBtn" class="red-btn" onclick="startRazorpayPayment()">Pay ₹50 with UPI / Razorpay</button><p id="payStatus" style="font-size:12px;text-align:center;color:#765f57"></p></div>`;
  showPage('payment');
}
async function startRazorpayPayment(){
  const status=$('payStatus'), btn=$('rzpPayBtn');
  btn.disabled=true; btn.textContent='Creating secure order…'; status.textContent='Please wait.';
  try{
    const orderRes=await fetch('/api/create-order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameId:selected.id,participantName:$('pname').value,mobile:$('mobile').value,age:$('age').value})});
    const order=await orderRes.json(); if(!orderRes.ok) throw new Error(order.error||'Could not create order');
    await loadRazorpay();
    const options={key:order.keyId,amount:order.amount,currency:order.currency,name:'Agrasen Jayanti Mahotsav 2026',description:`${selected.name} – Registration`,order_id:order.orderId,prefill:{name:$('pname').value,contact:'+91'+$('mobile').value},notes:{game:selected.name,event:'Agrasen Jayanti Mahotsav 2026'},theme:{color:'#8d1424'},handler:async function(response){
      btn.disabled=true; btn.textContent='Verifying payment…'; status.textContent='Checking payment with Razorpay.';
      try{const verifyRes=await fetch('/api/verify-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(response)});const verify=await verifyRes.json();if(!verifyRes.ok)throw new Error(verify.error||'Payment verification failed');completeRegistration(response,verify)}catch(err){btn.disabled=false;btn.textContent='Payment received — retry verification';status.textContent=err.message||'Payment verification failed. Please contact the organiser.'}
    }};
    const rzp=new Razorpay(options);
    rzp.on('payment.failed',response=>{btn.disabled=false;btn.textContent='Try Payment Again';status.textContent=response.error?.description||'Payment failed. Please try again.';});
    rzp.open();
    btn.disabled=false; btn.textContent='Pay ₹50 with UPI / Razorpay';
  }catch(err){btn.disabled=false;btn.textContent='Pay ₹50 with UPI / Razorpay';status.textContent=err.message||'Payment could not be started.';}
}
function loadRazorpay(){return new Promise((resolve,reject)=>{if(window.Razorpay)return resolve();const s=document.createElement('script');s.src='https://checkout.razorpay.com/v1/checkout.js';s.onload=resolve;s.onerror=()=>reject(new Error('Could not load Razorpay Checkout.'));document.head.appendChild(s)})}
function completeRegistration(payment,verified){let code='AGR26-'+Math.floor(100000+Math.random()*900000);let r={code,game:selected.name,gameId:selected.id,name:$('pname').value,mobile:$('mobile').value,age:$('age').value,guardian:$('guardian').value,date:selected.dateLabel,time:selected.time,fee:50,paymentId:verified.paymentId,orderId:verified.orderId};registrations.unshift(r);localStorage.setItem('agrasen_regs',JSON.stringify(registrations));$('successContent').innerHTML=`<div class="success-card"><div class="check">✓</div><h2>Registration Confirmed</h2><p>Payment verified successfully</p><div class="reg-code">${code}</div><div class="ticket"><b>${r.game}</b><br>Participant: ${r.name}<br>Mobile: ${r.mobile}<br>Age: ${r.age}<br>Date: ${r.date}<br>Time: ${r.time}<br><strong>Paid: ₹50</strong><br><small>Razorpay Payment: ${r.paymentId}</small></div><button class="red-btn" onclick="showPage('registrations')">View My Registrations</button></div>`;showPage('success')}
function renderRegistrations(){if(!registrations.length){$('registrationList').innerHTML='<div class="empty">No registrations yet.<br>Choose a game and register for ₹50.</div>';return}$('registrationList').innerHTML=registrations.map(r=>`<div class="ticket"><b>${r.game}</b><br><span class="reg-code">${r.code}</span><br>👤 ${r.name} • ${r.age} years<br>📅 ${r.date} • ${r.time}<br>💰 ₹${r.fee} paid</div>`).join('')}


const galleryImages=[
  "assets/gallery/gallery-01.jpg",
  "assets/gallery/gallery-02.jpg",
  "assets/gallery/gallery-03.jpg",
  "assets/gallery/gallery-04.jpg",
  "assets/gallery/gallery-05.jpg",
  "assets/gallery/gallery-06.jpg",
  "assets/gallery/gallery-07.jpg",
  "assets/gallery/gallery-08.jpg",
  "assets/gallery/gallery-09.jpg"
];
let galleryIndex=0, galleryTimer=null, galleryTouchX=0;

function initGallery(){
  const dots=$('galleryDots');
  if(!dots) return;
  dots.innerHTML=galleryImages.map((_,i)=>`<button class="gallery-dot${i===0?' active':''}" onclick="setGallery(${i})" aria-label="Go to photo ${i+1}"></button>`).join('');
  setGallery(0);
  const viewport=document.querySelector('.gallery-viewport');
  viewport?.addEventListener('touchstart',e=>{galleryTouchX=e.changedTouches[0].clientX},{passive:true});
  viewport?.addEventListener('touchend',e=>{
    const dx=e.changedTouches[0].clientX-galleryTouchX;
    if(Math.abs(dx)>45) dx<0?galleryNext():galleryPrev();
  },{passive:true});
  clearInterval(galleryTimer);
  galleryTimer=setInterval(galleryNext,3500);
}

function setGallery(i){
  if(!galleryImages.length) return;
  galleryIndex=(i+galleryImages.length)%galleryImages.length;
  const track=$('galleryTrack');
  if(track) track.style.transform=`translateX(-${galleryIndex*100}%)`;
  document.querySelectorAll('.gallery-dot').forEach((d,n)=>d.classList.toggle('active',n===galleryIndex));
}

function galleryNext(){setGallery(galleryIndex+1)}
function galleryPrev(){setGallery(galleryIndex-1)}

function openGallery(i){
  galleryIndex=i;
  const box=$('galleryLightbox'), img=$('lightboxImage');
  if(!box||!img) return;
  img.src=galleryImages[galleryIndex];
  box.classList.add('open');
  box.setAttribute('aria-hidden','false');
  document.body.classList.add('lightbox-open');
}
function closeGallery(){
  const box=$('galleryLightbox');
  if(!box) return;
  box.classList.remove('open');
  box.setAttribute('aria-hidden','true');
  document.body.classList.remove('lightbox-open');
}
function updateLightbox(){const img=$('lightboxImage'); if(img) img.src=galleryImages[galleryIndex]}
function lightboxNext(){galleryIndex=(galleryIndex+1)%galleryImages.length;updateLightbox()}
function lightboxPrev(){galleryIndex=(galleryIndex-1+galleryImages.length)%galleryImages.length;updateLightbox()}
document.addEventListener('keydown',e=>{
  const box=$('galleryLightbox');
  if(!box?.classList.contains('open')) return;
  if(e.key==='Escape') closeGallery();
  if(e.key==='ArrowRight') lightboxNext();
  if(e.key==='ArrowLeft') lightboxPrev();
});

window.addEventListener('load',initGallery);


// Box Cricket Tournament Highlights
let boxPhotos=[], boxIndex=0, boxTimer=null, boxTouchX=0, boxFilter='All';
async function loadBoxGallery(){
  try{
    const r=await fetch('box-cricket.json');
    boxPhotos=await r.json();
    renderBoxGrid(); updateBoxHero(); startBoxAutoPlay();
    const viewport=document.querySelector('.box-hero-media');
    viewport?.addEventListener('touchstart',e=>{boxTouchX=e.changedTouches[0].clientX},{passive:true});
    viewport?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-boxTouchX;if(Math.abs(dx)>45) dx<0?boxNext():boxPrev()},{passive:true});
  }catch(e){console.error('Box Cricket gallery failed',e)}
}
function filteredBoxPhotos(){return boxFilter==='All'?boxPhotos:boxPhotos.filter(p=>p.category===boxFilter)}
function filterBox(category,btn){boxFilter=category;document.querySelectorAll('.box-tabs button').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');boxIndex=0;renderBoxGrid();updateBoxHero();startBoxAutoPlay()}
function renderBoxGrid(){const grid=$('boxGrid');if(!grid)return;const list=filteredBoxPhotos();grid.innerHTML=list.map((p,i)=>`<button class="box-tile" onclick="setBoxIndex(${i})"><img loading="lazy" src="${p.src}" alt="${p.caption}"><span><b>${p.category}</b><small>${p.caption}</small></span></button>`).join('')}
function updateBoxHero(){const list=filteredBoxPhotos();if(!list.length)return;boxIndex=(boxIndex+list.length)%list.length;const p=list[boxIndex];$('boxHeroImage').src=p.src;$('boxHeroImage').alt=p.caption;$('boxCategory').textContent=p.category;$('boxCaption').textContent=p.caption;$('boxSubcaption').textContent=p.subcaption;$('boxCounter').textContent=`${boxIndex+1} / ${list.length}`;const bar=$('boxProgressBar');if(bar)bar.style.width=`${((boxIndex+1)/list.length)*100}%`;const lb=$('boxLightboxImage');if(lb)lb.src=p.src;const ll=$('boxLightboxLabel');if(ll)ll.textContent=p.caption}
function setBoxIndex(i){boxIndex=i;updateBoxHero();window.scrollTo({top:document.querySelector('.box-hero')?.offsetTop||0,behavior:'smooth'})}
function boxNext(){const list=filteredBoxPhotos();if(!list.length)return;boxIndex=(boxIndex+1)%list.length;updateBoxHero()}
function boxPrev(){const list=filteredBoxPhotos();if(!list.length)return;boxIndex=(boxIndex-1+list.length)%list.length;updateBoxHero()}
function startBoxAutoPlay(){clearInterval(boxTimer);boxTimer=setInterval(boxNext,4500)}
function openBoxLightbox(){const box=$('boxLightbox');if(!box)return;box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open');updateBoxHero()}
function closeBoxLightbox(){const box=$('boxLightbox');if(!box)return;box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open')}
document.addEventListener('keydown',e=>{const box=$('boxLightbox');if(!box?.classList.contains('open'))return;if(e.key==='Escape')closeBoxLightbox();if(e.key==='ArrowRight')boxNext();if(e.key==='ArrowLeft')boxPrev()});
window.addEventListener('load',loadBoxGallery);


// Agrasen Legacy Cricket Gallery
const legacyPhotos=[
  ...Array.from({length:85},(_,i)=>({src:`aj-${String(i+1).padStart(3,'0')}.webp`,caption:`Agrasen Legacy Cricket 2026 • Photo ${i+1}`})),
  ...Array.from({length:26},(_,i)=>({src:`agl-${String(i+1).padStart(2,'0')}.webp`,caption:`Agrasen Legacy Cricket 2026 • Photo ${i+86}`}))
];
let legacyIndex=0, legacyTimer=null, legacyTouchX=0;
function initLegacyGallery(){renderLegacyGrid();updateLegacyHero();const hero=document.querySelector('.legacy-hero');hero?.addEventListener('touchstart',e=>{legacyTouchX=e.changedTouches[0].clientX},{passive:true});hero?.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-legacyTouchX;if(Math.abs(dx)>45)dx<0?legacyNext():legacyPrev()},{passive:true});clearInterval(legacyTimer);legacyTimer=setInterval(legacyNext,4500)}
function renderLegacyGrid(){const grid=$('legacyGrid');if(!grid)return;grid.innerHTML=legacyPhotos.map((p,i)=>`<button class="legacy-tile" onclick="openLegacyPhoto(${i})"><img loading="lazy" src="${p.src}" alt="${p.caption}"></button>`).join('')}
function updateLegacyHero(){if(!legacyPhotos.length)return;legacyIndex=(legacyIndex+legacyPhotos.length)%legacyPhotos.length;const p=legacyPhotos[legacyIndex];const hero=$('legacyHeroImage');if(hero){hero.src=p.src;hero.alt=p.caption}const counter=$('legacyCounter');if(counter)counter.textContent=`${legacyIndex+1} / ${legacyPhotos.length}`;const lb=$('legacyLightboxImage');if(lb)lb.src=p.src;const label=$('legacyLightboxLabel');if(label)label.textContent=p.caption}
function legacyNext(){legacyIndex=(legacyIndex+1)%legacyPhotos.length;updateLegacyHero()}
function legacyPrev(){legacyIndex=(legacyIndex-1+legacyPhotos.length)%legacyPhotos.length;updateLegacyHero()}
function openLegacyPhoto(i){legacyIndex=i;updateLegacyHero();const box=$('legacyLightbox');if(!box)return;box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('lightbox-open')}
function closeLegacyLightbox(){const box=$('legacyLightbox');if(!box)return;box.classList.remove('open');box.setAttribute('aria-hidden','true');document.body.classList.remove('lightbox-open')}
document.addEventListener('keydown',e=>{const box=$('legacyLightbox');if(!box?.classList.contains('open'))return;if(e.key==='Escape')closeLegacyLightbox();if(e.key==='ArrowRight')legacyNext();if(e.key==='ArrowLeft')legacyPrev()});
window.addEventListener('load',initLegacyGallery);
