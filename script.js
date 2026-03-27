/**
 * script.js - Adur Muslim Centre Core Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    initPrayerTimes();
    initUIControls();
    initScrollAnimations();
    initForm();
    initTabs();
    
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
});

/* =========================================================
   PRAYER TIME ENGINE (adhan.js)
========================================================= */

const COORDS = new adhan.Coordinates(50.8341, -0.2730); // Shoreham-by-Sea
const PARAMS = adhan.CalculationMethod.MuslimWorldLeague();
PARAMS.madhab = adhan.Madhab.Shafi; // Shafi Asr method
PARAMS.highLatitudeRule = adhan.HighLatitudeRule.SeventhOfTheNight; // Fixes high latitude issues for UK

let currentDisplayedMonth = new Date();

function formatTime(date) {
    if(!date) return '--:--';
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function initPrayerTimes() {
    updateTodayPrayers();
    setInterval(updateCountdown, 1000); // Live countdown update
    generateMonthlyTimetable(currentDisplayedMonth);
    
    // Month navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        currentDisplayedMonth.setMonth(currentDisplayedMonth.getMonth() - 1);
        generateMonthlyTimetable(currentDisplayedMonth);
    });
    
    document.getElementById('next-month').addEventListener('click', () => {
        currentDisplayedMonth.setMonth(currentDisplayedMonth.getMonth() + 1);
        generateMonthlyTimetable(currentDisplayedMonth);
    });
}

function updateTodayPrayers() {
    const today = new Date();
    const prayerTimes = new adhan.PrayerTimes(COORDS, today, PARAMS);
    
    // Set Gregorian Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('gregorian-date').textContent = today.toLocaleDateString('en-GB', options);
    
    // Set Hijri Date (using Intl API)
    try {
        const hijriFormatter = new Intl.DateTimeFormat('en-u-ca-islamic', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        document.getElementById('hijri-date').textContent = hijriFormatter.format(today);
    } catch(e) {
        document.getElementById('hijri-date').textContent = "Islamic Date";
    }

    // Update Mini Bar & Cards
    const prayers = [
        { id: 'fajr', name: 'Fajr', arabic: 'الفجر', time: prayerTimes.fajr },
        { id: 'sunrise', name: 'Sunrise', arabic: 'الشروق', time: prayerTimes.sunrise, isPrayer: false },
        { id: 'dhuhr', name: 'Dhuhr', arabic: 'الظهر', time: prayerTimes.dhuhr },
        { id: 'asr', name: 'Asr', arabic: 'العصر', time: prayerTimes.asr },
        { id: 'maghrib', name: 'Maghrib', arabic: 'المغرب', time: prayerTimes.maghrib },
        { id: 'isha', name: 'Isha', arabic: 'العشاء', time: prayerTimes.isha }
    ];

    const cardsGrid = document.getElementById('prayer-cards-grid');
    cardsGrid.innerHTML = '';

    prayers.forEach(p => {
        if(p.id !== 'sunrise') {
            // Update hero mini bar
            const miniEl = document.getElementById(`mini-${p.id}`);
            if(miniEl) miniEl.textContent = formatTime(p.time);
            
            // Create cards
            const card = document.createElement('div');
            card.className = `prayer-card`;
            card.id = `card-${p.id}`;
            card.innerHTML = `
                <div class="pc-arabic">${p.arabic}</div>
                <div class="pc-name">${p.name}</div>
                <div class="pc-time">${formatTime(p.time)}</div>
            `;
            cardsGrid.appendChild(card);
        }
    });

    // Tahajjud
    const sunnahTimes = new adhan.SunnahTimes(prayerTimes);
    document.getElementById('tahajjud-time').textContent = `Last third of the night: ${formatTime(sunnahTimes.lastThirdOfTheNight)}`;

    // Initial countdown update
    updateCountdown();
    
    // Populate Initial Tab
    updatePrayerTabInfo('fajr');
}

function updateCountdown() {
    const now = new Date();
    const prayerTimes = new adhan.PrayerTimes(COORDS, now, PARAMS);
    
    let nextPrayerName = prayerTimes.nextPrayer();
    let nextPrayerTime;
    
    if (nextPrayerName === adhan.Prayer.None) {
        // Next prayer is Fajr tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowPrayers = new adhan.PrayerTimes(COORDS, tomorrow, PARAMS);
        nextPrayerName = adhan.Prayer.Fajr;
        nextPrayerTime = tomorrowPrayers.fajr;
    } else {
        nextPrayerTime = prayerTimes.timeForPrayer(nextPrayerName);
    }

    const nextNameStr = nextPrayerName === adhan.Prayer.Fajr ? 'Fajr' :
                        nextPrayerName === adhan.Prayer.Sunrise ? 'Sunrise' :
                        nextPrayerName === adhan.Prayer.Dhuhr ? 'Dhuhr' :
                        nextPrayerName === adhan.Prayer.Asr ? 'Asr' :
                        nextPrayerName === adhan.Prayer.Maghrib ? 'Maghrib' : 'Isha';

    // If next is sunrise, actually we show sunrise as next, but some mosques prefer to skip. We will show sunrise.
    document.getElementById('next-prayer-name').textContent = nextNameStr;
    document.getElementById('next-prayer-time').textContent = formatTime(nextPrayerTime);

    // Calculate difference
    const diff = nextPrayerTime.getTime() - now.getTime();
    if(diff > 0) {
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        document.getElementById('countdown-timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Highlight card
    document.querySelectorAll('.prayer-card').forEach(c => c.classList.remove('current-next'));
    const cardId = nextNameStr.toLowerCase();
    const activeCard = document.getElementById(`card-${cardId}`);
    if(activeCard) activeCard.classList.add('current-next');
}

function generateMonthlyTimetable(date) {
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    document.getElementById('current-month-display').textContent = monthFormatter.format(date);
    
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const tbody = document.getElementById('timetable-body');
    tbody.innerHTML = '';
    
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    for (let i = 1; i <= daysInMonth; i++) {
        const rowDate = new Date(year, month, i);
        const pt = new adhan.PrayerTimes(COORDS, rowDate, PARAMS);
        
        const tr = document.createElement('tr');
        if (isCurrentMonth && today.getDate() === i) {
            tr.className = 'today-row';
        }
        
        const dateStr = `${i} ${rowDate.toLocaleDateString('en-US', {weekday: 'short'})}`;
        
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>${formatTime(pt.fajr)}</td>
            <td>${formatTime(pt.sunrise)}</td>
            <td>${formatTime(pt.dhuhr)}</td>
            <td>${formatTime(pt.asr)}</td>
            <td>${formatTime(pt.maghrib)}</td>
            <td>${formatTime(pt.isha)}</td>
        `;
        tbody.appendChild(tr);
    }
}

/* =========================================================
   UI & INTERACTIVITY
========================================================= */

function initUIControls() {
    // Sticky Navbar
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if(window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        
        // Back to top button
        const topBtn = document.getElementById('back-to-top');
        if(window.scrollY > 300) {
            topBtn.classList.add('visible');
        } else {
            topBtn.classList.remove('visible');
        }
    });

    document.getElementById('back-to-top').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Mobile Menu
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.getElementById('nav-links');
    
    menuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
}

function initTabs() {
    // History vs Vision tabs
    const toggleBtns = document.querySelectorAll('.toggle-btn');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const target = btn.getAttribute('data-target');
            document.querySelectorAll('.history-section .tab-content').forEach(tc => {
                tc.style.display = 'none';
                tc.classList.remove('active');
            });
            const tEl = document.getElementById(target);
            tEl.style.display = 'block';
            setTimeout(() => tEl.classList.add('active'), 10);
        });
    });

    // Prayer Info Tabs
    const prayerBtns = document.querySelectorAll('.prayer-tabs .tab-btn');
    prayerBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            prayerBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updatePrayerTabInfo(btn.getAttribute('data-prayer'));
        });
    });
}

const prayerDetails = {
    fajr: { name: 'Fajr', arabic: 'الفجر', rakahs: '2 Sunnah, 2 Fard', desc: 'The dawn prayer performed before sunrise.', quote: 'The two Sunnah cycles of Fajr are better than this world and everything in it. (Muslim)' },
    dhuhr: { name: 'Dhuhr', arabic: 'الظهر', rakahs: '4 Sunnah, 4 Fard, 2 Sunnah', desc: 'The midday prayer performed after the sun passes its zenith.', quote: 'Perform Salah from mid-day till the darkness of the night... (Quran 17:78)' },
    asr: { name: 'Asr', arabic: 'العصر', rakahs: '4 Fard', desc: 'The afternoon prayer.', quote: 'Guard strictly your (habit of) prayers, especially the Middle Prayer (Asr). (Quran 2q:238)' },
    maghrib: { name: 'Maghrib', arabic: 'المغرب', rakahs: '3 Fard, 2 Sunnah', desc: 'The sunset prayer performed just after the sun sets.', quote: 'Hastening to perform Maghrib is a sign of goodness.' },
    isha: { name: 'Isha', arabic: 'العشاء', rakahs: '4 Fard, 2 Sunnah, 3 Witr', desc: 'The night prayer.', quote: 'Whoever prays Isha in congregation, it is as if he prayed half the night. (Muslim)' }
};

function updatePrayerTabInfo(prayerId) {
    const data = prayerDetails[prayerId];
    if(!data) return;
    
    // Get current time for this prayer
    const today = new Date();
    const pt = new adhan.PrayerTimes(COORDS, today, PARAMS);
    const time = formatTime(pt[prayerId]);

    const panel = document.getElementById('prayer-info-panel');
    panel.innerHTML = `
        <div class="pi-arabic">${data.arabic}</div>
        <h3 class="mb-3">${data.name} — ${time}</h3>
        <p class="pi-rakahs">${data.rakahs}</p>
        <p class="pi-desc">${data.desc}</p>
        <p class="pi-quote">"${data.quote}"</p>
    `;
}

function initScrollAnimations() {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
    
    reveals.forEach(r => observer.observe(r));
}

function initGallery() {
    const masonry = document.getElementById('gallery-masonry');
    
    // Inject placeholders
    for(let i=1; i<=8; i++) {
        const item = document.createElement('div');
        item.className = 'gallery-item reveal';
        item.style.transitionDelay = `${(i%4)*0.1}s`;
        
        // Create inner elements
        item.innerHTML = `
            <img src="images/gallery-${i}.png" alt="Gallery photo ${i}" onerror="this.src=''; this.alt='Image missing';">
            <div class="gallery-overlay">
                <p>Adur Muslim Centre</p>
            </div>
        `;
        
        item.addEventListener('click', () => openLightbox(i));
        masonry.appendChild(item);
    }

    // Lightbox Logic
    const lightbox = document.getElementById('lightbox');
    const closeBtn = document.getElementById('close-lightbox');
    const prevBtn = document.getElementById('prev-lightbox');
    const nextBtn = document.getElementById('next-lightbox');
    const lbImg = document.getElementById('lightbox-img');
    const lbCap = document.getElementById('lightbox-caption');
    
    let currentIndex = 1;

    function openLightbox(index) {
        currentIndex = index;
        updateLightboxImage();
        lightbox.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function updateLightboxImage() {
        lbImg.src = `images/gallery-${currentIndex}.png`;
        // Handle error gracefully if file missing
        lbImg.onerror = function() {
            this.src = '';
            lbCap.textContent = `Placeholder for gallery-${currentIndex}.png`;
        };
        lbImg.onload = function() {
            lbCap.textContent = `Adur Muslim Centre — Gallery Image ${currentIndex}`;
        }
    }

    closeBtn.addEventListener('click', closeLightbox);
    
    function closeLightbox() {
        lightbox.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    prevBtn.addEventListener('click', () => {
        currentIndex = currentIndex > 1 ? currentIndex - 1 : 8;
        updateLightboxImage();
    });

    nextBtn.addEventListener('click', () => {
        currentIndex = currentIndex < 8 ? currentIndex + 1 : 1;
        updateLightboxImage();
    });

    // Close on escape, nav on arrows
    window.addEventListener('keydown', (e) => {
        if(lightbox.style.display === 'block') {
            if(e.key === 'Escape') closeLightbox();
            if(e.key === 'ArrowLeft') prevBtn.click();
            if(e.key === 'ArrowRight') nextBtn.click();
        }
    });
}

function initForm() {
    const contactForm = document.getElementById('contact-form');
    const successMsg = document.getElementById('form-success');
    
    if(contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            // Validate (HTML5 does most of it)
            
            // Show success
            successMsg.style.display = 'block';
            contactForm.reset();
            
            // Hide after 5 seconds
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 5000);
        });
    }

    const subForm = document.getElementById('subscribe-form');
    const subSuccess = document.getElementById('sub-success');
    if(subForm) {
        subForm.addEventListener('submit', (e) => {
            e.preventDefault();
            subSuccess.style.display = 'block';
            subForm.reset();
            setTimeout(() => subSuccess.style.display = 'none', 3000);
        });
    }
}
