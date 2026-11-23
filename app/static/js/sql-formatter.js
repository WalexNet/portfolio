(() => {
  'use strict';
  const el = (id) => document.getElementById(id);
  const input = el('sql-input');
  if (!input) return;
  const output = el('sql-output');
  const status = el('sql-status');
  const controls = document.querySelectorAll('[data-sql-action]');
  const samples = {
    select: 'select u.id,u.nombre, count(p.id) as pedidos from usuarios u left join pedidos p on p.usuario_id=u.id where u.activo=true group by u.id,u.nombre order by pedidos desc;',
    cte: 'with ventas as (select cliente_id,sum(total) as importe from pedidos where estado=\'pagado\' group by cliente_id) select c.nombre,v.importe from clientes c join ventas v on c.id=v.cliente_id where v.importe>100 order by v.importe desc;',
    insert: "insert into productos (nombre,precio,activo) values ('Teclado',39.90,true),('Ratón',18.50,true);"
  };
  const show = (message, kind = '') => {
    status.hidden = false;
    status.className = 'sql-status' + (kind ? ' is-' + kind : '');
    status.textContent = message;
  };
  const updateCount = () => { el('sql-input-count').textContent = `${input.value.length.toLocaleString('es-ES')} caracteres`; };
  input.addEventListener('input', updateCount);
  el('sql-example').addEventListener('change', (event) => {
    if (!event.target.value) return;
    input.value = samples[event.target.value] || '';
    output.value = '';
    status.hidden = true;
    updateCount();
  });
  async function process(action) {
    if (!input.value.trim()) { show('Introduce una consulta SQL.', 'error'); input.focus(); return; }
    controls.forEach((button) => { button.disabled = true; });
    show('Analizando consulta…');
    try {
      const response = await fetch(document.querySelector('.sql-panel').dataset.apiUrl, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sql: input.value, dialect: el('sql-dialect').value, keyword_case: el('sql-keyword-case').value, action})
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Respuesta no JSON');
      const data = await response.json();
      if (!response.ok) { show(data.error || `Error HTTP ${response.status}.`, 'error'); return; }
      if (action !== 'validate') output.value = data.result || '';
      show(`${data.valid ? 'Sintaxis analizada' : 'Revisar sintaxis'} · ${data.statements} sentencia(s). ${data.message}`, data.valid ? 'success' : 'error');
    } catch (_err) { show('No se pudo contactar con la API SQL. Comprueba las rutas, la consola del navegador y las dependencias del servidor.', 'error'); }
    finally { controls.forEach((button) => { button.disabled = false; }); }
  }
  controls.forEach((button) => button.addEventListener('click', () => process(button.dataset.sqlAction)));
  el('sql-copy').addEventListener('click', async () => {
    if (!output.value) { show('No hay resultado para copiar.', 'error'); return; }
    try { await navigator.clipboard.writeText(output.value); show('Resultado copiado.', 'success'); }
    catch (_err) { output.focus(); output.select(); show('Selecciona el texto y cópialo manualmente.', 'error'); }
  });
  el('sql-clear').addEventListener('click', () => {
    input.value = ''; output.value = ''; el('sql-example').value = ''; status.hidden = true; updateCount(); input.focus();
  });
  updateCount();
})();
