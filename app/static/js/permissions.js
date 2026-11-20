document.addEventListener("DOMContentLoaded", () => {
  const boxes = [...document.querySelectorAll('.permissions-check input[data-owner]')];
  const specialBoxes = [...document.querySelectorAll('input[data-special]')];
  const octalField = document.getElementById('permissions-octal');
  const symbolicField = document.getElementById('permissions-symbolic');
  const octalOutput = document.getElementById('permissions-octal-output');
  const symbolicOutput = document.getElementById('permissions-symbolic-output');
  const targetField = document.getElementById('permissions-target');
  const commandOutput = document.getElementById('permissions-command-output');
  const error = document.getElementById('permissions-error');
  const copyStatus = document.getElementById('permissions-copy-status');
  let currentOctal = '0754';

  function parseOctal(value) {
    if (!/^[0-7]{3,4}$/.test(value)) return null;
    const fourDigits = value.padStart(4, '0');
    const special = Number(fourDigits[0]);
    const bits = [...fourDigits.slice(1)].flatMap(digit => {
      const n = Number(digit);
      return [!!(n & 4), !!(n & 2), !!(n & 1)];
    });
    return { bits, special };
  }

  function parseSymbolic(value) {
    if (value.length !== 9) return null;
    const bits = [];
    for (let i = 0; i < 9; i++) {
      const character = value[i];
      if (i % 3 === 0 && character !== 'r' && character !== '-') return null;
      if (i % 3 === 1 && character !== 'w' && character !== '-') return null;
      if (i % 3 === 2 && !('x-sStT'.includes(character))) return null;
      if (i % 3 === 2 && i !== 8 && (character === 't' || character === 'T')) return null;
      if (i === 8 && (character === 's' || character === 'S')) return null;
      bits.push(i % 3 === 2 ? character === 'x' || character === 's' || character === 't' : character !== '-');
    }
    const special = (/[sS]/.test(value[2]) ? 4 : 0)
      + (/[sS]/.test(value[5]) ? 2 : 0)
      + (/[tT]/.test(value[8]) ? 1 : 0);
    return { bits, special };
  }

  function fromBoxes() {
    return {
      bits: boxes.map(box => box.checked),
      special: specialBoxes.reduce((sum, box) => sum + (box.checked ? Number(box.dataset.special) : 0), 0)
    };
  }

  function toSymbolic(bits, special) {
    const symbols = bits.map((enabled, i) => enabled ? 'rwx'[i % 3] : '-');
    [[2, 4, 's', 'S'], [5, 2, 's', 'S'], [8, 1, 't', 'T']].forEach(([index, mask, lower, upper]) => {
      if (special & mask) symbols[index] = bits[index] ? lower : upper;
    });
    return symbols.join('');
  }

  function render(state) {
    const { bits, special } = state;
    boxes.forEach((box, index) => { box.checked = bits[index]; });
    specialBoxes.forEach(box => { box.checked = !!(special & Number(box.dataset.special)); });
    const digits = [0, 3, 6].map(i => String((bits[i] ? 4 : 0) + (bits[i+1] ? 2 : 0) + (bits[i+2] ? 1 : 0)));
    currentOctal = String(special) + digits.join('');
    const symbolic = toSymbolic(bits, special);
    octalField.value = special ? currentOctal : digits.join('');
    symbolicField.value = symbolic;
    octalOutput.textContent = octalField.value;
    symbolicOutput.textContent = symbolic;
    error.hidden = true;
    error.textContent = '';
    updateCommand();
  }

  function shellQuote(input) {
    return "'" + input.replace(/'/g, "'\\''") + "'";
  }

  function updateCommand() {
    const name = targetField.value.trim() || 'archivo.txt';
    const mode = currentOctal.startsWith('0') ? currentOctal.slice(1) : currentOctal;
    commandOutput.textContent = 'chmod ' + mode + ' -- ' + shellQuote(name);
    copyStatus.textContent = '';
  }

  function invalid(message) {
    error.textContent = message;
    error.hidden = false;
  }

  [...boxes, ...specialBoxes].forEach(box => box.addEventListener('change', () => render(fromBoxes())));
  octalField.addEventListener('input', () => {
    const parsed = parseOctal(octalField.value.trim());
    if (parsed) render(parsed);
    else invalid('Introduce tres o cuatro cifras octales (0 a 7), como 755 o 4755.');
  });
  symbolicField.addEventListener('input', () => {
    const parsed = parseSymbolic(symbolicField.value.trim());
    if (parsed) render(parsed);
    else invalid('Introduce nueve caracteres válidos, por ejemplo rwsr-xr-x o rwxrwxrwt.');
  });
  targetField.addEventListener('input', updateCommand);
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => render(parseOctal(button.dataset.mode))));
  document.getElementById('permissions-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(commandOutput.textContent);
      copyStatus.textContent = 'Comando copiado.';
    } catch {
      copyStatus.textContent = 'No se pudo copiar. Selecciona el comando manualmente.';
    }
  });
  render(parseOctal('754'));
});
