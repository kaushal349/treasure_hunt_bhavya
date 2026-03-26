// ================================================================
// PUZZLE LOADER — Parses the puzzle data and builds game objects
// ================================================================
// This script reads the PUZZLE_TEXT variable (from puzzles-data.js)
// and converts it into the GAME_DATA, PHASE_DECKS, and PHASES
// objects that the game engine (app.js) needs.
//
// You should NOT need to edit this file.
// To change puzzles:
//   1. Edit puzzles.txt
//   2. Double-click update-puzzles.bat
// ================================================================

var GAME_DATA = {};
var PHASE_DECKS = {};
var PHASES = {};

function loadPuzzles() {
  if (typeof PUZZLE_TEXT === 'undefined' || !PUZZLE_TEXT) {
    console.error('PUZZLE_TEXT not found! Did you run update-puzzles.bat?');
    return;
  }

  var lines = PUZZLE_TEXT.split('\n');
  var currentSection = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.charAt(0) === '#') continue;

    // Detect section headers like [PHASE 1 PUZZLES]
    if (line.charAt(0) === '[' && line.charAt(line.length - 1) === ']') {
      currentSection = line.substring(1, line.length - 1).trim();
      continue;
    }

    // Split on pipe and trim each piece
    var parts = line.split('|');
    for (var p = 0; p < parts.length; p++) {
      parts[p] = parts[p].trim();
    }

    // --- PHASE SETTINGS ---
    if (currentSection === 'PHASE SETTINGS') {
      var phaseNum = parseInt(parts[0]);
      var maxRounds = parseInt(parts[1]);
      var pct = parts[2] ? parseInt(parts[2]) : undefined;

      PHASES[phaseNum] = { maxRounds: maxRounds };
      if (pct !== undefined && !isNaN(pct)) {
        PHASES[phaseNum].thresholdPct = pct / 100;
      }
    }

    // --- PUZZLE SECTIONS ---
    else if (currentSection && currentSection.indexOf('PUZZLES') !== -1) {
      var phaseMatch = currentSection.match(/PHASE\s+(\d+)/i);
      if (!phaseMatch) continue;
      var pNum = parseInt(phaseMatch[1]);

      if (!GAME_DATA[pNum]) GAME_DATA[pNum] = {};

      var roundNum = parseInt(parts[0]);
      var type = parts[1] || 'quiz';
      var title = parts[2] || '';
      var question = parts[3] || '';
      var image = parts[4] || '';

      var entry = { type: type, title: title, question: question, image: image };

      if (type === 'quiz') {
        var options = [];
        if (parts[5] && parts[5].length > 0) options.push(parts[5]);
        if (parts[6] && parts[6].length > 0) options.push(parts[6]);
        if (parts[7] && parts[7].length > 0) options.push(parts[7]);
        if (parts[8] && parts[8].length > 0) options.push(parts[8]);
        if (options.length > 0) entry.options = options;
      }

      if (parts[9] && parts[9].length > 0) {
        entry.answer = parts[9];
      }

      GAME_DATA[pNum][roundNum] = entry;
    }

    // --- CARD DECK SECTIONS ---
    else if (currentSection && currentSection.indexOf('CARDS') !== -1) {
      var cardPhaseMatch = currentSection.match(/PHASE\s+(\d+)/i);
      if (!cardPhaseMatch) continue;
      var cNum = parseInt(cardPhaseMatch[1]);

      if (!PHASE_DECKS[cNum]) PHASE_DECKS[cNum] = [];

      PHASE_DECKS[cNum].push({
        name: parts[0],
        return: parseInt(parts[1]),
        risk: parseInt(parts[2]),
        icon: parts[3] || ''
      });
    }
  }
}
