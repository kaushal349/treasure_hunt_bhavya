// Puzzles and Configs are loaded from puzzles.txt via puzzle-loader.js

// --- State Management ---
let state = {
  teamId: '',
  teamName: '',
  p1: '',
  p2: '',
  email: '',
  phone: '',
  phase: 1,
  round: 1,
  totalScore: 0,
  phaseMarks: { 1: 0, 2: 0, 3: 0 },
  portfolio: { returns: 0, risk: 0, cards: [] },
  eliminated: false,
  eliminationReason: '',
  completed: false,
  pendingCardPick: false
};

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Parse puzzle data from puzzles-data.js (auto-generated from puzzles.txt)
  loadPuzzles();

  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  if (mode === 'admin') {
    renderAdminAuth();
  } else if (mode === 'register') {
    renderRegister();
  } else {
    // Try to recover session
    const activeTeamId = localStorage.getItem('activeTeamId');
    if (activeTeamId && localStorage.getItem(`team_${activeTeamId}`)) {
      state = JSON.parse(localStorage.getItem(`team_${activeTeamId}`));
      renderGameLoop();
    } else {
      renderMainLanding();
    }
  }
});

function saveState() {
  if (state.teamId) {
    localStorage.setItem(`team_${state.teamId}`, JSON.stringify(state));
    localStorage.setItem('activeTeamId', state.teamId);
    
    // Also save to server via API
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state)
    }).catch(err => console.error('Server save failed:', err));
  }
}

// --- UI Rendering Builders ---
const appContainer = document.getElementById('app');

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type}`;
  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 3000);
}

// --- Views ---

function renderMainLanding() {
  appContainer.innerHTML = `
    <div class="glass-panel text-center">
      <div style="font-size: 3rem; margin-bottom: var(--space-4);">🏆</div>
      <h1 class="gradient-text">Digital Finance<br>Treasure Hunt</h1>
      <p style="max-width: 360px; margin-left: auto; margin-right: auto;">
        Test your finance knowledge across 3 challenging phases. 
        Only the sharpest teams survive.
      </p>
      <div style="display:flex; gap: var(--space-2); justify-content:center; flex-wrap:wrap; margin-bottom: var(--space-6);">
        <span class="badge">40 Rounds</span>
        <span class="badge">3 Phases</span>
        <span class="badge">Card Strategy</span>
      </div>
      <button class="btn-primary" onclick="window.location.href='?mode=register'">
        Register Your Team →
      </button>
    </div>
  `;
}

function renderRegister() {
  appContainer.innerHTML = `
    <div class="glass-panel" style="max-width: 560px;">
      <div style="text-align:center; margin-bottom: var(--space-6);">
        <span class="badge">Step 1 of 1</span>
        <h2 style="margin-bottom: var(--space-2);">Team Registration</h2>
        <p style="margin-bottom: 0;">Fill in all fields to begin Phase 1.</p>
      </div>
      
      <div style="margin-bottom: var(--space-2);">
        <label style="display:block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: var(--space-1); text-transform:uppercase; letter-spacing:1px;">Team Name <span style="color:var(--brand-danger)">*</span></label>
        <input type="text" id="regTeamName" placeholder="e.g. The Wolves" />
      </div>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
        <div>
          <label style="display:block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: var(--space-1); text-transform:uppercase; letter-spacing:1px;">Participant 1 <span style="color:var(--brand-danger)">*</span></label>
          <input type="text" id="regP1" placeholder="Full Name" />
        </div>
        <div>
          <label style="display:block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: var(--space-1); text-transform:uppercase; letter-spacing:1px;">Participant 2 <span style="color:var(--brand-danger)">*</span></label>
          <input type="text" id="regP2" placeholder="Full Name" />
        </div>
      </div>
      <div style="margin-top: var(--space-1);">
        <label style="display:block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: var(--space-1); text-transform:uppercase; letter-spacing:1px;">Email <span style="color:var(--brand-danger)">*</span></label>
        <input type="text" id="regEmail" placeholder="team@email.com" />
      </div>
      <div>
        <label style="display:block; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: var(--space-1); text-transform:uppercase; letter-spacing:1px;">Phone <span style="color:var(--brand-danger)">*</span></label>
        <input type="text" id="regPhone" placeholder="+91 XXXXX XXXXX" />
      </div>
      
      <button class="btn-primary" id="startHuntBtn">Begin the Hunt →</button>
    </div>
  `;

  document.getElementById('startHuntBtn').addEventListener('click', () => {
    const tName = document.getElementById('regTeamName').value.trim();
    const p1 = document.getElementById('regP1').value.trim();
    const p2 = document.getElementById('regP2').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const phone = document.getElementById('regPhone').value.trim();

    if(!tName || !p1 || !p2 || !email || !phone) {
      return showToast("All fields are mandatory!", "error");
    }

    // Initialize State
    state.teamId = Date.now().toString(); // unique ID
    state.teamName = tName;
    state.p1 = p1;
    state.p2 = p2;
    state.email = email;
    state.phone = phone;
    state.phase = 1;
    state.round = 1;
    
    saveState();
    showToast(`Welcome Team ${tName}! Phase 1 Starting.`);
    renderGameLoop();
  });
}

function renderAdminAuth() {
  appContainer.innerHTML = `
    <div class="glass-panel" style="max-width: 400px; text-align:center;">
      <span class="badge">Security Lock</span>
      <h2 style="margin-bottom: var(--space-4);">Admin Access</h2>
      <p style="margin-bottom: var(--space-6);">Please enter the access key to unlock the Event Control Panel.</p>
      
      <input type="password" id="adminPassword" placeholder="Enter Password..." style="width:100%; padding:0.75rem 1rem; border-radius:var(--radius-md); border:1px solid var(--border-default); background:var(--bg-base); color:var(--text-primary); font-family:var(--font-sans); margin-bottom:var(--space-4); outline:none; text-align:center;" />
      
      <button class="btn-primary" id="unlockBtn" style="width:100%;">Unlock Dashboard</button>
      <div id="authError" style="color:var(--brand-danger); font-size:0.82rem; margin-top:var(--space-3); height:15px;"></div>
    </div>
  `;

  const input = document.getElementById('adminPassword');
  input.focus();

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('unlockBtn').click();
    }
  });

  document.getElementById('unlockBtn').addEventListener('click', () => {
    const pwd = input.value;
    if (pwd === 'Summer$26') {
      state.adminSecret = pwd; // Cache it for API calls
      showToast('Unlock Successful!', 'success');
      renderAdmin();
    } else {
      document.getElementById('authError').textContent = '✗ Invalid Password. Try again.';
      input.value = '';
      input.focus();
    }
  });
}

async function renderAdmin() {
  let teamsListHTML = '';
  let allTeams = [];
  
  try {
    const response = await fetch('/api/teams', {
      headers: { 'X-Admin-Key': state.adminSecret || 'Summer$26' }
    });
    allTeams = await response.json();
  } catch (err) {
    console.warn('Could not fetch teams from server, falling back to localStorage:', err);
    // Fallback to localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('team_')) {
        allTeams.push(JSON.parse(localStorage.getItem(key)));
      }
    }
  }

  if (allTeams.length > 0) {
    teamsListHTML = `<div style="margin-top: var(--space-8); border-top: 1px solid var(--border-subtle); padding-top: var(--space-6);">
      <h3 style="text-align:left; margin-bottom: var(--space-4);">📋 Registered Teams (${allTeams.length})</h3>`;
    allTeams.forEach(t => {
      const statusColor = t.eliminated ? 'var(--brand-danger)' : (t.completed ? 'var(--brand-primary)' : 'var(--brand-success)');
      const statusText = t.eliminated ? 'Eliminated' : (t.completed ? 'Completed' : 'Active');
      teamsListHTML += `<div class="team-item">
        <div style="text-align:left;">
          <strong style="font-size: 0.95rem;">${t.teamName}</strong><br/>
          <small style="color:var(--text-muted);">${t.p1} · ${t.p2}</small><br/>
          <small style="color:var(--text-muted);">📧 ${t.email} · 📞 ${t.phone}</small><br/>
          <small style="color:var(--text-muted);">Phase ${t.phase} · Marks: P1(${t.phaseMarks[1]||0}) P2(${t.phaseMarks[2]||0}) P3(${t.phaseMarks[3]||0})</small>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:var(--space-2);">
          <div style="font-weight:700; font-size:0.75rem; padding:0.25rem 0.6rem; border-radius:var(--radius-full); background:${statusColor}15; color:${statusColor}; border:1px solid ${statusColor}30; text-transform:uppercase; letter-spacing:0.5px;">${statusText}</div>
          ${t._filename ? `<button class="btn-outline delete-btn" style="border-color:var(--brand-danger); color:var(--brand-danger);" data-filename="${t._filename}">Delete</button>` : ''}
        </div>
      </div>`;
    });
    teamsListHTML += `</div>`;
  }

  appContainer.innerHTML = `
    <div class="glass-panel" style="max-width: 600px;">
      <div style="text-align:center; margin-bottom: var(--space-6);">
        <span class="badge">Admin</span>
        <h2 style="margin-bottom: var(--space-2);">Event Control Panel</h2>
        <p style="margin-bottom:0;">Generate a QR code for team registration.</p>
      </div>
      
      <button class="btn-primary" id="addTeamBtn">Generate Registration QR Code</button>

      <div id="qrContainer" style="text-align:center; display:none; margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--border-subtle);">
        <h3 id="qrTeamName">Scan to Register</h3>
        <div id="qrcode" class="qr-box"></div>
        <a id="qrLink" href="#" target="_blank" class="btn-secondary" style="display:inline-block; margin-top:var(--space-4); text-decoration:none; width:auto; padding: 0.5rem 1.5rem;">Open Registration Link</a>
      </div>

      ${teamsListHTML}
      
      <button class="btn-secondary" style="margin-top: var(--space-8); color: var(--brand-danger); border-color: rgba(239,68,68,0.3);" onclick="if(confirm('This will erase ALL team data. Continue?')){localStorage.clear(); window.location.reload();}">⚠ Reset All Data</button>
    </div>
  `;

  // Bind Delete buttons
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const filename = e.target.dataset.filename;
      if (confirm(`Are you sure you want to delete file "${filename}"?`)) {
        try {
          await fetch(`/api/delete/${filename}`, { 
            method: 'DELETE',
            headers: { 'X-Admin-Key': state.adminSecret || 'Summer$26' }
          });
          showToast('Entry deleted successfully.', 'success');
          renderAdmin(); // refresh
        } catch (err) {
          showToast('Failed to delete entry.', 'error');
        }
      }
    });
  });

  document.getElementById('addTeamBtn').addEventListener('click', () => {
    const baseUrl = window.location.href.split('?')[0];
    const regUrl = `${baseUrl}?mode=register`;
    
    document.getElementById('qrContainer').style.display = 'block';
    document.getElementById('qrcode').innerHTML = '';
    
    // eslint-disable-next-line no-undef
    new QRCode(document.getElementById('qrcode'), {
      text: regUrl,
      width: 200,
      height: 200
    });
    
    document.getElementById('qrLink').href = regUrl;
    showToast('QR Code Generated!');
  });
}

function handlePhaseTransition() {
  if (state.phase === 4) return;
  
  // Triggers end of phase Card pick
  if(!state.pendingCardPick) {
    state.pendingCardPick = true;
    saveState();
    return renderCardSelection();
  }
}

function renderGameLoop() {
  if (state.eliminated) return renderEliminated();
  if (state.completed) return renderCompleted();
  if (state.pendingCardPick) return renderCardSelection();
  if (state.round > PHASES[state.phase].maxRounds) return handlePhaseTransition();

  const currentTask = GAME_DATA[state.phase][state.round];
  const progress = ((state.round - 1) / PHASES[state.phase].maxRounds) * 100;
  const phaseNames = { 1: 'Logo Fragment', 2: 'Finance Quiz', 3: 'Finance Rebus', 4: 'Final Clue' };
  
  let content = `
    <div class="team-header">
      <span class="team-name-label">🏴‍☠️ ${state.teamName}</span>
      <button class="btn-outline" id="logoutBtn">Logout</button>
    </div>
    <div class="stats-bar" style="flex-wrap:wrap;">
      <div class="stat-item"><span class="stat-label">Phase</span><span class="stat-value">${state.phase}</span></div>
      <div class="stat-item"><span class="stat-label">Round</span><span class="stat-value">${state.round}/${PHASES[state.phase].maxRounds}</span></div>
      <div class="stat-item"><span class="stat-label">Score</span><span class="stat-value">${state.phaseMarks[state.phase]}</span></div>
    </div>
    <div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="glass-panel">
      <span class="badge">${phaseNames[state.phase] || 'Phase ' + state.phase} · Round ${state.round}</span>
      <h2>${currentTask.question}</h2>
      ${currentTask.image ? (() => {
        const imagePath = currentTask.image.startsWith('/') || currentTask.image.startsWith('../') || currentTask.image.startsWith('http') ? currentTask.image : `assets/${currentTask.image}`;
        return `<div class="${state.phase === 1 ? 'logo-fragment-container' : ''}" style="text-align:center; margin: var(--space-4) 0;">
          <img src="${imagePath}" class="${state.phase === 1 ? 'logo-fragment-img' : ''}" style="${state.phase !== 1 ? 'width:100%; max-width:300px; border-radius:var(--radius-md); border: 1px solid var(--border-subtle);' : ''}" />
        </div>`;
      })() : ''}
  `;

  if (currentTask.type === 'puzzle' || currentTask.type === 'rebus' || currentTask.type === 'dare') {
    if (currentTask.type === 'rebus') {
      content += `<div class="rebus-emoji">${currentTask.question}</div><h2 style="font-size:1.1rem; color:var(--text-secondary);">Guess the finance term!</h2>`;
    }
    content += `
      <input type="text" id="answerInput" placeholder="Type your answer..." />
      <button class="btn-primary" id="submitAnsBtn">Submit Answer</button>
    `;
  } else if (currentTask.type === 'quiz') {
    content += `<div class="quiz-options">`;
    
    // Check if we need to shuffle options for this round
    if (!state.currentOptions || state.currentOptions.round !== state.round) {
      state.currentOptions = {
        round: state.round,
        options: shuffleArray(currentTask.options)
      };
      saveState();
    }
    
    state.currentOptions.options.forEach(opt => {
      content += `<button class="quiz-option" data-ans="${opt}">${opt}</button>`;
    });
    content += `</div>`;
  } else if (currentTask.type === 'final') {
    content += `<p style="font-size: 1.05rem; color: var(--brand-success); margin-top: var(--space-6);">🎯 Run to the physical location to claim your prize!</p>`;
    content += `<button class="btn-primary" id="finishEventBtn">Complete Event</button>`;
  }

  content += `</div>`;
  appContainer.innerHTML = content;

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('activeTeamId');
    window.location.href = window.location.pathname;
  });

  // Bind Events
  if (currentTask.type === 'quiz') {
    document.querySelectorAll('.quiz-option').forEach(btn => {
      btn.addEventListener('click', (e) => handleAnswer(e.target.dataset.ans, currentTask.answer));
    });
  } else if (currentTask.type === 'final') {
    document.getElementById('finishEventBtn').addEventListener('click', () => {
      state.completed = true;
      saveState();
      renderCompleted();
    });
  } else {
    document.getElementById('submitAnsBtn').addEventListener('click', () => {
      const val = document.getElementById('answerInput').value.trim();
      handleAnswer(val, currentTask.answer);
    });
  }
}

function handleAnswer(given, correct) {
  const isCorrect = given.toLowerCase().includes(correct.toLowerCase()) || given.toLowerCase() === correct.toLowerCase();
  
  if (isCorrect) {
    state.phaseMarks[state.phase] = (state.phaseMarks[state.phase] || 0) + 1;
    state.totalScore++;
    showToast('✓ Correct! +1 Mark', 'success');
  } else {
    // In strict testing "includes" avoids penalizing minor spelling, but let's keep it exact
    if(given.toLowerCase() === correct.toLowerCase()){
      // Re-affirming identical matches
    } else {
      showToast(`✗ Incorrect — Answer: ${correct}`, 'error');
    }
  }
  
  state.round++;
  saveState();
  
  // Instead of waiting blindly, just call render loop, which will handle phase transition
  setTimeout(renderGameLoop, 1000);
}


function renderCardSelection() {
  const currentDeck = PHASE_DECKS[state.phase];
  
  let content = `
    <div class="glass-panel text-center">
      <div style="font-size: 2.5rem; margin-bottom: var(--space-4);">🃏</div>
      <h2 style="margin-bottom: var(--space-2);">Portfolio Selection</h2>
      <p>Phase ${state.phase} complete! Choose an asset card. Each card adds a <strong style="color:var(--text-primary)">+3 Bonus</strong> plus its Return value to your score.</p>
      
      <div class="cards-grid">
  `;

  currentDeck.forEach((card, idx) => {
    content += `
      <div class="finance-card" data-idx="${idx}">
        <div style="font-size: 2rem;">${card.icon}</div>
        <h4>${card.name}</h4>
        <div class="stats">
          <span style="color:var(--brand-success)">Return: +${card.return}</span>
          <span style="color:var(--brand-danger)">Risk: ${card.risk}</span>
        </div>
      </div>
    `;
  });

  content += `</div><button class="btn-primary" id="confirmCardBtn" style="display:none;">Confirm Selection →</button></div>`;
  appContainer.innerHTML = content;

  let selectedIdx = null;

  document.querySelectorAll('.finance-card').forEach(c => {
    c.addEventListener('click', (e) => {
      document.querySelectorAll('.finance-card').forEach(el => el.classList.remove('selected'));
      const cardEl = e.currentTarget;
      cardEl.classList.add('selected');
      selectedIdx = cardEl.dataset.idx;
      document.getElementById('confirmCardBtn').style.display = 'block';
    });
  });

  document.getElementById('confirmCardBtn').addEventListener('click', () => {
    if (selectedIdx === null) return;
    const card = currentDeck[selectedIdx];
    
    // Add 3 Card Bonus visually to their Phase Score later, but store properties now.
    state.portfolio.cards.push(card.name);
    state.portfolio.returns += card.return;
    state.portfolio.risk += card.risk;
    
    showToast(`${card.name} acquired.`);
    
    // Move to evaluating the phase entirely
    evaluateElimination(card);
  });
}

function evaluateElimination(chosenCard) {
  const phaseData = PHASES[state.phase];
  
  const rawPhaseMarks = state.phaseMarks[state.phase];
  const maxPhaseMarks = phaseData.maxRounds;
  const pctThresholdReq = phaseData.thresholdPct; // 0.5, 0.7, 0.9
  
  // Spec Formula:
  // Qualification Threshold = (Max Marks * threshold%) + Card Bonus(3) + Card Return
  // Total Phase Score = Raw Phase Marks + Card Bonus(3) + Card Return
  
  const thresholdRequirement = (maxPhaseMarks * pctThresholdReq) + 3 + chosenCard.return;
  const teamPhaseScore = rawPhaseMarks + 3 + chosenCard.return;

  if (teamPhaseScore < thresholdRequirement) {
    state.eliminated = true;
    state.eliminationReason = `Score ${teamPhaseScore} did not meet threshold ${thresholdRequirement}.<br/><br/>
    <small style="color:var(--text-muted);">Threshold: (${maxPhaseMarks} × ${pctThresholdReq * 100}%) + 3 bonus + ${chosenCard.return} return = ${thresholdRequirement}<br/>
    Your score: ${rawPhaseMarks} marks + 3 bonus + ${chosenCard.return} return = ${teamPhaseScore}</small>`;
    saveState();
    return renderEliminated();
  }

  // Not eliminated -> clear flag, proceed
  state.pendingCardPick = false;
  
  appContainer.innerHTML = `
    <div class="glass-panel text-center">
      <div style="font-size: 3rem; margin-bottom: var(--space-4);">🎉</div>
      <h1 class="gradient-text" style="font-size:2rem;">Phase ${state.phase} Cleared!</h1>
      <p>Congratulations, Team ${state.teamName}! Your score of <strong style="color:var(--text-primary)">${teamPhaseScore}</strong> exceeded the threshold of ${thresholdRequirement}.</p>
      
      <div class="stats-bar" style="justify-content:center; gap: var(--space-2); margin: var(--space-6) 0;">
        <div class="stat-item"><span class="stat-label">Raw Marks</span><span class="stat-value">${rawPhaseMarks}/${maxPhaseMarks}</span></div>
        <div class="stat-item"><span class="stat-label">Portfolio Return</span><span class="stat-value">${state.portfolio.returns}</span></div>
      </div>

      <button class="btn-primary" id="nextPhaseBtn">Continue to Phase ${state.phase + 1} →</button>
    </div>
  `;

  document.getElementById('nextPhaseBtn').addEventListener('click', () => {
    state.phase++;
    state.round = 1;
    saveState();
    renderGameLoop();
  });
}

function renderEliminated() {
  appContainer.innerHTML = `
    <div class="glass-panel text-center">
      <div style="font-size: 3rem; margin-bottom: var(--space-4);">💀</div>
      <h1 style="font-size: 2.2rem; font-weight: 900; color: var(--brand-danger); letter-spacing: 0.1em; margin-bottom: var(--space-4);">ELIMINATED</h1>
      <p style="font-size: 1rem; color:var(--text-primary);">Team ${state.teamName} has been knocked out of the Treasure Hunt.</p>
      <div style="background: rgba(239,68,68,0.06); border:1px solid rgba(239,68,68,0.2); padding: var(--space-6); border-radius:var(--radius-md); margin: var(--space-6) 0; text-align:left;">
        <h3 style="color:var(--brand-danger); margin: 0 0 var(--space-2) 0; font-size: 0.85rem; text-transform:uppercase; letter-spacing:1px;">Reason</h3>
        <p style="margin:0; color:var(--text-secondary); text-align:left;">${state.eliminationReason}</p>
      </div>
      <p style="color:var(--text-muted); font-size:0.85rem;">Better luck next time navigating the markets!</p>
      <button class="btn-secondary" style="margin-top: var(--space-4);" onclick="localStorage.removeItem('activeTeamId'); window.location.href='?mode=register';">Register New Team</button>
    </div>
  `;
}

function renderCompleted() {
  appContainer.innerHTML = `
    <div class="glass-panel text-center">
      <div style="font-size: 3rem; margin-bottom: var(--space-4);">🏆</div>
      <h1 class="gradient-text">Hunt Complete!</h1>
      <p>Team ${state.teamName}, you've conquered all phases of the Digital Finance Treasure Hunt!</p>
      <div class="stats-bar" style="justify-content:center; gap: var(--space-2); margin: var(--space-6) 0;">
        <div class="stat-item"><span class="stat-label">Final Score</span><span class="stat-value">${state.totalScore}</span></div>
        <div class="stat-item"><span class="stat-label">Portfolio</span><span class="stat-value">${state.portfolio.returns}</span></div>
      </div>
      <p style="color:var(--brand-primary-light); font-size:0.95rem; font-weight:600;">🎯 First team to reach the physical treasure wins! Ties broken by highest Portfolio Return.</p>
    </div>
  `;
}

// Global exposes
window.renderGameLoop = renderGameLoop;
