(() => {
  'use strict';
  const root = document.querySelector('[data-regex-lab]');
  if (!root) return;
  const el = (id) => document.getElementById(id);
  const pattern = el('rx-pattern');
  const source = el('rx-source');
  const flags = ['i', 'm', 's'];
  const highlight = el('rx-highlight');
  const list = el('rx-match-list');
  const status = el('rx-status');
  const counter = el('rx-counter');
  const summary = el('rx-results-summary');
  const charCount = el('rx-chars');
  const copyMatches = el('rx-copy-matches');
  const initial = { pattern: pattern.value, source: source.value };
  const examples = {
    ipv4: { pattern: String.raw`\b(?:\d{1,3}\.){3}\d{1,3}\b`, source: 'router=192.168.1.1\nfirewall=10.0.0.25\nservidor=172.20.0.10', flags: '' },
    email: { pattern: String.raw`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`, source: 'admin@ejemplo.com\nsoporte@empresa.es\ntexto sin correo', flags: 'i' },
    date: { pattern: String.raw`\b\d{4}-\d{2}-\d{2}\b`, source: 'Backup: 2026-11-20\nÚltima revisión: 2026-10-08', flags: '' },
    log: { pattern: String.raw`^.*sshd.*(?:Failed|Accepted).*$`, source: 'Nov 20 13:00:01 server sshd[100]: Failed password for root from 10.0.0.4\nNov 20 13:00:02 server cron[200]: job completed\nNov 20 13:00:03 server sshd[101]: Accepted publickey for user from 10.0.0.5', flags: 'mi' },
    ports: { pattern: String.raw`\b(?:port|puerto)\s*[:=]\s*(?<puerto>\d{1,5})\b`, source: 'tcp port=443\nudp puerto: 53\nservice port=8080', flags: 'i' }
  };
  let worker = null;
  let timer = null;
  let deadline = null;
  let current = 0;
  let currentMatches = [];
  let truncated = false;
  const workerUrl = new URL('regex-worker.js', document.currentScript.src);

  function textNode(tag, text, cls) {
    const node = document.createElement(tag);
    node.textContent = text;
    if (cls) node.className = cls;
    return node;
  }
  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('error', isError);
  }
  function clearWorker() {
    if (worker) worker.terminate();
    worker = null;
    if (deadline !== null) clearTimeout(deadline);
    deadline = null;
  }
  function render(matches, limit) {
    currentMatches = matches;
    truncated = limit;
    const src = source.value;
    highlight.replaceChildren();
    let cursor = 0;
    for (const match of matches) {
      if (match.start < cursor) continue;
      highlight.append(document.createTextNode(src.slice(cursor, match.start)));
      const marked = document.createElement('mark');
      marked.textContent = src.slice(match.start, match.end);
      highlight.append(marked);
      cursor = match.end;
    }
    highlight.append(document.createTextNode(src.slice(cursor)));
    counter.textContent = `${matches.length}${limit ? '+' : ''} coincidencia${matches.length === 1 && !limit ? '' : 's'}`;
    summary.textContent = matches.length ? `${matches.length}${limit ? '+' : ''} resultado(s)` : 'Sin resultados';
    copyMatches.disabled = matches.length === 0;
    list.replaceChildren();
    if (!matches.length) {
      list.append(textNode('p', 'No se encontraron coincidencias.', 'rx-empty'));
      return;
    }
    matches.forEach((match, index) => {
      const box = textNode('div', '', 'rx-match');
      const top = textNode('div', '', 'rx-match-top');
      top.append(textNode('strong', `#${index + 1}`), textNode('code', JSON.stringify(match.value)), textNode('span', `Posición ${match.start}–${match.end}`, 'rx-match-pos'));
      box.append(top);
      if (match.groups.length || match.named.length) {
        const groups = textNode('div', '', 'rx-groups');
        match.groups.forEach((group) => {
          const row = textNode('div', `Grupo ${group.name}: `, 'rx-group');
          row.append(textNode('code', group.value === null ? '(sin captura)' : JSON.stringify(group.value)));
          groups.append(row);
        });
        match.named.forEach((group) => {
          const row = textNode('div', `Nombre ${group.name}: `, 'rx-group');
          row.append(textNode('code', group.value === null ? '(sin captura)' : JSON.stringify(group.value)));
          groups.append(row);
        });
        box.append(groups);
      }
      list.append(box);
    });
  }
  function run() {
    clearWorker();
    const job = ++current;
    const src = source.value;
    charCount.textContent = `${src.length} caracteres`;
    render([], false);
    if (!pattern.value) { setStatus('Introduce una expresión regular.'); return; }
    if (src.length > 100000 || pattern.value.length > 1000) {
      setStatus('Límite: 100.000 caracteres de texto y 1.000 de patrón.', true);
      return;
    }
    const selected = flags.filter(f => el(`rx-flag-${f}`).checked).join('');
    try {
      worker = new Worker(workerUrl);
    } catch (_) {
      setStatus('Este navegador no permite iniciar el motor de evaluación.', true);
      return;
    }
    setStatus('Analizando…');
    worker.onmessage = (event) => {
      if (job !== current || event.data.id !== job) return;
      const { matches, truncated: limit, error } = event.data;
      clearWorker();
      if (error) { setStatus(`Patrón no válido: ${error}`, true); return; }
      render(matches, limit);
      setStatus(limit ? 'Se muestran las primeras 500 coincidencias.' : 'Patrón válido. Evaluación completada.');
    };
    worker.onerror = () => {
      if (job !== current) return;
      clearWorker();
      setStatus('No se pudo evaluar el patrón.', true);
    };
    worker.postMessage({ id: job, pattern: pattern.value, flags: selected, source: src });
    deadline = setTimeout(() => {
      if (job !== current) return;
      clearWorker();
      setStatus('Evaluación detenida: el patrón tarda demasiado. Simplifica la expresión.', true);
    }, 750);
  }
  function schedule() {
    clearTimeout(timer);
    clearWorker();
    ++current;
    timer = setTimeout(run, 180);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); setStatus('Copiado al portapapeles.'); }
    catch (_) { setStatus('No se pudo copiar. Comprueba los permisos del navegador.', true); }
  }
  pattern.addEventListener('input', schedule);
  source.addEventListener('input', schedule);
  flags.forEach(f => el(`rx-flag-${f}`).addEventListener('change', schedule));
  el('rx-copy-pattern').addEventListener('click', () => copy(pattern.value));
  copyMatches.addEventListener('click', () => copy(currentMatches.map(m => m.value).join('\n')));
  el('rx-reset').addEventListener('click', () => {
    pattern.value = initial.pattern;
    source.value = initial.source;
    flags.forEach(f => { el(`rx-flag-${f}`).checked = false; });
    schedule();
  });
  root.querySelectorAll('[data-rx-example]').forEach(button => {
    button.addEventListener('click', () => {
      const data = examples[button.dataset.rxExample];
      if (!data) return;
      pattern.value = data.pattern;
      source.value = data.source;
      flags.forEach(f => { el(`rx-flag-${f}`).checked = data.flags.includes(f); });
      schedule();
    });
  });
  copyMatches.disabled = true;
  run();
})();
