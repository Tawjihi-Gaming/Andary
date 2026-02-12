// ============================
// Kalak Trivia — SignalR Test Client
// ============================

const BACKEND_URL = "http://localhost:5049/gamehub";

// --- State ---
let currentRoomId = null;
let currentQuestion = null;
let isRoomCreator = false;
let playerCount = 0;

// --- DOM helpers ---
const $ = (id) => document.getElementById(id);

const statusEl = $("connection-status");
const connIdEl = $("my-connection-id");
const logEl = $("log");
const lobbySection = $("lobby-section");
const roomSection = $("room-section");
const gameSection = $("game-section");
const roomIdDisplay = $("room-id-display");
const roomCodeDisplay = $("room-code-display");
const playersUl = $("players-ul");
const noPlayersEl = $("no-players");
const fakeAnswerPhase = $("fake-answer-phase");
const chooseAnswerPhase = $("choose-answer-phase");
const resultsPhase = $("results-phase");
const gameOverPhase = $("game-over-phase");
const creatorJoinSection = $("creator-join-section");

// --- Logging ---
function log(msg, type = "") {
    const line = document.createElement("div");
    if (type) line.className = `log-${type}`;
    line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logEl.prepend(line);
    console.log("[Kalak]", msg);
}

$("btn-clear-log").addEventListener("click", () => {
    logEl.innerHTML = "";
});

// ============================
//  SignalR Connection
// ============================

const connection = new signalR.HubConnectionBuilder()
    .withUrl(BACKEND_URL)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information)
    .build();

async function startConnection() {
    try {
        await connection.start();
        statusEl.textContent = "Connected ✅";
        statusEl.style.color = "#0f0";
        connIdEl.textContent = `(${connection.connectionId})`;
        log("Connected to backend.", "success");
    } catch (err) {
        statusEl.textContent = "Disconnected ❌";
        statusEl.style.color = "#f00";
        log("Connection failed: " + err, "error");
        setTimeout(startConnection, 3000);
    }
}

connection.onclose(() => {
    statusEl.textContent = "Disconnected ❌";
    statusEl.style.color = "#f00";
    connIdEl.textContent = "";
    log("Disconnected.", "error");
});

connection.onreconnecting(() => {
    statusEl.textContent = "Reconnecting… 🔄";
    statusEl.style.color = "#ff0";
    log("Reconnecting…", "info");
});

connection.onreconnected(() => {
    statusEl.textContent = "Connected ✅";
    statusEl.style.color = "#0f0";
    connIdEl.textContent = `(${connection.connectionId})`;
    log("Reconnected!", "success");
});

// ============================
//  SERVER → CLIENT handlers
// ============================

connection.on("RoomCreated", (roomId, roomCode) => {
    currentRoomId = roomId;
    isRoomCreator = true;
    playerCount = 0;
    log(`Room created! ID: ${roomId} | Code: ${roomCode || "N/A"}`, "success");
    showRoomSection(roomId, roomCode);
    // Show the "join as player" section for the creator
    creatorJoinSection.style.display = "block";
});

connection.on("JoinFailed", () => {
    log("❌ Failed to join room. Check Room ID or game may have started.", "error");
    alert("Could not join room. Check the Room ID or the game may have already started.");
});

connection.on("PlayerJoined", (name) => {
    log(`👤 Player joined: ${name}`, "info");
    addPlayerToList(name);
});

connection.on("GameStarted", (gameState) => {
    log(`🎮 Round ${gameState.currentQuestionIndex + 1}/${gameState.totalQuestions} — Phase: CollectingAns`, "info");
    log(`   Question: "${gameState.currentQuestion.text}"`, "info");
    currentQuestion = gameState.currentQuestion;
    showFakeAnswerPhase(gameState);
});

connection.on("ShowChoices", (choices) => {
    log("🔀 Choices received: " + JSON.stringify(choices), "info");
    showChooseAnswerPhase(choices);
});

connection.on("RoundEnded", (gameState) => {
    log("📊 Round ended! Scores:", "info");
    gameState.players.forEach(p => log(`   ${p.name}: ${p.xp} XP`));
    showResultsPhase(gameState);
});

connection.on("GameEnded", (gameState) => {
    log("🏆 Game over! Final scores:", "success");
    gameState.players.forEach(p => log(`   ${p.name}: ${p.xp} XP`));
    showGameOverPhase(gameState);
});

// ============================
//  CLIENT → SERVER actions
// ============================

// --- Create Room ---
$("btn-create-room").addEventListener("click", async () => {
    const isPrivate = $("is-private").checked;
    const numQ = parseInt($("num-questions").value) || 3;
    log(`Creating room (private=${isPrivate}, questions=${numQ})…`);
    try {
        await connection.invoke("CreateRoom", isPrivate, numQ);
    } catch (err) {
        log("Error creating room: " + err, "error");
    }
});

// --- Join Room ---
$("btn-join-room").addEventListener("click", async () => {
    const roomId = $("room-id-input").value.trim();
    const name = $("player-name-input").value.trim();
    if (!roomId || !name) {
        alert("Enter both Room ID and your Name.");
        return;
    }
    log(`Joining room ${roomId} as "${name}"…`);
    try {
        await connection.invoke("JoinRoom", roomId, name);
        currentRoomId = roomId;
        isRoomCreator = false;
        showRoomSection(roomId, null);
    } catch (err) {
        log("Error joining room: " + err, "error");
    }
});

// --- Creator joins their own room ---
$("btn-creator-join").addEventListener("click", async () => {
    const name = $("creator-name-input").value.trim();
    if (!name) {
        alert("Enter your name!");
        return;
    }
    log(`Creator joining room ${currentRoomId} as "${name}"…`);
    try {
        await connection.invoke("JoinRoom", currentRoomId, name);
        creatorJoinSection.style.display = "none";
        log(`Joined own room as "${name}"`, "success");
    } catch (err) {
        log("Error joining own room: " + err, "error");
    }
});

// --- Copy Room ID ---
$("btn-copy-room-id").addEventListener("click", () => {
    const roomId = roomIdDisplay.textContent;
    navigator.clipboard.writeText(roomId).then(() => {
        log("Room ID copied to clipboard!", "success");
        $("btn-copy-room-id").textContent = "✅";
        setTimeout(() => $("btn-copy-room-id").textContent = "📋", 1500);
    }).catch(() => {
        // Fallback: select the text
        const range = document.createRange();
        range.selectNodeContents(roomIdDisplay);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
        log("Select and copy the Room ID manually", "info");
    });
});

// --- Start Game ---
$("btn-start-game").addEventListener("click", async () => {
    if (!currentRoomId) return;
    if (playerCount < 2) {
        log("⚠️ Need at least 2 players to start!", "error");
        alert("You need at least 2 players to start the game. Open another browser tab, join the same room with a different name.");
        return;
    }
    log("Starting game…");
    try {
        await connection.invoke("StartGame", currentRoomId);
    } catch (err) {
        log("Error starting game: " + err, "error");
    }
});

// --- Submit Fake Answer ---
$("btn-submit-fake").addEventListener("click", async () => {
    const fake = $("fake-answer-input").value.trim();
    if (!fake) {
        alert("Enter a fake answer!");
        return;
    }
    log(`Submitting fake answer: "${fake}"`);
    try {
        await connection.invoke("SubmitFakeAnswer", currentRoomId, fake);
        $("btn-submit-fake").disabled = true;
        $("btn-submit-fake").textContent = "Submitted ✓";
        $("fake-waiting").style.display = "block";
        log("Fake answer submitted!", "success");
    } catch (err) {
        log("Error submitting fake: " + err, "error");
    }
});

// --- Next Round ---
$("btn-next-round").addEventListener("click", async () => {
    log("Requesting next round…");
    try {
        await connection.invoke("NextRound", currentRoomId);
    } catch (err) {
        log("Error requesting next round: " + err, "error");
    }
});

// --- Back to Lobby ---
$("btn-back-lobby").addEventListener("click", () => {
    resetToLobby();
});

$("btn-back-to-lobby").addEventListener("click", () => {
    resetToLobby();
});

// ============================
//  UI State Management
// ============================

function resetToLobby() {
    currentRoomId = null;
    currentQuestion = null;
    isRoomCreator = false;
    playerCount = 0;
    playersUl.innerHTML = "";
    noPlayersEl.style.display = "block";
    hideAll();
    lobbySection.style.display = "block";
    log("Returned to lobby.");
}

function hideAll() {
    lobbySection.style.display = "none";
    roomSection.style.display = "none";
    gameSection.style.display = "none";
    fakeAnswerPhase.style.display = "none";
    chooseAnswerPhase.style.display = "none";
    resultsPhase.style.display = "none";
    gameOverPhase.style.display = "none";
    creatorJoinSection.style.display = "none";
}

function showRoomSection(roomId, roomCode) {
    hideAll();
    roomSection.style.display = "block";
    roomIdDisplay.textContent = roomId;
    roomCodeDisplay.textContent = roomCode || "N/A";
}

function addPlayerToList(name) {
    playerCount++;
    noPlayersEl.style.display = "none";
    const li = document.createElement("li");
    li.textContent = name;
    playersUl.appendChild(li);
}

function showFakeAnswerPhase(gameState) {
    hideAll();
    gameSection.style.display = "block";
    fakeAnswerPhase.style.display = "block";

    $("round-number").textContent = gameState.currentQuestionIndex + 1;
    $("total-rounds").textContent = gameState.totalQuestions;
    $("question-text").textContent = gameState.currentQuestion.text;

    // Reset input
    $("fake-answer-input").value = "";
    $("btn-submit-fake").disabled = false;
    $("btn-submit-fake").textContent = "Submit";
    $("fake-waiting").style.display = "none";
}

function showChooseAnswerPhase(choices) {
    fakeAnswerPhase.style.display = "none";
    chooseAnswerPhase.style.display = "block";
    resultsPhase.style.display = "none";

    // Copy round info from previous phase
    if (currentQuestion) {
        $("round-number-2").textContent = $("round-number").textContent;
        $("total-rounds-2").textContent = $("total-rounds").textContent;
        $("question-text-2").textContent = currentQuestion.text;
    }

    const container = $("choices-container");
    container.innerHTML = "";
    $("choose-waiting").style.display = "none";

    choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.textContent = choice;
        btn.addEventListener("click", async () => {
            // Disable all choices
            container.querySelectorAll(".choice-btn").forEach(b => {
                b.disabled = true;
                b.classList.remove("selected");
            });
            btn.classList.add("selected");
            $("choose-waiting").style.display = "block";
            log(`Chose answer: "${choice}"`);
            try {
                await connection.invoke("ChooseAnswer", currentRoomId, choice);
                log("Answer submitted!", "success");
            } catch (err) {
                log("Error choosing answer: " + err, "error");
            }
        });
        container.appendChild(btn);
    });
}

function showResultsPhase(gameState) {
    fakeAnswerPhase.style.display = "none";
    chooseAnswerPhase.style.display = "none";
    resultsPhase.style.display = "block";
    gameOverPhase.style.display = "none";

    $("correct-answer-display").textContent = gameState.currentQuestion.correctAnswer;

    const tbody = $("scoreboard-body");
    tbody.innerHTML = "";
    const sorted = [...gameState.players].sort((a, b) => b.xp - a.xp);
    sorted.forEach((p) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${p.name}</td><td>${p.xp}</td>`;
        tbody.appendChild(tr);
    });
}

function showGameOverPhase(gameState) {
    hideAll();
    gameSection.style.display = "block";
    gameOverPhase.style.display = "block";

    const tbody = $("final-scoreboard-body");
    tbody.innerHTML = "";
    const sorted = [...gameState.players].sort((a, b) => b.xp - a.xp);
    sorted.forEach((p, idx) => {
        const tr = document.createElement("tr");
        const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`;
        tr.innerHTML = `<td>${medal}</td><td>${p.name}</td><td>${p.xp}</td>`;
        tbody.appendChild(tr);
    });
}

// ============================
//  Keyboard shortcuts
// ============================
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        // Submit fake answer if that phase is active
        if (fakeAnswerPhase.style.display !== "none" && !$("btn-submit-fake").disabled) {
            $("btn-submit-fake").click();
        }
    }
});

// ============================
//  Start!
// ============================
startConnection();
