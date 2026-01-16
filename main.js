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
    conn: null,
    isMusicPlaying: false
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
    p1HealthBar: document.getElementById('p1-health'),
    p2HealthBar: document.getElementById('p2-health'),
    p1HealthText: document.getElementById('p1-hp-text'),
    p2HealthText: document.getElementById('p2-hp-text'),
    p1Card: document.getElementById('p1-card'),
    p2Card: document.getElementById('p2-card'),
    turnIndicator: document.getElementById('turn-indicator'),
    diceValue: document.getElementById('dice-value'),
    btnRoll: document.getElementById('btn-roll'),
    log: document.getElementById('game-log'),
    bgm: document.getElementById('bgm'),
    sfxSmash: document.getElementById('sfx-smash'), // Will use WebAudio fallback if fails
    musicToggle: document.getElementById('btn-music-toggle')
};

// --- Audio Context for Procedural Sound ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSmashSound() {
    // Try playing file first
    const played = ui.sfxSmash.play().catch(() => false);
    if (!played) {
        // Fallback: Synthesized noise
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        gain.gain.setValueAtTime(1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
    }
}

// --- Initialization ---
function init() {
    ui.btnLocal.addEventListener('click', () => startGame('local'));
    ui.btnOnline.addEventListener('click', () => startOnlineHost());
    ui.btnRoll.addEventListener('click', handleRollAction);
    ui.musicToggle.addEventListener('click', toggleMusic);

    // Initial music state
    ui.bgm.volume = 0.5;
    ui.musicToggle.classList.add('muted');

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
    // Removed automatic BGM play
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
        ui.turnIndicator.textContent = state.p1Health <= 0 ? "Player 2 Wins!" : "Player 1 Wins!";
        ui.btnRoll.disabled = true;
        ui.btnRoll.textContent = "Game Over";
        return;
    }

    switch (state.turn) {
        case 'p1_attack':
            ui.turnIndicator.textContent = "Player 1 Attack Phase";
            ui.p1Card.classList.add('active-turn');
            ui.p2Card.classList.add('defending');
            if (state.mode === 'local' || state.role === 'host') isMyTurn = true;
            break;
        case 'p2_defend':
            ui.turnIndicator.textContent = "Player 2 Defend Phase";
            ui.p2Card.classList.add('active-turn'); // Defending roll is active action
            if (state.mode === 'local' || state.role === 'guest') isMyTurn = true;
            break;
        case 'p2_attack':
            ui.turnIndicator.textContent = "Player 2 Attack Phase";
            ui.p2Card.classList.add('active-turn');
            ui.p1Card.classList.add('defending');
            if (state.mode === 'local' || state.role === 'guest') isMyTurn = true;
            break;
        case 'p1_defend':
            ui.turnIndicator.textContent = "Player 1 Defend Phase";
            ui.p1Card.classList.add('active-turn');
            if (state.mode === 'local' || state.role === 'host') isMyTurn = true;
            break;
    }

    // Button State
    ui.btnRoll.disabled = !isMyTurn;

    if (!isMyTurn && state.mode === 'online') {
        ui.btnRoll.textContent = "Waiting for Opponent...";
    } else {
        ui.btnRoll.textContent = "Roll Dice (1-10)";
    }

    if (state.mode === 'local') {
        ui.btnRoll.textContent = "Roll Dice"; // Local uses same button
    }
}

function handleRollAction() {
    const value = Math.floor(Math.random() * 10) + 1;
    sendData({ type: 'roll', value });
    performRoll(value, true);
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
                nextPhase('p2_attack');
            }, SMASH_DAMAGE_DELAY);
        } else {
            log("Blocked!");
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
                nextPhase('p1_attack');
            }, SMASH_DAMAGE_DELAY);
        } else {
            log("Blocked!");
            setTimeout(() => nextPhase('p1_attack'), 1000);
        }
    }
}

function animateSmash(attacker) {
    playSmashSound();
    if (attacker === 'p1') {
        ui.p1Card.classList.add('smash-animation-p1');
        setTimeout(() => {
            ui.p2Card.classList.add('shake-animation');
        }, 400); // Impact time
        setTimeout(() => {
            ui.p1Card.classList.remove('smash-animation-p1');
            ui.p2Card.classList.remove('shake-animation');
        }, 1000);
    } else {
        ui.p2Card.classList.add('smash-animation-p2');
        setTimeout(() => {
            ui.p1Card.classList.add('shake-animation');
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
        ui.p1Card.classList.add('shake-animation'); // Extra visual
    } else {
        state.p2Health = Math.max(0, state.p2Health - amount);
        ui.p2Card.classList.add('shake-animation');
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

function toggleMusic() {
    state.isMusicPlaying = !state.isMusicPlaying;

    if (state.isMusicPlaying) {
        ui.bgm.play().then(() => {
            ui.musicToggle.classList.remove('muted');
        }).catch(err => {
            console.error("Audio play failed:", err);
            state.isMusicPlaying = false;
        });
    } else {
        ui.bgm.pause();
        ui.musicToggle.classList.add('muted');
    }
}

// Start
init();
