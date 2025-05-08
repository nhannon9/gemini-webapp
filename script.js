// script.js
(function() {
    'use strict';

    // --- DOM Element References ---
    const preloader = document.getElementById('tw-preloader');
    const appContainer = document.getElementById('tw-app-container');
    
    const tesseractOuterShell = document.querySelector('.tw-tesseract-outer-shell');
    const innerCube = document.getElementById('tw-inner-cube'); // The parent of the nodes
    const nodes = document.querySelectorAll('.tw-node');
    const particleCanvas = document.getElementById('tw-particle-canvas');
    
    const stages = {
        initiation: document.getElementById('tw-stage-initiation'),
        alignment: document.getElementById('tw-stage-alignment'),
        focus: document.getElementById('tw-stage-focus'),
        leap: document.getElementById('tw-stage-leap')
    };
    
    const initiateButton = document.getElementById('tw-initiate-button');
    const focusEnergyButton = document.getElementById('tw-focus-energy-button');
    const leapButton = document.getElementById('tw-leap-button');
    
    const consoles = {
        initiation: document.getElementById('tw-console-initiation'),
        alignment: document.getElementById('tw-console-alignment'),
        focus: document.getElementById('tw-console-focus'),
        leap: document.getElementById('tw-console-leap')
    };
    
    const anchorsActivatedCountDisplay = document.getElementById('tw-anchors-activated-count');
    const focusChargeBar = document.getElementById('tw-focus-charge-bar');
    const resonanceStabilityDisplay = document.getElementById('tw-resonance-stability');
    const countdownTimerDisplay = document.getElementById('tw-countdown-timer');
    
    const audio = {
        click: document.getElementById('tw-audio-click'),
        activate: document.getElementById('tw-audio-activate'),
        charge: document.getElementById('tw-audio-charge'),
        warp: document.getElementById('tw-audio-warp'),
        ambient: document.getElementById('tw-audio-ambient')
    };

    // --- State Variables ---
    let currentStage = 'initiation';
    let activatedAnchors = 0;
    const totalAnchors = 8; // Should match the number of .tw-node elements
    let focusCharge = 0; // Percentage
    let focusInterval = null;
    let resonanceStability = 0; // Percentage
    let countdownInterval = null;
    let isAmbientPlaying = false;
    let particleAnimationId;

    // Particle system variables
    let particlesArray = [];
    const ctx = particleCanvas.getContext('2d');

    // --- Constants ---
    const FOCUS_CHARGE_INCREMENT = 2; // % charge per interval
    const FOCUS_STABILITY_GAIN_RATE = 2.5; // % stability gain per interval in sweet spot
    const FOCUS_STABILITY_DECAY_RATE = 1; // % stability decay per interval outside sweet spot or on release
    const FOCUS_CHARGE_DECAY_RATE = 3; // % charge decay on release
    const FOCUS_INTERVAL_MS = 50;
    const RESONANCE_TARGET_STABILITY = 90; // % stability required
    const RESONANCE_SWEET_SPOT_MIN = 70; // % charge
    const RESONANCE_SWEET_SPOT_MAX = 95; // % charge
    const LEAP_COUNTDOWN_SECONDS = 5;
    const RANDOM_PAGE_URL = 'https://randomwebsite.com/cgi-bin/random.pl';
    // Alternative random URL providers:
    // const RANDOM_PAGE_URL = 'https://www.randomurl.com/';

    // --- Utility Functions ---
    function playSound(soundKey, loop = false) {
        if (audio[soundKey]) {
            audio[soundKey].currentTime = 0;
            audio[soundKey].loop = loop;
            audio[soundKey].play().catch(e => console.warn(`Audio ${soundKey} play failed:`, e.message));
        }
    }

    function stopSound(soundKey) {
        if (audio[soundKey]) {
            audio[soundKey].pause();
            audio[soundKey].currentTime = 0; // Reset for next play
        }
    }

    function playAmbientSound() {
        if (audio.ambient && !isAmbientPlaying && audio.ambient.paused) {
            audio.ambient.volume = 0.08; // Keep ambient sound subtle
            audio.ambient.play().then(() => {
                isAmbientPlaying = true;
            }).catch(e => {
                console.warn("Ambient audio autoplay failed. Will try on user interaction.", e.message);
                // Add a one-time click listener to the body to attempt play on interaction
                document.body.addEventListener('click', function attemptPlayAmbient() {
                    if (audio.ambient.paused) {
                        audio.ambient.play().then(() => isAmbientPlaying = true).catch(err => console.warn("Still couldn't play ambient sound.", err.message));
                    }
                    document.body.removeEventListener('click', attemptPlayAmbient); // Clean up listener
                }, { once: true });
            });
        }
    }

    function logToConsole(stageKey, message, isError = false) {
        if (consoles[stageKey]) {
            const p = document.createElement('p');
            // Basic XSS sanitization, replace with a more robust library if handling user input directly
            const sanitizedMessage = message.replace(/</g, "<").replace(/>/g, ">");
            p.innerHTML = `> ${sanitizedMessage}`;
            if (isError) p.style.color = 'var(--secondary-color)'; // Or a dedicated error color
            consoles[stageKey].appendChild(p);
            consoles[stageKey].scrollTop = consoles[stageKey].scrollHeight; // Auto-scroll
        }
    }

    // --- Stage Management ---
    function updateStageDisplay() {
        Object.values(stages).forEach(stageEl => stageEl.classList.remove('current-stage'));
        if (stages[currentStage]) {
            stages[currentStage].classList.add('current-stage');
        }
    }

    function advanceStage(nextStage) {
        logToConsole(currentStage, `Status: Stage [${currentStage}] nominal. Transitioning to [${nextStage}] protocols.`);
        currentStage = nextStage;
        updateStageDisplay();

        switch (currentStage) {
            case 'alignment':
                logToConsole('alignment', 'Dimensional Stabilizers require calibration. Activate 8 Reality Anchors (glowing nodes).');
                setupAlignmentStage();
                break;
            case 'focus':
                logToConsole('focus', 'Energy Matrix online. Channel and stabilize resonant frequency.');
                focusEnergyButton.disabled = false;
                setupFocusStage();
                break;
            case 'leap':
                logToConsole('leap', 'Hyper-Leap trajectory computed and locked. Awaiting final authorization.');
                leapButton.disabled = false;
                break;
        }
    }

    // --- Stage 1: Initiation ---
    initiateButton.addEventListener('click', () => {
        playSound('click');
        initiateButton.disabled = true;
        logToConsole('initiation', 'Core awakening sequence initiated...');
        // Simulate processing
        setTimeout(() => {
            playSound('activate'); // Sound for successful activation
            logToConsole('initiation', 'Tesseract Core systems nominal. Power levels stable.');
            advanceStage('alignment');
        }, 2000);
    });

    // --- Stage 2: Alignment (Node Activation) ---
    function setupAlignmentStage() {
        activatedAnchors = 0;
        anchorsActivatedCountDisplay.textContent = activatedAnchors;
        nodes.forEach(node => {
            node.classList.remove('activated');
            // Ensure event listeners are not duplicated
            node.removeEventListener('click', handleNodeClick); 
            node.addEventListener('click', handleNodeClick);
        });
    }

    function handleNodeClick(event) {
        const node = event.target.closest('.tw-node'); // Ensure we get the node if event is on a child
        if (node && !node.classList.contains('activated')) {
            playSound('activate');
            node.classList.add('activated');
            activatedAnchors++;
            anchorsActivatedCountDisplay.textContent = activatedAnchors;
            logToConsole('alignment', `Anchor ${node.dataset.nodeId} calibrated. Status: [${activatedAnchors}/${totalAnchors}]`);

            if (activatedAnchors >= totalAnchors) {
                logToConsole('alignment', 'All Reality Anchors calibrated. Dimensional field stable.');
                nodes.forEach(n => n.removeEventListener('click', handleNodeClick)); // Clean up listeners
                setTimeout(() => advanceStage('focus'), 1500);
            }
        }
    }

    // --- Stage 3: Focus (Energy Channeling Minigame) ---
    function setupFocusStage() {
        focusCharge = 0;
        resonanceStability = 0;
        updateFocusDisplay();
        focusEnergyButton.disabled = false;
        focusEnergyButton.textContent = "Channel Energy";

        // Ensure listeners are fresh
        focusEnergyButton.removeEventListener('mousedown', startCharging);
        focusEnergyButton.removeEventListener('mouseup', stopChargingAndDecay);
        focusEnergyButton.removeEventListener('mouseleave', stopChargingAndDecay);
        focusEnergyButton.removeEventListener('touchstart', startChargingTouch, { passive: false });
        focusEnergyButton.removeEventListener('touchend', stopChargingAndDecay);
        focusEnergyButton.removeEventListener('touchcancel', stopChargingAndDecay);

        focusEnergyButton.addEventListener('mousedown', startCharging);
        focusEnergyButton.addEventListener('mouseup', stopChargingAndDecay);
        focusEnergyButton.addEventListener('mouseleave', stopChargingAndDecay); // If mouse leaves button while pressed
        focusEnergyButton.addEventListener('touchstart', startChargingTouch, { passive: false });
        focusEnergyButton.addEventListener('touchend', stopChargingAndDecay);
        focusEnergyButton.addEventListener('touchcancel', stopChargingAndDecay);
    }
    
    function startChargingTouch(e) {
        e.preventDefault(); // Prevent scrolling/default touch actions
        startCharging();
    }

    function startCharging() {
        if (currentStage !== 'focus' || focusCharge >= 100 || focusInterval) return; // Prevent multiple intervals
        
        playSound('charge', true);
        logToConsole('focus', 'Energy channeling initiated... Modulate intensity.');
        focusEnergyButton.textContent = "Charging...";

        focusInterval = setInterval(() => {
            focusCharge = Math.min(100, focusCharge + FOCUS_CHARGE_INCREMENT);

            if (focusCharge >= RESONANCE_SWEET_SPOT_MIN && focusCharge <= RESONANCE_SWEET_SPOT_MAX) {
                resonanceStability = Math.min(100, resonanceStability + FOCUS_STABILITY_GAIN_RATE);
            } else {
                resonanceStability = Math.max(0, resonanceStability - FOCUS_STABILITY_DECAY_RATE * 0.5); // Slower decay while actively charging outside spot
            }
            updateFocusDisplay();

            if (focusCharge >= 100) {
                if (resonanceStability >= RESONANCE_TARGET_STABILITY) {
                    stopCharging(true); // Success
                    logToConsole('focus', `Resonance lock achieved! Stability: ${Math.round(resonanceStability)}%. Matrix stable.`);
                    focusEnergyButton.disabled = true;
                    focusEnergyButton.textContent = "Lock Achieved";
                    playSound('activate');
                    setTimeout(() => advanceStage('leap'), 1500);
                } else {
                    logToConsole('focus', `Matrix at full charge, but resonance unstable (${Math.round(resonanceStability)}%). Release to recalibrate or risk overload.`, true);
                    // Could implement an overload penalty or auto-decay if held too long at 100% unstable
                }
            }
        }, FOCUS_INTERVAL_MS);
    }

    function stopCharging(isSuccess = false) {
        stopSound('charge');
        if (focusInterval) {
            clearInterval(focusInterval);
            focusInterval = null;
        }
        if (!isSuccess) {
             focusEnergyButton.textContent = "Channel Energy";
        }
    }
    
    function stopChargingAndDecay() { // Called on mouseup/touchend
        if (!focusInterval) return; // Only act if it was charging

        stopCharging(false);
        logToConsole('focus', 'Energy channeling paused. System decaying.');

        // Start decay for both charge and stability if not successful
        let decayInterval = setInterval(() => {
            let changed = false;
            if (focusCharge > 0) {
                focusCharge = Math.max(0, focusCharge - FOCUS_CHARGE_DECAY_RATE);
                changed = true;
            }
            if (resonanceStability > 0) {
                resonanceStability = Math.max(0, resonanceStability - FOCUS_STABILITY_DECAY_RATE);
                changed = true;
            }
            
            if (changed) {
                updateFocusDisplay();
            } else {
                clearInterval(decayInterval); // Stop decay if both are zero
                logToConsole('focus', 'Matrix discharged. Awaiting re-engagement.');
            }
            if (focusCharge === 0 && resonanceStability === 0) {
                 clearInterval(decayInterval);
                 logToConsole('focus', 'Matrix fully discharged.');
            }
        }, FOCUS_INTERVAL_MS * 2); // Slower decay interval
    }


    function updateFocusDisplay() {
        focusChargeBar.style.width = `${focusCharge}%`;
        resonanceStabilityDisplay.textContent = `${Math.round(resonanceStability)}%`;

        if (resonanceStability >= RESONANCE_TARGET_STABILITY && focusCharge >= RESONANCE_SWEET_SPOT_MIN) {
            focusChargeBar.style.background = 'linear-gradient(90deg, var(--primary-color) 0%, #33ffcc 100%)'; // Greenish success hint
        } else if (resonanceStability > 50 && focusCharge > RESONANCE_SWEET_SPOT_MIN *0.5) {
            focusChargeBar.style.background = 'linear-gradient(90deg, var(--secondary-color) 0%, var(--primary-color) 100%)'; // Normal
        } else {
            focusChargeBar.style.background = 'linear-gradient(90deg, #cc3333 0%, var(--secondary-color) 70%)'; // Reddish warning
        }
    }

    // --- Stage 4: Leap ---
    leapButton.addEventListener('click', () => {
        playSound('click');
        initiateHyperLeap();
    });

    function initiateHyperLeap() {
        playSound('warp');
        leapButton.disabled = true;
        leapButton.textContent = "TRANSIT IN PROGRESS";
        logToConsole('leap', 'Hyper-Leap authorized! Engaging extradimensional drive...');
        document.body.classList.add('tw-warp-effect-active'); // For CSS flash/shake

        let countdown = LEAP_COUNTDOWN_SECONDS;
        countdownTimerDisplay.textContent = `TRANSIT: ${countdown}s`;

        countdownInterval = setInterval(() => {
            countdown--;
            countdownTimerDisplay.textContent = `TRANSIT: ${countdown}s`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                countdownTimerDisplay.textContent = 'JUMPING!';
                logToConsole('leap', 'Destination: UNKNOWN. Navigating the Hyperweb...');
                
                // Intense visual/audio crescendo before redirect
                if (particleAnimationId) cancelAnimationFrame(particleAnimationId); // Stop normal particles
                intensifyParticlesForLeap(); // Start a more chaotic particle effect

                setTimeout(() => {
                    window.location.href = RANDOM_PAGE_URL;
                }, 2000); // Allow time for final effects and message
            }
        }, 1000);
    }

    // --- Particle System ---
    class Particle {
        constructor(isLeapParticle = false) {
            this.isLeapParticle = isLeapParticle;
            this.reset();
        }

        reset() {
            this.x = Math.random() * particleCanvas.width;
            this.y = Math.random() * particleCanvas.height;
            if (this.isLeapParticle) {
                this.size = Math.random() * 4 + 1;
                this.speedX = (Math.random() - 0.5) * (Math.random() * 10 + 5); // Faster for leap
                this.speedY = (Math.random() - 0.5) * (Math.random() * 10 + 5);
                this.color = `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, ${Math.random() * 0.8 + 0.2})`; // Random colors
                this.life = 100 + Math.random() * 50; // Frames to live
            } else {
                this.size = Math.random() * 2 + 0.5;
                this.speedX = (Math.random() * 1 - 0.5) * 0.3;
                this.speedY = (Math.random() * 1 - 0.5) * 0.3;
                // Use CSS variables for color, ensuring they are defined as r,g,b numbers
                const r = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-r').trim() || 0;
                const g = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-g').trim() || 242;
                const b = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-b').trim() || 255;
                this.color = `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.4 + 0.1})`;
            }
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            if (this.isLeapParticle) {
                this.life--;
                if (this.life <= 0) {
                    this.reset(); // Re-spawn leap particles as they die
                    this.x = particleCanvas.width / 2; // Emerge from center for leap
                    this.y = particleCanvas.height / 2;
                }
            } else {
                if (this.size > 0.1) this.size -= 0.005; // Shrink slowly
                 // Boundary check (disappear and reappear smoothly)
                if (this.x < -this.size || this.x > particleCanvas.width + this.size || 
                    this.y < -this.size || this.y > particleCanvas.height + this.size || 
                    this.size <= 0.1) {
                    this.reset(); // Re-initialize particle
                }
            }
        }

        draw(currentCtx) {
            currentCtx.fillStyle = this.color;
            currentCtx.beginPath();
            currentCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            currentCtx.fill();
        }
    }

    function initParticles(numParticles = 75) {
        particlesArray = [];
        particleCanvas.width = particleCanvas.offsetWidth;
        particleCanvas.height = particleCanvas.offsetHeight;
        for (let i = 0; i < numParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw(ctx);
        }
        particleAnimationId = requestAnimationFrame(animateParticles);
    }
    
    function intensifyParticlesForLeap() {
        particlesArray = []; // Clear existing gentle particles
        const numLeapParticles = 200; // More, faster particles
        for (let i = 0; i < numLeapParticles; i++) {
            const p = new Particle(true);
            p.x = particleCanvas.width / 2; // Emerge from center
            p.y = particleCanvas.height / 2;
            particlesArray.push(p);
        }
        // A local animation loop for the leap particles, could also integrate into main one
        function leapParticleLoop() {
            ctx.fillStyle = 'rgba(8, 0, 27, 0.2)'; // Fading trails
            ctx.fillRect(0,0, particleCanvas.width, particleCanvas.height);
            // ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
            particlesArray.forEach(p => {
                p.update();
                p.draw(ctx);
            });
            requestAnimationFrame(leapParticleLoop);
        }
        leapParticleLoop();
    }


    window.addEventListener('resize', () => {
        if (particleCanvas.offsetWidth === 0 || particleCanvas.offsetHeight === 0) return; // Avoid error if canvas not visible
        particleCanvas.width = particleCanvas.offsetWidth;
        particleCanvas.height = particleCanvas.offsetHeight;
        // Re-initialize particles only if not in leap stage to avoid disrupting leap effect
        if(currentStage !== 'leap' || (countdownInterval && LEAP_COUNTDOWN_SECONDS > 0) ) { // Check if countdown is active
            if (particleAnimationId) cancelAnimationFrame(particleAnimationId);
            initParticles();
            animateParticles();
        }
    });

    // --- App Initialization ---
    function initApp() {
        // Simulate loading time or wait for assets
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.addEventListener('transitionend', () => {
                preloader.classList.add('tw-hidden');
                appContainer.classList.add('tw-visible');
                
                playAmbientSound();
                updateStageDisplay();
                logToConsole('initiation', 'Chronos Tesseract Interface Initialized. System Standby.');
                
                // Set canvas size after app container is visible
                if (particleCanvas.offsetWidth > 0 && particleCanvas.offsetHeight > 0) {
                    initParticles();
                    animateParticles();
                } else {
                    // Fallback if canvas size is not yet available (e.g., hidden parent)
                    // This might happen if tw-visible transition is too slow or display:none related issues
                    setTimeout(() => {
                        if (particleCanvas.offsetWidth > 0 && particleCanvas.offsetHeight > 0) {
                           initParticles();
                           animateParticles();
                        } else {
                            console.warn("Particle canvas dimensions still zero after delay.");
                        }
                    }, 100); // Short delay to wait for CSS to apply
                }

            }, { once: true });
        }, 1500); // Simulate asset loading / preloader duration
    }

    document.addEventListener('DOMContentLoaded', initApp);

})(); // End of IIFE
