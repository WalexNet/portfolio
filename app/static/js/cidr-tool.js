(() => {
  'use strict';
  const root = document.querySelector('#cidr-tool');
  if (!root) return;
  const el = id => document.getElementById(id);
  const input = el('cidr-input');
  const error = el('cidr-error');
  const routeError = el('cidr-route-error');
  const generate = el('cidr-generate');
  const copyConfig = el('cidr-copy-config');
  const vendor = el('cidr-vendor');
  const iface = el('cidr-interface');
  let latest = null;

  const showError = (target, message = '') => { target.textContent = message; target.hidden = !message; };
  const post = async (url, body) => {
    const response = await fetch(url, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body)});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
    return result;
  };
  const reset = () => {
    latest = null;
    el('cidr-results').hidden = true;
    el('cidr-placeholder').hidden = false;
    el('cidr-config').hidden = true;
    generate.disabled = true;
    copyConfig.disabled = true;
    showError(error);
    showError(routeError);
  };
  const analyze = async () => {
    reset();
    el('cidr-analyze').disabled = true;
    try {
      const result = await post(root.dataset.analyzeUrl, {networks: input.value});
      latest = result;
      el('cidr-before').textContent = result.original_count;
      el('cidr-after').textContent = result.optimized_count;
      el('cidr-saving').textContent = `${result.reduction_pct}%`;
      el('cidr-exact').value = result.exact.join('\n');
      el('cidr-supernet').textContent = result.supernet;
      el('cidr-warning').textContent = result.is_supernet_exact
        ? 'La superred cubre exactamente las redes indicadas.'
        : `Atención: la superred incluye ${result.supernet_extra} direcciones adicionales. Para evitar anunciar redes ajenas, utiliza los prefijos exactos.`;
      const contained = result.contained.length ? ` · ${result.contained.length} prefijo(s) contenido(s) en otros` : '';
      el('cidr-redundancy').textContent = `${result.duplicate_count} entrada(s) duplicada(s)${contained}. Familia: IPv${result.version}.`;
      el('cidr-placeholder').hidden = true;
      el('cidr-results').hidden = false;
      generate.disabled = false;
    } catch (e) { showError(error, e.message); }
    finally { el('cidr-analyze').disabled = false; }
  };
  const copy = async value => {
    try { await navigator.clipboard.writeText(value); }
    catch { showError(error, 'No se pudo copiar automáticamente. Selecciona el texto y cópialo manualmente.'); }
  };
  const generateRoutes = async () => {
    if (!latest) return;
    showError(routeError);
    generate.disabled = true;
    try {
      const result = await post(root.dataset.routesUrl, {networks: latest.exact, vendor: vendor.value, gateway: el('cidr-gateway').value, interface: iface.value});
      el('cidr-config').textContent = result.configuration;
      el('cidr-config').hidden = false;
      copyConfig.disabled = false;
    } catch (e) {
      showError(routeError, e.message);
      el('cidr-config').hidden = true;
      copyConfig.disabled = true;
    } finally { generate.disabled = false; }
  };
  el('cidr-analyze').addEventListener('click', analyze);
  el('cidr-example-v6').addEventListener('click', () => { input.value = '2001:db8:100::/48\n2001:db8:101::/48'; el('cidr-gateway').value = '2001:db8::1'; reset(); });
  el('cidr-clear').addEventListener('click', () => { input.value = ''; reset(); input.focus(); });
  input.addEventListener('input', reset);
  el('cidr-copy').addEventListener('click', () => copy(el('cidr-exact').value));
  el('cidr-download').addEventListener('click', () => {
    if (!latest) return;
    const file = new Blob([latest.exact.join('\n') + '\n'], {type: 'text/plain;charset=utf-8'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = 'rutas-cidr.txt';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  vendor.addEventListener('change', () => { iface.disabled = vendor.value !== 'fortinet'; if (iface.disabled) iface.value = ''; el('cidr-config').hidden = true; copyConfig.disabled = true; });
  el('cidr-gateway').addEventListener('input', () => { el('cidr-config').hidden = true; copyConfig.disabled = true; });
  iface.addEventListener('input', () => { el('cidr-config').hidden = true; copyConfig.disabled = true; });
  generate.addEventListener('click', generateRoutes);
  copyConfig.addEventListener('click', () => copy(el('cidr-config').textContent));
})();
