(() => {
  "use strict";
  const root = document.querySelector('[data-acl-app]');
  if (!root) return;
  const $ = id => root.querySelector(`#${id}`);
  const rules = [];

  function parseIp(value) {
    const parts = value.split('.');
    if (parts.length !== 4 || parts.some(x => !/^\d{1,3}$/.test(x) || +x > 255)) throw Error(`IPv4 inválida: ${value}`);
    return parts.reduce((acc, p) => ((acc << 8) | +p) >>> 0, 0);
  }
  const toIp = n => [24, 16, 8, 0].map(s => (n >>> s) & 255).join('.');
  function address(input) {
    const raw = input.trim().toLowerCase();
    if (raw === 'any') return { kind: 'any', network: 0, prefix: 0, label: 'any' };
    const parts = raw.split('/');
    if (parts.length > 2 || !parts[0]) throw Error(`Dirección inválida: ${input}`);
    const ip = parseIp(parts[0]);
    const prefix = parts.length === 1 ? 32 : Number(parts[1]);
    if ((parts.length === 2 && !/^(?:\d|[12]\d|3[012])$/.test(parts[1])) || !Number.isInteger(prefix)) throw Error(`Prefijo CIDR inválido: ${input}`);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = (ip & mask) >>> 0;
    return { kind: 'cidr', network, prefix, label: `${toIp(network)}/${prefix}` };
  }
  function ports(input, protocol) {
    const raw = input.trim().toLowerCase();
    if (protocol !== 'tcp' && protocol !== 'udp') {
      if (raw && raw !== 'any') throw Error('Los puertos solo se permiten con TCP o UDP.');
      return { kind: 'any', label: 'any' };
    }
    if (!raw || raw === 'any') return { kind: 'any', label: 'any' };
    if (/^\d{1,5}$/.test(raw)) {
      const n = Number(raw);
      if (n < 1 || n > 65535) throw Error('Los puertos deben estar entre 1 y 65535.');
      return { kind: 'eq', from: n, to: n, label: String(n) };
    }
    const match = /^(\d{1,5})-(\d{1,5})$/.exec(raw);
    if (!match) throw Error('Puerto no válido: usa any, 443 o 1000-2000.');
    const from = +match[1], to = +match[2];
    if (from < 1 || to > 65535 || from >= to) throw Error('Intervalo de puertos inválido.');
    return { kind: 'range', from, to, label: `${from}-${to}` };
  }
  function addrCli(a) {
    if (a.kind === 'any' || a.prefix === 0) return 'any';
    if (a.prefix === 32) return `host ${toIp(a.network)}`;
    const mask = (0xffffffff >>> a.prefix) >>> 0;
    return `${toIp(a.network)} ${toIp(mask)}`;
  }
  function portCli(p) { return p.kind === 'any' ? '' : p.kind === 'eq' ? ` eq ${p.from}` : ` range ${p.from} ${p.to}`; }
  // Cisco extended ACL syntax: source [source-port] destination [destination-port].
  function ace(r) { return `${r.action} ${r.protocol} ${addrCli(r.src)}${portCli(r.sport)} ${addrCli(r.dst)}${portCli(r.dport)}${r.log ? ' log' : ''}`; }
  function validateName(id, type) {
    const value = $(id).value.trim();
    if (type === 'acl' && !/^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(value)) throw Error('Nombre de ACL: empieza por letra y utiliza solo letras, números, _, . o -.');
    if (type === 'iface' && value && !/^[A-Za-z][A-Za-z0-9/._:-]{0,63}$/.test(value)) throw Error('Nombre de interfaz inválido.');
    return value;
  }
  function config() {
    const name = validateName('acl-name', 'acl');
    const iface = validateName('acl-interface', 'iface');
    const lines = [`ip access-list extended ${name}`];
    rules.forEach((r, i) => lines.push(` ${10 * (i + 1)} ${ace(r)}`));
    lines.push('exit');
    if (iface) lines.push(`!`, `interface ${iface}`, ` ip access-group ${name} ${$('acl-direction').value}`, 'exit');
    return lines.join('\n') + '\n';
  }
  function download(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function safeFilename() { return ($('acl-name').value.trim().replace(/[^A-Za-z0-9_.-]/g, '_') || 'acl'); }
  function issue(msg) { $('acl-error').textContent = msg; $('acl-error').hidden = !msg; }
  function render() {
    const list = $('acl-rules'); list.replaceChildren();
    rules.forEach((r, i) => {
      const line = document.createElement('div'); line.className = 'acl-rule';
      const info = document.createElement('div'); info.className = 'acl-rule-main';
      const mark = document.createElement('span'); mark.className = `acl-action ${r.action === 'permit' ? 'acl-allow' : 'acl-deny'}`; mark.textContent = r.action.toUpperCase();
      const seq = document.createElement('small'); seq.textContent = `Secuencia ${10 * (i + 1)}`;
      const code = document.createElement('code'); code.textContent = ace(r);
      info.append(mark, code, seq);
      const controls = document.createElement('div'); controls.className = 'acl-rule-controls';
      [['↑', -1, 'Subir'], ['↓', 1, 'Bajar'], ['×', 0, 'Eliminar']].forEach(([txt, offset, title]) => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.title = title; btn.setAttribute('aria-label', `${title} regla ${i+1}`); btn.textContent = txt;
        btn.disabled = offset !== 0 && (i + offset < 0 || i + offset >= rules.length);
        btn.addEventListener('click', () => { if (!offset) rules.splice(i, 1); else [rules[i], rules[i + offset]] = [rules[i + offset], rules[i]]; render(); });
        controls.append(btn);
      });
      line.append(info, controls); list.append(line);
    });
    if (!rules.length) { const empty = document.createElement('p'); empty.className = 'acl-empty'; empty.textContent = 'Todavía no hay reglas. Añade una para empezar.'; list.append(empty); }
    $('acl-count').textContent = `${rules.length} regla${rules.length === 1 ? '' : 's'}`;
    const warnings = [];
    const seen = new Map();
    rules.forEach((r, i) => {
      const exact = `${r.protocol}|${r.src.label}|${r.dst.label}|${r.sport.label}|${r.dport.label}`;
      if (seen.has(exact)) warnings.push(`Regla ${i+1}: mismo criterio de coincidencia que la regla ${seen.get(exact)+1}; nunca se alcanzará.`);
      else seen.set(exact, i);
      const earlierAll = rules.slice(0, i).findIndex(x => x.protocol === 'ip' && x.src.kind === 'any' && x.dst.kind === 'any');
      if (earlierAll >= 0) warnings.push(`Regla ${i+1}: está cubierta por la regla general ${earlierAll+1} (ip any any).`);
    });
    $('acl-warnings').textContent = warnings.join(' ');
    try { $('acl-config').textContent = config(); issue(''); }
    catch (e) { $('acl-config').textContent = '! Corrige la configuración: ' + e.message; issue(e.message); }
  }
  $('acl-rule-form').addEventListener('submit', e => {
    e.preventDefault();
    try {
      const protocol = $('acl-protocol').value;
      const src = address($('acl-source').value), dst = address($('acl-destination').value);
      const sport = ports($('acl-sport').value, protocol), dport = ports($('acl-dport').value, protocol);
      if (rules.length >= 100) throw Error('Límite de 100 reglas por ACL.');
      rules.push({ action: $('acl-action').value, protocol, src, dst, sport, dport, log: $('acl-log').checked });
      issue(''); render();
    } catch (err) { issue(err.message); }
  });
  $('acl-protocol').addEventListener('change', () => {
    const hasPorts = ['tcp','udp'].includes($('acl-protocol').value);
    for (const id of ['acl-sport', 'acl-dport']) { $(id).disabled = !hasPorts; if (!hasPorts) $(id).value = ''; }
  });
  ['acl-name', 'acl-interface', 'acl-direction'].forEach(id => $(id).addEventListener('input', render));
  $('acl-clear').addEventListener('click', () => { rules.length = 0; render(); });
  $('acl-copy').addEventListener('click', async () => { try { const s = config(); await navigator.clipboard.writeText(s); $('acl-copy').textContent = 'Copiado'; setTimeout(() => $('acl-copy').textContent = 'Copiar Cisco', 1500); } catch (e) { issue(e.message || 'No se pudo copiar.'); } });
  $('acl-export').addEventListener('click', () => { try { download(config(), `${safeFilename()}.txt`, 'text/plain;charset=utf-8'); } catch (e) { issue(e.message); } });
  $('acl-json').addEventListener('click', () => { try { const name = validateName('acl-name','acl'); const iface = validateName('acl-interface','iface'); download(JSON.stringify({ name, vendor: 'Cisco IOS/IOS XE', interface: iface || null, direction: $('acl-direction').value, rules: rules.map((r,i) => ({ sequence: (i+1)*10, action:r.action, protocol:r.protocol, source:r.src.label, destination:r.dst.label, source_port:r.sport.label, destination_port:r.dport.label, log:r.log })) }, null, 2), `${safeFilename()}.json`, 'application/json;charset=utf-8'); } catch (e) { issue(e.message); } });
  render();
})();
