// TERRA NOVA - Interactive Functionality & Animations

const localApiHosts = ['localhost', '127.0.0.1', '::1'];
const apiOrigin = location.protocol === 'file:' || (localApiHosts.includes(location.hostname) && location.port !== '3000')
    ? `http://${location.hostname || 'localhost'}:3000`
    : location.origin;

function getApiUrl(path) {
    return `${apiOrigin}${path}`;
}

const lazyScriptLoads = new Map();

function loadExternalScript(source, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (lazyScriptLoads.has(source)) return lazyScriptLoads.get(source);

    const loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = source;
        script.async = true;
        script.onload = () => {
            if (window[globalName]) resolve(window[globalName]);
            else {
                lazyScriptLoads.delete(source);
                reject(new Error(`${globalName} did not initialize`));
            }
        };
        script.onerror = () => {
            lazyScriptLoads.delete(source);
            reject(new Error(`${globalName} could not be loaded`));
        };
        document.head.append(script);
    });
    lazyScriptLoads.set(source, loadPromise);
    return loadPromise;
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Header scroll effect
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });

    // 2. GSAP Animations & ScrollTriggers
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        // Hero Content Fade In
        gsap.from('.hero-fade', {
            opacity: 0,
            y: 40,
            duration: 1.2,
            stagger: 0.2,
            ease: 'power3.out',
            delay: 0.2
        });

        // Parallax effect on Hero Background Image
        gsap.to('#hero-bg-img', {
            yPercent: 20,
            ease: 'none',
            scrollTrigger: {
                trigger: '#hero',
                start: 'top top',
                end: 'bottom top',
                scrub: true
            }
        });

        // Solutions section cards fade-in stagger
        gsap.from('.solution-card', {
            opacity: 0,
            y: 50,
            duration: 1,
            stagger: 0.2,
            ease: 'power2.out',
            scrollTrigger: {
                trigger: '#solutions',
                start: 'top 75%'
            }
        });

        // 3D Interactive Mouse Move Tilt on Hero Background
        const heroSection = document.getElementById('hero');
        const heroBgImg = document.getElementById('hero-bg-img');
        const heroBgVid = document.getElementById('hero-bg-video');

        if (heroSection) {
            heroSection.addEventListener('mousemove', (e) => {
                const { clientX, clientY } = e;
                const { innerWidth, innerHeight } = window;
                const xPos = (clientX / innerWidth - 0.5) * 20; // -10deg to 10deg
                const yPos = (clientY / innerHeight - 0.5) * -20;

                if (heroBgImg) {
                    heroBgImg.style.transform = `scale(1.1) rotateX(${yPos}deg) rotateY(${xPos}deg) translateY(${yPos*0.5}px)`;
                }
                if (heroBgVid) {
                    heroBgVid.style.transform = `scale(1.1) rotateX(${yPos}deg) rotateY(${xPos}deg) translateY(${yPos*0.5}px)`;
                }
            });

            heroSection.addEventListener('mouseleave', () => {
                if (heroBgImg) heroBgImg.style.transform = '';
                if (heroBgVid) heroBgVid.style.transform = '';
            });
        }
    }
});

// 3. Hero Slide Switcher (01, 02, 03, 04)
const heroSlides = [
    {
        bg: 'assets/hero_bg.webp',
        headline: 'NATURAL<br>INTELLIGENCE.<br><span class="text-white/95">REAL CHANGE.</span>',
        paragraph: 'Innovative solutions for a healthier planet.<br class="hidden sm:inline">Cleaner energy. Greener communities.<br class="hidden sm:inline">A more sustainable future.'
    },
    {
        bg: 'assets/hero_bg_2.webp',
        headline: 'RENEWABLE<br>POWER.<br><span class="text-white/95">CLEAN ENERGY.</span>',
        paragraph: 'Harnessing offshore wind grids and solar arrays.<br class="hidden sm:inline">Powering zero-emission futures globally.'
    },
    {
        bg: 'assets/solution_ecosystems.webp',
        headline: 'THRIVING<br>ECOSYSTEMS.<br><span class="text-white/95">BIODIVERSITY.</span>',
        paragraph: 'Restoring ancient forest habitats and pristine river basins.<br class="hidden sm:inline">Protecting nature for generations to come.'
    },
    {
        bg: 'assets/solution_communities.webp',
        headline: 'SUSTAINABLE<br>HABITATS.<br><span class="text-white/95">ECO CITIES.</span>',
        paragraph: 'Pioneering green timber eco-architecture and smart infrastructure.<br class="hidden sm:inline">Connecting people directly with environment.'
    }
];

function switchHeroSlide(slideIndex) {
    const slideIndexZero = slideIndex - 1;
    const slideData = heroSlides[slideIndexZero];
    if (!slideData) return;

    // Update active nav button
    document.querySelectorAll('.slide-nav-btn').forEach((btn, idx) => {
        if (idx === slideIndexZero) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const bgImg = document.getElementById('hero-bg-img');
    const bgVid = document.getElementById('hero-bg-video');
    const headline = document.getElementById('hero-headline');
    const paragraph = document.getElementById('hero-paragraph');

    // Smooth transition
    if (bgImg) bgImg.style.opacity = '0.3';
    if (bgVid) bgVid.style.opacity = slideIndex === 1 ? '0.8' : '0';
    headline.style.opacity = '0';
    paragraph.style.opacity = '0';

    setTimeout(() => {
        if (bgImg) bgImg.src = slideData.bg;
        headline.innerHTML = slideData.headline;
        paragraph.innerHTML = slideData.paragraph;

        if (bgImg) bgImg.style.opacity = '1';
        headline.style.opacity = '1';
        paragraph.style.opacity = '1';
    }, 400);
}

// 4. Video Modal ("Watch Our Story")
function openVideoModal() {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('story-video');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    activateAccessibleModal(modal);
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
        if (video) {
            loadDeferredVideo(video);
            video.currentTime = 0;
            video.play().catch(e => console.log('Autoplay prevented', e));
        }
    }, 50);
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const video = document.getElementById('story-video');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    if (video) {
        video.pause();
    }
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        deactivateAccessibleModal(modal);
    }, 500);
}

const modalFocusOrigins = new WeakMap();

function activateAccessibleModal(modal) {
    if (!modal) return;
    modalFocusOrigins.set(modal, document.activeElement);
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
        const dialog = modal.querySelector('[role="dialog"]');
        const firstControl = modal.querySelector('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], video[controls]');
        (firstControl || dialog || modal).focus({ preventScroll: true });
    });
}

function deactivateAccessibleModal(modal) {
    if (!modal) return;
    modal.setAttribute('aria-hidden', 'true');
    const anotherModalIsOpen = [...document.querySelectorAll('[data-accessible-modal]')]
        .some(candidate => candidate !== modal && !candidate.classList.contains('hidden'));
    if (!anotherModalIsOpen) document.body.classList.remove('modal-open');
    const focusOrigin = modalFocusOrigins.get(modal);
    if (focusOrigin?.isConnected) focusOrigin.focus({ preventScroll: true });
    modalFocusOrigins.delete(modal);
}

function getModalFocusableElements(modal) {
    return [...modal.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), video[controls], [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.closest('[hidden]') && element.getClientRects().length > 0);
}

document.addEventListener('keydown', event => {
    const openModals = [...document.querySelectorAll('[data-accessible-modal]')]
        .filter(modal => !modal.classList.contains('hidden'));
    const activeModal = openModals[openModals.length - 1];
    if (!activeModal) {
        const mobileMenu = document.getElementById('mobile-menu');
        if (event.key === 'Escape' && mobileMenu && !mobileMenu.classList.contains('hidden')) {
            toggleMobileMenu();
            document.getElementById('mobile-menu-btn')?.focus();
        }
        return;
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        const closeModal = {
            'video-modal': closeVideoModal,
            'movement-modal': closeMovementModal,
            'auth-modal': closeAuthModal,
            'vr-tour-modal': closeVrModal,
            'certificate-modal': closeCertificateModal
        }[activeModal.id];
        if (closeModal) closeModal();
        return;
    }

    if (event.key !== 'Tab') return;
    const focusable = getModalFocusableElements(activeModal);
    if (!focusable.length) {
        event.preventDefault();
        activeModal.querySelector('[role="dialog"]')?.focus();
        return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !activeModal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !activeModal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
    }
});

// 5. "Join the Movement" Modal
function openMovementModal() {
    const modal = document.getElementById('movement-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    activateAccessibleModal(modal);
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modal.classList.add('opacity-100');
    }, 50);
}

function closeMovementModal() {
    const modal = document.getElementById('movement-modal');
    modal.classList.remove('opacity-100');
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.remove('flex');
        modal.classList.add('hidden');
        deactivateAccessibleModal(modal);
    }, 500);
}

async function handleMovementSubmit(event) {
    event.preventDefault();
    const successMsg = document.getElementById('movement-success');
    const form = event.currentTarget;
    const submitButton = form.querySelector('[type="submit"]');
    const formData = new FormData(form);
    if (submitButton) submitButton.disabled = true;

    try {
        const response = await fetch(getApiUrl('/api/movement'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: form.querySelector('input[type="text"]').value.trim(),
                email: form.querySelector('input[type="email"]').value.trim(),
                interest: form.querySelector('select').value
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Registration could not be completed.');
        successMsg.innerText = data.message;
        successMsg.classList.remove('hidden');
        form.reset();
        setTimeout(() => {
            closeMovementModal();
            successMsg.classList.add('hidden');
        }, 2500);
    } catch (error) {
        successMsg.innerText = error.message || 'Could not connect to Terra Nova. Please try again.';
        successMsg.classList.remove('hidden');
    } finally {
        if (submitButton) submitButton.disabled = false;
    }
}

// 6. Newsletter Form Submit
async function handleNewsletterSubmit(event) {
    event.preventDefault();
    const toast = document.getElementById('newsletter-toast');
    const email = event.currentTarget.querySelector('input[type="email"]').value.trim();
    try {
        const response = await fetch(getApiUrl('/api/newsletter'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Subscription failed.');
        toast.innerText = data.message;
        event.currentTarget.reset();
    } catch (error) {
        toast.innerText = error.message || 'Could not connect. Please try again.';
    }
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

async function handleContactSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const status = document.getElementById('contact-status');
    const submitButton = document.getElementById('contact-submit');
    if (!form.reportValidity()) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    status.classList.remove('hidden', 'border-red-400/30', 'bg-red-500/10', 'text-red-200');
    status.textContent = 'Submitting your request...';

    try {
        const payload = Object.fromEntries(new FormData(form).entries());
        const response = await fetch(getApiUrl('/api/contact'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Your request could not be submitted.');

        form.reset();
        status.textContent = `${data.message} Reference: ${data.reference}.`;
        status.classList.remove('border-terraGreen-400/30', 'bg-terraGreen-500/10', 'text-terraGreen-200');
        status.classList.add('border-terraGreen-400/30', 'bg-terraGreen-500/10', 'text-terraGreen-200');
    } catch (error) {
        status.textContent = error.message || 'Could not connect. Please try again.';
        status.classList.remove('border-terraGreen-400/30', 'bg-terraGreen-500/10', 'text-terraGreen-200');
        status.classList.add('border-red-400/30', 'bg-red-500/10', 'text-red-200');
    } finally {
        status.classList.remove('hidden');
        submitButton.disabled = false;
        submitButton.innerHTML = 'Send inquiry <span aria-hidden="true">→</span>';
    }
}

document.querySelectorAll('[data-contact-plan]').forEach(link => {
    link.addEventListener('click', () => {
        const planSelect = document.getElementById('contact-plan');
        if (planSelect) planSelect.value = link.dataset.contactPlan;
    });
});

// 7. Mobile Menu Toggle
function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('menu-icon');
    const button = document.getElementById('mobile-menu-btn');
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        button.setAttribute('aria-expanded', 'true');
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
    } else {
        menu.classList.add('hidden');
        button.setAttribute('aria-expanded', 'false');
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
    }
}

// 8. Custom Glowing Cursor Follower
const cursorDot = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');

if (cursorDot && cursorRing) {
    window.addEventListener('mousemove', (e) => {
        const posX = e.clientX;
        const posY = e.clientY;

        cursorDot.style.left = `${posX}px`;
        cursorDot.style.top = `${posY}px`;

        cursorRing.animate({
            left: `${posX}px`,
            top: `${posY}px`
        }, { duration: 300, fill: 'forwards' });
    });

    // Expand cursor ring over hoverable elements
    document.querySelectorAll('a, button, input, select, .solution-card, .map-pin').forEach((el) => {
        el.addEventListener('mouseenter', () => {
            cursorRing.style.width = '54px';
            cursorRing.style.height = '54px';
            cursorRing.style.borderColor = 'rgba(99, 132, 83, 0.9)';
            cursorDot.style.backgroundColor = '#8ba77b';
        });
        el.addEventListener('mouseleave', () => {
            cursorRing.style.width = '36px';
            cursorRing.style.height = '36px';
            cursorRing.style.borderColor = 'rgba(139, 167, 123, 0.5)';
            cursorDot.style.backgroundColor = '#638453';
        });
    });
}

// =========================================================================
// 🎵 AMBIENT ENVIRONMENTAL SOUNDSCAPE SYNTHESIZER (WEB AUDIO API)
// =========================================================================
let soundAudioCtx = null;
let soundMasterGain = null;
let soundSourceNodes = [];
let currentSoundTrack = 'rainforest';
let isSoundscapeActive = false;
let birdIntervalId = null;

function toggleSoundscapeDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('soundscape-dropdown');
    const langDropdown = document.getElementById('lang-dropdown');
    const langButton = document.getElementById('lang-btn');
    const soundButton = document.getElementById('soundscape-btn');
    if (langDropdown) langDropdown.classList.add('hidden');
    if (langButton) langButton.setAttribute('aria-expanded', 'false');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (soundButton) soundButton.setAttribute('aria-expanded', String(!dropdown.classList.contains('hidden')));
    }
}

function selectSoundscapeTrack(trackId) {
    currentSoundTrack = trackId;
    document.querySelectorAll('.sound-track-btn').forEach(btn => {
        const isSelected = btn.dataset.track === trackId;
        const ind = btn.querySelector('.track-indicator');
        if (ind) ind.classList.toggle('hidden', !isSelected);
        btn.classList.toggle('text-white', isSelected);
        btn.classList.toggle('text-gray-300', !isSelected);
    });

    if (isSoundscapeActive) {
        stopSoundscapeAudio();
        startSoundscapeAudio();
    }
}

function setSoundscapeVolume(val) {
    const vol = parseFloat(val) / 100;
    const label = document.getElementById('sound-vol-val');
    if (label) label.innerText = `${Math.round(val)}%`;
    if (soundMasterGain && soundAudioCtx) {
        soundMasterGain.gain.setValueAtTime(vol * 0.15, soundAudioCtx.currentTime);
    }
}

function toggleSoundscapePlay() {
    if (!isSoundscapeActive) {
        startSoundscapeAudio();
    } else {
        stopSoundscapeAudio();
    }
}

function initSoundAudioContext() {
    if (!soundAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        soundAudioCtx = new AudioCtx();
        soundMasterGain = soundAudioCtx.createGain();
        const volInput = document.getElementById('sound-volume');
        const vol = volInput ? parseFloat(volInput.value) / 100 : 0.6;
        soundMasterGain.gain.setValueAtTime(vol * 0.15, soundAudioCtx.currentTime);
        soundMasterGain.connect(soundAudioCtx.destination);
    }
    if (soundAudioCtx.state === 'suspended') {
        soundAudioCtx.resume();
    }
}

function createNoiseBuffer(seconds = 3) {
    const bufferSize = soundAudioCtx.sampleRate * seconds;
    const buffer = soundAudioCtx.createBuffer(1, bufferSize, soundAudioCtx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
        b6 = white * 0.115926;
    }
    return buffer;
}

function startSoundscapeAudio() {
    initSoundAudioContext();
    stopSoundscapeAudio();

    isSoundscapeActive = true;
    const playBtn = document.getElementById('soundscape-play-toggle');
    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    const statusLabel = document.getElementById('sound-status-label');

    if (playBtn) playBtn.innerText = '⏸ PAUSE AMBIENCE';
    if (soundIcon) soundIcon.innerText = '🔊';
    if (soundText) soundText.innerText = 'SOUNDSCAPE ON';
    if (statusLabel) {
        statusLabel.innerText = 'LIVE PLAYING';
        statusLabel.classList.add('text-terraGreen-400');
    }

    if (currentSoundTrack === 'rainforest') {
        const noise = soundAudioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer(3);
        noise.loop = true;

        const filter = soundAudioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, soundAudioCtx.currentTime);

        noise.connect(filter);
        filter.connect(soundMasterGain);
        noise.start();
        soundSourceNodes.push(noise);

        birdIntervalId = setInterval(() => {
            if (!isSoundscapeActive || currentSoundTrack !== 'rainforest') return;
            const now = soundAudioCtx.currentTime;
            const osc = soundAudioCtx.createOscillator();
            const birdGain = soundAudioCtx.createGain();

            osc.type = 'sine';
            const baseFreq = 2200 + Math.random() * 800;
            osc.frequency.setValueAtTime(baseFreq, now);
            osc.frequency.exponentialRampToValueAtTime(baseFreq + 600, now + 0.08);
            osc.frequency.exponentialRampToValueAtTime(baseFreq - 300, now + 0.16);

            birdGain.gain.setValueAtTime(0.0001, now);
            birdGain.gain.linearRampToValueAtTime(0.035, now + 0.04);
            birdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

            osc.connect(birdGain);
            birdGain.connect(soundMasterGain);
            osc.start(now);
            osc.stop(now + 0.2);
        }, 3200);

    } else if (currentSoundTrack === 'ocean') {
        const noise = soundAudioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer(4);
        noise.loop = true;

        const filter = soundAudioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, soundAudioCtx.currentTime);

        const lfo = soundAudioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(0.18, soundAudioCtx.currentTime);

        const lfoGain = soundAudioCtx.createGain();
        lfoGain.gain.setValueAtTime(320, soundAudioCtx.currentTime);

        lfo.connect(filter.frequency);
        noise.connect(filter);
        filter.connect(soundMasterGain);

        noise.start();
        lfo.start();
        soundSourceNodes.push(noise, lfo);

    } else if (currentSoundTrack === 'wind') {
        const noise = soundAudioCtx.createBufferSource();
        noise.buffer = createNoiseBuffer(3);
        noise.loop = true;

        const filter = soundAudioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(180, soundAudioCtx.currentTime);
        filter.Q.setValueAtTime(3.0, soundAudioCtx.currentTime);

        const drone = soundAudioCtx.createOscillator();
        drone.type = 'sine';
        drone.frequency.setValueAtTime(55, soundAudioCtx.currentTime);

        const droneGain = soundAudioCtx.createGain();
        droneGain.gain.setValueAtTime(0.04, soundAudioCtx.currentTime);

        drone.connect(droneGain);
        droneGain.connect(soundMasterGain);

        noise.connect(filter);
        filter.connect(soundMasterGain);

        noise.start();
        drone.start();
        soundSourceNodes.push(noise, drone);
    }
}

function stopSoundscapeAudio() {
    isSoundscapeActive = false;
    if (birdIntervalId) {
        clearInterval(birdIntervalId);
        birdIntervalId = null;
    }
    soundSourceNodes.forEach(node => {
        try { node.stop(); node.disconnect(); } catch (e) {}
    });
    soundSourceNodes = [];

    const playBtn = document.getElementById('soundscape-play-toggle');
    const soundIcon = document.getElementById('sound-icon');
    const soundText = document.getElementById('sound-text');
    const statusLabel = document.getElementById('sound-status-label');

    if (playBtn) playBtn.innerText = '▶ PLAY AMBIENCE';
    if (soundIcon) soundIcon.innerText = '🔈';
    if (soundText) soundText.innerText = 'SOUNDSCAPE';
    if (statusLabel) {
        statusLabel.innerText = 'OFF';
        statusLabel.classList.remove('text-terraGreen-400');
    }
}

// =========================================================================
// 🌍 MULTI-LANGUAGE I18N DICTIONARY & SELECTOR ENGINE
// =========================================================================
const translations = {
    en: {
        navMission: "Our Mission",
        navSolutions: "Solutions",
        navImpact: "Impact",
        navAbout: "About",
        navContact: "Contact",
        navCareers: "Careers",
        navJoin: "Join Movement",
        heroTag: "A CLEANER PLANET IS A BRIGHTER TOMORROW",
        heroHeadline: "NATURAL<br>INTELLIGENCE.<br><span class=\"text-white/95\">REAL CHANGE.</span>",
        heroDesc: "Innovative solutions for a healthier planet.<br class=\"hidden sm:inline\">Cleaner energy. Greener communities.<br class=\"hidden sm:inline\">A more sustainable future.",
        heroExplore: "Explore Our Impact",
        heroWatch: "Watch Our Story",
        missionTag: "OUR MISSION",
        missionTitle: "PIONEERING THE NEXT ERA OF SUSTAINABILITY",
        solutionsTag: "A BRIGHTER TOMORROW",
        solutionsTitle: "SOLUTIONS<br>THAT MAKE<br>A DIFFERENCE.",
        solutionsDesc: "From renewable energy to ecosystem restoration, we create real world solutions for a cleaner, healthier, more vibrant planet.",
        impactTag: "GLOBAL IMPACT",
        impactTitle: "MEASURABLE ENVIRONMENTAL CHANGE",
        simTag: "LIVE INTERACTIVE TOOL",
        simTitle: "PLANETARY IMPACT SIMULATOR",
        globeTag: "GLOBAL DEPLOYMENT",
        globeTitle: "ACTIVE INITIATIVES WORLDWIDE",
        cityTag: "LIVE GLOBAL SATELLITE SEARCH",
        cityTitle: "REAL-TIME CITY AIR QUALITY SEARCH"
    },
    hi: {
        navMission: "हमारा लक्ष्य",
        navSolutions: "समाधान",
        navImpact: "प्रभाव",
        navAbout: "परिचय",
        navContact: "संपर्क",
        navCareers: "करियर",
        navJoin: "आंदोलन से जुड़ें",
        heroTag: "एक स्वच्छ ग्रह, एक उज्ज्वल कल है",
        heroHeadline: "प्राकृतिक<br>बुद्धिमत्ता.<br><span class=\"text-white/95\">सच्चा बदलाव.</span>",
        heroDesc: "एक स्वस्थ ग्रह के लिए नवीन समाधान।<br class=\"hidden sm:inline\">स्वच्छ ऊर्जा। हरित समुदाय।<br class=\"hidden sm:inline\">एक अधिक टिकाऊ भविष्य।",
        heroExplore: "हमारा प्रभाव देखें",
        heroWatch: "हमारी कहानी देखें",
        missionTag: "हमारा मिशन",
        missionTitle: "सस्टेनेबिलिटी के नए युग की शुरुआत",
        solutionsTag: "एक उज्ज्वल कल",
        solutionsTitle: "समाधान<br>जो बदलाव<br>लाते हैं।",
        solutionsDesc: "नवीकरणीय ऊर्जा से लेकर पारिस्थितिकी तंत्र की पुनर्स्थापना तक, हम स्वच्छ और स्वस्थ ग्रह के लिए वास्तविक समाधान बनाते हैं।",
        impactTag: "वैश्विक प्रभाव",
        impactTitle: "मापने योग्य पर्यावरणीय परिवर्तन",
        simTag: "लाइव इंटरएक्टिव टूल",
        simTitle: "ग्रह प्रभाव सिम्युलेटर",
        globeTag: "वैश्विक पहल",
        globeTitle: "दुनिया भर में सक्रिय पहल",
        cityTag: "लाइव सैटेलाइट खोज",
        cityTitle: "शहर की वायु गुणवत्ता खोज"
    },
    es: {
        navMission: "Nuestra Misión",
        navSolutions: "Soluciones",
        navImpact: "Impacto",
        navAbout: "Nosotros",
        navContact: "Contacto",
        navCareers: "Carreras",
        navJoin: "Únete al Movimiento",
        heroTag: "UN PLANETA MÁS LIMPIO ES UN MAÑANA MÁS BRILLANTE",
        heroHeadline: "INTELIGENCIA<br>NATURAL.<br><span class=\"text-white/95\">CAMBIO REAL.</span>",
        heroDesc: "Soluciones innovadoras para un planeta más saludable.<br class=\"hidden sm:inline\">Energía limpia. Comunidades verdes.<br class=\"hidden sm:inline\">Un futuro más sostenible.",
        heroExplore: "Explora Nuestro Impacto",
        heroWatch: "Ver Nuestra Historia",
        missionTag: "NUESTRA MISIÓN",
        missionTitle: "PIONEROS EN LA PRÓXIMA ERA DE LA SOSTENIBILIDAD",
        solutionsTag: "UN MAÑANA MÁS BRILLANTE",
        solutionsTitle: "SOLUCIONES<br>QUE MARCAN<br>LA DIFERENCIA.",
        solutionsDesc: "Desde energía renovable hasta restauración ecológica, creamos soluciones del mundo real.",
        impactTag: "IMPACTO GLOBAL",
        impactTitle: "CAMBIO AMBIENTAL MEDIBLE",
        simTag: "HERRAMIENTA INTERACTIVA",
        simTitle: "SIMULADOR DE IMPACTO PLANETARIO",
        globeTag: "DESPLIEGUE GLOBAL",
        globeTitle: "INICIATIVAS ACTIVAS EN EL MUNDO",
        cityTag: "BÚSQUEDA SATELITAL",
        cityTitle: "CALIDAD DEL AIRE EN TIEMPO REAL"
    },
    fr: {
        navMission: "Notre Mission",
        navSolutions: "Solutions",
        navImpact: "Impact",
        navAbout: "À Propos",
        navContact: "Contact",
        navCareers: "Carrières",
        navJoin: "Rejoindre le Mouvement",
        heroTag: "UNE PLANÈTE PLUS PROPRE EST UN AVENIR MEILLEUR",
        heroHeadline: "INTELLIGENCE<br>NATURELLE.<br><span class=\"text-white/95\">VRAI CHANGEMENT.</span>",
        heroDesc: "Des solutions innovantes pour une planète plus saine.<br class=\"hidden sm:inline\">Énergie propre. Communautés durables.<br class=\"hidden sm:inline\">Un avenir plus résilient.",
        heroExplore: "Explorer Notre Impact",
        heroWatch: "Regarder Notre Histoire",
        missionTag: "NOTRE MISSION",
        missionTitle: "PIONNIERS DE LA NOUVELLE ÈRE DE DURABILITÉ",
        solutionsTag: "UN AVENIR MEILLEUR",
        solutionsTitle: "DES SOLUTIONS<br>QUI FONT<br>LA DIFFÉRENCE.",
        solutionsDesc: "Des énergies renouvelables à la restauration des écosystèmes, des solutions réelles.",
        impactTag: "IMPACT MONDIAL",
        impactTitle: "CHANGEMENT ENVIRONNEMENTAL MESURABLE",
        simTag: "OUTIL INTERACTIF",
        simTitle: "SIMULATEUR D'IMPACT PLANÉTAIRE",
        globeTag: "DÉPLOIEMENT MONDIAL",
        globeTitle: "INITIATIVES ACTIVES DANS LE MONDE",
        cityTag: "RECHERCHE SATELLITE",
        cityTitle: "QUALITÉ DE L'AIR EN TEMPS RÉEL"
    }
};

const hindiPageText = {
    'Rainforest Birds': 'वर्षावन के पक्षी',
    'Ocean Waves': 'समुद्र की लहरें',
    'Wind Turbine': 'पवन टरबाइन',
    VOLUME: 'ध्वनि स्तर',
    'PLAY AMBIENCE': 'प्रकृति की ध्वनियाँ चलाएँ',
    LOGIN: 'लॉग इन',
    DARK: 'डार्क मोड',
    LIGHT: 'लाइट मोड',
    'Our Mission': 'हमारा मिशन',
    Solutions: 'समाधान',
    Impact: 'प्रभाव',
    About: 'परिचय',
    Contact: 'संपर्क',
    Careers: 'करियर',
    'Join the Movement': 'अभियान से जुड़ें',
    'PEOPLE —': 'लोग —',
    'PLANET —': 'पृथ्वी —',
    POSSIBILITY: 'संभावना',
    '100%': '100%',
    'Renewable Focus': 'नवीकरणीय ऊर्जा पर ध्यान',
    '45M+': '4.5 करोड़+',
    'Hectares Protected': 'हेक्टेयर संरक्षित',
    'Initiative 01': 'पहल 01',
    'Offshore Wind Energy Grids': 'समुद्री पवन ऊर्जा ग्रिड',
    'A BRIGHTER TOMORROW': 'एक उज्ज्वल कल',
    'SOLUTIONS': 'समाधान',
    'THAT MAKE': 'जो लाते हैं',
    'A DIFFERENCE.': 'बदलाव।',
    'LEARN MORE ABOUT OUR SOLUTIONS': 'हमारे समाधानों के बारे में जानें',
    'CLEAN ENERGY': 'स्वच्छ ऊर्जा',
    'Powering a sustainable future with renewable solutions.': 'नवीकरणीय समाधानों से टिकाऊ भविष्य को ऊर्जा देना।',
    'THRIVING ECOSYSTEMS': 'समृद्ध पारिस्थितिकी तंत्र',
    'Restoring balance for generations ahead.': 'आने वाली पीढ़ियों के लिए संतुलन बहाल करना।',
    'STRONGER COMMUNITIES': 'सशक्त समुदाय',
    'Building a cleaner, healthier world together.': 'मिलकर स्वच्छ और स्वस्थ दुनिया बनाना।',
    'LEARN MORE': 'और जानें',
    'A healthier planet isn\'t a dream. It\'s a choice.': 'स्वस्थ पृथ्वी सपना नहीं, हमारा चुनाव है।',
    'CLEANER TODAY': 'आज अधिक स्वच्छ',
    'BRIGHTER TOMORROW': 'कल अधिक उज्ज्वल',
    'GLOBAL IMPACT': 'वैश्विक प्रभाव',
    'MEASURABLE ENVIRONMENTAL CHANGE': 'मापने योग्य पर्यावरणीय बदलाव',
    'Every initiative we lead is backed by verified data, transparent reporting, and real-world environmental recovery metrics.': 'हमारी हर पहल प्रमाणित आँकड़ों, पारदर्शी रिपोर्ट और वास्तविक पर्यावरणीय सुधार के मापदंडों पर आधारित है।',
    'Clean Power Generated': 'स्वच्छ ऊर्जा उत्पादन',
    'Annually supplying zero-carbon electricity to over 1.2 million households.': 'हर साल 12 लाख से अधिक घरों को शून्य-कार्बन बिजली।',
    'Trees Planted': 'पेड़ लगाए गए',
    'Native biodiverse afforestation projects across 14 vulnerable ecosystems.': '14 संवेदनशील पारिस्थितिकी तंत्रों में स्थानीय प्रजातियों के वन लगाए जा रहे हैं।',
    'Waste Diverted': 'कचरे का पुनर्चक्रण',
    'Closed-loop circular resource management across partner municipalities.': 'साझेदार नगरपालिकाओं में संसाधनों का चक्रीय प्रबंधन।',
    'Lives Empowered': 'लाभान्वित जीवन',
    'Providing clean water, sustainable housing, and green jobs globally.': 'दुनिया भर में स्वच्छ पानी, टिकाऊ आवास और हरित रोजगार उपलब्ध कराना।',
    'LIVE INTERACTIVE TOOL': 'लाइव इंटरैक्टिव टूल',
    'PLANETARY IMPACT SIMULATOR': 'पृथ्वी पर प्रभाव का सिम्युलेटर',
    'Adjust the sustainability parameters below to model real-time carbon reduction, clean energy output, and ecological recovery rates.': 'कार्बन कमी, स्वच्छ ऊर्जा उत्पादन और पारिस्थितिकी सुधार का अनुमान लगाने के लिए नीचे के मान बदलें।',
    'Clean Energy Capacity Target': 'स्वच्छ ऊर्जा क्षमता का लक्ष्य',
    'Reforestation & Ecosystem Land': 'वन पुनर्स्थापन और पारिस्थितिकी भूमि',
    'Annual Carbon Offset Direct Capture': 'वार्षिक कार्बन कमी और प्रत्यक्ष संग्रह',
    'CO₂ Abated / Yr': 'वार्षिक CO₂ कमी',
    'Equivalent to removing 3.2M cars off the road.': 'सड़कों से 32 लाख कारें हटाने के बराबर।',
    'Homes Powered': 'ऊर्जा पाने वाले घर',
    '100% clean, zero-carbon electric power.': '100% स्वच्छ, शून्य-कार्बन बिजली।',
    'Trees Equivalent': 'पेड़ों के बराबर',
    'Native biodiverse forest ecosystem value.': 'स्थानीय जैव विविधता वाले वन का समतुल्य लाभ।',
    'Clean Air Gain': 'स्वच्छ हवा में सुधार',
    'Regional atmospheric purity index boost.': 'क्षेत्रीय वायु गुणवत्ता सूचकांक में सुधार।',
    'GLOBAL DEPLOYMENT': 'वैश्विक परियोजनाएँ',
    'ACTIVE INITIATIVES WORLDWIDE': 'दुनिया भर में सक्रिय पहल',
    'Active Hub': 'सक्रिय केंद्र',
    'Expanding Grid': 'विस्तारित होता ऊर्जा ग्रिड',
    '📍 North Sea (Wind)': '📍 उत्तरी सागर (पवन ऊर्जा)',
    '📍 Amazon (Forest)': '📍 अमेज़न (वन)',
    '📍 Alps (Hydro)': '📍 आल्प्स (जलविद्युत)',
    '📍 Mojave (Solar)': '📍 मोजावे (सौर ऊर्जा)',
    'Drag / Rotate 3D WebGL Earth Globe': 'खींचकर 3D पृथ्वी को घुमाएँ',
    'NORDIC OFFSHORE WIND MATRIX': 'नॉर्डिक समुद्री पवन ऊर्जा ग्रिड',
    'Generating 1.4 Gigawatts of clean renewable wind energy in the North Sea.': 'उत्तरी सागर में 1.4 गीगावॉट स्वच्छ पवन ऊर्जा का उत्पादन।',
    'NORTH SEA · 1.4 GW OFFSHORE WIND': 'उत्तरी सागर · 1.4 GW समुद्री पवन ऊर्जा',
    'AMAZON CANOPY GUARD INITIATIVE': 'अमेज़न वन संरक्षण पहल',
    'Protecting rainforest habitat and biodiversity across the Amazon basin.': 'अमेज़न क्षेत्र में वर्षावन और जैव विविधता की रक्षा।',
    'BRAZIL · 12M HECTARES PROTECTED': 'ब्राज़ील · 1.2 करोड़ हेक्टेयर संरक्षित',
    'ALPINE HYDRO STORAGE RESERVE': 'आल्प्स जलविद्युत भंडारण केंद्र',
    'High-altitude water storage supports renewable grid stability across Switzerland.': 'ऊँचाई पर जल भंडारण से स्विट्ज़रलैंड के नवीकरणीय ऊर्जा ग्रिड को स्थिरता मिलती है।',
    'SWITZERLAND · HYDRO STORAGE': 'स्विट्ज़रलैंड · जलविद्युत भंडारण',
    'MOJAVE ADVANCED SOLAR ARRAY': 'मोजावे आधुनिक सौर ऊर्जा संयंत्र',
    'Utility-scale solar generation serving communities in the Mojave region.': 'मोजावे क्षेत्र के समुदायों के लिए बड़े पैमाने पर सौर ऊर्जा उत्पादन।',
    'CALIFORNIA · 850 MW SOLAR': 'कैलिफ़ोर्निया · 850 MW सौर ऊर्जा',
    'PARTNER ON PROJECTS': 'परियोजनाओं में साझेदार बनें',
    'LIVE GLOBAL SATELLITE SEARCH': 'लाइव वैश्विक सैटेलाइट खोज',
    'REAL-TIME CITY AIR QUALITY SEARCH': 'शहर की वायु गुणवत्ता की ताज़ा जानकारी',
    'Type any city in the world to fetch live satellite air quality (AQI), PM2.5 particulate density, and carbon monoxide levels via Open-Meteo live API.': 'Open-Meteo से AQI, PM2.5 और कार्बन मोनोऑक्साइड की ताज़ा जानकारी पाने के लिए किसी भी शहर का नाम लिखें।',
    'SEARCH 🔍': 'खोजें 🔍',
    'SELECTED CITY': 'चुना हुआ शहर',
    'EUROPEAN AQI INDEX': 'यूरोपीय AQI सूचकांक',
    'Clean atmospheric air quality rating.': 'हवा की स्वच्छता का माप।',
    'PM2.5 DENSITY': 'PM2.5 की मात्रा',
    'Fine inhalable particulate matter.': 'साँस के साथ अंदर जाने वाले सूक्ष्म कण।',
    'CARBON MONOXIDE': 'कार्बन मोनोऑक्साइड',
    'Atmospheric CO concentration reading.': 'हवा में CO की मात्रा।',
    'LIVE CLIMATE OBSERVATIONS · OPEN-METEO': 'लाइव जलवायु जानकारी · OPEN-METEO',
    'Air quality': 'वायु गुणवत्ता',
    Wind: 'पवन',
    Projects: 'परियोजनाएँ',
    'Loading observations...': 'जानकारी लोड हो रही है...',
    'LIVE COMMUNITY IMPACT': 'समुदाय का लाइव प्रभाव',
    'GLOBAL SUPPORTERS & LIVE STREAM': 'वैश्विक समर्थक और लाइव गतिविधियाँ',
    'CONNECTING...': 'कनेक्ट हो रहा है...',
    'SSE STREAM CONNECTED': 'लाइव स्ट्रीम जुड़ी हुई है',
    'RECONNECTING TO LIVE FEED': 'लाइव फ़ीड से फिर जुड़ रहे हैं',
    'LEADERBOARD UNAVAILABLE': 'लीडरबोर्ड उपलब्ध नहीं है',
    'TOP PLANET GUARDIANS': 'पृथ्वी के शीर्ष संरक्षक',
    'VERIFIED OFFSETS': 'सत्यापित कार्बन कमी',
    RANK: 'स्थान',
    SUPPORTER: 'समर्थक',
    TREES: 'पेड़',
    'CO₂ OFFSET': 'CO₂ में कमी',
    BADGE: 'बैज',
    'LIVE PLEDGE FEED': 'लाइव संकल्प फ़ीड',
    'REAL-TIME SSE': 'लाइव SSE',
    'Live stream of environmental actions taken by supporters around the globe:': 'दुनिया भर के समर्थकों की पर्यावरणीय गतिविधियाँ:',
    '+ MAKE YOUR GLOBAL PLEDGE NOW': '+ अभी अपना वैश्विक संकल्प लें',
    'LIVE TELEMETRY:': 'लाइव टेलीमेट्री:',
    'LAUNCH 360° VR TOUR →': '360° VR यात्रा शुरू करें →',
    '3D SIMULATION CONFIGURATOR': '3D सिमुलेशन सेटअप',
    'RENEWABLE FARM DESIGNER': 'नवीकरणीय ऊर्जा संयंत्र डिज़ाइनर',
    'Configure wind turbine arrays, solar panel tilts, and environmental weather profiles to optimize real-time clean power output.': 'स्वच्छ ऊर्जा उत्पादन बेहतर करने के लिए पवन टरबाइन, सौर पैनल का कोण और मौसम चुनें।',
    'Wind Turbine Count:': 'पवन टरबाइन की संख्या:',
    'Solar Panel Angle:': 'सौर पैनल का कोण:',
    'Weather Condition Mode': 'मौसम की स्थिति',
    'Golden Hour Sunset': 'सुनहरी शाम',
    'High Noon Sunlight': 'दोपहर की तेज़ धूप',
    'Misty Rain & Wind': 'धुंध, बारिश और हवा',
    'Starry Twilight': 'तारों भरी शाम',
    'ESTIMATED OUTPUT:': 'अनुमानित उत्पादन:',
    'EFFICIENCY SCORE:': 'दक्षता स्कोर:',
    'SIMULATION LIVE': 'सिमुलेशन लाइव',
    'ECOSYSTEM RECOVERY': 'पारिस्थितिकी तंत्र का सुधार',
    'BEFORE & AFTER RESTORATION': 'पुनर्स्थापन से पहले और बाद',
    'Drag the interactive slider handle to visualize 36 months of Terra Nova biodiverse reforestation and river basin recovery.': 'स्लाइडर खींचकर 36 महीनों में वन और नदी क्षेत्र के सुधार को देखें।',
    'After Restoration': 'पुनर्स्थापन के बाद',
    'AFTER: TERRA NOVA RESTORATION (MONTH 36)': 'बाद में: टेरा नोवा पुनर्स्थापन (महीना 36)',
    'Before Restoration': 'पुनर्स्थापन से पहले',
    'BEFORE: DEGRADED LANDSCAPE (MONTH 0)': 'पहले: क्षतिग्रस्त क्षेत्र (महीना 0)',
    'SATELLITE TELEMETRY': 'सैटेलाइट टेलीमेट्री',
    'REAL-TIME EARTH RADAR TELEMETRY': 'पृथ्वी रडार की लाइव जानकारी',
    'Direct orbital telemetry monitoring canopy cover recovery, solar thermal dissipation, and atmospheric CO₂ capture efficiency across all Terra Nova project coordinates.': 'कक्षीय सैटेलाइट से वन आवरण, सौर ऊष्मा और CO₂ संग्रह की निगरानी।',
    'ORBITAL SATELLITE': 'कक्षीय सैटेलाइट',
    'OCEAN TEMP SHIFT': 'समुद्र के तापमान में बदलाव',
    'ATMOSPHERIC PURITY': 'वायु की शुद्धता',
    'CANOPY COVER': 'वन आवरण',
    'ENTERPRISE & INDIVIDUAL TOOL': 'संस्थाओं और व्यक्तियों के लिए टूल',
    'CARBON FOOTPRINT CALCULATOR': 'कार्बन पदचिह्न कैलकुलेटर',
    'Estimate your annual footprint and claim a verified Terra Nova Offset Certificate.': 'अपने सालाना कार्बन पदचिह्न का अनुमान लगाएँ और सत्यापित टेरा नोवा प्रमाणपत्र पाएँ।',
    'Monthly Electricity Usage (kWh)': 'मासिक बिजली उपयोग (kWh)',
    'Annual Flights Taken': 'सालाना हवाई यात्राएँ',
    'ESTIMATED ANNUAL FOOTPRINT': 'अनुमानित सालाना कार्बन पदचिह्न',
    'CLAIM OFFSET CERTIFICATE': 'कार्बन कमी प्रमाणपत्र पाएँ',
    'PUBLICATIONS & INSIGHTS': 'लेख और जानकारी',
    'THE TERRA NOVA JOURNAL': 'टेरा नोवा पत्रिका',
    ALL: 'सभी',
    'CLIMATE TECH': 'जलवायु तकनीक',
    BIODIVERSITY: 'जैव विविधता',
    ARCHITECTURE: 'वास्तुकला',
    'The Future of Next-Gen Offshore Wind Floating Grids': 'अगली पीढ़ी के समुद्री पवन ऊर्जा ग्रिड का भविष्य',
    'How deep-sea floating wind turbines can supply 40% of global industrial electricity needs.': 'गहरे समुद्र के तैरते पवन टरबाइन दुनिया की औद्योगिक बिजली का 40% दे सकते हैं।',
    'Restoring Rainforest Corridors with AI Drone Seeds': 'AI ड्रोन बीजों से वर्षावन गलियारों का पुनर्स्थापन',
    'Automated reforestation dropping native biodiverse seed pods across 10,000 hectares daily.': 'स्वचालित वनरोपण से हर दिन 10,000 हेक्टेयर में स्थानीय प्रजातियों के बीज पहुँचते हैं।',
    'Mass Timber & Glass: Living Architectural Habitats': 'मास टिम्बर और काँच: प्रकृति के अनुकूल आवास',
    'Designing carbon-negative residential structures surrounded by natural wetlands.': 'प्राकृतिक आर्द्रभूमि के बीच कार्बन-नकारात्मक आवासों का डिज़ाइन।',
    'LEADERSHIP & SCIENTISTS': 'नेतृत्व और वैज्ञानिक',
    'OUR SCIENTIFIC LEADERSHIP': 'हमारा वैज्ञानिक नेतृत्व',
    'Guided by world-renowned climate technologists, ecological engineers, and renewable energy pioneers.': 'जलवायु तकनीक विशेषज्ञों, पारिस्थितिकी इंजीनियरों और नवीकरणीय ऊर्जा अग्रदूतों का मार्गदर्शन।',
    'Chief Climate Scientist': 'मुख्य जलवायु वैज्ञानिक',
    'Former IPCC lead researcher with 18+ years in atmospheric carbon capture modeling.': 'IPCC के पूर्व प्रमुख शोधकर्ता, वायुमंडलीय कार्बन संग्रह मॉडलिंग में 18+ वर्षों का अनुभव।',
    'VP Clean Energy': 'स्वच्छ ऊर्जा उपाध्यक्ष',
    'Pioneered offshore wind matrix grid infrastructure across the Atlantic basin.': 'अटलांटिक क्षेत्र में समुद्री पवन ऊर्जा ग्रिड की आधारभूत संरचना विकसित की।',
    'Lead Eco Architect': 'मुख्य पर्यावरण वास्तुकार',
    'Specializes in zero-carbon mass timber eco-cities and biophilic design.': 'शून्य-कार्बन लकड़ी के इको-सिटी और प्रकृति-आधारित डिज़ाइन के विशेषज्ञ।',
    'Head of Global Ops': 'वैश्विक संचालन प्रमुख',
    'Overseeing deployment across 24 global sustainable restoration project sites.': 'दुनिया भर में 24 टिकाऊ पुनर्स्थापन परियोजनाओं का संचालन।',
    'TERRA NOVA 360° VR VIRTUAL TOUR': 'टेरा नोवा 360° VR वर्चुअल यात्रा',
    '💡 Drag or scroll to rotate 360° environment view': '💡 वातावरण को 360° घुमाने के लिए खींचें या स्क्रॉल करें',
    'OFFICIAL VERIFIED CERTIFICATE': 'आधिकारिक सत्यापित प्रमाणपत्र',
    'GREEN SUPPORTER CERTIFICATE': 'हरित समर्थक प्रमाणपत्र',
    'This certifies that annual carbon emissions of': 'यह प्रमाणित करता है कि सालाना कार्बन उत्सर्जन',
    'have been officially offset through Terra Nova clean energy initiatives.': 'टेरा नोवा की स्वच्छ ऊर्जा पहलों के माध्यम से संतुलित किया गया है।',
    'DOWNLOAD OFFICIAL CERTIFICATE (PNG/PDF)': 'आधिकारिक प्रमाणपत्र डाउनलोड करें (PNG/PDF)',
    'TERRA AI ASSISTANT': 'टेरा AI सहायक',
    '👋 Welcome! I am Terra AI. How can I help you explore our clean energy initiatives or calculate carbon offsets today?': '👋 स्वागत है! मैं टेरा AI हूँ। स्वच्छ ऊर्जा पहलों या कार्बन कमी की गणना में कैसे मदद करूँ?',
    'Ask Terra AI a question...': 'टेरा AI से सवाल पूछें...',
    'OUR PHILOSOPHY': 'हमारा दर्शन',
    'Nature possesses the blue print for absolute efficiency. We build technology that honors it.': 'प्रकृति में सर्वोत्तम दक्षता का खाका है। हम उसी का सम्मान करने वाली तकनीक बनाते हैं।',
    'ABOUT TERRA NOVA': 'टेरा नोवा के बारे में',
    'WHERE TECHNOLOGY HARMONIZES WITH ECOLOGY': 'जहाँ तकनीक और प्रकृति साथ चलते हैं',
    'Founded with a vision to accelerate planet-wide ecological recovery, Terra Nova partners with world-leading environmental scientists, clean tech innovators, and forward-thinking governments. We design scalable solutions that reduce emissions, restore wildlife corridors, and promote long-term climate stability.': 'पृथ्वी पर पारिस्थितिकी सुधार को गति देने के उद्देश्य से स्थापित टेरा नोवा, पर्यावरण वैज्ञानिकों, स्वच्छ तकनीक नवप्रवर्तकों और दूरदर्शी सरकारों के साथ काम करता है। हम उत्सर्जन घटाने, वन्यजीव गलियारों को बहाल करने और दीर्घकालीन जलवायु स्थिरता के लिए विस्तार योग्य समाधान बनाते हैं।',
    'GET INVOLVED TODAY': 'आज ही जुड़ें',
    'Innovating for a cleaner planet, stronger communities, and a more sustainable tomorrow.': 'स्वच्छ पृथ्वी, सशक्त समुदाय और टिकाऊ कल के लिए नवाचार।',
    'SOLUTIONS': 'समाधान',
    Ecosystems: 'पारिस्थितिकी तंत्र',
    Communities: 'समुदाय',
    'Our Approach': 'हमारा तरीका',
    'OUR IMPACT': 'हमारा प्रभाव',
    People: 'लोग',
    Planet: 'पृथ्वी',
    Possibility: 'संभावना',
    Stories: 'कहानियाँ',
    ABOUT: 'परिचय',
    'Our Team': 'हमारी टीम',
    Partners: 'साझेदार',
    News: 'समाचार',
    SUPPORT: 'सहायता',
    'Work With Us': 'हमारे साथ काम करें',
    FAQs: 'अक्सर पूछे जाने वाले सवाल',
    'STAY INFORMED': 'अपडेट पाएँ',
    'Get updates on our impact, stories and ways to get involved.': 'हमारे प्रभाव, कहानियों और जुड़ने के तरीकों की जानकारी पाएँ।',
    '✓ Thank you! You are subscribed to Terra Nova updates.': '✓ धन्यवाद! आपने टेरा नोवा अपडेट के लिए सदस्यता ली।',
    'A Cleaner Tomorrow.': 'एक स्वच्छ कल।',
    Privacy: 'गोपनीयता',
    Terms: 'नियम और शर्तें',
    Accessibility: 'सुगम्यता',
    'TERRA NOVA — OUR STORY': 'टेरा नोवा — हमारी कहानी',
    'Your browser does not support the video tag.': 'आपका ब्राउज़र वीडियो चलाने का समर्थन नहीं करता।',
    'BECOME A MEMBER': 'सदस्य बनें',
    'JOIN THE MOVEMENT': 'अभियान से जुड़ें',
    'Partner with Terra Nova to support global ecological restoration and clean energy transition.': 'वैश्विक पारिस्थितिकी पुनर्स्थापन और स्वच्छ ऊर्जा बदलाव के लिए टेरा नोवा के साथ जुड़ें।',
    'Full Name': 'पूरा नाम',
    'Email Address': 'ईमेल पता',
    'Primary Interest': 'मुख्य रुचि',
    'Clean Energy Initiatives': 'स्वच्छ ऊर्जा पहल',
    'Ecosystem Restoration': 'पारिस्थितिकी तंत्र का पुनर्स्थापन',
    'Sustainable Architecture': 'टिकाऊ वास्तुकला',
    'Corporate Partnership': 'कॉर्पोरेट साझेदारी',
    'Submit Registration': 'पंजीकरण भेजें',
    '✓ Registration received! Welcome to Terra Nova.': '✓ पंजीकरण मिल गया! टेरा नोवा में आपका स्वागत है।',
    'TERRA NOVA MEMBER PORTAL': 'टेरा नोवा सदस्य पोर्टल',
    'PERSONAL ECO-DASHBOARD & PROFILE': 'व्यक्तिगत पर्यावरण डैशबोर्ड और प्रोफ़ाइल',
    'Track your personal environmental impact analytics, monthly carbon offsets, and manage profile credentials.': 'अपने पर्यावरणीय प्रभाव, मासिक कार्बन कमी और प्रोफ़ाइल का प्रबंधन करें।',
    '📊 Impact Analytics & Badges': '📊 प्रभाव विश्लेषण और बैज',
    '👤 Edit Profile & Photo': '👤 प्रोफ़ाइल और फ़ोटो बदलें',
    'LIFETIME OFFSET': 'कुल कार्बन कमी',
    'CO₂ Abated': 'CO₂ कम किया',
    'TREES PLANTED': 'लगाए गए पेड़',
    'Native Species': 'स्थानीय प्रजातियाँ',
    'CLEAN ENERGY': 'स्वच्छ ऊर्जा',
    'Solar & Wind': 'सौर और पवन ऊर्जा',
    'ECO TIER': 'पर्यावरण स्तर',
    'Planet Guardian': 'पृथ्वी संरक्षक',
    'MONTHLY CO₂ REDUCTION TRAJECTORY (TONS)': 'मासिक CO₂ कमी का रुझान (टन)',
    'YEAR 2026': 'वर्ष 2026',
    '🏆 EARNED ACHIEVEMENT BADGES': '🏆 अर्जित उपलब्धि बैज',
    Seedling: 'नन्हा पौधा',
    'First Pledge': 'पहला संकल्प',
    'Solar Pioneer': 'सौर ऊर्जा अग्रदूत',
    '5 MWh Clean': '5 MWh स्वच्छ ऊर्जा',
    Guardian: 'संरक्षक',
    '10+ Tons CO₂': '10+ टन CO₂',
    'Forest Titan': 'वन संरक्षक',
    '80% to Unlock': 'अनलॉक करने के लिए 80%',
    '📷 CHANGE PHOTO': '📷 फ़ोटो बदलें',
    '📁 Choose Photo From Device': '📁 डिवाइस से फ़ोटो चुनें',
    'User Full Name': 'सदस्य का पूरा नाम',
    'Member Bio / Designation': 'सदस्य परिचय / पद',
    'SAVE PROFILE & SWAP LOGO TO MY PHOTO': 'प्रोफ़ाइल सहेजें और फ़ोटो लगाएँ',
    '🚪 LOGOUT (RESET LOGO TO TERRA NOVA)': '🚪 लॉग आउट (टेरा नोवा लोगो वापस लगाएँ)',
    'Toggle Navigation': 'नेविगेशन खोलें या बंद करें',
    'Select Language': 'भाषा चुनें',
    'Toggle Theme': 'थीम बदलें',
    'Search city (e.g. London, Delhi, New York, Tokyo)...': 'शहर खोजें (जैसे दिल्ली, मुंबई, लंदन)...',
    'Your email address': 'आपका ईमेल पता',
    'e.g. Alex Morgan': 'जैसे, Alex Morgan',
    'alex@example.com': 'alex@example.com',
    'Your Name': 'आपका नाम',
    'yourname@example.com': 'yourname@example.com',
    Designation: 'पद',
    Instagram: 'इंस्टाग्राम',
    LinkedIn: 'लिंक्डइन',
    YouTube: 'यूट्यूब',
    SOUNDSCAPE: 'प्रकृति की ध्वनियाँ',
    'NATURE SOUNDS': 'प्रकृति की ध्वनियाँ',
    OFF: 'बंद',
    '🌲 Rainforest Birds': '🌲 वर्षावन के पक्षी',
    '🌊 Ocean Waves': '🌊 समुद्र की लहरें',
    '🌀 Wind Turbine': '🌀 पवन टरबाइन',
    'Join the Movement →': 'अभियान से जुड़ें →',
    'At Terra Nova, we merge cutting-edge environmental technology with natural ecosystem intelligence. Our global initiatives reverse ecological degradation, harness clean renewable energy, and build resilient communities for tomorrow.': 'टेरा नोवा में हम पर्यावरण तकनीक और प्रकृति की समझ को जोड़ते हैं। हमारी वैश्विक पहल पारिस्थितिकी को सुधारती हैं, स्वच्छ ऊर्जा अपनाती हैं और समुदायों को टिकाऊ बनाती हैं।',
    '"A healthier planet isn\'t a dream. It\'s a choice."': '"स्वस्थ पृथ्वी सपना नहीं, हमारा चुनाव है।"',
    'PARTNER ON PROJECTS →': 'परियोजनाओं में साझेदार बनें →',
    '🏆 TOP PLANET GUARDIANS': '🏆 पृथ्वी के शीर्ष संरक्षक',
    'GRID LOAD: 98.4%': 'ग्रिड भार: 98.4%',
    'CANOPY DENSITY: +14.2%': 'वन आवरण: +14.2%',
    '24 Units': '24 इकाइयाँ',
    '35° Optimal': '35° उपयुक्त',
    'TERRA-SAT 4': 'टेरा-सैट 4',
    '-0.12°C Stabilized': '-0.12°C स्थिर',
    '94.8 AQI Index': '94.8 AQI सूचकांक',
    '88.4% Density': '88.4% घनत्व',
    'CLAIM OFFSET CERTIFICATE →': 'कार्बन कमी प्रमाणपत्र पाएँ →',
    'CLIMATE TECH • SEPT 2026': 'जलवायु तकनीक • सितंबर 2026',
    'BIODIVERSITY • AUG 2026': 'जैव विविधता • अगस्त 2026',
    'ARCHITECTURE • JUL 2026': 'वास्तुकला • जुलाई 2026',
    'HASH:': 'हैश:',
    'DOWNLOAD OFFICIAL CERTIFICATE (PNG/PDF) →': 'आधिकारिक प्रमाणपत्र डाउनलोड करें (PNG/PDF) →',
    'GET INVOLVED TODAY →': 'आज ही जुड़ें →',
    'PEOPLE': 'लोग',
    'PLANET': 'पृथ्वी',
    'PEOPLE PLANET POSSIBILITY': 'लोग · पृथ्वी · संभावना',
    'Submit Registration →': 'पंजीकरण भेजें →',
    'SAVE PROFILE & SWAP LOGO TO MY PHOTO →': 'प्रोफ़ाइल सहेजें और अपनी फ़ोटो लगाएँ →',
    '14.2 Tons': '14.2 टन',
    '240 Trees': '240 पेड़',
    '6.8 MWh': '6.8 MWh',
    'Level 4': 'स्तर 4',
    '5 MWh Clean': '5 MWh स्वच्छ ऊर्जा',
    '© OpenStreetMap contributors © CARTO': '© OpenStreetMap योगदानकर्ता © CARTO',
    'Loading observations...': 'जानकारी लोड हो रही है...',
    'SSE STREAM CONNECTED': 'लाइव स्ट्रीम जुड़ी हुई है',
    'RECONNECTING TO LIVE FEED': 'लाइव फ़ीड से फिर जुड़ रहे हैं',
    'LEADERBOARD UNAVAILABLE': 'लीडरबोर्ड उपलब्ध नहीं है',
    'AI chat is not configured. Set OPENAI_API_KEY or GEMINI_API_KEY on the server.': 'AI चैट सेट नहीं है। सर्वर पर OPENAI_API_KEY या GEMINI_API_KEY जोड़ें।',
    'Successfully subscribed to Terra Nova updates.': 'टेरा नोवा अपडेट के लिए सदस्यता सफल रही।',
    'Welcome to Terra Nova movement.': 'टेरा नोवा अभियान में आपका स्वागत है।',
    'Registration received! Welcome to Terra Nova.': 'पंजीकरण मिल गया! टेरा नोवा में आपका स्वागत है।',
    '▶ PLAY AMBIENCE': '▶ प्रकृति की ध्वनियाँ चलाएँ',
    'Nordic Wind Grid generated +450 kWh clean power in last 5 seconds.': 'नॉर्डिक पवन ग्रिड ने पिछले 5 सेकंड में +450 kWh स्वच्छ ऊर्जा बनाई।',
    'Amazon Canopy Guard deployed 12,000 AI biodiverse seed pods in Sector 4.': 'अमेज़न वन संरक्षण ने सेक्टर 4 में जैव विविधता वाले 12,000 AI बीज-पॉड लगाए।',
    'Alpine Hydro Reserve achieved 99.4% grid balance efficiency across Switzerland.': 'आल्प्स जलविद्युत केंद्र ने स्विट्ज़रलैंड में 99.4% ग्रिड संतुलन दक्षता हासिल की।',
    'Mojave Solar Array reduced regional carbon offset by +120 Metric Tons today.': 'मोजावे सौर संयंत्र ने आज क्षेत्रीय कार्बन उत्सर्जन में 120 मीट्रिक टन की कमी की।',
    'Greetings! I am Terra Nova AI. How can I assist you with clean energy technologies, carbon reduction calculations, or our global initiatives today?': 'नमस्ते! मैं टेरा नोवा AI हूँ। स्वच्छ ऊर्जा, कार्बन कमी की गणना या हमारी वैश्विक पहलों में कैसे मदद करूँ?',
    'You can calculate your personal carbon footprint using household electricity and flights in our Carbon Calculator section, then download an official verified 1200x800 PNG Certificate!': 'कार्बन कैलकुलेटर में घर की बिजली और हवाई यात्राओं से अपना कार्बन पदचिह्न निकालें, फिर आधिकारिक 1200x800 PNG प्रमाणपत्र डाउनलोड करें।',
    'Our interactive 3D WebGL Earth Globe displays real-time active environmental hubs: Nordic Offshore Wind, Amazon Canopy Guard, Alpine Hydro Storage, and Mojave Solar Array. You can drag and rotate the globe in 360 degrees to explore all global initiatives!': 'हमारा इंटरैक्टिव 3D WebGL पृथ्वी ग्लोब नॉर्डिक पवन, अमेज़न वन, आल्प्स जलविद्युत और मोजावे सौर केंद्र दिखाता है। सभी वैश्विक पहलों को देखने के लिए ग्लोब को घुमाएँ।',
    'Thank you for asking about': 'आपके सवाल के लिए धन्यवाद',
    'Could not connect to the AI service. Check your connection and try again.': 'AI सेवा से संपर्क नहीं हो पाया। अपना कनेक्शन जाँचकर फिर प्रयास करें।',
    'The AI assistant could not answer. Please try again.': 'AI सहायक जवाब नहीं दे पाया। कृपया फिर प्रयास करें।'
};

const originalPageText = new WeakMap();
const originalPageAttributes = new WeakMap();
const translatedPageText = new WeakMap();
let pageLanguageObserver = null;

function getLocalizedPageText(text, langCode = currentLang) {
    if (langCode !== 'hi') return text;
    const trimmed = text.trim();
    if (hindiPageText[trimmed]) return hindiPageText[trimmed];

    let match = trimmed.match(/^(\d+(?:\.\d+)?)M Hectares$/);
    if (match) return `${match[1]}M हेक्टेयर`;
    match = trimmed.match(/^(\d+(?:\.\d+)?)M Tons$/);
    if (match) return `${match[1]}M टन`;
    match = trimmed.match(/^(\d+) Units$/);
    if (match) return `${match[1]} इकाइयाँ`;
    match = trimmed.match(/^(\d+)° Optimal$/);
    if (match) return `${match[1]}° उपयुक्त`;
    match = trimmed.match(/^(\d+) \((GOOD|MODERATE|POOR)\)$/);
    if (match) return `${match[1]} (${({ GOOD: 'अच्छा', MODERATE: 'मध्यम', POOR: 'खराब' })[match[2]]})`;
    match = trimmed.match(/^Lat: ([\d.-]+)° \| Lon: ([\d.-]+)°$/);
    if (match) return `अक्षांश: ${match[1]}° | देशांतर: ${match[2]}°`;
    match = trimmed.match(/^Updated (.+) · (\d+)\/(\d+) hubs$/);
    if (match) return `अपडेट ${match[1]} · ${match[2]}/${match[3]} केंद्र`;
    match = trimmed.match(/^(\d+(?:\.\d+)?) Metric Tons CO₂$/);
    if (match) return `${match[1]} मीट्रिक टन CO₂`;
    match = trimmed.match(/^LIVE SATELLITE API: European AQI Index is (\d+) \(PM2\.5: ([\d.]+) µg\/m³, CO: ([\d.]+) µg\/m³\)$/);
    if (match) return `लाइव सैटेलाइट जानकारी: यूरोपीय AQI ${match[1]} (PM2.5: ${match[2]} µg/m³, CO: ${match[3]} µg/m³)`;
    return text;
}

function translatePageTextNode(textNode, langCode = currentLang, isExternalUpdate = false) {
    if (isExternalUpdate && translatedPageText.get(textNode) === textNode.nodeValue) return;
    if (isExternalUpdate) originalPageText.set(textNode, textNode.nodeValue);
    if (!originalPageText.has(textNode)) originalPageText.set(textNode, textNode.nodeValue);

    const original = originalPageText.get(textNode);
    const translated = getLocalizedPageText(original, langCode);
    const leadingSpace = original.match(/^\s*/)[0];
    const trailingSpace = original.match(/\s*$/)[0];
    const nextValue = `${leadingSpace}${translated}${trailingSpace}`;
    if (textNode.nodeValue !== nextValue) textNode.nodeValue = nextValue;
    if (translated !== original.trim()) translatedPageText.set(textNode, nextValue);
    else translatedPageText.delete(textNode);
}

function translatePageSubtree(root) {
    if (root.nodeType === Node.TEXT_NODE) {
        translatePageTextNode(root);
        return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) translatePageTextNode(textNode);
}

function applyPageLanguage(langCode) {
    if (pageLanguageObserver) pageLanguageObserver.disconnect();
    document.documentElement.lang = langCode;
    document.title = langCode === 'hi' ? 'TERRA NOVA — प्राकृतिक बुद्धिमत्ता. वास्तविक बदलाव.' : 'TERRA NOVA — Natural Intelligence. Real Change.';
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let textNode;
    while ((textNode = walker.nextNode())) translatePageTextNode(textNode, langCode);

    document.querySelectorAll('[placeholder], [title], [aria-label]').forEach(element => {
        if (!originalPageAttributes.has(element)) {
            originalPageAttributes.set(element, {
                placeholder: element.getAttribute('placeholder'),
                title: element.getAttribute('title'),
                ariaLabel: element.getAttribute('aria-label')
            });
        }
        const originals = originalPageAttributes.get(element);
        for (const [attribute, original] of Object.entries({ placeholder: originals.placeholder, title: originals.title, 'aria-label': originals.ariaLabel })) {
            if (original === null) continue;
            element.setAttribute(attribute, langCode === 'hi' ? (hindiPageText[original] || original) : original);
        }
    });

    if (langCode === 'hi') {
        if (!pageLanguageObserver) {
            pageLanguageObserver = new MutationObserver(records => {
                for (const record of records) {
                    if (record.type === 'characterData') {
                        translatePageTextNode(record.target, currentLang, true);
                    } else {
                        record.addedNodes.forEach(translatePageSubtree);
                    }
                }
            });
        }
        pageLanguageObserver.observe(document.body, { childList: true, characterData: true, subtree: true });
    }
}

let currentLang = 'en';

function toggleLangDropdown(e) {
    if (e) e.stopPropagation();
    const dropdown = document.getElementById('lang-dropdown');
    const soundDropdown = document.getElementById('soundscape-dropdown');
    const langButton = document.getElementById('lang-btn');
    const soundButton = document.getElementById('soundscape-btn');
    if (soundDropdown) soundDropdown.classList.add('hidden');
    if (soundButton) soundButton.setAttribute('aria-expanded', 'false');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
        if (langButton) langButton.setAttribute('aria-expanded', String(!dropdown.classList.contains('hidden')));
    }
}

function setLanguage(langCode) {
    if (!translations[langCode]) return;
    currentLang = langCode;
    applyPageLanguage(langCode);
    localStorage.setItem('terra_nova_lang', langCode);

    const langText = document.getElementById('current-lang-text');
    if (langText) langText.innerText = langCode.toUpperCase();

    const dropdown = document.getElementById('lang-dropdown');
    if (dropdown) dropdown.classList.add('hidden');
    document.getElementById('lang-btn')?.setAttribute('aria-expanded', 'false');

    const t = translations[langCode];

    const navLinks = document.querySelectorAll('header nav a');
    if (navLinks.length >= 6) {
        navLinks[0].childNodes[0].nodeValue = t.navMission + ' ';
        navLinks[1].childNodes[0].nodeValue = t.navSolutions + ' ';
        navLinks[2].childNodes[0].nodeValue = t.navImpact + ' ';
        navLinks[3].childNodes[0].nodeValue = t.navAbout + ' ';
        navLinks[4].childNodes[0].nodeValue = t.navContact + ' ';
        navLinks[5].childNodes[0].nodeValue = t.navCareers + ' ';
    }
    const navJoin = document.getElementById('nav-join-text');
    if (navJoin) navJoin.innerText = t.navJoin;

    const heroTag = document.querySelector('#hero .hero-fade span:last-child');
    if (heroTag) heroTag.innerText = t.heroTag;
    const heroHeadline = document.getElementById('hero-headline');
    if (heroHeadline) heroHeadline.innerHTML = t.heroHeadline;
    const heroPara = document.getElementById('hero-paragraph');
    if (heroPara) heroPara.innerHTML = t.heroDesc;

    const heroExploreBtn = document.querySelector('#hero a[href="#solutions"] span:first-child');
    if (heroExploreBtn) heroExploreBtn.innerText = t.heroExplore;
    const heroWatchBtn = document.querySelector('#hero button span:last-child');
    if (heroWatchBtn) heroWatchBtn.innerText = t.heroWatch;

    const missionTag = document.querySelector('#mission .inline-flex span:last-child');
    if (missionTag) missionTag.innerText = t.missionTag;
    const missionTitle = document.querySelector('#mission h2');
    if (missionTitle) missionTitle.innerText = t.missionTitle;

    const solTag = document.querySelector('#solutions .inline-flex span:first-child');
    if (solTag) solTag.innerText = t.solutionsTag;
    const solTitle = document.querySelector('#solutions h2');
    if (solTitle) solTitle.innerHTML = t.solutionsTitle;
    const solDesc = document.querySelector('#solutions p');
    if (solDesc) solDesc.innerText = t.solutionsDesc;

    const impTag = document.querySelector('#impact .inline-flex span:last-child');
    if (impTag) impTag.innerText = t.impactTag;
    const impTitle = document.querySelector('#impact h2');
    if (impTitle) impTitle.innerText = t.impactTitle;

    const simTag = document.querySelector('#simulator .inline-flex span:nth-child(2)');
    if (simTag) simTag.innerText = t.simTag;
    const simTitle = document.querySelector('#simulator h2');
    if (simTitle) simTitle.innerText = t.simTitle;

    const globeTag = document.querySelector('#projects-map .inline-flex span:last-child');
    if (globeTag) globeTag.innerText = t.globeTag;
    const globeTitle = document.querySelector('#projects-map h2');
    if (globeTitle) globeTitle.innerText = t.globeTitle;

    const cityTag = document.querySelector('#city-search-widget .inline-flex span:nth-child(2)');
    if (cityTag) cityTag.innerText = t.cityTag;
    const cityTitle = document.querySelector('#city-search-widget h2');
    if (cityTitle) cityTitle.innerText = t.cityTitle;
}

window.addEventListener('click', (e) => {
    const langDrop = document.getElementById('lang-dropdown');
    const soundDrop = document.getElementById('soundscape-dropdown');
    const langBtn = document.getElementById('lang-btn');
    const soundBtn = document.getElementById('soundscape-btn');

    if (langDrop && !langDrop.contains(e.target) && langBtn && !langBtn.contains(e.target)) {
        langDrop.classList.add('hidden');
    }
    if (soundDrop && !soundDrop.contains(e.target) && soundBtn && !soundBtn.contains(e.target)) {
        soundDrop.classList.add('hidden');
    }
});

// 10. Planetary Impact Simulator Calculation Logic
function updateSimulator() {
    const energy = parseFloat(document.getElementById('sim-energy').value);
    const land = parseFloat(document.getElementById('sim-land').value);
    const carbon = parseFloat(document.getElementById('sim-carbon').value);

    // Update Slider Label Displays
    document.getElementById('sim-energy-val').innerText = `${energy.toFixed(1)} GW`;
    document.getElementById('sim-land-val').innerText = `${land.toFixed(1)}M Hectares`;
    document.getElementById('sim-carbon-val').innerText = `${carbon.toFixed(1)}M Tons`;

    // Calculate Impact Metrics
    const co2Abated = (energy * 2.1 + carbon * 0.8).toFixed(1);
    const homesPowered = (energy * 0.43).toFixed(2);
    const treesEq = Math.round(land * 16.8);
    const airGain = Math.min(99, Math.round(energy * 3 + land * 1.2 + carbon * 1.5));

    // Update Result Counters
    document.getElementById('res-co2').innerText = `${co2Abated}M`;
    document.getElementById('res-homes').innerText = `${homesPowered}M`;
    document.getElementById('res-trees').innerText = `${treesEq}M`;
    document.getElementById('res-air').innerText = `+${airGain}%`;
}

// 11. Global Projects Interactive Map Pin Selection
const mapPinData = {
    nordic: {
        title: 'NORDIC OFFSHORE WIND MATRIX',
        desc: 'Generating clean power with offshore wind installations in the North Sea.',
        metric: 'NORTH SEA · 1.4 GW OFFSHORE WIND',
        image: 'assets/solution_clean_energy.webp',
        alt: 'Offshore wind turbines in the North Sea',
        icon: '🌬️'
    },
    amazon: {
        title: 'AMAZON CANOPY GUARD INITIATIVE',
        desc: 'Protecting rainforest habitat and biodiversity across the Amazon basin.',
        metric: 'BRAZIL · 12M HECTARES PROTECTED',
        image: 'assets/solution_ecosystems.webp',
        alt: 'Amazon rainforest and ecosystem restoration',
        icon: '🌳'
    },
    alpine: {
        title: 'ALPINE HYDRO STORAGE RESERVE',
        desc: 'High-altitude water storage supports renewable grid stability across Switzerland.',
        metric: 'SWITZERLAND · HYDRO STORAGE',
        image: 'assets/hero_bg_2.webp',
        alt: 'Alpine landscape for the hydro storage initiative',
        icon: '💧'
    },
    mojave: {
        title: 'MOJAVE ADVANCED SOLAR ARRAY',
        desc: 'Utility-scale solar generation serving communities in the Mojave region.',
        metric: 'CALIFORNIA · 850 MW SOLAR',
        image: 'assets/solution_communities.webp',
        alt: 'Sustainable community supported by the Mojave solar project',
        icon: '☀️'
    }
};

function selectMapPin(pinKey) {
    const data = mapPinData[pinKey];
    if (data) {
        document.getElementById('map-info-title').textContent = data.title;
        document.getElementById('map-info-desc').textContent = data.desc;
        document.getElementById('map-info-metric').textContent = data.metric;
        document.getElementById('map-info-image').src = data.image;
        document.getElementById('map-info-image').alt = data.alt;
        document.getElementById('map-info-icon').textContent = data.icon;
        document.querySelectorAll('.project-select-btn').forEach(button => {
            const active = button.dataset.project === pinKey;
            button.setAttribute('aria-pressed', String(active));
            button.classList.toggle('border-terraGreen-400', active);
            button.classList.toggle('border-white/20', !active);
            button.classList.toggle('text-white', active);
            button.classList.toggle('text-gray-300', !active);
        });

        if (hubCoordinates[pinKey] && globeCamera) {
            const hub = hubCoordinates[pinKey];
            const targetPos = latLonToVector3(hub.lat, hub.lon, 14.5);
            if (globeControls) globeControls.target.set(0, 0, 0);
            if (typeof gsap !== 'undefined') {
                gsap.to(globeCamera.position, {
                    x: targetPos.x,
                    y: targetPos.y,
                    z: targetPos.z,
                    duration: 1.4,
                    ease: 'power2.inOut'
                });
            } else {
                globeCamera.position.copy(targetPos);
            }
        }
    }
}

let globeCamera = null;
let globeControls = null;
let leafletMap = null;
let leafletMarker = null;
let climateLayers = null;
let activeClimateLayer = 'air';

const hubCoordinates = {
    nordic: { lat: 56.5, lon: 3.0, name: 'North Sea (Wind)', color: 0x38bdf8 },
    amazon: { lat: -3.5, lon: -62.0, name: 'Amazon (Forest)', color: 0x4ade80 },
    alpine: { lat: 46.8, lon: 9.0, name: 'Alps (Hydro)', color: 0xfacc15 },
    mojave: { lat: 35.0, lon: -116.5, name: 'Mojave (Solar)', color: 0xfb923c }
};

function latLonToVector3(latitude, longitude, radius = 5.02) {
    const phi = (90 - latitude) * Math.PI / 180;
    const theta = (longitude + 180) * Math.PI / 180;
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

function createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 1. Deep Space Ocean Gradient
    const ocean = ctx.createLinearGradient(0, 0, 0, canvas.height);
    ocean.addColorStop(0, '#061324');
    ocean.addColorStop(0.5, '#030a14');
    ocean.addColorStop(1, '#081728');
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Graticule Coordinate Grid Lines
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.08)';
    ctx.lineWidth = 1;
    for (let lon = -180; lon <= 180; lon += 30) {
        const x = (lon + 180) / 360 * canvas.width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let lat = -60; lat <= 60; lat += 30) {
        const y = (90 - lat) / 180 * canvas.height;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    // Equator line (slightly brighter)
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // 3. High-Definition World Continents (Realistic Global Landmass Paths)
    const continents = [
        // North America (Alaska, Canada, USA, Mexico)
        [
            [-168, 66], [-160, 71], [-140, 70], [-130, 68], [-120, 76], [-90, 74], [-80, 70],
            [-65, 60], [-55, 52], [-65, 44], [-75, 38], [-80, 26], [-88, 20], [-96, 16],
            [-105, 23], [-115, 30], [-124, 40], [-126, 50], [-135, 58], [-148, 60], [-168, 66]
        ],
        // Greenland
        [
            [-50, 83], [-20, 80], [-20, 70], [-35, 60], [-50, 62], [-58, 72], [-50, 83]
        ],
        // Central America & Caribbean
        [
            [-96, 16], [-88, 14], [-83, 9], [-77, 8], [-80, 10], [-85, 12], [-90, 15], [-96, 16]
        ],
        // South America
        [
            [-77, 10], [-60, 6], [-50, 0], [-35, -5], [-36, -15], [-42, -23], [-50, -32],
            [-55, -40], [-66, -55], [-74, -50], [-72, -35], [-76, -18], [-81, -5], [-77, 10]
        ],
        // Europe (Scandinavia, UK, Mainland)
        [
            [-9, 36], [-8, 43], [0, 48], [-4, 58], [5, 62], [15, 68], [28, 71], [40, 66],
            [35, 55], [28, 45], [20, 40], [15, 38], [0, 38], [-9, 36]
        ],
        // British Isles
        [
            [-10, 52], [-5, 58], [2, 53], [-1, 50], [-5, 50], [-10, 52]
        ],
        // Africa
        [
            [-5, 36], [12, 37], [25, 32], [32, 31], [43, 12], [51, 10], [42, -5], [35, -20],
            [28, -34], [18, -35], [12, -20], [8, 4], [-12, 6], [-17, 15], [-10, 28], [-5, 36]
        ],
        // Madagascar
        [
            [44, -12], [50, -15], [47, -25], [43, -24], [44, -12]
        ],
        // Asia (Russia, China, India, SE Asia, Middle East)
        [
            [35, 55], [60, 68], [90, 75], [140, 72], [170, 66], [160, 52], [140, 48],
            [130, 38], [120, 32], [110, 20], [105, 10], [98, 8], [90, 22], [80, 15],
            [76, 8], [72, 22], [60, 25], [50, 30], [35, 30], [35, 55]
        ],
        // Japan
        [
            [130, 32], [141, 38], [142, 44], [138, 38], [130, 32]
        ],
        // Australia & Tasmania
        [
            [114, -22], [124, -14], [136, -12], [148, -18], [153, -28], [150, -37],
            [138, -38], [128, -33], [115, -34], [114, -22]
        ],
        // New Zealand
        [
            [167, -45], [174, -40], [177, -38], [172, -43], [167, -45]
        ]
    ];

    // Draw Continents with Glowing Borders & Rich Eco-Green Fill
    ctx.shadowColor = 'rgba(74, 222, 128, 0.4)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#1c4232';
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2.5;

    for (const continent of continents) {
        ctx.beginPath();
        continent.forEach(([lon, lat], index) => {
            const x = (lon + 180) / 360 * canvas.width;
            const y = (90 - lat) / 180 * canvas.height;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // 4. Glowing City & Renewable Energy Telemetry Light Specks
    const cityCenters = [
        [-74, 40], [-118, 34], [-87, 41], [-122, 37], [-43, -22], [-46, -23], [-58, -34],
        [-0.1, 51.5], [2.3, 48.8], [13.4, 52.5], [3, 56], [9, 47], [31, 30], [28, -26],
        [77, 28], [72, 19], [121, 31], [116, 39], [103, 1], [139, 35], [151, -33], [144, -37]
    ];
    for (const [lon, lat] of cityCenters) {
        const x = (lon + 180) / 360 * canvas.width;
        const y = (90 - lat) / 180 * canvas.height;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
        ctx.beginPath();
        ctx.arc(x + 4, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
}

function initThreeGlobe() {
    const container = document.getElementById('globe-3d-canvas-container');
    if (!container) return;
    if (!window.THREE || !THREE.OrbitControls) {
        container.innerHTML = '<p class="p-8 text-center text-sm text-gray-300">3D globe unavailable. The live project map remains available below.</p>';
        return;
    }
    try {
        container.innerHTML = '';
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 500;

        const scene = new THREE.Scene();

        // Camera positioned at optimal distance so full globe is visible with breathing room
        globeCamera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        globeCamera.position.set(0, 0, 14.5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height);
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        // Ambient & Directional Sunlights
        scene.add(new THREE.AmbientLight(0x304254, 1.4));
        const sunlight = new THREE.DirectionalLight(0xe2fbf0, 2.2);
        sunlight.position.set(12, 6, 12);
        scene.add(sunlight);

        // Soft back-rim light for dramatic 3D contour
        const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
        rimLight.position.set(-10, -5, -10);
        scene.add(rimLight);

        // 1. Earth Sphere (Radius 5)
        const earthGeo = new THREE.SphereGeometry(5, 64, 64);
        const earthMat = new THREE.MeshStandardMaterial({
            map: createEarthTexture(),
            roughness: 0.65,
            metalness: 0.15
        });
        const earth = new THREE.Mesh(earthGeo, earthMat);
        scene.add(earth);

        // 2. Atmospheric Halo Glow Outer Mesh
        const atmosGeo = new THREE.SphereGeometry(5.18, 64, 64);
        const atmosMat = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            vertexShader: 'varying vec3 vNormal; void main(){ vNormal = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
            fragmentShader: 'varying vec3 vNormal; void main(){ float glow = pow(0.7 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 3.0); gl_FragColor = vec4(0.2, 0.85, 0.65, clamp(glow, 0.0, 0.85)); }'
        });
        const atmosphere = new THREE.Mesh(atmosGeo, atmosMat);
        scene.add(atmosphere);

        // 3. Subtle 3D Starfield Particles in background
        const starGeo = new THREE.BufferGeometry();
        const starCount = 200;
        const starPos = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount * 3; i += 3) {
            starPos[i] = (Math.random() - 0.5) * 60;
            starPos[i + 1] = (Math.random() - 0.5) * 60;
            starPos[i + 2] = -15 - Math.random() * 25;
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
        const starMat = new THREE.PointsMaterial({ color: 0x8ba77b, size: 0.15, transparent: true, opacity: 0.5 });
        scene.add(new THREE.Points(starGeo, starMat));

        // 4. Glowing 3D Location Hub Markers & Beacon Beams
        const hubKeys = Object.keys(hubCoordinates);
        const hubPoints = hubKeys.map(key => latLonToVector3(hubCoordinates[key].lat, hubCoordinates[key].lon, 5.08));

        hubPoints.forEach((point, index) => {
            const key = hubKeys[index];
            const hubColor = hubCoordinates[key].color;

            // Glowing Beacon Pin Sphere
            const pin = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 16, 16),
                new THREE.MeshBasicMaterial({ color: hubColor })
            );
            pin.position.copy(point);
            scene.add(pin);

            // Vertical Beacon Light Beam
            const beamGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
            const beamMat = new THREE.MeshBasicMaterial({ color: hubColor, transparent: true, opacity: 0.8 });
            const beam = new THREE.Mesh(beamGeo, beamMat);
            const beamPos = point.clone().normalize().multiplyScalar(5.25);
            beam.position.copy(beamPos);
            beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), point.clone().normalize());
            scene.add(beam);
        });

        // 5. Parabolic 3D Energy Arcs Linking the Hubs
        for (let i = 0; i < hubPoints.length; i++) {
            const start = hubPoints[i].clone().normalize().multiplyScalar(5.1);
            const end = hubPoints[(i + 1) % hubPoints.length].clone().normalize().multiplyScalar(5.1);
            const middle = start.clone().add(end).normalize().multiplyScalar(6.2);
            const arc = new THREE.QuadraticBezierCurve3(start, middle, end);
            const tube = new THREE.Mesh(
                new THREE.TubeGeometry(arc, 36, 0.015, 6, false),
                new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.75 })
            );
            scene.add(tube);
        }

        // 6. OrbitControls with smooth damping
        globeControls = new THREE.OrbitControls(globeCamera, renderer.domElement);
        globeControls.enableDamping = true;
        globeControls.dampingFactor = 0.06;
        globeControls.enablePan = false;
        globeControls.minDistance = 8;
        globeControls.maxDistance = 20;
        globeControls.autoRotate = true;
        globeControls.autoRotateSpeed = 0.4;

        const resize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (!w || !h) return;
            globeCamera.aspect = w / h;
            globeCamera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', resize);

        const animate = () => {
            requestAnimationFrame(animate);
            globeControls.update();
            renderer.render(scene, globeCamera);
        };
        animate();
    } catch (error) {
        console.error('3D globe could not initialize:', error);
        container.innerHTML = '<p class="p-8 text-center text-sm text-gray-300">3D globe unavailable in this browser.</p>';
    }
}

const climateSites = [
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Delhi', lat: 28.61, lon: 77.21 },
    { name: 'Singapore', lat: 1.35, lon: 103.82 },
    { name: 'Nairobi', lat: -1.29, lon: 36.82 },
    { name: 'Sao Paulo', lat: -23.55, lon: -46.63 },
    { name: 'Los Angeles', lat: 34.05, lon: -118.24 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 }
];

const communityProjects = [
    {
        key: 'nordic',
        title: 'Nordic Offshore Wind Matrix',
        location: 'North Sea · Nordic region',
        lat: hubCoordinates.nordic.lat,
        lon: hubCoordinates.nordic.lon,
        categories: ['energy'],
        categoryLabel: 'Clean energy',
        icon: 'fa-solid fa-wind',
        color: '#4bb8dc',
        impact: '1.4 GW offshore wind generation',
        detail: 'Renewable power generation across the North Sea.'
    },
    {
        key: 'amazon',
        title: 'Amazon Canopy Guard',
        location: 'Amazon Basin · Brazil',
        lat: hubCoordinates.amazon.lat,
        lon: hubCoordinates.amazon.lon,
        categories: ['restoration', 'tree-planting', 'volunteer'],
        categoryLabel: 'Restoration & tree planting',
        icon: 'fa-solid fa-leaf',
        color: '#6dd691',
        impact: '12M hectares protected',
        detail: 'Rainforest habitat protection and native ecosystem restoration.',
        volunteer: 'Contact the team to coordinate a volunteer pathway for restoration and native tree planting.'
    },
    {
        key: 'alpine',
        title: 'Alpine Hydro Storage Reserve',
        location: 'Alps · Switzerland',
        lat: hubCoordinates.alpine.lat,
        lon: hubCoordinates.alpine.lon,
        categories: ['energy'],
        categoryLabel: 'Clean energy',
        icon: 'fa-solid fa-droplet',
        color: '#80a9e8',
        impact: 'Renewable grid storage',
        detail: 'High-altitude water storage supports grid stability across Switzerland.'
    },
    {
        key: 'mojave',
        title: 'Mojave Advanced Solar Array',
        location: 'Mojave, California · United States',
        lat: hubCoordinates.mojave.lat,
        lon: hubCoordinates.mojave.lon,
        categories: ['energy'],
        categoryLabel: 'Clean energy',
        icon: 'fa-solid fa-sun',
        color: '#f2bd67',
        impact: '850 MW solar generation',
        detail: 'Utility-scale solar power serving communities in the Mojave region.'
    }
];

const communityProjectMarkers = new Map();
let activeProjectFilter = 'all';

function initLeafletMap() {
    const container = document.getElementById('leaflet-city-map');
    if (!container || !window.L) return;

    leafletMap = L.map(container, {
        scrollWheelZoom: false,
        worldCopyJump: true,
        zoomControl: true,
        attributionControl: true
    }).setView([20, 10], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        subdomains: ['a', 'b', 'c'],
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(leafletMap);

    climateLayers = {
        air: L.layerGroup(),
        wind: L.layerGroup(),
        projects: L.layerGroup()
    };

    communityProjects.forEach(project => {
        const marker = L.marker([project.lat, project.lon], {
            icon: createCommunityProjectIcon(project),
            riseOnHover: true,
            title: `${project.title} · ${project.location}`
        });
        marker.bindPopup(createCommunityProjectPopup(project), { maxWidth: 300 });
        marker.on('click', () => highlightCommunityProject(project.key));
        communityProjectMarkers.set(project.key, marker);
    });
    renderCommunityProjectList();
    document.querySelectorAll('.project-filter-btn').forEach(button => {
        button.addEventListener('click', () => filterCommunityProjects(button.dataset.projectFilter));
    });
    const projectCount = document.getElementById('project-count');
    const energyCount = document.getElementById('project-energy-count');
    if (projectCount) projectCount.textContent = communityProjects.length;
    if (energyCount) energyCount.textContent = communityProjects.filter(project => project.categories.includes('energy')).length;
    filterCommunityProjects(activeProjectFilter);

    leafletMarker = L.marker([52.52, 13.41], {
        riseOnHover: true,
        title: 'Berlin, DE'
    }).addTo(leafletMap).bindPopup('Berlin, DE');

    setClimateLayer(activeClimateLayer);
    updateClimateMapData();
    window.setInterval(updateClimateMapData, 15 * 60 * 1000);
    window.setTimeout(() => leafletMap.invalidateSize(), 250);
}

function setClimateLayer(layerName) {
    if (!climateLayers || !leafletMap || !climateLayers[layerName]) return;
    leafletMap.closePopup();
    Object.values(climateLayers).forEach(layer => leafletMap.removeLayer(layer));
    activeClimateLayer = layerName;
    climateLayers[layerName].addTo(leafletMap);
    document.querySelectorAll('.climate-layer-btn').forEach(button => {
        const selected = button.dataset.climateLayer === layerName;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('border-terraGreen-400', selected);
        button.classList.toggle('text-white', selected);
        button.classList.toggle('border-white/20', !selected);
        button.classList.toggle('text-gray-400', !selected);
    });

    const isProjectLayer = layerName === 'projects';
    const projectDashboard = document.getElementById('community-project-dashboard');
    const projectPanel = document.getElementById('project-impact-panel');
    const aqiLegend = document.getElementById('aqi-legend');
    if (projectDashboard) projectDashboard.hidden = !isProjectLayer;
    if (projectPanel) projectPanel.hidden = !isProjectLayer;
    if (aqiLegend) aqiLegend.hidden = isProjectLayer;
}

function createCommunityProjectIcon(project) {
    return L.divIcon({
        className: 'community-project-marker-wrap',
        html: `<span class="community-project-marker" style="--project-color:${project.color}"><i class="${project.icon}" aria-hidden="true"></i></span>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
    });
}

function createCommunityProjectPopup(project) {
    const volunteerInfo = project.volunteer
        ? `<div class="project-popup-volunteer"><strong>Volunteer pathway</strong><br>${project.volunteer}<br><a href="#contact">Contact the team</a></div>`
        : '';
    return `<div class="project-popup-content"><span class="project-popup-category">${project.categoryLabel}</span><strong>${project.title}</strong><span class="project-popup-location">${project.location}</span><p>${project.detail}</p><div class="project-popup-impact"><span>IMPACT</span><strong>${project.impact}</strong></div>${volunteerInfo}</div>`;
}

function renderCommunityProjectList() {
    const list = document.getElementById('project-impact-list');
    if (!list) return;
    list.innerHTML = communityProjects.map(project => `
        <button type="button" class="project-impact-item" data-project-focus="${project.key}">
            <span class="project-impact-icon" style="--project-color:${project.color}"><i class="${project.icon}" aria-hidden="true"></i></span>
            <span class="project-impact-copy">
                <strong>${project.title}</strong>
                <span>${project.location}</span>
                <small>${project.impact}</small>
            </span>
            <i class="fa-solid fa-arrow-up-right-from-square project-impact-arrow" aria-hidden="true"></i>
        </button>
    `).join('');

    list.addEventListener('click', event => {
        const item = event.target.closest('[data-project-focus]');
        if (item) focusCommunityProject(item.dataset.projectFocus);
    });
}

function highlightCommunityProject(projectKey) {
    document.querySelectorAll('.project-impact-item').forEach(item => {
        item.classList.toggle('is-selected', item.dataset.projectFocus === projectKey);
    });
}

function focusCommunityProject(projectKey) {
    const project = communityProjects.find(item => item.key === projectKey);
    const marker = communityProjectMarkers.get(projectKey);
    if (!project || !marker || !leafletMap) return;
    setClimateLayer('projects');
    filterCommunityProjects('all');
    highlightCommunityProject(projectKey);
    leafletMap.flyTo([project.lat, project.lon], 5, { duration: 0.8 });
    marker.openPopup();
}

function filterCommunityProjects(filterName) {
    if (!climateLayers || !climateLayers.projects) return;
    activeProjectFilter = filterName;
    climateLayers.projects.clearLayers();
    communityProjects.forEach(project => {
        if (filterName === 'all' || project.categories.includes(filterName)) {
            communityProjectMarkers.get(project.key)?.addTo(climateLayers.projects);
        }
    });
    document.querySelectorAll('.project-filter-btn').forEach(button => {
        const selected = button.dataset.projectFilter === filterName;
        button.setAttribute('aria-pressed', String(selected));
        button.classList.toggle('is-active', selected);
    });
    document.querySelectorAll('.project-impact-item').forEach(item => {
        item.hidden = filterName !== 'all' && !communityProjects.find(project => project.key === item.dataset.projectFocus)?.categories.includes(filterName);
    });
    highlightCommunityProject('');
}

function createAqiMarker(color) {
    return L.divIcon({
        className: 'aqi-live-marker-wrap',
        html: `<div class="aqi-live-marker" style="--marker-color:${color}; --marker-shadow:${color};"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
    });
}

async function updateClimateMapData() {
    if (!climateLayers || !window.L) return;
    const updatedLabel = document.getElementById('climate-map-updated');
    const readings = await Promise.all(climateSites.map(async site => {
        const params = `latitude=${site.lat}&longitude=${site.lon}&current=european_aqi,pm2_5`;
        const windParams = `latitude=${site.lat}&longitude=${site.lon}&current=wind_speed_10m,wind_direction_10m`;
        const [airResponse, windResponse] = await Promise.all([
            fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`),
            fetch(`https://api.open-meteo.com/v1/forecast?${windParams}`)
        ]);
        if (!airResponse.ok || !windResponse.ok) throw new Error('A climate observation request failed.');
        const [airData, windData] = await Promise.all([airResponse.json(), windResponse.json()]);
        return { ...site, aqi: airData.current?.european_aqi, pm25: airData.current?.pm2_5, speed: windData.current?.wind_speed_10m, direction: windData.current?.wind_direction_10m };
    }).map(promise => promise.catch(error => ({ error }))));

    climateLayers.air.clearLayers();
    climateLayers.wind.clearLayers();
    readings.forEach(reading => {
        if (reading.error) return;
        const position = [reading.lat, reading.lon];

        if (Number.isFinite(reading.aqi)) {
            const color = reading.aqi <= 50 ? '#66d68d' : reading.aqi <= 100 ? '#f3c85b' : '#f07861';
            const area = L.circle(position, {
                radius: 42000,
                color,
                weight: 1,
                fillColor: color,
                fillOpacity: 0.22
            }).bindPopup(`<strong>${reading.name}</strong><br>European AQI: ${reading.aqi}<br>PM2.5: ${Number(reading.pm25 || 0).toFixed(1)} µg/m³`);
            area.addTo(climateLayers.air);

            const marker = L.marker(position, { icon: createAqiMarker(color), title: `${reading.name} AQI ${reading.aqi}` });
            marker.bindTooltip(`<strong>${reading.name}</strong><br>AQI ${reading.aqi}<br>PM2.5 ${Number(reading.pm25 || 0).toFixed(1)} µg/m³`, {
                direction: 'top',
                offset: [0, -16],
                opacity: 1,
                sticky: true
            });
            marker.on('mouseover', (event) => event.target.openTooltip());
            marker.on('mouseout', (event) => event.target.closeTooltip());
            marker.addTo(climateLayers.air);
        }

        if (Number.isFinite(reading.direction)) {
            const arrow = L.divIcon({ className: 'wind-marker', html: `<span style="transform:rotate(${reading.direction}deg)">➤</span>`, iconSize: [30, 30], iconAnchor: [15, 15] });
            const windMarker = L.marker(position, { icon: arrow });
            windMarker.bindTooltip(`<strong>${reading.name}</strong><br>Wind: ${Math.round(reading.speed || 0)} km/h<br>Direction: ${Math.round(reading.direction)}°`, {
                direction: 'top',
                offset: [0, -10]
            });
            windMarker.on('mouseover', (event) => event.target.openTooltip());
            windMarker.on('mouseout', (event) => event.target.closeTooltip());
            windMarker.addTo(climateLayers.wind);
        }
    });
    if (updatedLabel) {
        const available = readings.filter(reading => !reading.error).length;
        updatedLabel.textContent = available ? `Updated ${new Date().toLocaleTimeString()} · ${available}/${readings.length} hubs` : 'Live data unavailable';
    }
}

function renderLeaderboard(entries) {
    const tableBody = document.getElementById('leaderboard-table-body');
    if (!tableBody) return;
    tableBody.replaceChildren();
    entries.forEach(entry => {
        const row = document.createElement('tr');
        const values = [entry.rank, `${entry.name} · ${entry.country}`, Number(entry.trees).toLocaleString(), `${Number(entry.offsetTons).toFixed(1)} t`, entry.badge];
        values.forEach(value => {
            const cell = document.createElement('td');
            cell.className = 'py-3 pr-3';
            cell.textContent = value;
            row.appendChild(cell);
        });
        tableBody.appendChild(row);
    });
}

async function initLeaderboardAndStream() {
    const status = document.getElementById('sse-status-badge');
    try {
        const response = await fetch(getApiUrl('/api/leaderboard'));
        if (!response.ok) throw new Error('Leaderboard request failed.');
        const data = await response.json();
        renderLeaderboard(data.leaderboard);
    } catch (error) {
        if (status) status.textContent = 'LEADERBOARD UNAVAILABLE';
    }

    const feed = document.getElementById('live-pledges-stream');
    if (!feed || !window.EventSource) return;
    const stream = new EventSource(getApiUrl('/api/stream-live-pledges'));
    stream.onopen = () => {
        if (status) status.textContent = 'SSE STREAM CONNECTED';
    };
    stream.onerror = () => {
        if (status) status.textContent = 'RECONNECTING TO LIVE FEED';
    };
    stream.onmessage = event => {
        let item;
        try {
            item = JSON.parse(event.data);
        } catch {
            return;
        }
        if (item.type === 'connected') return;
        if (item.type === 'pledge') {
            fetch(getApiUrl('/api/leaderboard')).then(response => response.json()).then(data => renderLeaderboard(data.leaderboard)).catch(error => console.error('Leaderboard refresh failed:', error));
        }
        const card = document.createElement('article');
        card.className = 'p-3 rounded-lg bg-white/5 border border-white/10';
        const title = document.createElement('div');
        title.className = 'text-xs text-white font-semibold';
        title.textContent = `${item.user || 'Community member'} · ${item.city || 'Global'}`;
        const action = document.createElement('div');
        action.className = 'text-[11px] text-gray-300 mt-1';
        action.textContent = `${item.action || 'Made a pledge'} · ${item.impact || item.project || ''}`;
        const time = document.createElement('div');
        time.className = 'text-[10px] text-gray-500 mt-1';
        time.textContent = new Date(item.timestamp || Date.now()).toLocaleTimeString();
        card.append(title, action, time);
        feed.prepend(card);
        while (feed.children.length > 20) feed.lastElementChild.remove();
    };
}

// 12. Theme Accent Switcher (Dark / Daylight)
function toggleTheme() {
    const body = document.body;
    const icon = document.getElementById('theme-icon');
    const text = document.getElementById('theme-text');

    body.classList.toggle('light-theme');
    if (body.classList.contains('light-theme')) {
        if (icon) icon.innerText = '☀️';
        if (text) text.innerText = 'LIGHT';
    } else {
        if (icon) icon.innerText = '🌙';
        if (text) text.innerText = 'DARK';
    }
}

// 13. AI Assistant Floating Chatbot Logic
let chatConversation = [];

function toggleAiChat() {
    const drawer = document.getElementById('terra-ai-drawer');
    const button = document.querySelector('#terra-ai-chat > button');
    if (drawer) {
        if (drawer.classList.contains('hidden')) {
            drawer.classList.remove('hidden');
            drawer.classList.add('flex');
            button?.setAttribute('aria-expanded', 'true');
            document.getElementById('chat-input')?.focus();
        } else {
            drawer.classList.remove('flex');
            drawer.classList.add('hidden');
            button?.setAttribute('aria-expanded', 'false');
            button?.focus();
        }
    }
}

async function sendChatMessage(event) {
    if (event) event.preventDefault();
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const sendButton = document.getElementById('chat-send-btn');
    if (!input || !messages || !input.value.trim()) return;

    const userText = input.value.trim();
    input.value = '';
    if (sendButton) sendButton.disabled = true;

    const userDiv = document.createElement('div');
    userDiv.className = 'bg-terraGreen-500/20 text-terraGreen-200 border border-terraGreen-400/30 p-3 rounded-xl max-w-[85%] self-end text-right leading-relaxed shadow-md';
    userDiv.innerText = userText;
    messages.appendChild(userDiv);

    // Append Animated Typing Indicator
    const typingDiv = document.createElement('div');
    typingDiv.id = 'ai-typing-indicator';
    typingDiv.className = 'bg-white/10 p-3 rounded-xl max-w-[85%] text-gray-400 font-mono text-xs flex items-center gap-2';
    typingDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-terraGreen-400 animate-ping"></span> Terra Nova AI is thinking...`;
    messages.appendChild(typingDiv);
    messages.scrollTop = messages.scrollHeight;

    let aiReply = "";

    try {
        const res = await fetch(getApiUrl('/api/chat'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userText, history: chatConversation, language: currentLang })
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.reply) {
                aiReply = data.reply;
            }
        }
    } catch (err) {
        console.log('API chat endpoint fetch error, falling back to client-side engine:', err);
    }

    const indicator = document.getElementById('ai-typing-indicator');
    if (indicator) indicator.remove();

    // Guaranteed Fallback if server response is unavailable
    if (!aiReply) {
        const q = userText.toLowerCase();
        if (currentLang === 'hi') {
            if (q.includes('globe') || q.includes('map') || q.includes('3d')) {
                aiReply = 'हमारा इंटरैक्टिव 3D पृथ्वी ग्लोब नॉर्डिक पवन, अमेज़न वन, आल्प्स जलविद्युत और मोजावे सौर केंद्र दिखाता है। सभी वैश्विक पहलों को देखने के लिए ग्लोब को घुमाएँ।';
            } else if (q.includes('carbon') || q.includes('offset') || q.includes('footprint') || q.includes('calculate')) {
                aiReply = 'कार्बन कैलकुलेटर में घर की बिजली और हवाई यात्राओं से अपना कार्बन पदचिह्न निकालें, फिर आधिकारिक 1200x800 PNG प्रमाणपत्र डाउनलोड करें।';
            } else if (q.includes('wind') || q.includes('nordic')) {
                aiReply = 'नॉर्डिक समुद्री पवन ऊर्जा ग्रिड उत्तरी सागर में 1.4 गीगावॉट स्वच्छ बिजली बनाता है।';
            } else if (q.includes('amazon') || q.includes('forest') || q.includes('trees')) {
                aiReply = 'अमेज़न वन संरक्षण पहल उपग्रह निगरानी और स्थानीय बीजों की मदद से वर्षावन और जैव विविधता की रक्षा करती है।';
            } else if (q.includes('solar') || q.includes('mojave')) {
                aiReply = 'मोजावे सौर ऊर्जा संयंत्र 850 मेगावॉट द्वि-मुखीय सौर ऊर्जा का उत्पादन करता है।';
            } else if (q.includes('hello') || q.includes('hi') || q.includes('hey') || q.includes('namaste')) {
                aiReply = 'मैं लाइव मौसम, स्वच्छ ऊर्जा, कार्बन कमी और टेरा नोवा परियोजनाओं में मदद कर सकता हूँ।';
            } else {
                aiReply = `मैं लाइव मौसम, स्वच्छ ऊर्जा, कार्बन कमी और टेरा नोवा परियोजनाओं में मदद कर सकता हूँ। ${userText} के बारे में कोई खास सवाल पूछें।`;
            }
        } else {
            if (q.includes('globe') || q.includes('map') || q.includes('3d')) {
                aiReply = 'Our interactive 3D WebGL Earth Globe displays real-time active environmental hubs: Nordic Offshore Wind, Amazon Canopy Guard, Alpine Hydro Storage, and Mojave Solar Array. You can drag and rotate the globe in 360 degrees!';
            } else if (q.includes('carbon') || q.includes('offset') || q.includes('footprint') || q.includes('calculate')) {
                aiReply = 'You can calculate your personal carbon footprint using household electricity and flights in our Carbon Calculator section, then download an official verified 1200x800 PNG Certificate!';
            } else if (q.includes('wind') || q.includes('nordic')) {
                aiReply = 'The Nordic Offshore Wind Matrix generates 1.4 Gigawatts of clean renewable wind energy in the North Sea, powering zero-carbon grids across Northern Europe.';
            } else if (q.includes('amazon') || q.includes('forest') || q.includes('trees')) {
                aiReply = 'The Amazon Canopy Guard initiative protects over 12 million hectares of biodiverse rainforest habitat using AI-guided seed pods and satellite telemetry.';
            } else if (q.includes('solar') || q.includes('mojave')) {
                aiReply = 'The Mojave Advanced Solar Array generates 850 Megawatts of bifacial solar energy, providing clean electricity for communities across the American Southwest.';
            } else if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
                aiReply = 'I can help with live weather, clean energy, carbon reduction, and Terra Nova projects.';
            } else {
                aiReply = `I can help with live weather, clean energy, carbon reduction, and Terra Nova projects. Ask a specific question about ${userText}.`;
            }
        }
    }

    const aiDiv = document.createElement('div');
    aiDiv.className = 'bg-white/10 p-3 rounded-xl max-w-[85%] leading-relaxed text-gray-200 border border-white/10 shadow-lg whitespace-pre-line';
    aiDiv.innerText = aiReply.split(/\r?\n/).map(line => `• ${line.trim().replace(/^(?:[-*•]|\d+[.)])\s*/, '')}`).join('\n');
    messages.appendChild(aiDiv);

    chatConversation.push({ role: 'user', content: userText }, { role: 'assistant', content: aiReply });
    chatConversation = chatConversation.slice(-8);
    messages.scrollTop = messages.scrollHeight;

    if (sendButton) sendButton.disabled = false;
}

// 14. 3D Renewable Farm Configurator
function renderFarmConfig() {
    const turbines = document.getElementById('cfg-turbines').value;
    const angle = document.getElementById('cfg-angle').value;
    const weather = document.getElementById('cfg-weather').value;

    document.getElementById('cfg-turbines-val').innerText = `${turbines} Units`;
    document.getElementById('cfg-angle-val').innerText = `${angle}° Optimal`;

    const powerOut = Math.round(turbines * 55 + angle * 4.2);
    const eff = (90 + (angle / 10)).toFixed(1);

    document.getElementById('cfg-power').innerText = `${powerOut.toLocaleString()} MW/h`;
    document.getElementById('cfg-eff').innerText = `${eff}%`;

    const img = document.getElementById('farm-render-img');
    const badge = document.getElementById('farm-render-badge');

    if (weather === 'sunset') {
        img.src = 'assets/hero_bg_2.webp';
        badge.innerText = 'MODE: GOLDEN SUNSET';
    } else if (weather === 'noon') {
        img.src = 'assets/solution_clean_energy.webp';
        badge.innerText = 'MODE: HIGH NOON';
    } else if (weather === 'rain') {
        img.src = 'assets/solution_ecosystems.webp';
        badge.innerText = 'MODE: MISTY RAIN';
    } else {
        img.src = 'assets/solution_communities.webp';
        badge.innerText = 'MODE: STARRY TWILIGHT';
    }
}

// 15. Before / After Comparison Slider Logic
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('ba-slider');
    const resize = document.getElementById('ba-resize');
    const handle = document.getElementById('ba-handle');

    if (container && resize && handle) {
        let isDragging = false;

        const setSliderPos = (x) => {
            const rect = container.getBoundingClientRect();
            let offsetX = x - rect.left;
            if (offsetX < 0) offsetX = 0;
            if (offsetX > rect.width) offsetX = rect.width;

            const pct = (offsetX / rect.width) * 100;
            resize.style.width = `${pct}%`;
            handle.style.left = `${pct}%`;
        };

        container.addEventListener('mousedown', (e) => {
            isDragging = true;
            setSliderPos(e.clientX);
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            setSliderPos(e.clientX);
        });

        window.addEventListener('mouseup', () => { isDragging = false; });
    }
});

// 16. Footprint Calculator Logic
function calculateFootprint(persistProfile = true) {
    const kwh = Math.max(0, parseFloat(document.getElementById('calc-kwh').value) || 0);
    const flights = Math.max(0, parseFloat(document.getElementById('calc-flights').value) || 0);

    const tons = ((kwh * 12 * 0.0004) + (flights * 0.6)).toFixed(1);
    document.getElementById('calc-result').innerText = `${tons} Metric Tons CO₂`;
    updatePersonalCarbonDashboard(kwh, flights, persistProfile);
}

const personalCarbonStorageKey = 'terra_nova_carbon_profile_v1';

function updatePersonalCarbonDashboard(kwh, annualFlights, persistProfile = true) {
    const commuteDays = Math.max(0, parseFloat(document.getElementById('carbon-commute-days').value) || 0);
    const commuteDistance = Math.max(0, parseFloat(document.getElementById('carbon-commute-distance').value) || 0);
    const commuteMode = document.getElementById('carbon-commute-mode').value;
    const commuteFactors = { car: 0.17, transit: 0.05, active: 0 };
    const commuteFactor = commuteFactors[commuteMode] ?? commuteFactors.car;
    const targetInput = document.getElementById('carbon-monthly-target');
    const monthlyTarget = Math.max(0.01, parseFloat(targetInput.value) || 0);
    const electricityEmissions = kwh * 0.0004;
    const flightEmissions = annualFlights * 0.6 / 12;
    const commuteEmissions = commuteDays * commuteDistance * commuteFactor / 1000;
    const monthlyEmissions = electricityEmissions + flightEmissions + commuteEmissions;
    const profileName = document.getElementById('carbon-profile-name').value.trim();
    const progressTrack = document.querySelector('.carbon-target-track');
    const progressBar = document.getElementById('carbon-target-progress');
    const targetStatus = document.getElementById('carbon-target-status');
    const progressPercent = monthlyEmissions / monthlyTarget * 100;

    document.getElementById('carbon-dashboard-greeting').textContent = profileName
        ? `${profileName.toLocaleUpperCase()}'S MONTHLY FOOTPRINT`
        : 'PERSONAL FOOTPRINT';
    document.getElementById('carbon-monthly-total').textContent = monthlyEmissions.toFixed(2);
    document.getElementById('carbon-electricity-total').textContent = `${electricityEmissions.toFixed(2)} t`;
    document.getElementById('carbon-flights-total').textContent = `${flightEmissions.toFixed(2)} t`;
    document.getElementById('carbon-commute-total').textContent = `${commuteEmissions.toFixed(2)} t`;
    document.getElementById('carbon-target-value').textContent = `${monthlyTarget.toFixed(2)} t`;
    progressBar.style.width = `${Math.min(progressPercent, 100)}%`;
    progressTrack.setAttribute('aria-valuenow', Math.min(Math.round(progressPercent), 100));
    progressTrack.classList.toggle('is-over', monthlyEmissions > monthlyTarget);

    if (monthlyEmissions > monthlyTarget) {
        const overPercent = Math.round((monthlyEmissions - monthlyTarget) / monthlyTarget * 100);
        targetStatus.textContent = `Over target by ${(monthlyEmissions - monthlyTarget).toFixed(2)} t (${overPercent}%)`;
    } else {
        targetStatus.textContent = monthlyEmissions === monthlyTarget
            ? 'On target · no headroom'
            : `Within target · ${(monthlyTarget - monthlyEmissions).toFixed(2)} t headroom`;
    }

    const electricitySaving = electricityEmissions * 0.1;
    const flightSaving = Math.min(flightEmissions, 0.6 / 12);
    let commuteSaving = 0;
    let commuteSuggestion = 'Keep active travel in your routine and combine errands to avoid extra trips.';
    if (commuteFactor > commuteFactors.transit) {
        commuteSaving = Math.min(commuteDays, 4.33) * commuteDistance * (commuteFactor - commuteFactors.transit) / 1000;
        commuteSuggestion = 'Swap one commute day each week from driving to public transit.';
    } else if (commuteFactor > 0) {
        commuteSaving = Math.min(commuteDays, 4.33) * commuteDistance * commuteFactor / 1000;
        commuteSuggestion = 'Try walking or cycling for one commute day each week.';
    }

    const recommendations = [
        { text: 'Reduce home electricity use by 10% with efficient lighting and standby checks.', saving: electricitySaving },
        { text: 'Replace one annual short-haul flight with rail or a remote meeting.', saving: flightSaving },
        { text: commuteSuggestion, saving: commuteSaving }
    ];
    document.getElementById('carbon-recommendation-list').innerHTML = recommendations.map(item => `
        <li><span>${item.text}</span><strong>-${item.saving.toFixed(2)} t/mo</strong></li>
    `).join('');

    if (persistProfile) {
        try {
            localStorage.setItem(personalCarbonStorageKey, JSON.stringify({
                name: profileName,
                kwh,
                flights: annualFlights,
                commuteDays,
                commuteDistance,
                commuteMode,
                monthlyTarget
            }));
        } catch (error) {
            console.warn('Carbon profile could not be saved in this browser:', error);
        }
    }
}

function initializePersonalCarbonDashboard() {
    try {
        const savedProfile = JSON.parse(localStorage.getItem(personalCarbonStorageKey) || 'null');
        if (savedProfile) {
            const profileFields = {
                'carbon-profile-name': 'name',
                'calc-kwh': 'kwh',
                'calc-flights': 'flights',
                'carbon-commute-days': 'commuteDays',
                'carbon-commute-distance': 'commuteDistance',
                'carbon-commute-mode': 'commuteMode',
                'carbon-monthly-target': 'monthlyTarget'
            };
            Object.entries(profileFields).forEach(([fieldId, savedKey]) => {
                if (savedProfile[savedKey] !== undefined) {
                    document.getElementById(fieldId).value = savedProfile[savedKey];
                }
            });
        }
    } catch (error) {
        console.warn('Carbon profile could not be loaded in this browser:', error);
    }
    calculateFootprint(false);
}

document.addEventListener('DOMContentLoaded', initializePersonalCarbonDashboard);

// 17. Modals (Certificate & VR Tour)
function closeCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            deactivateAccessibleModal(modal);
        }, 500);
    }
}

function openVrModal() {
    const modal = document.getElementById('vr-tour-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        activateAccessibleModal(modal);
        setTimeout(() => modal.classList.remove('opacity-0'), 50);
    }
}

function closeVrModal() {
    const modal = document.getElementById('vr-tour-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            deactivateAccessibleModal(modal);
        }, 500);
    }
}

// 18. Journal Filter
function filterJournal(category) {
    const cards = document.querySelectorAll('.journal-card');
    cards.forEach(card => {
        if (category === 'all' || card.classList.contains(category)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });

    document.querySelectorAll('.journal-tag').forEach(tag => {
        tag.classList.remove('active', 'border-white', 'text-white');
        tag.classList.add('border-white/20', 'text-gray-400');
    });
    event.target.classList.add('active', 'border-white', 'text-white');
}

// 19. Live Telemetry Ticker Rotator
const tickerMessages = [
    "Nordic Wind Grid generated +450 kWh clean power in last 5 seconds.",
    "Amazon Canopy Guard deployed 12,000 AI biodiverse seed pods in Sector 4.",
    "Alpine Hydro Reserve achieved 99.4% grid balance efficiency across Switzerland.",
    "Mojave Solar Array reduced regional carbon offset by +120 Metric Tons today."
];
let tickerIdx = 0;
setInterval(() => {
    tickerIdx = (tickerIdx + 1) % tickerMessages.length;
    const tickerEl = document.getElementById('ticker-text');
    if (tickerEl) {
        tickerEl.style.opacity = '0';
        setTimeout(() => {
            tickerEl.innerText = tickerMessages[tickerIdx];
            tickerEl.style.opacity = '1';
        }, 300);
    }
}, 4500);

// 20. Real-Time Live Open-Meteo Climate API Fetcher
async function fetchLiveClimateData() {
    try {
        const url = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=52.52&longitude=13.41&current=european_aqi,pm10,pm2_5,carbon_monoxide';
        const res = await fetch(url);
        const data = await res.json();

        if (data && data.current) {
            const aqi = data.current.european_aqi || 24;
            const pm25 = data.current.pm2_5 || 12.4;
            const co = data.current.carbon_monoxide || 180;

            // Update Satellite Radar Telemetry Display with real live API data
            const aqiEl = document.querySelector('#satellite-radar .text-terraGreen-300');
            const liveTicker = document.getElementById('ticker-text');

            if (liveTicker) {
                tickerMessages.unshift(`LIVE SATELLITE API: European AQI Index is ${aqi} (PM2.5: ${pm25} µg/m³, CO: ${co} µg/m³)`);
            }

            console.log('Real Live Climate API Data Fetched:', data.current);
        }
    } catch (err) {
        console.log('Using simulated telemetry due to CORS/offline', err);
    }
}

// Fetch live climate data on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeLazyHeroVideo();
    fetchLiveClimateData();
    checkSavedUserAuth();
    initializeGoogleAuthProvider();
    initThreeGlobe();
    initLeafletMap();
    initLeaderboardAndStream();

    // Load saved language preference if present
    const savedLang = localStorage.getItem('terra_nova_lang');
    if (savedLang && translations[savedLang]) {
        setLanguage(savedLang);
    }
});

function loadDeferredVideo(video, autoplay = false) {
    if (!video) return;
    const source = video.querySelector('source[data-src]');
    if (source) {
        source.src = source.dataset.src;
        source.removeAttribute('data-src');
        video.load();
    }
    if (autoplay) video.play().catch(error => console.log('Video autoplay prevented', error));
}

function initializeLazyHeroVideo() {
    const heroVideo = document.getElementById('hero-bg-video');
    if (!heroVideo) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        heroVideo.style.visibility = 'hidden';
        return;
    }
    if (!('IntersectionObserver' in window)) {
        loadDeferredVideo(heroVideo, true);
        return;
    }

    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            const startVideo = () => loadDeferredVideo(heroVideo, true);
            if ('requestIdleCallback' in window) {
                requestIdleCallback(startVideo, { timeout: 2500 });
            } else {
                setTimeout(startVideo, 1000);
            }
        }
    }, { rootMargin: '200px' });
    observer.observe(heroVideo);
}

// 21. User Authentication, Eco-Dashboard, Profile Edit, Photo Upload & Logo Swap Logic
let currentUploadedPhoto = 'assets/solution_communities.webp';
let isUserLoggedIn = false;
let userOffsetChartInstance = null;
let authMode = 'register';

function setAuthMode(mode) {
    authMode = mode;
    switchPortalTab('profile');
    const registerButton = document.getElementById('auth-mode-register');
    const loginButton = document.getElementById('auth-mode-login');
    const submitButton = document.getElementById('auth-submit-btn');
    const nameWrap = document.getElementById('user-name-wrap');
    const bioWrap = document.getElementById('user-bio-wrap');

    if (registerButton) {
        registerButton.className = mode === 'register'
            ? 'rounded-full border border-terraGreen-400/60 bg-terraGreen-500/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-terraGreen-200 hover:bg-terraGreen-500/30'
            : 'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10';
    }

    if (loginButton) {
        loginButton.className = mode === 'login'
            ? 'rounded-full border border-terraGreen-400/60 bg-terraGreen-500/20 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-terraGreen-200 hover:bg-terraGreen-500/30'
            : 'rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300 hover:bg-white/10';
    }

    if (nameWrap) {
        nameWrap.classList.toggle('hidden', mode === 'login');
    }

    if (bioWrap) {
        bioWrap.classList.toggle('hidden', mode === 'login');
    }

    if (submitButton) {
        submitButton.textContent = mode === 'login' ? 'LOGIN TO ACCOUNT →' : 'CREATE ACCOUNT →';
    }

    const modalTitle = document.getElementById('auth-modal-title');
    if (modalTitle) {
        modalTitle.textContent = mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR MEMBER PROFILE';
    }
}

// Tab switcher between Eco-Dashboard and Profile Edit
function switchPortalTab(tabName) {
    const tabDashboard = document.getElementById('portal-tab-dashboard');
    const tabProfile = document.getElementById('portal-tab-profile');
    const btnDashboard = document.getElementById('tab-btn-dashboard');
    const btnProfile = document.getElementById('tab-btn-profile');

    if (tabName === 'dashboard') {
        if (tabDashboard) tabDashboard.classList.remove('hidden');
        if (tabProfile) tabProfile.classList.add('hidden');

        if (btnDashboard) {
            btnDashboard.className = 'flex-1 py-2.5 text-center font-bold uppercase tracking-wider text-terraGreen-300 border-b-2 border-terraGreen-400 transition-all cursor-pointer';
        }
        if (btnProfile) {
            btnProfile.className = 'flex-1 py-2.5 text-center font-bold uppercase tracking-wider text-gray-400 border-b-2 border-transparent hover:text-white transition-all cursor-pointer';
        }
        setTimeout(initUserOffsetChart, 60);
    } else if (tabName === 'profile') {
        if (tabDashboard) tabDashboard.classList.add('hidden');
        if (tabProfile) tabProfile.classList.remove('hidden');

        if (btnDashboard) {
            btnDashboard.className = 'flex-1 py-2.5 text-center font-bold uppercase tracking-wider text-gray-400 border-b-2 border-transparent hover:text-white transition-all cursor-pointer';
        }
        if (btnProfile) {
            btnProfile.className = 'flex-1 py-2.5 text-center font-bold uppercase tracking-wider text-terraGreen-300 border-b-2 border-terraGreen-400 transition-all cursor-pointer';
        }
    }
}

// Interactive Chart.js Monthly CO2 Reduction Trajectory Graph
async function initUserOffsetChart() {
    const canvas = document.getElementById('user-offset-chart');
    if (!canvas) return;
    if (typeof Chart === 'undefined') {
        try {
            await loadExternalScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js', 'Chart');
        } catch (error) {
            console.warn('Impact chart library could not be loaded:', error);
            return;
        }
    }

    if (userOffsetChartInstance) {
        userOffsetChartInstance.resize();
        return;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(139, 167, 123, 0.45)');
    gradient.addColorStop(0.7, 'rgba(139, 167, 123, 0.08)');
    gradient.addColorStop(1, 'rgba(139, 167, 123, 0.0)');

    userOffsetChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{
                label: 'CO₂ Offsets (Tons)',
                data: [0.8, 1.4, 2.1, 3.2, 4.5, 5.8, 7.2, 8.9, 10.4, 11.9, 13.1, 14.2],
                borderColor: '#8ba77b',
                borderWidth: 3,
                backgroundColor: gradient,
                fill: true,
                tension: 0.38,
                pointBackgroundColor: '#638453',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#a1c290',
                pointHoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#0c1523',
                    titleColor: '#8ba77b',
                    bodyColor: '#ffffff',
                    borderColor: 'rgba(139, 167, 123, 0.3)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y} Metric Tons CO₂ Abated`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 11
                        }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            family: 'Plus Jakarta Sans',
                            size: 11
                        },
                        callback: function(val) {
                            return val + ' T';
                        }
                    }
                }
            }
        }
    });
}

function openAuthModal(mode = 'register') {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        setAuthMode(mode);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        activateAccessibleModal(modal);
        setTimeout(() => {
            modal.classList.remove('opacity-0');
            initUserOffsetChart();
        }, 50);
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('opacity-0');
        setTimeout(() => {
            modal.classList.remove('flex');
            modal.classList.add('hidden');
            deactivateAccessibleModal(modal);
        }, 500);
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentUploadedPhoto = e.target.result;
            document.getElementById('avatar-preview-img').src = currentUploadedPhoto;
        };
        reader.readAsDataURL(file);
    }
}

function applyLoggedInState(userData) {
    isUserLoggedIn = true;
    const logoIcon = document.getElementById('brand-logo-icon');
    const userAvatarContainer = document.getElementById('user-avatar-container');
    const userAvatarImg = document.getElementById('user-avatar-img');
    const authBtnIcon = document.getElementById('auth-btn-icon');
    const authBtnText = document.getElementById('auth-btn-text');
    const logoutContainer = document.getElementById('logout-container');

    if (logoIcon) logoIcon.classList.add('hidden');
    if (userAvatarContainer) userAvatarContainer.classList.remove('hidden');
    if (userAvatarImg) userAvatarImg.src = userData.photo || currentUploadedPhoto;
    if (authBtnIcon) authBtnIcon.innerText = '👤';
    if (authBtnText) authBtnText.innerText = (userData.name || 'USER').split(' ')[0].toUpperCase();
    if (logoutContainer) logoutContainer.classList.remove('hidden');
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const name = document.getElementById('user-name-input').value.trim() || 'Ravish Kumar';
    const email = document.getElementById('user-email-input').value.trim();
    const bio = document.getElementById('user-bio-input').value.trim();
    const password = document.getElementById('user-password-input').value.trim() || 'terra-nova-demo';

    try {
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const payload = authMode === 'login'
            ? { email, password }
            : { name, email, password, bio, photo: currentUploadedPhoto };

        const response = await fetch(getApiUrl(endpoint), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Profile could not be saved.');

        if (data.token) {
            localStorage.setItem('terra_nova_session', data.token);
        }

        const userData = {
            id: data.user?.id || email,
            name: data.user?.name || name,
            email,
            bio: data.user?.bio || bio,
            photo: data.user?.photo || currentUploadedPhoto,
            loggedIn: true,
            role: data.user?.role || 'member'
        };
        localStorage.setItem('terra_nova_user', JSON.stringify(userData));
        applyLoggedInState(userData);
        closeAuthModal();
    } catch (error) {
        alert(error.message || 'Unable to create or save your profile right now.');
    }
}

function handleUserLogout() {
    isUserLoggedIn = false;

    const logoIcon = document.getElementById('brand-logo-icon');
    const userAvatarContainer = document.getElementById('user-avatar-container');
    const authBtnIcon = document.getElementById('auth-btn-icon');
    const authBtnText = document.getElementById('auth-btn-text');
    const logoutContainer = document.getElementById('logout-container');

    if (logoIcon) logoIcon.classList.remove('hidden');
    if (userAvatarContainer) userAvatarContainer.classList.add('hidden');
    if (authBtnIcon) authBtnIcon.innerText = '🔑';
    if (authBtnText) authBtnText.innerText = 'LOGIN';
    if (logoutContainer) logoutContainer.classList.add('hidden');

    localStorage.removeItem('terra_nova_user');
    localStorage.removeItem('terra_nova_session');

    closeAuthModal();
}

function handleBrandLogoClick() {
    if (isUserLoggedIn) {
        openAuthModal();
    } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

async function checkSavedUserAuth() {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const googleToken = fragment.get('terra_session');
    if (googleToken) {
        localStorage.setItem('terra_nova_session', googleToken);
        history.replaceState(null, '', `${location.pathname}${location.search}`);
    }

    const token = localStorage.getItem('terra_nova_session');
    const saved = localStorage.getItem('terra_nova_user');

    if (token) {
        try {
            const response = await fetch(getApiUrl('/api/auth/me'), {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && data.user) {
                const userData = { ...data.user, photo: data.user.photo || currentUploadedPhoto, loggedIn: true };
                localStorage.setItem('terra_nova_user', JSON.stringify(userData));
                currentUploadedPhoto = userData.photo || currentUploadedPhoto;
                document.getElementById('user-name-input').value = userData.name || 'Ravish Kumar';
                document.getElementById('user-email-input').value = userData.email || '';
                document.getElementById('user-bio-input').value = userData.bio || '';
                document.getElementById('avatar-preview-img').src = currentUploadedPhoto;
                applyLoggedInState(userData);
                return;
            }
        } catch (error) {
            console.log('Saved auth verification failed', error);
        }
        localStorage.removeItem('terra_nova_session');
    }

    if (saved) {
        try {
            const userData = JSON.parse(saved);
            if (userData && userData.loggedIn) {
                currentUploadedPhoto = userData.photo || currentUploadedPhoto;
                document.getElementById('user-name-input').value = userData.name || 'Ravish Kumar';
                document.getElementById('user-email-input').value = userData.email || '';
                document.getElementById('user-bio-input').value = userData.bio || '';
                document.getElementById('avatar-preview-img').src = currentUploadedPhoto;
                applyLoggedInState(userData);
            }
        } catch (e) {
            console.log('Saved auth parse error', e);
        }
    }
}

async function initializeGoogleAuthProvider() {
    const button = document.getElementById('google-auth-btn');
    if (!button) return;
    try {
        const response = await fetch(getApiUrl('/api/auth/providers'));
        const data = await response.json();
        if (response.ok && data.google) button.classList.remove('hidden');
    } catch (error) {
        console.log('Google sign-in availability check failed', error);
    }
}

// Check saved authentication on page load
checkSavedUserAuth();

// 22. Real-Time Global City Air Quality & Satellite Search API
async function searchCityAirQuality(event) {
    event.preventDefault();
    const cityInput = document.getElementById('city-search-input');
    if (!cityInput || !cityInput.value.trim()) return;

    const query = cityInput.value.trim();
    const resName = document.getElementById('city-res-name');
    const resCoords = document.getElementById('city-res-coords');
    const resAqi = document.getElementById('city-res-aqi');
    const resPm25 = document.getElementById('city-res-pm25');
    const resCo = document.getElementById('city-res-co');

    try {
        if (resName) resName.innerText = `Fetching ${query}...`;

        // Step 1: Geocoding API search
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData || !geoData.results || geoData.results.length === 0) {
            alert(`City "${query}" not found. Please try another city.`);
            if (resName) resName.innerText = 'Berlin, DE';
            return;
        }

        const place = geoData.results[0];
        const lat = place.latitude;
        const lon = place.longitude;
        const placeName = `${place.name}, ${place.country_code || place.country || ''}`;

        // Step 2: Air Quality API fetch for coordinates
        const aqUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm10,pm2_5,carbon_monoxide`;
        const aqRes = await fetch(aqUrl);
        const aqData = await aqRes.json();

        if (aqData && aqData.current) {
            const aqiVal = aqData.current.european_aqi || 22;
            const pm25Val = aqData.current.pm2_5 || 11.2;
            const coVal = aqData.current.carbon_monoxide || 160;

            let aqiStatus = 'GOOD';
            if (aqiVal > 50) aqiStatus = 'MODERATE';
            if (aqiVal > 100) aqiStatus = 'POOR';

            if (resName) resName.innerText = placeName;
            if (resCoords) resCoords.innerText = `Lat: ${lat.toFixed(2)}° | Lon: ${lon.toFixed(2)}°`;
            if (resAqi) resAqi.innerText = `${aqiVal} (${aqiStatus})`;
            if (resPm25) resPm25.innerText = `${pm25Val} µg/m³`;
            if (resCo) resCo.innerText = `${coVal} µg/m³`;

            // Update Leaflet Interactive Satellite Map
            if (typeof leafletMap !== 'undefined' && leafletMap && leafletMarker) {
                leafletMap.flyTo([lat, lon], 11);
                leafletMarker.setLatLng([lat, lon]);
                leafletMarker.bindPopup(`<b>${placeName}</b><br>European AQI Index: ${aqiVal} (${aqiStatus})<br>PM2.5: ${pm25Val} µg/m³<br>CO: ${coVal} µg/m³`).openPopup();
            }
        }
    } catch (err) {
        console.log('City search error:', err);
        alert('Could not retrieve live satellite data for this location. Please try again.');
    }
}

// 23. Signed Certificate Library, Exports & Sharing
const certificateLibraryStorageKey = 'terra_nova_verified_certificates_v1';
let activeCertificate = null;
let certificateHistoryChart = null;

function getCertificateHistory() {
    try {
        const history = JSON.parse(localStorage.getItem(certificateLibraryStorageKey) || '[]');
        return Array.isArray(history) ? history.filter(record => record && record.certificateToken && record.verificationHash) : [];
    } catch (error) {
        console.warn('Certificate history could not be loaded:', error);
        return [];
    }
}

function saveCertificateHistory(history) {
    try {
        localStorage.setItem(certificateLibraryStorageKey, JSON.stringify(history.slice(0, 50)));
        return true;
    } catch (error) {
        console.warn('Certificate history could not be saved:', error);
        return false;
    }
}

function setCertificateActionState(enabled) {
    ['certificate-png-btn', 'certificate-pdf-btn', 'certificate-copy-btn'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.disabled = !enabled;
    });
    document.querySelectorAll('.certificate-social-actions button').forEach(button => {
        button.disabled = !enabled;
    });
}

function setCertificateStatus(message, isError = false) {
    const status = document.getElementById('certificate-action-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', isError);
}

function drawCertificateArtwork(certificate, isDraft = false) {
    const canvas = document.getElementById('certificate-preview');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const issuedDate = new Date(certificate.issuedAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, '#101d1b');
    background.addColorStop(0.52, '#0a1118');
    background.addColorStop(1, '#13221d');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#8ba77b';
    ctx.lineWidth = 5;
    ctx.strokeRect(26, 26, width - 52, height - 52);
    ctx.strokeStyle = 'rgba(220, 237, 224, 0.48)';
    ctx.lineWidth = 1;
    ctx.strokeRect(43, 43, width - 86, height - 86);

    const markX = width / 2;
    const markY = 105;
    ctx.strokeStyle = '#b6e5bf';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(markX, markY, 27, 0, Math.PI * 2);
    ctx.moveTo(markX, markY - 26);
    ctx.lineTo(markX, markY + 26);
    ctx.ellipse(markX, markY, 12, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#eaf5ec';
    ctx.textAlign = 'center';
    ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('TERRA NOVA', markX, 158);
    ctx.fillStyle = '#93bf9c';
    ctx.font = '12px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('ISSUED BY RAJ GOLU · VERIFIED CLIMATE IMPACT RECORD', markX, 183);

    ctx.strokeStyle = 'rgba(139, 167, 123, 0.65)';
    ctx.beginPath();
    ctx.moveTo(260, 211);
    ctx.lineTo(940, 211);
    ctx.stroke();

    ctx.fillStyle = '#dce9df';
    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('THIS RECORD IS ISSUED TO', markX, 263);
    ctx.fillStyle = '#ffffff';
    let nameFontSize = 48;
    ctx.font = `600 ${nameFontSize}px Georgia, serif`;
    while (ctx.measureText(certificate.name.toUpperCase()).width > 980 && nameFontSize > 28) {
        nameFontSize -= 2;
        ctx.font = `600 ${nameFontSize}px Georgia, serif`;
    }
    ctx.fillText(certificate.name.toUpperCase(), markX, 335);
    ctx.fillStyle = '#cad7ce';
    ctx.font = '18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('FOR AN ESTIMATED ANNUAL CARBON FOOTPRINT OF', markX, 392);
    ctx.fillStyle = '#b6e5bf';
    ctx.font = '600 40px Georgia, serif';
    ctx.fillText(`${Number(certificate.tonsCO2).toFixed(1)} METRIC TONS CO₂`, markX, 457);
    ctx.fillStyle = '#a4b3aa';
    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Calculated from the electricity and flight data provided by the certificate holder.', markX, 495);

    ctx.fillStyle = '#7c8f84';
    ctx.font = '13px monospace';
    ctx.fillText(`CERTIFICATE ID  ${certificate.verificationHash}`, markX, 570);
    ctx.fillText(`${isDraft ? 'PREVIEW · NOT YET ISSUED' : `ISSUED ${issuedDate.toUpperCase()}`}`, markX, 598);

    ctx.strokeStyle = isDraft ? '#bd9b65' : '#8ba77b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(markX, 681, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = isDraft ? '#e0bf83' : '#b6e5bf';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(isDraft ? 'DRAFT' : 'SIGNED', markX, 685);
    ctx.fillStyle = '#68796f';
    ctx.font = '11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('Signature verifies issuer and record integrity; it is not an independent emissions audit.', markX, 747);
}

function renderCertificateLibrary() {
    const list = document.getElementById('certificate-history-list');
    const count = document.getElementById('certificate-library-count');
    if (!list || !count) return;

    const history = getCertificateHistory().sort((left, right) => new Date(right.issuedAt) - new Date(left.issuedAt));
    count.textContent = `${history.length} ${history.length === 1 ? 'CERTIFICATE' : 'CERTIFICATES'}`;
    list.replaceChildren();

    if (!history.length) {
        const empty = document.createElement('p');
        empty.className = 'certificate-library-empty';
        empty.textContent = 'No certificates yet. Generate one to start comparing your impact history.';
        list.append(empty);
    } else {
        history.forEach(certificate => {
            const item = document.createElement('article');
            item.className = 'certificate-history-item';

            const details = document.createElement('div');
            details.className = 'certificate-history-details';
            const name = document.createElement('strong');
            name.textContent = certificate.name;
            const metadata = document.createElement('span');
            metadata.textContent = `${new Date(certificate.issuedAt).toLocaleDateString()} · ${certificate.verificationHash}`;
            details.append(name, metadata);

            const impact = document.createElement('strong');
            impact.className = 'certificate-history-impact';
            impact.textContent = `${Number(certificate.tonsCO2).toFixed(1)} t CO₂ / year`;

            const actions = document.createElement('div');
            actions.className = 'certificate-history-actions';
            const viewButton = document.createElement('button');
            viewButton.type = 'button';
            viewButton.textContent = 'Open';
            viewButton.addEventListener('click', () => openSavedCertificate(certificate));
            const verifyLink = document.createElement('a');
            verifyLink.href = certificate.certificateUrl;
            verifyLink.target = '_blank';
            verifyLink.rel = 'noopener noreferrer';
            verifyLink.textContent = 'Verify';
            actions.append(viewButton, verifyLink);
            item.append(details, impact, actions);
            list.append(item);
        });
    }

    const canvas = document.getElementById('certificate-history-chart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (certificateHistoryChart) certificateHistoryChart.destroy();
    const ascendingHistory = [...history].sort((left, right) => new Date(left.issuedAt) - new Date(right.issuedAt));
    certificateHistoryChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: ascendingHistory.map(record => new Date(record.issuedAt).toLocaleDateString(undefined, { month: 'short', year: '2-digit' })),
            datasets: [{
                label: 'Annual footprint estimate (metric tons)',
                data: ascendingHistory.map(record => Number(record.tonsCO2)),
                borderColor: '#92d3a1',
                backgroundColor: 'rgba(109, 214, 145, 0.12)',
                pointBackgroundColor: '#d7f5dc',
                pointBorderColor: '#68b37d',
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 2,
                fill: true,
                tension: 0.28
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#9aaba2' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { beginAtZero: true, title: { display: true, text: 'Metric tons CO₂ / year', color: '#9aaba2' }, ticks: { color: '#9aaba2' }, grid: { color: 'rgba(255,255,255,0.07)' } }
            }
        }
    });
}

function initializeCertificateLibrary() {
    renderCertificateLibrary();
    const canvas = document.getElementById('certificate-history-chart');
    if (!canvas || typeof Chart !== 'undefined') return;

    const loadChart = () => {
        loadExternalScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js', 'Chart')
            .then(renderCertificateLibrary)
            .catch(error => console.warn('Certificate history chart could not be loaded:', error));
    };

    if (!('IntersectionObserver' in window)) {
        loadChart();
        return;
    }

    const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
            observer.disconnect();
            loadChart();
        }
    }, { rootMargin: '250px' });
    observer.observe(canvas);
}

document.addEventListener('DOMContentLoaded', initializeCertificateLibrary);

async function issueVerifiedCertificate() {
    const issueButton = document.getElementById('certificate-issue-btn');
    const name = document.getElementById('certificate-recipient-name').value.trim();
    const kwh = Math.max(0, Number(document.getElementById('calc-kwh').value) || 0);
    const flights = Math.max(0, Number(document.getElementById('calc-flights').value) || 0);
    if (!name) {
        setCertificateStatus('Enter the certificate recipient name before issuing.', true);
        document.getElementById('certificate-recipient-name').focus();
        return;
    }
    issueButton.disabled = true;
    issueButton.textContent = 'Issuing…';
    setCertificateStatus('Requesting signed certificate from Terra Nova…');

    try {
        const response = await fetch(getApiUrl('/api/certificate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, kwh, flights })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || 'Certificate could not be issued.');
        if (!result.certificateToken || !result.verificationHash || result.issuer !== 'Raj Golu' || !result.certificateUrl) {
            throw new Error('The certificate server is out of date. Restart the app server to enable signed certificates.');
        }

        activeCertificate = {
            ...result,
            name,
            issuedDate: new Date(result.issuedAt).toLocaleDateString(),
            certificateUrl: new URL(result.certificateUrl, window.location.origin).toString()
        };
        drawCertificateArtwork(activeCertificate);
        document.getElementById('certificate-recipient-name').disabled = true;
        setCertificateActionState(true);
        const history = getCertificateHistory();
        const existingIndex = history.findIndex(record => record.verificationHash === activeCertificate.verificationHash);
        if (existingIndex >= 0) history.splice(existingIndex, 1);
        history.unshift(activeCertificate);
        const saved = saveCertificateHistory(history);
        renderCertificateLibrary();
        setCertificateStatus(saved
            ? `Signed and saved · ${activeCertificate.verificationHash}`
            : `Signed · ${activeCertificate.verificationHash}. Browser storage is unavailable, so this record was not added to your library.`
        );
    } catch (error) {
        setCertificateStatus(error.message || 'Certificate issuance failed. Please retry.', true);
    } finally {
        issueButton.disabled = false;
        issueButton.textContent = 'Generate & save';
    }
}

function openSavedCertificate(certificate) {
    activeCertificate = certificate;
    const recipientField = document.getElementById('certificate-recipient-name');
    recipientField.value = certificate.name;
    recipientField.disabled = true;
    drawCertificateArtwork(certificate);
    setCertificateActionState(true);
    setCertificateStatus(`Signed certificate · ${certificate.verificationHash}`);
    const modal = document.getElementById('certificate-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    activateAccessibleModal(modal);
    setTimeout(() => modal.classList.remove('opacity-0'), 50);
}

async function downloadRealCertificate(format = 'png') {
    if (!activeCertificate) {
        setCertificateStatus('Generate or open a saved certificate before downloading.', true);
        return;
    }
    const canvas = document.getElementById('certificate-preview');
    const fileName = `Terra_Nova_Certificate_${activeCertificate.name.trim().replace(/[^\w-]+/g, '_')}`;
    if (format === 'pdf') {
        try {
            await loadExternalScript('https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js', 'jspdf');
        } catch (error) {
            setCertificateStatus('PDF export library is unavailable. Download the PNG instead.', true);
            return;
        }
        const PdfDocument = window.jspdf?.jsPDF;
        if (!PdfDocument) {
            setCertificateStatus('PDF export library is unavailable. Download the PNG instead.', true);
            return;
        }
        const pdf = new PdfDocument({ orientation: 'landscape', unit: 'pt', format: [900, 600] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 900, 600);
        pdf.save(`${fileName}.pdf`);
    } else {
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
    setCertificateStatus(`${format.toUpperCase()} download started · ${activeCertificate.verificationHash}`);
}

async function shareCertificate(destination) {
    if (!activeCertificate) {
        setCertificateStatus('Generate or open a saved certificate before sharing.', true);
        return;
    }
    const verifyUrl = activeCertificate.certificateUrl;
    const shareText = `My Terra Nova verified climate impact certificate records an estimated ${activeCertificate.tonsCO2} metric tons CO₂ per year.`;

    if (destination === 'copy') {
        try {
            await navigator.clipboard.writeText(verifyUrl);
            setCertificateStatus('Verification link copied.');
        } catch (error) {
            const field = document.createElement('textarea');
            field.value = verifyUrl;
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.append(field);
            field.select();
            const copied = document.execCommand('copy');
            field.remove();
            setCertificateStatus(copied ? 'Verification link copied.' : verifyUrl, !copied);
        }
        return;
    }

    const shareUrls = {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(verifyUrl)}`,
        x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(verifyUrl)}`
    };
    if (shareUrls[destination]) window.open(shareUrls[destination], '_blank', 'noopener,noreferrer');
}

function openCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    if (modal) {
        activeCertificate = null;
        setCertificateActionState(false);
        const recipientField = document.getElementById('certificate-recipient-name');
        const previewName = getDefaultCertificateRecipient();
        recipientField.disabled = false;
        recipientField.value = previewName;
        const annualTons = Number((document.getElementById('calc-result').textContent.match(/[\d.]+/) || ['0'])[0]);
        drawCertificateArtwork({ name: previewName, tonsCO2: annualTons, verificationHash: 'PENDING ISSUANCE', issuedAt: new Date().toISOString() }, true);
        setCertificateStatus('Preview only. Generate a signed certificate to enable downloads and sharing.');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        activateAccessibleModal(modal);
        setTimeout(() => modal.classList.remove('opacity-0'), 50);
    }
}

function getDefaultCertificateRecipient() {
    try {
        const authData = JSON.parse(localStorage.getItem('terra_nova_user') || 'null');
        if (authData?.loggedIn && authData.name?.trim()) return authData.name.trim();
    } catch (error) {
        console.warn('Saved profile name could not be read:', error);
    }
    return document.getElementById('carbon-profile-name').value.trim() || 'Guest Member';
}

function previewCertificateRecipient() {
    if (activeCertificate) return;
    const name = document.getElementById('certificate-recipient-name').value.trim() || 'Recipient name';
    const annualTons = Number((document.getElementById('calc-result').textContent.match(/[\d.]+/) || ['0'])[0]);
    drawCertificateArtwork({ name, tonsCO2: annualTons, verificationHash: 'PENDING ISSUANCE', issuedAt: new Date().toISOString() }, true);
}

