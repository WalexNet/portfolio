// Dependencias ESM: ejecutan el conversor en el navegador, sin peticiones de datos a Flask.
import * as YAML from 'https://esm.sh/yaml@2.8.1';
import { parse as parseTOML, stringify as stringifyTOML } from 'https://esm.sh/smol-toml@1.6.1';

const root = document.querySelector('[data-config-converter]');
if (root) {
  const $ = (id) => root.querySelector(`#${id}`);
  const source = $('cfg-source');
  const output = $('cfg-output');
  const from = $('cfg-source-format');
  const to = $('cfg-target-format');
  const status = $('cfg-status');
  const compact = $('cfg-compact');
  const file = $('cfg-file');
  const LIMIT = 2 * 1024 * 1024;
  const samples = {
    docker: { format: 'yaml', text: 'servicios:\n  nginx:\n    imagen: nginx:stable-alpine\n    puerto: 443\n    activo: true\n  postgres:\n    imagen: postgres:17\n    puerto: 5432\n' },
    network: { format: 'json', text: '{\n  "interfaz": "eth0",\n  "direccion": "172.20.0.10",\n  "prefijo": 24,\n  "dns": ["1.1.1.1", "9.9.9.9"]\n}' },
    app: { format: 'toml', text: 'titulo = "Portfolio"\nversion = "1.0"\nactivo = true\n\n[servidor]\nhost = "localhost"\npuerto = 5000\n' }
  };
  function message(text, type = '') {
    status.textContent = text;
    status.className = `cfg-status${type ? ` is-${type}` : ''}`;
  }
  function parseInput(text, format) {
    if (!text.trim()) throw new Error('Introduce un documento antes de continuar.');
    if (new Blob([text]).size > LIMIT) throw new Error('El texto supera el límite de 2 MiB.');
    if (format === 'json') return JSON.parse(text);
    if (format === 'toml') return parseTOML(text);
    const docs = YAML.parseAllDocuments(text, { uniqueKeys: true });
    if (docs.length !== 1) throw new Error('Se admite exactamente un documento YAML.');
    if (docs[0].errors.length) throw docs[0].errors[0];
    return docs[0].toJS({ maxAliasCount: 100 });
  }
  function checkTOML(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value instanceof Date) {
      throw new Error('TOML necesita un objeto de claves en la raíz; no admite listas ni valores escalares como documento completo.');
    }
    const visit = (v, path = 'raíz') => {
      if (v === null) throw new Error(`TOML no admite null (${path}).`);
      if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`Número no finito (${path}).`);
      if (Array.isArray(v)) v.forEach((item, i) => visit(item, `${path}[${i}]`));
      else if (v && typeof v === 'object' && !(v instanceof Date)) {
        Object.entries(v).forEach(([k, val]) => visit(val, `${path}.${k}`));
      }
    };
    visit(value);
  }
  function serialize(value, format) {
    if (format === 'json') {
      const result = JSON.stringify(value, null, compact.checked ? 0 : 2);
      if (result === undefined) throw new Error('Este valor no se puede representar en JSON.');
      return result;
    }
    if (format === 'yaml') return YAML.stringify(value, { indent: 2 });
    checkTOML(value);
    return stringifyTOML(value);
  }
  function convert() {
    try {
      const data = parseInput(source.value, from.value);
      const result = serialize(data, to.value);
      output.value = result;
      message(`Documento válido. Conversión ${from.value.toUpperCase()} → ${to.value.toUpperCase()} completada.`, 'success');
      return true;
    } catch (error) {
      output.value = '';
      message(`Error: ${error.message || String(error)}`, 'error');
      return false;
    }
  }
  $('cfg-convert').addEventListener('click', convert);
  $('cfg-validate').addEventListener('click', () => {
    try {
      parseInput(source.value, from.value);
      message(`Sintaxis ${from.value.toUpperCase()} válida.`, 'success');
    } catch (error) { message(`Error: ${error.message || String(error)}`, 'error'); }
  });
  $('cfg-format').addEventListener('click', () => {
    try {
      source.value = serialize(parseInput(source.value, from.value), from.value);
      message(`Documento ${from.value.toUpperCase()} formateado.`, 'success');
    } catch (error) { message(`Error: ${error.message || String(error)}`, 'error'); }
  });
  $('cfg-swap').addEventListener('click', () => {
    if (!output.value) { message('Convierte el documento antes de intercambiar formatos.', 'error'); return; }
    const prev = from.value;
    from.value = to.value; to.value = prev;
    source.value = output.value; output.value = '';
    convert();
  });
  $('cfg-reset').addEventListener('click', () => {
    from.value = 'yaml'; to.value = 'json'; compact.checked = false;
    source.value = samples.docker.text; output.value = '';
    message('Editor reiniciado.'); convert();
  });
  $('cfg-open').addEventListener('click', () => file.click());
  file.addEventListener('change', async () => {
    const selected = file.files?.[0]; if (!selected) return;
    if (selected.size > LIMIT) { message('Archivo demasiado grande (máximo 2 MiB).', 'error'); file.value = ''; return; }
    const name = selected.name.toLowerCase();
    const fmt = name.endsWith('.json') ? 'json' : name.endsWith('.yaml') || name.endsWith('.yml') ? 'yaml' : name.endsWith('.toml') ? 'toml' : null;
    if (!fmt) { message('Extensión no admitida: utiliza JSON, YAML o TOML.', 'error'); file.value = ''; return; }
    from.value = fmt; source.value = await selected.text(); file.value = ''; convert();
  });
  $('cfg-copy').addEventListener('click', async () => {
    if (!output.value) { message('No hay resultado para copiar.', 'error'); return; }
    try { await navigator.clipboard.writeText(output.value); message('Resultado copiado.', 'success'); }
    catch { message('No se pudo copiar. Comprueba los permisos del navegador.', 'error'); }
  });
  $('cfg-download').addEventListener('click', () => {
    if (!output.value) { message('No hay resultado para descargar.', 'error'); return; }
    const blob = new Blob([output.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `configuracion.${to.value === 'yaml' ? 'yaml' : to.value}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  compact.addEventListener('change', () => { if (to.value === 'json') convert(); });
  root.querySelectorAll('[data-cfg-example]').forEach((button) => button.addEventListener('click', () => {
    const example = samples[button.dataset.cfgExample];
    from.value = example.format; to.value = example.format === 'json' ? 'yaml' : 'json';
    source.value = example.text; convert();
  }));
  convert();
}
