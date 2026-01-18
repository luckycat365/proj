// import { Peer } from 'peerjs'; // Using CDN for easier deployment


// --- Game Constants & State ---
const MAX_HEALTH = 100;
const SMASH_DAMAGE_DELAY = 1000; // ms to wait for animation impact

const state = {
    mode: 'local', // 'local' | 'online'
    role: 'host',  // 'host' | 'guest'
    turn: 'p1_attack', // 'p1_attack', 'p2_defend', 'p2_attack', 'p1_defend'
    p1Health: MAX_HEALTH,
    p2Health: MAX_HEALTH,
    p1Dice: 0,
    p2Dice: 0,
    gameOver: false,
    peer: null,
    conn: null
};

// --- DOM Elements ---
const screens = {
    menu: document.getElementById('menu-screen'),
    game: document.getElementById('game-screen')
};

const ui = {
    btnLocal: document.getElementById('btn-local'),
    btnOnline: document.getElementById('btn-online'),
    inviteArea: document.getElementById('invite-area'),
    inviteLink: document.getElementById('invite-link'),
    btnCopy: document.getElementById('btn-copy'),
    p1HealthBar: document.getElementById('p1-health'),
    p2HealthBar: document.getElementById('p2-health'),
    p1HealthText: document.getElementById('p1-hp-text'),
    p2HealthText: document.getElementById('p2-hp-text'),
    p1Card: document.getElementById('p1-card'),
    p2Card: document.getElementById('p2-card'),
    p1AttackOverlay: document.getElementById('p1-attack-overlay'),
    p2AttackOverlay: document.getElementById('p2-attack-overlay'),
    turnIndicator: document.getElementById('turn-indicator'),
    diceValue: document.getElementById('dice-value'),
    btnRoll: document.getElementById('btn-roll'),
    log: document.getElementById('game-log'),
    log: document.getElementById('game-log')
};

import attack1Src from './assets/character1_basicattack.png';
import attack2Src from './assets/character2_basicattack.png';
import blockSrc from './assets/block.png';
import ch1AttackWav from './assets/sounds/character1_normalattack.wav';
import ch2AttackWav from './assets/sounds/character2_normalattack.mp3';
import blockWav from './assets/sounds/block.wav';
import diceWav from './assets/sounds/dice.wav';

import bgmSrc from './assets/sounds/Backgroundmusic.mp3';

const ATTACK_SPRITE_SRC_P1 = attack1Src;
const ATTACK_SPRITE_SRC_P2 = attack2Src;
const BLOCK_SPRITE_SRC = blockSrc;

let bgmAudio = null;

function playBGM() {
    if (!bgmAudio) {
        bgmAudio = new Audio(bgmSrc);
        bgmAudio.loop = true;
        bgmAudio.volume = 0.2;
    }
    bgmAudio.play().catch(e => console.log("BGM autoplay prevented:", e));
}

function playOverlaySprite(overlay, src, className, durationMs) {
    if (!overlay) return;

    overlay.src = src;

    overlay.classList.remove('show', 'show-block');
    // Force reflow so repeated hits/blocks replay the animation
    void overlay.offsetWidth;
    overlay.classList.add(className);

    setTimeout(() => {
        overlay.classList.remove(className);
    }, durationMs);
}

function showFloatingNumber(parentId, value) {
    const parent = document.getElementById(parentId);
    if (!parent) return;

    const el = document.createElement('div');
    el.classList.add('damage-number');
    el.textContent = value;

    if (value === 0 || value === '0') {
        el.classList.add('blocked');
    }

    parent.appendChild(el);

    // Remove after animation
    setTimeout(() => {
        el.remove();
    }, 2000);
}

function showAttackSprite(attacker) {
    const overlay = attacker === 'p1' ? ui.p2AttackOverlay : ui.p1AttackOverlay;
    if (!overlay) return;

    playOverlaySprite(
        overlay,
        attacker === 'p1' ? ATTACK_SPRITE_SRC_P1 : ATTACK_SPRITE_SRC_P2,
        'show',
        700
    );
}

function showBlockSprite(defender) {
    const overlay = defender === 'p1' ? ui.p1AttackOverlay : ui.p2AttackOverlay;
    playOverlaySprite(overlay, BLOCK_SPRITE_SRC, 'show-block', 560);
}

// --- Audio Context for Procedural Sound ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let audioUnlocked = false;

function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;

    // Resume WebAudio (required on many browsers until a user gesture)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => { });
    }
}

function playSmashSynth() {
    const t = audioCtx.currentTime;

    // 1. Low frequency "thud" (impact)
    const osc = audioCtx.createOscillator();
    const oscGain = audioCtx.createGain();

    osc.connect(oscGain);
    oscGain.connect(audioCtx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(20, t + 0.15);

    oscGain.gain.setValueAtTime(1.0, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.start(t);
    osc.stop(t + 0.3);

    // 2. Noise "crunch" (texture)
    const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds buffer
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.2);

    const noiseGain = audioCtx.createGain();

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);

    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    noise.start(t);
    noise.stop(t + 0.2);
}

async function playAttackSound(attacker) {
    // Best effort: make sure audio is running
    unlockAudio();

    const src = attacker === 'p1' ? ch1AttackWav : ch2AttackWav;
    const audio = new Audio(src);
    try {
        await audio.play();
    } catch (e) {
        console.error("Failed to play attack sound", e);
    }
}

async function playBlockSound() {
    unlockAudio();
    const audio = new Audio(blockWav);
    try {
        await audio.play();
    } catch (e) {
        console.error("Failed to play block sound", e);
    }
}

async function playDiceSound() {
    unlockAudio();
    const audio = new Audio(diceWav);
    try {
        await audio.play();
    } catch (e) {
        console.error("Failed to play dice sound", e);
    }
}

// --- Initialization ---
function init() {
    ui.btnLocal.addEventListener('click', () => startGame('local'));
    ui.btnOnline.addEventListener('click', () => startOnlineHost());
    ui.btnRoll.addEventListener('click', handleRollAction);
    ui.btnCopy.addEventListener('click', copyInviteLink);

    // Check URL for join
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('gameid');
    if (gameId) {
        joinOnlineGame(gameId);
    }
}

function startGame(mode) {
    state.mode = mode;
    screens.menu.classList.remove('active');
    screens.game.classList.add('active');
    playBGM();
    updateUI();
}

// --- Online Logic ---
function startOnlineHost() {
    state.mode = 'online';
    state.role = 'host';
    ui.inviteArea.classList.remove('hidden');

    state.peer = new Peer();
    state.peer.on('open', (id) => {
        const link = `${window.location.href}?gameid=${id}`;
        ui.inviteLink.textContent = link;
    });

    state.peer.on('connection', (conn) => {
        state.conn = conn;
        setupConnection();
        startGame('online');
    });
}

function joinOnlineGame(hostId) {
    state.mode = 'online';
    state.role = 'guest';
    // Hide menu immediately
    screens.menu.classList.remove('active');
    screens.game.classList.add('active');

    state.peer = new Peer();
    state.peer.on('open', () => {
        state.conn = state.peer.connect(hostId);
        setupConnection();
    });
}

function setupConnection() {
    state.conn.on('data', (data) => {
        handleNetworkData(data);
    });
    state.conn.on('open', () => {
        console.log('Connected!');
        log("Player 2 Connected!");
        // Removed automatic BGM play
    });
}

function sendData(data) {
    if (state.mode === 'online' && state.conn) {
        state.conn.send(data);
    }
}

function handleNetworkData(data) {
    if (data.type === 'roll') {
        // Opponent rolled
        // If I am guest, and host rolled, I just update UI?
        // Actually, we must stay in sync.
        // Host is authority? Or just relay actions?
        // Let's rely on turn logic.
        performRoll(data.value, false);
    } else if (data.type === 'restart') {
        window.location.reload();
    }
}

// --- Game Logic ---

function copyInviteLink() {
    const link = ui.inviteLink.textContent;
    if (!link || link === 'Generating...') return;

    navigator.clipboard.writeText(link).then(() => {
        const originalText = ui.btnCopy.textContent;
        ui.btnCopy.textContent = "Copied!";
        setTimeout(() => {
            ui.btnCopy.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}

function updateUI() {
    // Update Health Bars
    const p1Pct = Math.max(0, (state.p1Health / MAX_HEALTH) * 100);
    const p2Pct = Math.max(0, (state.p2Health / MAX_HEALTH) * 100);

    ui.p1HealthBar.style.width = `${p1Pct}%`;
    ui.p2HealthBar.style.width = `${p2Pct}%`;

    if (p1Pct < 30) ui.p1HealthBar.classList.add('low');
    if (p2Pct < 30) ui.p2HealthBar.classList.add('low');

    ui.p1HealthText.textContent = `${state.p1Health}/${MAX_HEALTH}`;
    ui.p2HealthText.textContent = `${state.p2Health}/${MAX_HEALTH}`;

    // Highlight Active Card
    ui.p1Card.classList.remove('active-turn', 'defending');
    ui.p2Card.classList.remove('active-turn', 'defending');

    let isMyTurn = false;

    // Turn Description
    if (state.gameOver) {
        ui.turnIndicator.textContent = state.p1Health <= 0 ? "P2 Wins!" : "P1 Wins!";
        ui.btnRoll.disabled = true;
        // ui.btnRoll.textContent = "Game Over"; // Removed to keep image button
        return;
    }

    switch (state.turn) {
        case 'p1_attack':
            ui.turnIndicator.textContent = "P1 Attack";
            ui.p1Card.classList.add('active-turn');
            ui.p2Card.classList.add('defending');
            if (state.mode === 'local' || state.role === 'host') isMyTurn = true;
            break;
        case 'p2_defend':
            ui.turnIndicator.textContent = "P2 Defend";
            ui.p2Card.classList.add('active-turn'); // Defending roll is active action
            if (state.mode === 'local' || state.role === 'guest') isMyTurn = true;
            break;
        case 'p2_attack':
            ui.turnIndicator.textContent = "P2 Attack";
            ui.p2Card.classList.add('active-turn');
            ui.p1Card.classList.add('defending');
            if (state.mode === 'local' || state.role === 'guest') isMyTurn = true;
            break;
        case 'p1_defend':
            ui.turnIndicator.textContent = "P1 Defend";
            ui.p1Card.classList.add('active-turn');
            if (state.mode === 'local' || state.role === 'host') isMyTurn = true;
            break;
    }

    // Button State
    ui.btnRoll.disabled = !isMyTurn;
    ui.btnRoll.style.opacity = isMyTurn ? "1" : "0.5";
    ui.btnRoll.style.cursor = isMyTurn ? "pointer" : "not-allowed";
}

function handleRollAction() {
    unlockAudio();
    // Play sound
    playDiceSound();

    ui.btnRoll.disabled = true; // Disable button during animation

    const duration = 1100;
    const intervalTime = 50;
    const startTime = Date.now();

    const intervalId = setInterval(() => {
        const randomVal = Math.floor(Math.random() * 10) + 1;
        ui.diceValue.textContent = randomVal;

        if (Date.now() - startTime >= duration) {
            clearInterval(intervalId);
            const finalValue = Math.floor(Math.random() * 10) + 1;

            // Finalize
            sendData({ type: 'roll', value: finalValue });
            performRoll(finalValue, true);
        }
    }, intervalTime);
}

function performRoll(value, isMe) {
    // Animation/Display
    ui.diceValue.textContent = value;
    log(`${getCurrentPlayerName()} rolled ${value}!`);

    // Save roll
    if (state.turn === 'p1_attack') {
        state.p1Dice = value;
        setTimeout(() => advanceTurn(), 1000);
    } else if (state.turn === 'p2_defend') {
        state.p2Dice = value;
        setTimeout(() => {
            resolveCombat('p1'); // P1 was attacker
        }, 1000);
    } else if (state.turn === 'p2_attack') {
        state.p2Dice = value;
        setTimeout(() => advanceTurn(), 1000);
    } else if (state.turn === 'p1_defend') {
        state.p1Dice = value;
        setTimeout(() => {
            resolveCombat('p2'); // P2 was attacker
        }, 1000);
    }
}

function getCurrentPlayerName() {
    if (state.turn.startsWith('p1')) return "Player 1";
    return "Player 2";
}

function advanceTurn() {
    // Simple state machine transition
    if (state.turn === 'p1_attack') state.turn = 'p2_defend';
    else if (state.turn === 'p2_defend') state.turn = 'p2_attack'; // Should be resolved before this?
    // Wait, the order is: P1 Attack -> P2 Defend -> Calc -> P2 Attack -> P1 Defend -> Calc ->...
    // So after P2 Defend, we don't just switch, we calc.
    // The 'resolveCombat' function handles calculation and then switches to P2 Attack.

    else if (state.turn === 'p2_attack') state.turn = 'p1_defend';
    else if (state.turn === 'p1_defend') state.turn = 'p1_attack'; // After calc

    updateUI();
}

function resolveCombat(attacker) {
    // Logic: Damage = Attack - Defend
    let damage = 0;
    let attackerName = "";
    let defenderName = "";

    if (attacker === 'p1') {
        damage = Math.max(0, state.p1Dice - state.p2Dice);
        attackerName = "Player 1";
        defenderName = "Player 2";
        log(`Result: ${state.p1Dice} (ATK) vs ${state.p2Dice} (DEF). Damage: ${damage}`);

        // Animate Smash
        if (damage > 0) {
            animateSmash('p1');
            setTimeout(() => {
                applyDamage('p2', damage);
                showFloatingNumber('p2-card', damage);
                nextPhase('p2_attack');
            }, SMASH_DAMAGE_DELAY);
        } else {
            log("Blocked!");
            playBlockSound();
            showBlockSprite('p2');
            showFloatingNumber('p2-card', 0);
            setTimeout(() => nextPhase('p2_attack'), 1000);
        }
    } else {
        damage = Math.max(0, state.p2Dice - state.p1Dice);
        attackerName = "Player 2";
        defenderName = "Player 1";
        log(`Result: ${state.p2Dice} (ATK) vs ${state.p1Dice} (DEF). Damage: ${damage}`);

        // Animate Smash
        if (damage > 0) {
            animateSmash('p2');
            setTimeout(() => {
                applyDamage('p1', damage);
                showFloatingNumber('p1-card', damage);
                nextPhase('p1_attack');
            }, SMASH_DAMAGE_DELAY);
        } else {
            log("Blocked!");
            playBlockSound();
            showBlockSprite('p1');
            showFloatingNumber('p1-card', 0);
            setTimeout(() => nextPhase('p1_attack'), 1000);
        }
    }
}

function animateSmash(attacker) {
    playAttackSound(attacker);
    if (attacker === 'p1') {
        ui.p1Card.classList.add('smash-animation-p1');
        setTimeout(() => {
            ui.p2Card.classList.add('shake-animation');
            showAttackSprite('p1');
        }, 400); // Impact time
        setTimeout(() => {
            ui.p1Card.classList.remove('smash-animation-p1');
            ui.p2Card.classList.remove('shake-animation');
        }, 1000);
    } else {
        ui.p2Card.classList.add('smash-animation-p2');
        setTimeout(() => {
            ui.p1Card.classList.add('shake-animation');
            showAttackSprite('p2');
        }, 400);
        setTimeout(() => {
            ui.p2Card.classList.remove('smash-animation-p2');
            ui.p1Card.classList.remove('shake-animation');
        }, 1000);
    }
}

function applyDamage(target, amount) {
    if (target === 'p1') {
        state.p1Health = Math.max(0, state.p1Health - amount);
    } else {
        state.p2Health = Math.max(0, state.p2Health - amount);
    }

    updateUI();
    checkGameOver();
}

function nextPhase(nextTurn) {
    if (state.gameOver) return;
    state.turn = nextTurn;
    updateUI();
}

function checkGameOver() {
    if (state.p1Health <= 0 || state.p2Health <= 0) {
        state.gameOver = true;
        updateUI();
    }
}

function log(msg) {
    ui.log.textContent = msg;
    console.log(msg);
}



// Start
init();
