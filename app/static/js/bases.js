(() => {
  'use strict';
  const root = document.querySelector('[data-bases-app]');
  if (!root) return;

  const inputs = new Map([[2, root.querySelector('#bases-bin')], [8, root.querySelector('#bases-oct')], [10, root.querySelector('#bases-dec')], [16, root.querySelector('#bases-hex')]]);
  const error = root.querySelector('#bases-error');
  const grouped = root.querySelector('#bases-grouped');
  const announcement = root.querySelector('#bases-announcement');
  const digits = '0123456789ABCDEF';
  let groupSize = 4;
  let valid = true;

  function parseInteger(raw, base) {
    const normalized = raw.trim().replace(/^[+\-]/, '').toUpperCase();
    if (!normalized) throw Error('Introduce un número entero.');
    for (const char of normalized) {
      const digit = digits.indexOf(char);
      if (digit < 0 || digit >= base) throw Error(`El carácter «${char}» no es válido en base ${base}.`);
    }
    let value = 0n;
    for (const char of normalized) value = value * BigInt(base) + BigInt(digits.indexOf(char));
    return raw.trim().startsWith('-') ? -value : value;
  }

  function groupBinary(value) {
    const negative = value.startsWith('-');
    const bits = negative ? value.slice(1) : value;
    // Agrupar desde la derecha, como se acostumbra en notación binaria.
    const chunks = [];
    for (let i = bits.length; i > 0; i -= groupSize) chunks.unshift(bits.slice(Math.max(0, i - groupSize), i));
    return (negative ? '−' : '') + chunks.join(' ');
  }

  function convert(sourceBase) {
    const source = inputs.get(sourceBase);
    inputs.forEach(input => input.closest('.bases-field').classList.remove('is-invalid'));
    try {
      const number = parseInteger(source.value, sourceBase);
      for (const [base, input] of inputs) {
        if (base !== sourceBase) input.value = number.toString(base).toUpperCase();
      }
      grouped.textContent = groupBinary(inputs.get(2).value.toUpperCase());
      error.textContent = '';
      valid = true;
    } catch (err) {
      source.closest('.bases-field').classList.add('is-invalid');
      for (const [base, input] of inputs) if (base !== sourceBase) input.value = '';
      grouped.textContent = '—';
      error.textContent = err.message;
      valid = false;
    }
  }

  inputs.forEach((input, base) => input.addEventListener('input', () => convert(base)));

  root.querySelectorAll('[data-group]').forEach(button => {
    button.addEventListener('click', () => {
      groupSize = Number(button.dataset.group);
      root.querySelectorAll('[data-group]').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      if (valid) grouped.textContent = groupBinary(inputs.get(2).value.toUpperCase());
    });
  });

  root.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
    inputs.get(10).value = button.dataset.example;
    convert(10);
  }));

  root.querySelector('#bases-reset').addEventListener('click', () => {
    inputs.get(10).value = '255';
    convert(10);
    inputs.get(10).focus();
  });

  root.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const value = inputs.get(Number(button.dataset.copy)).value;
    if (!valid || !value) return;
    try {
      await navigator.clipboard.writeText(value);
      announcement.textContent = 'Valor copiado al portapapeles.';
      const icon = button.querySelector('i');
      icon.className = 'bi bi-check2';
      setTimeout(() => { icon.className = 'bi bi-copy'; announcement.textContent = ''; }, 1400);
    } catch {
      announcement.textContent = 'No se pudo copiar. Selecciona el valor manualmente.';
    }
  }));
  convert(10);
})();
