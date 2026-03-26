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
  let allTeams = [];
  
  try {
    const response = await fetch('/api/teams', {
      headers: { 'X-Admin-Key': state.adminSecret || 'Summer$26' }
    });
    allTeams = await response.json();
  } catch (err) {
    console.warn('Could not fetch teams from server:', err);
  }

  const totalTeams = allTeams.length;
  const activeTeams = allTeams.filter(t => !t.eliminated && !t.completed).length;
  const eliminatedTeams = allTeams.filter(t => t.eliminated).length;

  const phaseCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  allTeams.forEach(t => {
    if (t.completed) phaseCounts[4]++;
    else phaseCounts[t.phase]++;
  });

  appContainer.innerHTML = `
    <div class="glass-panel" style="max-width: 900px; width:95%;">
      <div style="text-align:center; margin-bottom: var(--space-6);">
        <span class="badge">Admin Hub</span>
        <h2 style="margin-bottom: var(--space-2);">Event Control Panel</h2>
      </div>

      <div class="stats-bar" style="margin-bottom: var(--space-6);">
        <div class="stat-item"><span class="stat-label">Total Teams</span><span class="stat-value">${totalTeams}</span></div>
        <div class="stat-item"><span class="stat-label">Active</span><span class="stat-value">${activeTeams}</span></div>
        <div class="stat-item"><span class="stat-label">Eliminated</span><span class="stat-value" style="color:var(--brand-danger)">${eliminatedTeams}</span></div>
      </div>

      <div class="admin-tabs" style="display:flex; gap:var(--space-2); border-bottom:1px solid var(--border-subtle); padding-bottom:var(--space-3); margin-bottom:var(--space-6);">
        <button class="tab-btn active" data-tab="tabTeams">👥 Teams & Overrides</button>
        <button class="tab-btn" data-tab="tabLeaderboard">🏆 Leaderboard & Analytics</button>
        <button class="tab-btn" data-tab="tabData">⚙️ Data & Sync</button>
      </div>

      <div id="tabTeams" class="tab-content active">
        <div style="margin-bottom: var(--space-4); display:flex; gap:var(--space-2);">
          <input type="text" id="adminSearch" placeholder="🔍 Search by Team Name, Email, or Phone..." style="flex:1; margin-bottom:0;" />
        </div>

        <h3>📋 Registered Teams (${allTeams.length})</h3>
        <div class="teams-scroll-list" id="teamsListContainer" style="max-height: 500px; overflow-y: auto; padding-right: 5px;">
          <!-- List injected via renderTeamsList -->
        </div>
      </div>

      <div id="tabLeaderboard" class="tab-content">
        <h3>📊 Phase Distribution</h3>
        <div class="analytics-chart" style="display:flex; flex-direction:column; gap:var(--space-3); background:var(--bg-elevated); padding:var(--space-5); border-radius:var(--radius-md); border:1px solid var(--border-subtle); margin-bottom:var(--space-6);">
          ${[1,2,3].map(p => {
            const count = phaseCounts[p];
            const pct = totalTeams > 0 ? (count / totalTeams) * 100 : 0;
            return `
              <div style="display:flex; align-items:center; gap:var(--space-3);">
                <div style="width:70px; font-size:0.85rem; font-weight:600;">Phase ${p}</div>
                <div style="flex:1; background:rgba(255,255,255,0.05); height:16px; border-radius:var(--radius-full); overflow:hidden;">
                  <div style="width:${pct}%; background:linear-gradient(90deg, var(--brand-primary), var(--brand-primary-soft)); height:100%;"></div>
                </div>
                <div style="width:30px; font-size:0.85rem; text-align:right;">${count}</div>
              </div>
            `;
          }).join('')}
          <div style="display:flex; align-items:center; gap:var(--space-3);">
            <div style="width:70px; font-size:0.85rem; font-weight:600;">Completed</div>
            <div style="flex:1; background:rgba(255,255,255,0.05); height:16px; border-radius:var(--radius-full); overflow:hidden;">
              <div style="width:${totalTeams > 0 ? (phaseCounts[4] / totalTeams) * 100 : 0}%; background:linear-gradient(90deg, var(--brand-success), #10B981); height:100%;"></div>
            </div>
            <div style="width:30px; font-size:0.85rem; text-align:right;">${phaseCounts[4]}</div>
          </div>
        </div>

        <h3>🏆 Live Ranking</h3>
        <div style="overflow-x:auto;">
          <table class="admin-table" style="width:100%; border-collapse:collapse; font-size:0.85rem; text-align:left;">
            <thead>
              <tr style="border-bottom:1px solid var(--border-default); color:var(--text-muted);">
                <th style="padding:var(--space-3);">Rank</th>
                <th style="padding:var(--space-3);">Team</th>
                <th style="padding:var(--space-3);">Phase</th>
                <th style="padding:var(--space-3);">Total Score</th>
                <th style="padding:var(--space-3);">Status</th>
              </tr>
            </thead>
            <tbody>
              ${(() => {
                const sorted = [...allTeams].sort((a,b) => {
                  if(a.phase !== b.phase) return b.phase - a.phase;
                  return b.totalScore - a.totalScore;
                });
                return sorted.map((t, index) => `
                  <tr style="border-bottom:1px solid var(--border-subtle);">
                    <td style="padding:var(--space-3); font-weight:700;">#${index+1}</td>
                    <td style="padding:var(--space-3);"><strong>${t.teamName}</strong></td>
                    <td style="padding:var(--space-3);">${t.completed ? 'End' : t.phase}</td>
                    <td style="padding:var(--space-3);">${t.totalScore}</td>
                    <td style="padding:var(--space-3);">${t.eliminated ? '💀' : (t.completed ? '🏆' : '🟢')}</td>
                  </tr>
                `).join('');
              })()}
            </tbody>
          </table>
        </div>
      </div>

      <div id="tabData" class="tab-content">
        <h3>💾 Cloud Persistence & Sync</h3>
        <p style="text-align:left;">Since Render.com files reset on redeployment, use these tools to backup and restore state.</p>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-4); margin-bottom:var(--space-6);">
          <div style="background:var(--bg-elevated); padding:var(--space-5); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <h4>📤 Export State</h4>
            <p style="text-align:left; font-size:0.8rem;">Download entire event state as a JSON file.</p>
            <button class="btn-secondary" id="exportBtn">Download JSON</button>
          </div>
          
          <div style="background:var(--bg-elevated); padding:var(--space-5); border-radius:var(--radius-md); border:1px solid var(--border-subtle);">
            <h4>📥 Import / Restore</h4>
            <p style="text-align:left; font-size:0.8rem;">Upload a previously exported JSON to restore teams.</p>
            <input type="file" id="importFile" style="display:none;" accept=".json" />
            <button class="btn-primary" onclick="document.getElementById('importFile').click()" style="margin-top:0;">Upload JSON</button>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding-top:var(--space-4);">
          <button class="btn-secondary" style="color: var(--brand-danger); border-color: rgba(239,68,68,0.3);" onclick="if(confirm('This will wipe local storage and reset UI. Continue?')){localStorage.clear(); window.location.reload();}">⚠ Reset Admin Panel</button>
        </div>
      </div>
    </div>
  `;

  function renderTeamsList(filterText = '') {
    const container = document.getElementById('teamsListContainer');
    if (!container) return;

    const filtered = allTeams.filter(t => {
      const searchStr = `${t.teamName || ''} ${t.email || ''} ${t.phone || ''}`.toLowerCase();
      return searchStr.includes(filterText.toLowerCase());
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p>No teams found matching search criteria.</p>';
      return;
    }

    container.innerHTML = filtered.map(t => {
      const statusColor = t.eliminated ? 'var(--brand-danger)' : (t.completed ? 'var(--brand-primary)' : 'var(--brand-success)');
      const statusText = t.eliminated ? 'Eliminated' : (t.completed ? 'Completed' : 'Active');
      return `
        <div class="team-item" style="flex-direction:column; align-items:stretch;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div style="text-align:left;">
              <strong style="font-size: 0.95rem;">${t.teamName}</strong><br/>
              <small style="color:var(--text-muted);">${t.p1} · ${t.p2}</small><br/>
              <small style="color:var(--text-muted);">📧 ${t.email} · 📞 ${t.phone}</small><br/>
              <small style="color:var(--text-muted);">Phase ${t.phase} · Quiz Marks: P1(${t.phaseMarks[1]||0}) P2(${t.phaseMarks[2]||0}) P3(${t.phaseMarks[3]||0})</small>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:var(--space-2);">
              <div style="font-weight:700; font-size:0.75rem; padding:0.25rem 0.6rem; border-radius:var(--radius-full); background:${statusColor}15; color:${statusColor}; border:1px solid ${statusColor}30;">${statusText}</div>
              <div style="display:flex; gap:var(--space-2);">
                <button class="btn-outline edit-toggle-btn" style="padding:0.3rem 0.6rem; font-size:0.8rem;" data-id="${t.teamId}">🔧 Override</button>
                <button class="btn-outline delete-btn" style="border-color:var(--brand-danger); color:var(--brand-danger); padding:0.3rem 0.6rem; font-size:0.8rem;" data-filename="${t._filename}">Trash</button>
              </div>
            </div>
          </div>

          <div id="edit-${t.teamId}" class="edit-panel" style="display:none; margin-top:var(--space-4); padding-top:var(--space-4); border-top:1px solid var(--border-subtle);">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-3);">
              <div>
                <label style="font-size:0.8rem; display:block; margin-bottom:var(--space-1);">Total Score</label>
                <input type="number" id="sc-${t.teamId}" value="${t.totalScore}" style="margin-bottom:0;" />
              </div>
              <div>
                <label style="font-size:0.8rem; display:block; margin-bottom:var(--space-1);">Current Phase</label>
                <input type="number" id="ph-${t.teamId}" value="${t.phase}" style="margin-bottom:0;" />
              </div>
            </div>
            <div style="display:flex; gap:var(--space-2); margin-top:var(--space-3);">
              <button class="btn-primary save-override-btn" style="margin-top:0; padding:0.4rem;" data-id="${t.teamId}" data-orig='${JSON.stringify(t)}'>Save Override</button>
              <button class="btn-secondary cancel-edit-btn" style="margin-top:0; padding:0.4rem;" data-id="${t.teamId}">Cancel</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    bindTeamListEvents();
  }

  function bindTeamListEvents() {
    document.querySelectorAll('.edit-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        const panel = document.getElementById(`edit-${id}`);
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      });
    });

    document.querySelectorAll('.cancel-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        document.getElementById(`edit-${id}`).style.display = 'none';
      });
    });

    document.querySelectorAll('.save-override-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const origData = JSON.parse(e.target.dataset.orig);
        const newScore = parseInt(document.getElementById(`sc-${id}`).value);
        const newPhase = parseInt(document.getElementById(`ph-${id}`).value);

        origData.totalScore = newScore;
        origData.phase = newPhase;

        try {
          const response = await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(origData)
          });
          if (response.ok) {
            showToast('Override saved successfully!', 'success');
            renderAdmin();
          } else {
            showToast('Failed to save override.', 'error');
          }
        } catch (err) {
          showToast('Failed to save override.', 'error');
        }
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const filename = e.target.dataset.filename;
        if (confirm(`Are you sure you want to delete this team?`)) {
          try {
            await fetch(`/api/delete/${filename}`, { 
              method: 'DELETE',
              headers: { 'X-Admin-Key': state.adminSecret || 'Summer$26' }
            });
            showToast('Entry deleted successfully.', 'success');
            renderAdmin();
          } catch (err) {
            showToast('Failed to delete entry.', 'error');
          }
        }
      });
    });
  }

  renderTeamsList();

  document.getElementById('adminSearch').addEventListener('keyup', (e) => {
    renderTeamsList(e.target.value);
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      e.target.classList.add('active');
      const tabId = e.target.dataset.tab;
      document.getElementById(tabId).classList.add('active');
    });
  });

  document.getElementById('exportBtn').addEventListener('click', async () => {
    try {
      const response = await fetch('/api/admin/export', {
        headers: { 'X-Admin-Key': state.adminSecret || 'Summer$26' }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'treasure_hunt_backup.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Backup downloaded successfully.', 'success');
    } catch (err) {
      showToast('Failed to export data.', 'error');
    }
  });

  document.getElementById('importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        const response = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Admin-Key': state.adminSecret || 'Summer$26'
          },
          body: JSON.stringify(data)
        });
        if (response.ok) {
          showToast('Data imported successfully!', 'success');
          renderAdmin();
        } else {
          showToast('Failed to import data.', 'error');
        }
      } catch (err) {
        showToast('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
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
  
  const thresholdRequirement = Math.ceil(maxPhaseMarks * pctThresholdReq);
  const teamPhaseScore = rawPhaseMarks + chosenCard.return - chosenCard.risk;

  if (teamPhaseScore < thresholdRequirement) {
    state.eliminated = true;
    state.eliminationReason = `Score ${teamPhaseScore} did not meet threshold ${thresholdRequirement}.<br/><br/>
    <small style="color:var(--text-muted);">Threshold Required: ${maxPhaseMarks} marks × ${pctThresholdReq * 100}% = ${thresholdRequirement}<br/>
    Your score: ${rawPhaseMarks} marks + ${chosenCard.return} (card return) - ${chosenCard.risk} (card risk) = ${teamPhaseScore}</small>`;
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
