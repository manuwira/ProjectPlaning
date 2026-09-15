/* ===================== Ressourcen- & Planungstool ===================== */
/* Alle Daten werden lokal im Browser (localStorage) gespeichert.          */

const STORAGE_KEY = 'planungstool_v1';
const NUM_WEEKS = 60; // Anzahl sichtbarer Wochen im Gantt-Fenster
const WEEK_WINDOW = 6; // Anzahl gleichzeitig angezeigter Wochen in der Wochenplanung (untereinander)

const PROJECT_STATUSES = [
  { id: 'ok', label: 'Alles ok', color: '#2ecc71' },
  { id: 'attention', label: 'Braucht Aufmerksamkeit', color: '#f1c40f' },
  { id: 'delay', label: 'Verzögerung', color: '#e74c3c' },
  { id: 'none', label: 'Nichts zu tun', color: '#95a5a6' }
];

const TASK_TYPES = [
  { id: 'service', label: 'Service', color: '#3498db' },
  { id: 'projekt', label: 'Projekt', color: '#8e44ad' },
  { id: 'intern', label: 'Intern', color: '#7f8c8d' }
];
const TASK_PRIORITIES = [
  { id: 'kritisch', label: 'Kritisch', color: '#e74c3c' },
  { id: 'normal', label: 'Normal', color: '#95a5a6' },
  { id: 'erhoeht', label: 'Erhöht', color: '#f39c12' }
];
const TASK_STATUSES = [
  { id: 'geplant', label: 'Geplant', color: '#5b8def' },
  { id: 'offen', label: 'Offen', color: '#f1c40f' },
  { id: 'erledigt', label: 'Erledigt', color: '#2ecc71' }
];

let DATA = null;

/* ---------------------------------------------------------------------- */
/* Utilities                                                               */
/* ---------------------------------------------------------------------- */

function uid(prefix) {
  return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 10);
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = str == null ? '' : String(str);
  return d.innerHTML;
}

function textColorFor(hex) {
  if (!hex) return '#1a1a1a';
  const c = hex.replace('#', '');
  if (c.length < 6) return '#1a1a1a';
  const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#1a1a1a' : '#ffffff';
}

function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isoDate(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addWeeks(d, n) { return addDays(d, n * 7); }
function startOfWeek(d) {
  const date = new Date(d); const day = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - day); date.setHours(0, 0, 0, 0); return date;
}
function getISOWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const diff = (date - firstThursday) / 86400000;
  return 1 + Math.floor(diff / 7);
}
function fmtDate(d) { return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
function fmtDateShort(d) { return d.toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit' }); }
function fmtMonthYear(d) { return d.toLocaleDateString('de-CH', { month: 'short', year: '2-digit' }); }
const WEEKDAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
function weeksBetween(a, b) { return Math.round((startOfWeek(b) - startOfWeek(a)) / (7 * 86400000)); }

/* ---------------------------------------------------------------------- */
/* Default data / persistence                                             */
/* ---------------------------------------------------------------------- */

function defaultData() {
  const today = new Date();
  return {
    employees: [
      { id: uid('emp'), name: 'Mario Stadelmann', team: 'WICK' },
      { id: uid('emp'), name: 'Marc Crettaz', team: 'WICK' },
      { id: uid('emp'), name: 'Michael Sprich', team: 'WICK' },
      { id: uid('emp'), name: 'Daniel Föhn', team: 'WICK' },
      { id: uid('emp'), name: 'René Weinland', team: 'WICK' },
      { id: uid('emp'), name: 'Jörg Staudenmann', team: 'WICK' }
    ],
    activityTypes: [
      { id: uid('act'), name: 'Abwesenheit', color: '#f2b6b6' },
      { id: uid('act'), name: 'Feiertag', color: '#ffe28a' },
      { id: uid('act'), name: 'Arbeit intern', color: '#ffffff' },
      { id: uid('act'), name: 'Auswärtig', color: '#fcd9a8' },
      { id: uid('act'), name: '2nd Level', color: '#c9e8c0' },
      { id: uid('act'), name: 'Kurzarbeit', color: '#cfd4ff' }
    ],
    projects: [
      { id: uid('prj'), number: '252001', name: 'WiCell (Design)', color: '#4a90d9' },
      { id: uid('prj'), number: '252056', name: 'Nitrochemie E10', color: '#e67e22' },
      { id: uid('prj'), number: '262010', name: 'Van der Graaf NL, Automation Stocker', color: '#8e44ad' },
      { id: uid('prj'), number: '262015', name: 'Pilatus Heisspresse LHP-20', color: '#16a085' }
    ],
    phaseTypes: [
      { id: uid('ph'), code: 'CON', name: '', color: '#95a5a6' },
      { id: uid('ph'), code: 'PCZ', name: '', color: '#8bc34a' },
      { id: uid('ph'), code: 'ACZ', name: '', color: '#e67e22' },
      { id: uid('ph'), code: 'CCZ', name: '', color: '#3498db' },
      { id: uid('ph'), code: 'DTW', name: '', color: '#9b59b6' },
      { id: uid('ph'), code: 'IBNW', name: '', color: '#2ecc71' },
      { id: uid('ph'), code: 'CMC', name: '', color: '#f1c40f' },
      { id: uid('ph'), code: 'DLY', name: '', color: '#7f8c8d' },
      { id: uid('ph'), code: 'SAT', name: '', color: '#e74c3c' },
      { id: uid('ph'), code: 'FAT', name: '', color: '#d81b60' }
    ],
    entries: {},
    dayNotes: {},
    ganttProjects: [],
    tasks: [],
    settings: {
      currentWeek: isoDate(startOfWeek(today)),
      ganttStart: isoDate(startOfWeek(addWeeks(today, -4))),
      ganttZoom: 'week'
    }
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.employees) return migrate(parsed);
    }
  } catch (e) { console.warn('Konnte gespeicherte Daten nicht laden:', e); }
  return defaultData();
}

function migrate(d) {
  if (!d.ganttProjects) d.ganttProjects = [];
  d.ganttProjects.forEach(gp => {
    if (!gp.status) gp.status = 'ok';
    if (gp.collapsed === undefined) gp.collapsed = false;
  });
  if (!d.phaseTypes) d.phaseTypes = [];
  d.phaseTypes.forEach(ph => { if (ph.name === undefined) ph.name = ''; });
  if (!d.dayNotes) d.dayNotes = {};
  if (!d.tasks) d.tasks = [];
  if (!d.settings) d.settings = defaultData().settings;
  if (!d.settings.ganttZoom) d.settings.ganttZoom = 'week';
  return d;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DATA));
}

/* ---------------------------------------------------------------------- */
/* Init                                                                    */
/* ---------------------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  DATA = loadData();
  wireTabs();
  wireWeekToolbar();
  wireGanttToolbar();
  wireCellModal();
  wireManageModal();
  wireBarModal();
  wireTasksTab();
  wireTaskModal();
  wireExportImport();
  wirePromptConfirmModals();
  renderAll();
});

function renderAll() {
  renderWeekLegend();
  renderWeekTable();
  renderGanttLegend();
  renderGantt();
  renderTasksTable();
}

function wireTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });
}

/* ---------------------------------------------------------------------- */
/* Wochenplanung                                                          */
/* ---------------------------------------------------------------------- */

function wireWeekToolbar() {
  document.getElementById('week-prev').addEventListener('click', () => {
    DATA.settings.currentWeek = isoDate(addWeeks(parseISO(DATA.settings.currentWeek), -WEEK_WINDOW));
    saveData(); renderWeekTable();
  });
  document.getElementById('week-next').addEventListener('click', () => {
    DATA.settings.currentWeek = isoDate(addWeeks(parseISO(DATA.settings.currentWeek), WEEK_WINDOW));
    saveData(); renderWeekTable();
  });
  document.getElementById('week-today').addEventListener('click', () => {
    DATA.settings.currentWeek = isoDate(startOfWeek(new Date()));
    saveData(); renderWeekTable();
  });
  document.getElementById('btn-add-employee').addEventListener('click', async () => {
    const res = await askPrompt('Neuer Mitarbeiter', [
      { id: 'name', label: 'Name' },
      { id: 'team', label: 'Team (optional, z.B. WICK)' }
    ]);
    if (!res || !res.name) return;
    DATA.employees.push({ id: uid('emp'), name: res.name, team: res.team || '' });
    saveData(); renderWeekTable(); renderManageEmployees();
  });
}

function renderWeekLegend() {
  const el = document.getElementById('week-legend');
  el.innerHTML = '';
  DATA.activityTypes.forEach(a => {
    const chip = document.createElement('span');
    chip.className = 'legend-chip';
    chip.innerHTML = `<span class="legend-swatch" style="background:${esc(a.color)}"></span>${esc(a.name)}`;
    el.appendChild(chip);
  });
}

function renderWeekTable() {
  const firstMonday = parseISO(DATA.settings.currentWeek);
  const weekStarts = Array.from({ length: WEEK_WINDOW }, (_, i) => addWeeks(firstMonday, i));
  const lastSunday = addDays(weekStarts[weekStarts.length - 1], 6);
  document.getElementById('week-label').textContent =
    `KW ${getISOWeekNumber(weekStarts[0])}–${getISOWeekNumber(weekStarts[weekStarts.length - 1])} — ${fmtDate(weekStarts[0])} bis ${fmtDate(lastSunday)}`;

  const todayISO = isoDate(new Date());
  const currentWeekISO = isoDate(startOfWeek(new Date()));

  // group employees by team, preserving order of first appearance; employees without team -> '' bucket
  const teams = [];
  DATA.employees.forEach(e => { const t = e.team || ''; if (!teams.includes(t)) teams.push(t); });
  const showTeamHeaders = teams.length > 1 || (teams.length === 1 && teams[0] !== '');
  const orderedEmployees = [];
  teams.forEach(t => DATA.employees.filter(e => (e.team || '') === t).forEach(e => orderedEmployees.push(e)));

  const table = document.getElementById('week-table');
  table.innerHTML = '';

  // ---- header ----
  const thead = document.createElement('thead');

  if (showTeamHeaders) {
    const trTeam = document.createElement('tr');
    const kwCorner = el('th', 'KW'); kwCorner.rowSpan = 2; kwCorner.className = 'corner-cell kw-corner';
    const dateCorner = el('th', 'Datum'); dateCorner.rowSpan = 2; dateCorner.className = 'corner-cell date-corner';
    const noteCorner = el('th', 'Notiz'); noteCorner.rowSpan = 2; noteCorner.className = 'corner-cell note-corner';
    trTeam.appendChild(kwCorner); trTeam.appendChild(dateCorner); trTeam.appendChild(noteCorner);
    teams.forEach(t => {
      const count = orderedEmployees.filter(e => (e.team || '') === t).length;
      const th = el('th', t || 'Ohne Team');
      th.colSpan = count;
      th.className = 'team-header';
      trTeam.appendChild(th);
    });
    thead.appendChild(trTeam);
  }

  const trEmp = document.createElement('tr');
  if (!showTeamHeaders) {
    const kwCorner = el('th', 'KW'); kwCorner.className = 'corner-cell kw-corner';
    const dateCorner = el('th', 'Datum'); dateCorner.className = 'corner-cell date-corner';
    const noteCorner = el('th', 'Notiz'); noteCorner.className = 'corner-cell note-corner';
    trEmp.appendChild(kwCorner); trEmp.appendChild(dateCorner); trEmp.appendChild(noteCorner);
  }
  orderedEmployees.forEach(emp => {
    const th = el('th', emp.name);
    th.className = 'emp-header-col';
    trEmp.appendChild(th);
  });
  thead.appendChild(trEmp);
  table.appendChild(thead);

  // ---- body ----
  const tbody = document.createElement('tbody');

  weekStarts.forEach((monday, wi) => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const kw = getISOWeekNumber(monday);

    days.forEach((d, di) => {
      const iso = isoDate(d);
      const tr = document.createElement('tr');
      if (di === 0 && wi > 0) tr.classList.add('week-start-row');

      if (di === 0) {
        const kwTd = el('td', 'KW ' + kw);
        kwTd.className = 'kw-cell';
        kwTd.rowSpan = 7;
        if (isoDate(monday) === currentWeekISO) kwTd.classList.add('current-week');
        tr.appendChild(kwTd);
      }

      const dateTd = document.createElement('td');
      dateTd.className = 'date-cell';
      if (d.getDay() === 0 || d.getDay() === 6) dateTd.classList.add('weekend-bg');
      if (iso === todayISO) dateTd.classList.add('today-bg');
      dateTd.textContent = `${WEEKDAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]} ${fmtDateShort(d)}`;
      tr.appendChild(dateTd);

      const noteTd = document.createElement('td');
      noteTd.className = 'note-cell';
      if (d.getDay() === 0 || d.getDay() === 6) noteTd.classList.add('weekend-bg');
      if (iso === todayISO) noteTd.classList.add('today-bg');
      const noteInput = document.createElement('textarea');
      noteInput.className = 'note-input';
      noteInput.rows = 2;
      noteInput.placeholder = 'Notiz…';
      noteInput.value = DATA.dayNotes[iso] || '';
      noteInput.addEventListener('click', (e) => e.stopPropagation());
      noteInput.addEventListener('change', () => {
        const val = noteInput.value.trim();
        if (val) DATA.dayNotes[iso] = val; else delete DATA.dayNotes[iso];
        saveData();
      });
      noteTd.appendChild(noteInput);
      tr.appendChild(noteTd);

      orderedEmployees.forEach(emp => {
        const key = emp.id + '::' + iso;
        const entry = DATA.entries[key];
        const td = document.createElement('td');
        td.className = 'day-cell';
        if (d.getDay() === 0 || d.getDay() === 6) td.classList.add('weekend-bg');
        if (iso === todayISO) td.classList.add('today-bg');

        if (entry) {
          const act = DATA.activityTypes.find(a => a.id === entry.activityTypeId);
          const prj = DATA.projects.find(p => p.id === entry.projectId);
          const bg = act ? act.color : '#ffffff';
          td.style.background = bg;
          td.style.color = textColorFor(bg);
          let html = '';
          if (act) html += `<div class="cell-activity">${esc(act.name)}</div>`;
          if (prj) html += `<div class="cell-project">${esc(prj.name)}</div>`;
          if (entry.note) html += `<div class="cell-note">${esc(entry.note)}</div>`;
          td.innerHTML = html || '<div class="cell-empty">+</div>';
        } else {
          td.innerHTML = '<div class="cell-empty">+</div>';
        }

        td.addEventListener('click', () => openCellModal(emp.id, iso));
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  });

  table.appendChild(tbody);
}

function el(tag, text) {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  return e;
}

/* ---- Cell modal ---- */

let editingCell = null; // {empId, dateISO}

function wireCellModal() {
  document.getElementById('cell-cancel').addEventListener('click', closeCellModal);
  document.getElementById('cell-save').addEventListener('click', saveCellModal);
  document.getElementById('cell-clear').addEventListener('click', () => {
    if (editingCell) {
      delete DATA.entries[editingCell.empId + '::' + editingCell.dateISO];
      saveData(); renderWeekTable();
    }
    closeCellModal();
  });
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeAllModals();
  });
}

function openCellModal(empId, dateISO) {
  editingCell = { empId, dateISO };
  const emp = DATA.employees.find(e => e.id === empId);
  const d = parseISO(dateISO);
  document.getElementById('modal-cell-sub').textContent =
    `${emp.name} — ${WEEKDAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]}, ${fmtDate(d)}`;

  const actSel = document.getElementById('cell-activity');
  actSel.innerHTML = '<option value="">— keine —</option>' +
    DATA.activityTypes.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');

  const prjSel = document.getElementById('cell-project');
  prjSel.innerHTML = '<option value="">— keines —</option>' +
    DATA.projects.map(p => `<option value="${p.id}">${esc(p.number ? p.number + ' – ' : '')}${esc(p.name)}</option>`).join('');

  const entry = DATA.entries[empId + '::' + dateISO];
  actSel.value = entry ? (entry.activityTypeId || '') : '';
  prjSel.value = entry ? (entry.projectId || '') : '';
  document.getElementById('cell-note').value = entry ? (entry.note || '') : '';

  showModal('modal-cell');
}

function saveCellModal() {
  if (!editingCell) return;
  const activityTypeId = document.getElementById('cell-activity').value;
  const projectId = document.getElementById('cell-project').value;
  const note = document.getElementById('cell-note').value.trim();
  const key = editingCell.empId + '::' + editingCell.dateISO;

  if (!activityTypeId && !projectId && !note) {
    delete DATA.entries[key];
  } else {
    DATA.entries[key] = { activityTypeId: activityTypeId || null, projectId: projectId || null, note };
  }
  saveData();
  renderWeekTable();
  closeCellModal();
}

function closeCellModal() {
  editingCell = null;
  hideModal('modal-cell');
}

/* ---------------------------------------------------------------------- */
/* Meilensteinplanung (Gantt)                                             */
/* ---------------------------------------------------------------------- */

function wireGanttToolbar() {
  document.getElementById('gantt-prev').addEventListener('click', () => {
    DATA.settings.ganttStart = isoDate(addWeeks(parseISO(DATA.settings.ganttStart), -13));
    saveData(); renderGantt();
  });
  document.getElementById('gantt-next').addEventListener('click', () => {
    DATA.settings.ganttStart = isoDate(addWeeks(parseISO(DATA.settings.ganttStart), 13));
    saveData(); renderGantt();
  });
  document.getElementById('gantt-today').addEventListener('click', () => {
    DATA.settings.ganttStart = isoDate(startOfWeek(addWeeks(new Date(), -4)));
    saveData(); renderGantt();
  });
  document.getElementById('gantt-zoom').addEventListener('change', (e) => {
    DATA.settings.ganttZoom = e.target.value;
    saveData(); renderGantt();
  });
  document.getElementById('btn-add-project').addEventListener('click', async () => {
    const res = await askPrompt('Neues Projekt', [
      { id: 'name', label: 'Projektname' },
      { id: 'number', label: 'Projektnummer (optional)' }
    ]);
    if (!res || !res.name) return;
    const gp = {
      id: uid('gprj'), number: res.number || '', name: res.name, color: randomColor(),
      status: 'ok', collapsed: false,
      rows: [{ id: uid('row'), name: res.name, bars: [] }]
    };
    DATA.ganttProjects.push(gp);
    saveData(); renderGantt();
  });
}

function randomColor() {
  const palette = ['#4a90d9', '#e67e22', '#8e44ad', '#16a085', '#c0392b', '#2980b9', '#27ae60', '#d35400'];
  return palette[Math.floor(Math.random() * palette.length)];
}

function renderGanttLegend() {
  const el2 = document.getElementById('gantt-legend');
  el2.innerHTML = '';
  DATA.phaseTypes.forEach(p => {
    const chip = document.createElement('span');
    chip.className = 'legend-chip';
    if (p.name) chip.title = p.name;
    chip.innerHTML = `<span class="legend-swatch" style="background:${esc(p.color)}"></span>${esc(p.code)}`;
    el2.appendChild(chip);
  });
}

function renderGantt() {
  const zoom = DATA.settings.ganttZoom || 'week';
  const weekPx = zoom === 'month' ? 12 : 34;
  const start = parseISO(DATA.settings.ganttStart);
  const weeks = Array.from({ length: NUM_WEEKS }, (_, i) => addWeeks(start, i));
  const totalWidth = NUM_WEEKS * weekPx;
  const todayWeekIdx = weeksBetween(start, new Date());

  // Wie oft wird pro Woche welche Phase über alle Projekte/Zeilen hinweg verwendet?
  const weekPhaseCounts = Array.from({ length: NUM_WEEKS }, () => ({}));
  DATA.ganttProjects.forEach(proj => {
    proj.rows.forEach(row => {
      row.bars.forEach(bar => {
        const bStart = startOfWeek(parseISO(bar.start));
        const bEnd = startOfWeek(parseISO(bar.end));
        let sIdx = weeksBetween(start, bStart);
        let eIdx = weeksBetween(start, bEnd);
        if (eIdx < 0 || sIdx > NUM_WEEKS - 1) return;
        sIdx = Math.max(sIdx, 0);
        eIdx = Math.min(eIdx, NUM_WEEKS - 1);
        for (let i = sIdx; i <= eIdx; i++) {
          weekPhaseCounts[i][bar.phaseId] = (weekPhaseCounts[i][bar.phaseId] || 0) + 1;
        }
      });
    });
  });

  document.getElementById('gantt-label').textContent =
    `${fmtDate(start)} – ${fmtDate(addWeeks(start, NUM_WEEKS))}`;

  const root = document.getElementById('gantt-chart');
  root.innerHTML = '';
  root.style.setProperty('--week-px', weekPx + 'px');

  // ---- Timeline header (sticky) ----
  const header = document.createElement('div');
  header.style.position = 'sticky';
  header.style.top = '0';
  header.style.zIndex = '5';
  header.style.display = 'flex';

  const corner = document.createElement('div');
  corner.className = 'gantt-corner';
  corner.style.width = '220px';
  header.appendChild(corner);

  const headerRight = document.createElement('div');
  headerRight.style.width = totalWidth + 'px';

  // month row
  const monthsRow = document.createElement('div');
  monthsRow.className = 'gantt-months';
  let i = 0;
  while (i < weeks.length) {
    const m = weeks[i].getMonth(), y = weeks[i].getFullYear();
    let span = 0;
    while (i + span < weeks.length && weeks[i + span].getMonth() === m && weeks[i + span].getFullYear() === y) span++;
    const cell = document.createElement('div');
    cell.className = 'gantt-month-cell';
    cell.style.width = (span * weekPx) + 'px';
    cell.textContent = fmtMonthYear(weeks[i]);
    monthsRow.appendChild(cell);
    i += span;
  }
  headerRight.appendChild(monthsRow);

  // phase-usage summary row (über der Datum/KW-Zeile): wie oft welche Phase in dieser Woche vorkommt
  const summaryRow = document.createElement('div');
  summaryRow.className = 'gantt-phase-summary';
  weeks.forEach((w, idx) => {
    const cell = document.createElement('div');
    cell.className = 'gantt-summary-cell';
    cell.style.width = weekPx + 'px';
    const counts = weekPhaseCounts[idx];
    const phaseIds = Object.keys(counts);
    if (phaseIds.length) {
      const badges = document.createElement('div');
      badges.className = 'summary-badges';
      phaseIds.forEach(pid => {
        const phase = DATA.phaseTypes.find(p => p.id === pid);
        const color = phase ? phase.color : '#95a5a6';
        const badge = document.createElement('span');
        badge.className = 'summary-badge';
        badge.style.background = color;
        badge.style.color = textColorFor(color);
        badge.textContent = counts[pid];
        const phaseLabel = phase ? (phase.code + (phase.name ? ' – ' + phase.name : '')) : '?';
        badge.title = `${phaseLabel}: ${counts[pid]}×`;
        badges.appendChild(badge);
      });
      cell.appendChild(badges);
    }
    summaryRow.appendChild(cell);
  });
  headerRight.appendChild(summaryRow);

  // week row
  let thirdRow;
  if (zoom !== 'month') {
    const weeksRow = document.createElement('div');
    weeksRow.className = 'gantt-weeks';
    weeks.forEach((w, idx) => {
      const cell = document.createElement('div');
      cell.className = 'gantt-week-cell';
      cell.style.width = weekPx + 'px';
      if (idx === todayWeekIdx) cell.classList.add('today-week');
      cell.textContent = 'KW' + getISOWeekNumber(w);
      weeksRow.appendChild(cell);
    });
    headerRight.appendChild(weeksRow);
    thirdRow = weeksRow;
  } else {
    const spacer = document.createElement('div');
    spacer.style.height = '18px';
    headerRight.appendChild(spacer);
    thirdRow = spacer;
  }

  header.appendChild(headerRight);
  root.appendChild(header);

  // Sticky-Offsets abhängig von der tatsächlichen (variablen) Höhe der Summary-Zeile berechnen
  const monthsH = monthsRow.offsetHeight;
  const summaryH = summaryRow.offsetHeight;
  const thirdH = thirdRow.offsetHeight;
  summaryRow.style.top = monthsH + 'px';
  if (zoom !== 'month') thirdRow.style.top = (monthsH + summaryH) + 'px';
  corner.style.height = (monthsH + summaryH + thirdH) + 'px';

  // ---- Body: one block per project ----
  const body = document.createElement('div');
  body.className = 'gantt-body';

  DATA.ganttProjects.forEach(proj => {
    const block = document.createElement('div');
    block.className = 'gantt-project-block';

    const titleRow = document.createElement('div');
    titleRow.className = 'gantt-project-title';
    const statusDef = PROJECT_STATUSES.find(s => s.id === proj.status) || PROJECT_STATUSES[0];
    titleRow.style.borderLeft = `5px solid ${statusDef.color}`;

    const collapseBtn = document.createElement('button');
    collapseBtn.className = 'gantt-collapse-btn';
    collapseBtn.textContent = proj.collapsed ? '▸' : '▾';
    collapseBtn.title = proj.collapsed ? 'Zeilen aufklappen' : 'Zeilen einklappen';
    collapseBtn.addEventListener('click', () => {
      proj.collapsed = !proj.collapsed;
      saveData(); renderGantt();
    });
    titleRow.appendChild(collapseBtn);

    const swatch = document.createElement('span');
    swatch.className = 'proj-color';
    swatch.style.background = proj.color;
    titleRow.appendChild(swatch);

    const nameSpan = document.createElement('span');
    nameSpan.textContent = (proj.number ? proj.number + ' – ' : '') + proj.name;
    titleRow.appendChild(nameSpan);

    const statusSelect = document.createElement('select');
    statusSelect.className = 'gantt-status-select';
    statusSelect.style.background = statusDef.color;
    statusSelect.style.color = textColorFor(statusDef.color);
    PROJECT_STATUSES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id; opt.textContent = s.label;
      if (s.id === proj.status) opt.selected = true;
      statusSelect.appendChild(opt);
    });
    statusSelect.addEventListener('change', () => {
      proj.status = statusSelect.value;
      saveData(); renderGantt();
    });
    titleRow.appendChild(statusSelect);

    const actions = document.createElement('span');
    actions.className = 'proj-actions';

    const addBarBtn = document.createElement('button');
    addBarBtn.className = 'btn-secondary'; addBarBtn.textContent = '+ Balken';
    addBarBtn.addEventListener('click', () => openBarModal({ projectId: proj.id }));
    actions.appendChild(addBarBtn);

    const addRowBtn = document.createElement('button');
    addRowBtn.className = 'btn-secondary'; addRowBtn.textContent = '+ Zeile';
    addRowBtn.addEventListener('click', async () => {
      const res = await askPrompt('Neue Zeile', [{ id: 'name', label: 'Name (z.B. Design MCAD)' }]);
      if (!res || !res.name) return;
      proj.rows.push({ id: uid('row'), name: res.name, bars: [] });
      saveData(); renderGantt();
    });
    actions.appendChild(addRowBtn);

    const renameBtn = document.createElement('button');
    renameBtn.className = 'btn-secondary'; renameBtn.textContent = 'Umbenennen';
    renameBtn.addEventListener('click', async () => {
      const res = await askPrompt('Projekt umbenennen', [{ id: 'name', label: 'Projektname', value: proj.name }]);
      if (!res || !res.name) return;
      proj.name = res.name;
      saveData(); renderGantt();
    });
    actions.appendChild(renameBtn);

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Löschen';
    delBtn.addEventListener('click', async () => {
      const ok = await askConfirm(`Projekt "${proj.name}" inkl. aller Balken löschen?`);
      if (!ok) return;
      DATA.ganttProjects = DATA.ganttProjects.filter(p => p.id !== proj.id);
      saveData(); renderGantt();
    });
    actions.appendChild(delBtn);

    titleRow.appendChild(actions);
    block.appendChild(titleRow);

    if (proj.collapsed) { body.appendChild(block); return; }

    proj.rows.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'gantt-row';

      const label = document.createElement('div');
      label.className = 'gantt-row-label';
      label.textContent = row.name;
      label.title = 'Doppelklick zum Umbenennen';
      label.addEventListener('dblclick', async () => {
        const res = await askPrompt('Zeile umbenennen', [{ id: 'name', label: 'Name', value: row.name }]);
        if (!res || !res.name) return;
        row.name = res.name;
        saveData(); renderGantt();
      });
      rowEl.appendChild(label);

      const track = document.createElement('div');
      track.className = 'gantt-row-track';
      track.style.width = totalWidth + 'px';
      track.addEventListener('click', (e) => {
        if (e.target !== track) return; // ignore clicks on bars
        const rect = track.getBoundingClientRect();
        const weekIdx = Math.floor((e.clientX - rect.left) / weekPx);
        const clickedMonday = addWeeks(start, weekIdx);
        openBarModal({ projectId: proj.id, rowId: row.id, start: isoDate(clickedMonday), end: isoDate(addDays(clickedMonday, 6)) });
      });

      row.bars.forEach(bar => {
        const bStart = startOfWeek(parseISO(bar.start));
        const bEnd = startOfWeek(parseISO(bar.end));
        let sIdx = weeksBetween(start, bStart);
        let eIdx = weeksBetween(start, bEnd);
        if (eIdx < 0 || sIdx > NUM_WEEKS - 1) return; // outside window
        sIdx = Math.max(sIdx, 0);
        eIdx = Math.min(eIdx, NUM_WEEKS - 1);
        const phase = DATA.phaseTypes.find(p => p.id === bar.phaseId);
        const employee = bar.employeeId ? DATA.employees.find(e => e.id === bar.employeeId) : null;
        const color = phase ? phase.color : '#7f8c8d';
        const barEl = document.createElement('div');
        barEl.className = 'gantt-bar';
        barEl.style.left = (sIdx * weekPx) + 'px';
        barEl.style.width = Math.max((eIdx - sIdx + 1) * weekPx - 2, 4) + 'px';
        barEl.style.background = color;
        barEl.style.color = textColorFor(color);
        barEl.textContent = bar.label || (employee ? employee.name : (phase ? phase.code : ''));
        const phaseLabel = phase ? (phase.code + (phase.name ? ' – ' + phase.name : '')) : '';
        const employeeLabel = employee ? ` | ${employee.name}` : '';
        barEl.title = `${phaseLabel}${employeeLabel} ${bar.label || ''} (${fmtDate(parseISO(bar.start))} – ${fmtDate(parseISO(bar.end))})`.trim();
        barEl.addEventListener('click', (ev) => {
          ev.stopPropagation();
          openBarModal({ projectId: proj.id, rowId: row.id, barId: bar.id });
        });
        track.appendChild(barEl);
      });

      rowEl.appendChild(track);
      block.appendChild(rowEl);
    });

    body.appendChild(block);
  });

  root.appendChild(body);
}

/* ---- Bar modal ---- */

let editingBar = null; // {projectId, rowId, barId} barId null = new

function wireBarModal() {
  document.getElementById('bar-project').addEventListener('change', (e) => {
    populateBarRowSelect(e.target.value);
  });
  document.getElementById('bar-add-row').addEventListener('click', async () => {
    const projId = document.getElementById('bar-project').value;
    const proj = DATA.ganttProjects.find(p => p.id === projId);
    if (!proj) { alert('Bitte zuerst ein Projekt wählen.'); return; }
    const res = await askPrompt('Neue Zeile', [{ id: 'name', label: 'Name' }]);
    if (!res || !res.name) return;
    const newRow = { id: uid('row'), name: res.name, bars: [] };
    proj.rows.push(newRow);
    saveData();
    populateBarRowSelect(projId);
    document.getElementById('bar-row').value = newRow.id;
  });
  document.getElementById('bar-cancel').addEventListener('click', closeBarModal);
  document.getElementById('bar-save').addEventListener('click', saveBarModal);
  document.getElementById('bar-delete').addEventListener('click', () => {
    if (!editingBar || !editingBar.barId) { closeBarModal(); return; }
    const proj = DATA.ganttProjects.find(p => p.id === editingBar.projectId);
    const row = proj && proj.rows.find(r => r.id === editingBar.rowId);
    if (row) row.bars = row.bars.filter(b => b.id !== editingBar.barId);
    saveData(); renderGantt(); closeBarModal();
  });
}

function populateBarRowSelect(projectId) {
  const proj = DATA.ganttProjects.find(p => p.id === projectId);
  const sel = document.getElementById('bar-row');
  sel.innerHTML = proj ? proj.rows.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('') : '';
}

function openBarModal(ctx) {
  // ctx: {projectId, rowId, barId, start, end}
  editingBar = { projectId: ctx.projectId, rowId: ctx.rowId || null, barId: ctx.barId || null };

  const projSel = document.getElementById('bar-project');
  projSel.innerHTML = DATA.ganttProjects.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  projSel.value = ctx.projectId;
  populateBarRowSelect(ctx.projectId);

  const phaseSel = document.getElementById('bar-phase');
  phaseSel.innerHTML = DATA.phaseTypes.map(p => `<option value="${p.id}">${esc(p.code)}${p.name ? ' – ' + esc(p.name) : ''}</option>`).join('');

  const employeeSel = document.getElementById('bar-employee');
  employeeSel.innerHTML = '<option value="">— keiner —</option>' +
    DATA.employees.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('');

  let bar = null;
  if (ctx.barId) {
    const proj = DATA.ganttProjects.find(p => p.id === ctx.projectId);
    const row = proj && proj.rows.find(r => r.id === ctx.rowId);
    bar = row && row.bars.find(b => b.id === ctx.barId);
  }

  document.getElementById('bar-title').textContent = bar ? 'Balken bearbeiten' : 'Neuer Balken';
  if (ctx.rowId) document.getElementById('bar-row').value = ctx.rowId;
  phaseSel.value = bar ? bar.phaseId : (DATA.phaseTypes[0] ? DATA.phaseTypes[0].id : '');
  employeeSel.value = bar ? (bar.employeeId || '') : '';
  document.getElementById('bar-start').value = bar ? bar.start : (ctx.start || isoDate(startOfWeek(new Date())));
  document.getElementById('bar-end').value = bar ? bar.end : (ctx.end || isoDate(addDays(startOfWeek(new Date()), 6)));
  document.getElementById('bar-label').value = bar ? (bar.label || '') : '';
  document.getElementById('bar-delete').style.display = bar ? '' : 'none';

  showModal('modal-bar');
}

function saveBarModal() {
  const projectId = document.getElementById('bar-project').value;
  const rowId = document.getElementById('bar-row').value;
  const phaseId = document.getElementById('bar-phase').value;
  const employeeId = document.getElementById('bar-employee').value || null;
  const start = document.getElementById('bar-start').value;
  const end = document.getElementById('bar-end').value;
  const label = document.getElementById('bar-label').value.trim();

  if (!projectId || !rowId || !start || !end) { alert('Bitte Projekt, Zeile, Start- und Enddatum angeben.'); return; }
  if (parseISO(end) < parseISO(start)) { alert('Das Enddatum liegt vor dem Startdatum.'); return; }

  const proj = DATA.ganttProjects.find(p => p.id === projectId);
  const row = proj.rows.find(r => r.id === rowId);

  if (editingBar && editingBar.barId) {
    const bar = row.bars.find(b => b.id === editingBar.barId);
    Object.assign(bar, { phaseId, employeeId, start, end, label });
  } else {
    row.bars.push({ id: uid('bar'), phaseId, employeeId, start, end, label });
  }

  saveData(); renderGantt(); closeBarModal();
}

function closeBarModal() {
  editingBar = null;
  hideModal('modal-bar');
}

/* ---------------------------------------------------------------------- */
/* Projektaufgaben                                                        */
/* ---------------------------------------------------------------------- */

function wireTasksTab() {
  document.getElementById('btn-add-task').addEventListener('click', () => openTaskModal(null));
  document.getElementById('task-filter-type').addEventListener('change', renderTasksTable);
  document.getElementById('task-filter-status').addEventListener('change', renderTasksTable);
}

function taskBadgeCell(def) {
  const td = document.createElement('td');
  if (def) {
    const span = document.createElement('span');
    span.className = 'task-badge';
    span.style.background = def.color;
    span.style.color = textColorFor(def.color);
    span.textContent = def.label;
    td.appendChild(span);
  } else {
    td.textContent = '—';
  }
  return td;
}

function renderTasksTable() {
  const typeFilter = document.getElementById('task-filter-type').value;
  const statusFilter = document.getElementById('task-filter-status').value;

  let tasks = DATA.tasks.slice();
  if (typeFilter) tasks = tasks.filter(t => t.type === typeFilter);
  if (statusFilter) tasks = tasks.filter(t => t.status === statusFilter);
  tasks.sort((a, b) => (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'));

  const table = document.getElementById('tasks-table');
  table.innerHTML = '';

  const thead = document.createElement('thead');
  const trh = document.createElement('tr');
  ['Typ', 'Person', 'Kunde', 'Arbeit', 'Priorität', 'Aufwand', 'Datum', 'Status', ''].forEach(h => trh.appendChild(el('th', h)));
  thead.appendChild(trh);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  if (!tasks.length) {
    const tr = document.createElement('tr');
    const td = el('td', 'Keine Aufgaben vorhanden.');
    td.colSpan = 9;
    td.className = 'tasks-empty';
    tr.appendChild(td);
    tbody.appendChild(tr);
  }

  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.className = 'task-row';

    const typeDef = TASK_TYPES.find(t => t.id === task.type);
    const prioDef = TASK_PRIORITIES.find(p => p.id === task.priority);
    const statusDef = TASK_STATUSES.find(s => s.id === task.status);

    tr.appendChild(taskBadgeCell(typeDef));
    tr.appendChild(el('td', task.person || '—'));
    tr.appendChild(el('td', task.customer || '—'));
    const workTd = el('td', task.work || '—');
    workTd.className = 'task-work-cell';
    tr.appendChild(workTd);
    tr.appendChild(taskBadgeCell(prioDef));
    tr.appendChild(el('td', task.effortValue != null && task.effortValue !== '' ? `${task.effortValue} ${task.effortUnit === 'stunden' ? 'Std.' : 'Tage'}` : '—'));
    tr.appendChild(el('td', task.date ? fmtDate(parseISO(task.date)) : '—'));
    tr.appendChild(taskBadgeCell(statusDef));

    const actionsTd = document.createElement('td');
    actionsTd.className = 'task-actions-cell';
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = '×';
    delBtn.title = 'Löschen';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const ok = await askConfirm('Aufgabe löschen?');
      if (!ok) return;
      DATA.tasks = DATA.tasks.filter(t => t.id !== task.id);
      saveData(); renderTasksTable();
    });
    actionsTd.appendChild(delBtn);
    tr.appendChild(actionsTd);

    tr.addEventListener('click', () => openTaskModal(task.id));
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

/* ---- Task modal ---- */

let editingTask = null; // task id, or null for a new task

function wireTaskModal() {
  document.getElementById('task-cancel').addEventListener('click', closeTaskModal);
  document.getElementById('task-save').addEventListener('click', saveTaskModal);
  document.getElementById('task-delete').addEventListener('click', async () => {
    if (editingTask) {
      const ok = await askConfirm('Aufgabe löschen?');
      if (!ok) { return; }
      DATA.tasks = DATA.tasks.filter(t => t.id !== editingTask);
      saveData(); renderTasksTable();
    }
    closeTaskModal();
  });
}

function openTaskModal(taskId) {
  editingTask = taskId || null;
  const task = taskId ? DATA.tasks.find(t => t.id === taskId) : null;

  document.getElementById('task-modal-title').textContent = task ? 'Aufgabe bearbeiten' : 'Neue Aufgabe';

  const personList = document.getElementById('task-person-list');
  personList.innerHTML = DATA.employees.map(e => `<option value="${esc(e.name)}"></option>`).join('');

  document.getElementById('task-type').value = task ? task.type : 'projekt';
  document.getElementById('task-person').value = task ? (task.person || '') : '';
  document.getElementById('task-customer').value = task ? (task.customer || '') : '';
  document.getElementById('task-work').value = task ? (task.work || '') : '';
  document.getElementById('task-priority').value = task ? task.priority : 'normal';
  document.getElementById('task-effort-value').value = task && task.effortValue != null ? task.effortValue : '';
  document.getElementById('task-effort-unit').value = task ? (task.effortUnit || 'tage') : 'tage';
  document.getElementById('task-date').value = task ? (task.date || '') : isoDate(new Date());
  document.getElementById('task-status').value = task ? task.status : 'geplant';
  document.getElementById('task-delete').style.display = task ? '' : 'none';

  showModal('modal-task');
}

function saveTaskModal() {
  const type = document.getElementById('task-type').value;
  const person = document.getElementById('task-person').value.trim();
  const customer = document.getElementById('task-customer').value.trim();
  const work = document.getElementById('task-work').value.trim();
  const priority = document.getElementById('task-priority').value;
  const effortRaw = document.getElementById('task-effort-value').value;
  const effortValue = effortRaw !== '' ? parseFloat(effortRaw) : null;
  const effortUnit = document.getElementById('task-effort-unit').value;
  const date = document.getElementById('task-date').value;
  const status = document.getElementById('task-status').value;

  if (editingTask) {
    const task = DATA.tasks.find(t => t.id === editingTask);
    Object.assign(task, { type, person, customer, work, priority, effortValue, effortUnit, date, status });
  } else {
    DATA.tasks.push({ id: uid('task'), type, person, customer, work, priority, effortValue, effortUnit, date, status });
  }

  saveData(); renderTasksTable(); closeTaskModal();
}

function closeTaskModal() {
  editingTask = null;
  hideModal('modal-task');
}

/* ---------------------------------------------------------------------- */
/* Verwalten (Manage modal)                                               */
/* ---------------------------------------------------------------------- */

function wireManageModal() {
  document.getElementById('btn-manage').addEventListener('click', () => {
    renderManageEmployees(); renderManageProjects(); renderManageActivities(); renderManagePhases();
    showModal('modal-manage');
  });
  document.getElementById('manage-close').addEventListener('click', () => hideModal('modal-manage'));

  document.querySelectorAll('.manage-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.manage-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.manage-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('manage-' + btn.dataset.mtab).classList.add('active');
    });
  });

  document.getElementById('add-employee-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-employee-name');
    const teamInput = document.getElementById('new-employee-team');
    if (!nameInput.value.trim()) return;
    DATA.employees.push({ id: uid('emp'), name: nameInput.value.trim(), team: teamInput.value.trim() });
    nameInput.value = ''; teamInput.value = '';
    saveData(); renderManageEmployees(); renderWeekTable();
  });

  document.getElementById('add-project-btn').addEventListener('click', () => {
    const numInput = document.getElementById('new-project-number');
    const nameInput = document.getElementById('new-project-name');
    const colorInput = document.getElementById('new-project-color');
    if (!nameInput.value.trim()) return;
    DATA.projects.push({ id: uid('prj'), number: numInput.value.trim(), name: nameInput.value.trim(), color: colorInput.value });
    numInput.value = ''; nameInput.value = '';
    saveData(); renderManageProjects(); renderWeekTable();
  });

  document.getElementById('add-activity-btn').addEventListener('click', () => {
    const nameInput = document.getElementById('new-activity-name');
    const colorInput = document.getElementById('new-activity-color');
    if (!nameInput.value.trim()) return;
    DATA.activityTypes.push({ id: uid('act'), name: nameInput.value.trim(), color: colorInput.value });
    nameInput.value = '';
    saveData(); renderManageActivities(); renderWeekLegend(); renderWeekTable();
  });

  document.getElementById('add-phase-btn').addEventListener('click', () => {
    const codeInput = document.getElementById('new-phase-code');
    const nameInput = document.getElementById('new-phase-name');
    const colorInput = document.getElementById('new-phase-color');
    if (!codeInput.value.trim()) return;
    DATA.phaseTypes.push({ id: uid('ph'), code: codeInput.value.trim().toUpperCase(), name: nameInput.value.trim(), color: colorInput.value });
    codeInput.value = ''; nameInput.value = '';
    saveData(); renderManagePhases(); renderGanttLegend(); renderGantt();
  });
}

function renderManageEmployees() {
  const list = document.getElementById('manage-employees-list');
  list.innerHTML = '';
  DATA.employees.forEach(emp => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    const nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = emp.name;
    nameInput.addEventListener('change', () => { emp.name = nameInput.value.trim(); saveData(); renderWeekTable(); });
    const teamInput = document.createElement('input');
    teamInput.type = 'text'; teamInput.value = emp.team || ''; teamInput.placeholder = 'Team';
    teamInput.style.maxWidth = '110px';
    teamInput.addEventListener('change', () => { emp.team = teamInput.value.trim(); saveData(); renderWeekTable(); });
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Löschen';
    delBtn.addEventListener('click', async () => {
      const ok = await askConfirm(`Mitarbeiter "${emp.name}" löschen?`);
      if (!ok) return;
      DATA.employees = DATA.employees.filter(e => e.id !== emp.id);
      Object.keys(DATA.entries).forEach(k => { if (k.startsWith(emp.id + '::')) delete DATA.entries[k]; });
      saveData(); renderManageEmployees(); renderWeekTable();
    });
    row.appendChild(nameInput); row.appendChild(teamInput); row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function renderManageProjects() {
  const list = document.getElementById('manage-projects-list');
  list.innerHTML = '';
  DATA.projects.forEach(prj => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    const numInput = document.createElement('input');
    numInput.type = 'text'; numInput.value = prj.number || ''; numInput.style.maxWidth = '80px'; numInput.placeholder = 'Nr.';
    numInput.addEventListener('change', () => { prj.number = numInput.value.trim(); saveData(); renderWeekTable(); });
    const nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = prj.name;
    nameInput.addEventListener('change', () => { prj.name = nameInput.value.trim(); saveData(); renderWeekTable(); });
    const colorInput = document.createElement('input');
    colorInput.type = 'color'; colorInput.value = prj.color || '#4a90d9';
    colorInput.addEventListener('change', () => { prj.color = colorInput.value; saveData(); renderWeekTable(); });
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Löschen';
    delBtn.addEventListener('click', async () => {
      const ok = await askConfirm(`Projekt "${prj.name}" löschen?`);
      if (!ok) return;
      DATA.projects = DATA.projects.filter(p => p.id !== prj.id);
      Object.keys(DATA.entries).forEach(k => { if (DATA.entries[k].projectId === prj.id) DATA.entries[k].projectId = null; });
      saveData(); renderManageProjects(); renderWeekTable();
    });
    row.appendChild(numInput); row.appendChild(nameInput); row.appendChild(colorInput); row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function renderManageActivities() {
  const list = document.getElementById('manage-activities-list');
  list.innerHTML = '';
  DATA.activityTypes.forEach(act => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    const nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = act.name;
    nameInput.addEventListener('change', () => { act.name = nameInput.value.trim(); saveData(); renderWeekLegend(); renderWeekTable(); });
    const colorInput = document.createElement('input');
    colorInput.type = 'color'; colorInput.value = act.color;
    colorInput.addEventListener('change', () => { act.color = colorInput.value; saveData(); renderWeekLegend(); renderWeekTable(); });
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Löschen';
    delBtn.addEventListener('click', async () => {
      const ok = await askConfirm(`Kategorie "${act.name}" löschen?`);
      if (!ok) return;
      DATA.activityTypes = DATA.activityTypes.filter(a => a.id !== act.id);
      Object.keys(DATA.entries).forEach(k => { if (DATA.entries[k].activityTypeId === act.id) DATA.entries[k].activityTypeId = null; });
      saveData(); renderManageActivities(); renderWeekLegend(); renderWeekTable();
    });
    row.appendChild(nameInput); row.appendChild(colorInput); row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function renderManagePhases() {
  const list = document.getElementById('manage-phases-list');
  list.innerHTML = '';
  DATA.phaseTypes.forEach(ph => {
    const row = document.createElement('div');
    row.className = 'manage-row';
    const codeInput = document.createElement('input');
    codeInput.type = 'text'; codeInput.value = ph.code; codeInput.style.maxWidth = '70px';
    codeInput.addEventListener('change', () => { ph.code = codeInput.value.trim().toUpperCase(); saveData(); renderGanttLegend(); renderGantt(); });
    const nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.value = ph.name || ''; nameInput.placeholder = 'Name (optional)';
    nameInput.addEventListener('change', () => { ph.name = nameInput.value.trim(); saveData(); renderGanttLegend(); renderGantt(); });
    const colorInput = document.createElement('input');
    colorInput.type = 'color'; colorInput.value = ph.color;
    colorInput.addEventListener('change', () => { ph.color = colorInput.value; saveData(); renderGanttLegend(); renderGantt(); });
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger'; delBtn.textContent = 'Löschen';
    delBtn.addEventListener('click', async () => {
      const ok = await askConfirm(`Phase "${ph.code}" löschen?`);
      if (!ok) return;
      DATA.phaseTypes = DATA.phaseTypes.filter(p => p.id !== ph.id);
      saveData(); renderManagePhases(); renderGanttLegend(); renderGantt();
    });
    row.appendChild(codeInput); row.appendChild(nameInput); row.appendChild(colorInput); row.appendChild(delBtn);
    list.appendChild(row);
  });
}

/* ---------------------------------------------------------------------- */
/* Export / Import                                                        */
/* ---------------------------------------------------------------------- */

function wireExportImport() {
  document.getElementById('btn-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(DATA, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `planungstool_${isoDate(new Date())}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  document.getElementById('btn-import').addEventListener('click', () => {
    document.getElementById('import-file').click();
  });
  document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.employees) throw new Error('Ungültiges Format');
        const ok = await askConfirm('Aktuelle Daten werden durch die importierte Datei ersetzt. Fortfahren?', 'Importieren');
        if (!ok) return;
        DATA = migrate(parsed);
        saveData(); renderAll();
      } catch (err) {
        alert('Import fehlgeschlagen: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}

/* ---------------------------------------------------------------------- */
/* Modal helpers                                                          */
/* ---------------------------------------------------------------------- */

let modalStack = [];

function showModal(id) {
  const current = document.querySelector('.modal:not(.hidden)');
  if (current && current.id !== id) {
    current.classList.add('hidden');
    modalStack.push(current.id);
  }
  document.getElementById('modal-backdrop').classList.remove('hidden');
  document.getElementById(id).classList.remove('hidden');
}
function hideModal(id) {
  document.getElementById(id).classList.add('hidden');
  if (modalStack.length) {
    const prev = modalStack.pop();
    document.getElementById(prev).classList.remove('hidden');
  } else {
    document.getElementById('modal-backdrop').classList.add('hidden');
  }
}
function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  document.getElementById('modal-backdrop').classList.add('hidden');
  modalStack = [];
  editingCell = null; editingBar = null;
  if (promptResolver) { const r = promptResolver; promptResolver = null; r(null); }
  if (confirmResolver) { const r = confirmResolver; confirmResolver = null; r(false); }
}

/* ---- Generic prompt / confirm modals (replace native prompt()/confirm()) ---- */

let promptResolver = null;
let confirmResolver = null;

function askPrompt(title, fields) {
  document.getElementById('prompt-title').textContent = title;
  const container = document.getElementById('prompt-fields');
  container.innerHTML = '';
  const inputs = fields.map(f => {
    const label = document.createElement('label');
    label.textContent = f.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = f.placeholder || '';
    input.value = f.value || '';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); promptResolver && promptResolver(true); }
    });
    label.appendChild(input);
    container.appendChild(label);
    return { id: f.id, input };
  });
  showModal('modal-prompt');
  setTimeout(() => { if (inputs[0]) inputs[0].input.focus(); }, 20);
  return new Promise((resolve) => {
    promptResolver = (ok) => {
      promptResolver = null;
      hideModal('modal-prompt');
      if (!ok) { resolve(null); return; }
      const result = {};
      inputs.forEach(i => { result[i.id] = i.input.value.trim(); });
      resolve(result);
    };
  });
}

function askConfirm(message, okLabel) {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-ok').textContent = okLabel || 'Löschen';
  showModal('modal-confirm');
  return new Promise((resolve) => {
    confirmResolver = (ok) => {
      confirmResolver = null;
      hideModal('modal-confirm');
      resolve(ok);
    };
  });
}

function wirePromptConfirmModals() {
  document.getElementById('prompt-ok').addEventListener('click', () => promptResolver && promptResolver(true));
  document.getElementById('prompt-cancel').addEventListener('click', () => promptResolver && promptResolver(false));
  document.getElementById('confirm-ok').addEventListener('click', () => confirmResolver && confirmResolver(true));
  document.getElementById('confirm-cancel').addEventListener('click', () => confirmResolver && confirmResolver(false));
}
