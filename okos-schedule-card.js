/*
 * okos-schedule-card — grafikus heti ütemező Zigbee2MQTT termosztátokhoz
 * (pl. SONOFF TP-WGZBA: weekly_schedule_monday … sunday, "HH:mm/hőfok" szöveges entitások)
 *
 * Használat:
 *   type: custom:okos-schedule-card
 *   entity: text.<eszkoz>_weekly_schedule_monday   # bármelyik nap, a többit levezeti
 *   group_entity: select.<eszkoz>_schedule_group_to_edit   # opcionális
 *   name: Nappali
 */
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_RE = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/;
const HU = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
const HU_SHORT = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

const pad = (n) => String(n).padStart(2, '0');
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const norm = (t) => { const [h, m] = String(t).split(':'); return `${pad(h)}:${pad(m)}`; };
// A skála a tipikus lakótéri tartományra (16–26 °C) van széthúzva, hogy a közeli értékek is jól elváljanak.
const color = (c) => {
  const k = Math.min(1, Math.max(0, (c - 16) / 10));
  return `hsl(${Math.round(225 - 225 * k)}, 78%, ${Math.round(40 + 4 * Math.sin(k * Math.PI))}%)`;
};

function parse(s) {
  if (!s || s === 'unknown' || s === 'unavailable') return [];
  return s.trim().split(/\s+/).map((tok) => {
    const [t, c] = tok.split('/');
    return { t: /^\d{1,2}:\d\d$/.test(t || '') ? norm(t) : null, c: parseFloat(c) };
  }).filter((x) => x.t && !isNaN(x.c)).sort((a, b) => toMin(a.t) - toMin(b.t))
    // Az eszköz a nem használt helyeket az utolsó átmenet ismétlésével tölti fel (pl. 22:00/16 ×7): ezeket egybevonjuk.
    .filter((x, i, arr) => i === 0 || x.t !== arr[i - 1].t);
}
const serialize = (rows) =>
  rows.slice().sort((a, b) => toMin(a.t) - toMin(b.t)).map((r) => `${norm(r.t)}/${r.c}`).join(' ');

const CSS = `
  :host { display: block; }
  ha-card { padding: 12px 14px 14px; }
  .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .title { font-size: 1.1rem; font-weight: 500; }
  select, input[type=time], input[type=number] {
    font: inherit; color: var(--primary-text-color); background: var(--secondary-background-color);
    border: 1px solid var(--divider-color); border-radius: 8px; padding: 6px 8px; min-width: 0;
  }
  .axis { position: relative; height: 14px; margin-left: 46px; font-size: 0.7rem; color: var(--secondary-text-color); }
  .axis span { position: absolute; transform: translateX(-50%); }
  .row { display: grid; grid-template-columns: 40px 1fr; gap: 6px; align-items: center; margin: 5px 0; cursor: pointer; }
  .row .d { font-size: 0.85rem; color: var(--secondary-text-color); }
  .row.today .d { color: var(--primary-text-color); font-weight: 600; }
  .bar { position: relative; display: flex; gap: 2px; height: 40px; padding: 2px; box-sizing: border-box;
         border-radius: 12px; overflow: hidden; background: var(--secondary-background-color); }
  .seg { display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.1;
         color: #fff; border-radius: 8px; white-space: nowrap; overflow: hidden;
         text-shadow: 0 1px 2px rgba(0,0,0,.45); box-shadow: inset 0 -10px 14px -12px rgba(0,0,0,.35); }
  .seg b { font-size: 0.82rem; font-weight: 600; }
  .seg small { font-size: 0.62rem; opacity: .85; }
  .now { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--primary-text-color); opacity: .75; pointer-events: none; }
  .row { margin: 7px 0; }
  .empty { padding: 0 8px; font-size: 0.75rem; color: var(--secondary-text-color); align-self: center; }
  .hint { font-size: 0.75rem; color: var(--secondary-text-color); margin-top: 8px; }
  .tr { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 8px; align-items: center; margin: 6px 0; }
  .tr span { color: var(--secondary-text-color); }
  button { font: inherit; cursor: pointer; border-radius: 8px; border: 1px solid var(--divider-color);
           background: var(--secondary-background-color); color: var(--primary-text-color); padding: 7px 12px; }
  button.primary { background: var(--primary-color); color: var(--text-primary-color, #fff); border-color: transparent; }
  button:disabled { opacity: .4; cursor: default; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 10px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--divider-color); border-radius: 16px; font-size: 0.85rem; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 12px; }
  .err { color: var(--error-color, #db4437); font-size: 0.85rem; margin-top: 8px; }
  .lbl { font-size: 0.85rem; color: var(--secondary-text-color); margin-top: 10px; }
`;

class OkosScheduleCard extends HTMLElement {
  static getConfigElement() { return document.createElement('okos-schedule-card-editor'); }
  static getStubConfig(hass) {
    const e = Object.keys(hass.states).find((k) => k.startsWith('text.') && /weekly_schedule_monday$/.test(k));
    return { entity: e || 'text.termosztat_weekly_schedule_monday' };
  }

  setConfig(config) {
    if (!config.entity) throw new Error('Add meg egy weekly_schedule entitást.');
    this._cfg = config;
    this._edit = null;
    this._sig = null;
    this._render();
  }

  getCardSize() { return 6; }

  set hass(h) {
    this._hass = h;
    if (this._edit || !this._cfg) { if (!this._rendered) this._render(); return; }
    const sig = this._signature();
    if (sig !== this._sig) { this._sig = sig; this._render(); }
  }

  _signature() {
    const ids = DAYS.map((d) => this._entityFor(d)).concat([this._groupId()]);
    return ids.map((i) => (i && this._hass.states[i] ? this._hass.states[i].state : '-')).join('|');
  }

  _entityFor(day) {
    return DAY_RE.test(this._cfg.entity) ? this._cfg.entity.replace(DAY_RE, day) : null;
  }

  _groupId() {
    if (this._cfg.group_entity) return this._cfg.group_entity;
    const g = this._cfg.entity.replace(/^text\./, 'select.').replace(/weekly_schedule_[a-z]+$/, 'schedule_group_to_edit');
    return this._hass && this._hass.states[g] ? g : null;
  }

  _render() {
    if (!this._cfg || !this._hass) return;
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this._bind();
    }
    this._rendered = true;
    this.shadowRoot.innerHTML = `<style>${CSS}</style><ha-card>${this._edit ? this._editHTML() : this._viewHTML()}</ha-card>`;
  }

  _groupHTML() {
    const gid = this._groupId();
    const st = gid && this._hass.states[gid];
    if (!st) return '';
    const opts = (st.attributes.options || []).map((o) => `<option ${o === st.state ? 'selected' : ''}>${o}</option>`).join('');
    return `<label>Csoport: <select data-group>${opts}</select></label>`;
  }

  _viewHTML() {
    if (!DAY_RE.test(this._cfg.entity)) {
      return `<div class="err">Az entitás neve nem tartalmaz angol napnevet (pl. …weekly_schedule_monday), ezért a többi nap nem vezethető le.</div>`;
    }
    const today = (new Date().getDay() + 6) % 7;
    const now = new Date();
    const nowPct = ((now.getHours() * 60 + now.getMinutes()) / 1440) * 100;
    const axis = [0, 6, 12, 18, 24].map((h) => `<span style="left:${(h / 24) * 100}%">${h}</span>`).join('');
    const rows = DAYS.map((d, i) => {
      const id = this._entityFor(d);
      const st = this._hass.states[id];
      if (!st) return `<div class="row"><div class="d">${HU_SHORT[i]}</div><div class="err">Nincs ilyen entitás: ${id}</div></div>`;
      const tr = parse(st.state);
      let segs = '';
      if (!tr.length) segs = `<div class="empty">nincs adat</div>`;
      else {
        tr.forEach((x, k) => {
          const a = toMin(x.t);
          const b = k + 1 < tr.length ? toMin(tr[k + 1].t) : 1440;
          const w = ((b - a) / 1440) * 100;
          const label = w > 9 ? `<b>${x.c}°</b>` + (w > 14 ? `<small>${x.t}</small>` : '') : '';
          segs += `<div class="seg" style="flex:${b - a} 1 0;background:${color(x.c)}" title="${x.t} → ${x.c}°C">${label}</div>`;
        });
      }
      const marker = i === today ? `<div class="now" style="left:${nowPct}%"></div>` : '';
      return `<div class="row ${i === today ? 'today' : ''}" data-day="${i}"><div class="d">${HU_SHORT[i]}</div><div class="bar">${segs}${marker}</div></div>`;
    }).join('');
    return `<div class="top"><div class="title">${this._cfg.name || 'Heti ütemező'}</div>${this._groupHTML()}</div>
      <div class="axis">${axis}</div>${rows}
      <div class="hint">Koppints egy napra a szerkesztéshez. A szerkesztés mindig a kiválasztott csoportba ír.</div>`;
  }

  _editHTML() {
    const e = this._edit;
    const rows = e.rows.map((r, k) => `
      <div class="tr">
        <input type="time" data-f="t" data-k="${k}" value="${r.t}" ${k === 0 ? 'disabled' : ''}>
        <input type="number" data-f="c" data-k="${k}" value="${r.c}" min="5" max="30" step="0.5" inputmode="decimal">
        <span>°C</span>
        <button data-act="del" data-k="${k}" ${k === 0 ? 'disabled' : ''} aria-label="Törlés">✕</button>
      </div>`).join('');
    const chips = DAYS.map((_, j) => j === e.day ? '' :
      `<label class="chip"><input type="checkbox" data-copy="${j}" ${e.copy.has(j) ? 'checked' : ''}>${HU_SHORT[j]}</label>`).join('');
    return `<div class="top"><div class="title">${HU[e.day]}</div>${this._groupHTML()}</div>
      ${rows}
      <button data-act="add" ${e.rows.length >= 12 ? 'disabled' : ''}>Új átmenet</button>
      <div class="lbl">Ugyanez a többi napra is:</div><div class="chips">${chips}</div>
      ${e.err ? `<div class="err">${e.err}</div>` : ''}
      <div class="actions"><button data-act="cancel">Mégse</button><button class="primary" data-act="save">Mentés</button></div>`;
  }

  _bind() {
    const root = this.shadowRoot;
    root.addEventListener('click', (ev) => {
      const actEl = ev.target.closest('[data-act]');
      if (actEl) return this._act(actEl.dataset.act, actEl.dataset.k);
      const row = ev.target.closest('.row[data-day]');
      if (row && !this._edit) this._startEdit(Number(row.dataset.day));
    });
    root.addEventListener('input', (ev) => {
      const el = ev.target;
      if (!this._edit || !el.dataset.f) return;
      const r = this._edit.rows[Number(el.dataset.k)];
      if (el.dataset.f === 't') r.t = el.value;
      else r.c = el.value === '' ? '' : Number(el.value);
    });
    root.addEventListener('change', (ev) => {
      const el = ev.target;
      if (el.dataset.copy !== undefined && this._edit) {
        const j = Number(el.dataset.copy);
        el.checked ? this._edit.copy.add(j) : this._edit.copy.delete(j);
      }
      if (el.hasAttribute('data-group')) {
        this._hass.callService('select', 'select_option', { entity_id: this._groupId(), option: el.value });
      }
    });
  }

  _startEdit(day) {
    const st = this._hass.states[this._entityFor(DAYS[day])];
    if (!st) return;
    let rows = parse(st.state);
    if (!rows.length) rows = [{ t: '00:00', c: 20 }];
    rows[0].t = '00:00';
    this._edit = { day, rows, copy: new Set(), err: '' };
    this._render();
  }

  _act(act, k) {
    const e = this._edit;
    if (act === 'cancel') { this._edit = null; this._sig = null; return this._render(); }
    if (!e) return;
    if (act === 'add') {
      const last = e.rows[e.rows.length - 1];
      const m = Math.min(1439, toMin(norm(last.t)) + 60);
      e.rows.push({ t: `${pad(Math.floor(m / 60))}:${pad(m % 60)}`, c: last.c });
      return this._render();
    }
    if (act === 'del') { e.rows.splice(Number(k), 1); return this._render(); }
    if (act === 'save') return this._save();
  }

  async _save() {
    const e = this._edit;
    const rows = e.rows.map((r) => ({ t: r.t ? norm(r.t) : '', c: r.c }));
    const bad = rows.find((r) => !r.t || r.t.includes('NaN') || r.c === '' || r.c < 5 || r.c > 30);
    if (bad) { e.err = 'Minden sorhoz kell időpont és 5–30 °C közötti hőfok.'; return this._render(); }
    if (new Set(rows.map((r) => r.t)).size !== rows.length) { e.err = 'Két átmenet nem lehet ugyanabban az időpontban.'; return this._render(); }
    const value = serialize(rows);
    try {
      for (const d of [e.day, ...e.copy]) {
        await this._hass.callService('text', 'set_value', { entity_id: this._entityFor(DAYS[d]), value });
      }
      this._edit = null;
      this._sig = null;
    } catch (err) {
      e.err = 'Mentési hiba: ' + (err.message || err);
    }
    this._render();
  }
}

class OkosScheduleCardEditor extends HTMLElement {
  setConfig(c) { this._cfg = c; this._build(); }
  set hass(h) { this._hass = h; if (this._form) this._form.hass = h; }
  _build() {
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (ev) => {
        this._cfg = ev.detail.value;
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    const labels = {
      entity: 'Ütemező entitás (bármelyik nap, pl. …weekly_schedule_monday)',
      group_entity: 'Csoportválasztó (schedule_group_to_edit, nem kötelező)',
      name: 'Név',
    };
    this._form.hass = this._hass;
    this._form.data = this._cfg;
    this._form.schema = [
      { name: 'entity', required: true, selector: { entity: { domain: 'text' } } },
      { name: 'group_entity', selector: { entity: { domain: 'select' } } },
      { name: 'name', selector: { text: {} } },
    ];
    this._form.computeLabel = (s) => labels[s.name] || s.name;
  }
}

customElements.define('okos-schedule-card', OkosScheduleCard);
customElements.define('okos-schedule-card-editor', OkosScheduleCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'okos-schedule-card',
  name: 'Termosztát heti ütemező',
  description: 'Grafikus heti ütemező Zigbee2MQTT termosztátokhoz (HH:mm/hőfok szöveges entitások).',
});

console.info('%c OKOS-SCHEDULE-CARD %c v1.0.1 ', 'color:#fff;background:#e8590c;font-weight:700', 'color:#e8590c;background:#fff;font-weight:700');
