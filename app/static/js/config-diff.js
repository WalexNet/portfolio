(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const left = $('cd-left'), right = $('cd-right'), status = $('cd-status');
  const MAX_CHARS = 250000, MAX_LINES = 2000;
  let current = null;
  const getLines = value => value.replace(/\r\n?/g, '\n').split('\n');
  function prepare(raw) {
    const ignoredEmpty = $('cd-ignore-empty').checked;
    let rows = getLines(raw).map((text, index) => ({text, number:index+1}));
    if (ignoredEmpty) rows = rows.filter(row => row.text.trim() !== '');
    for (const row of rows) {
      let key = row.text;
      if ($('cd-ignore-space').checked) key = key.replace(/[\t ]+/g, ' ').trim();
      if ($('cd-ignore-case').checked) key = key.toLocaleLowerCase();
      row.key = key;
    }
    return rows;
  }
  // LCS: comparación por líneas, con tamaño acotado para mantener la interfaz ágil.
  function diff(a, b) {
    const n=a.length, m=b.length;
    const dp = Array.from({length:n+1},()=>new Uint16Array(m+1));
    for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--)
      dp[i][j] = a[i].key === b[j].key ? 1+dp[i+1][j+1] : Math.max(dp[i+1][j],dp[i][j+1]);
    const result=[]; let i=0,j=0;
    while(i<n || j<m){
      if(i<n && j<m && a[i].key===b[j].key){result.push({type:'same',old:a[i],next:b[j]}); i++; j++;}
      else if(i<n && (j===m || dp[i+1][j]>=dp[i][j+1])){result.push({type:'del',old:a[i]});i++;}
      else {result.push({type:'add',next:b[j]});j++;}
    }
    return result;
  }
  const line = (num, text, type) => {
    const row=document.createElement('div'); row.className='cd-row '+type;
    const number=document.createElement('span'); number.className='cd-no'; number.textContent=num == null ? '' : String(num);
    const content=document.createElement('span'); content.className='cd-line'; content.textContent=text;
    row.append(number,content);return row;
  };
  function render() {
    if(!current) return;
    const container=$('cd-output'); container.replaceChildren();
    const fragment=document.createDocumentFragment();
    const side=$('cd-view').value === 'side';
    if (!side) {
      for(const change of current){
        if(change.type==='same') fragment.append(line(change.old.number, '  '+change.old.text, 'same'));
        if(change.type==='del') fragment.append(line(change.old.number, '- '+change.old.text, 'del'));
        if(change.type==='add') fragment.append(line(change.next.number, '+ '+change.next.text, 'add'));
      }
    } else {
      for(let i=0;i<current.length;i++) {
        const change=current[i];
        const row=document.createElement('div');row.className='cd-side';
        if(change.type==='same') {
          row.append(line(change.old.number,change.old.text,'same'),line(change.next.number,change.next.text,'same'));
        } else if(change.type==='del' && current[i+1]?.type==='add') {
          const next=current[++i];
          row.append(line(change.old.number,change.old.text,'del'),line(next.next.number,next.next.text,'add'));
        } else if(change.type==='del') {
          row.append(line(change.old.number,change.old.text,'del'),line(null,'','same'));
        } else {
          row.append(line(null,'','same'),line(change.next.number,change.next.text,'add'));
        }
        fragment.append(row);
      }
    }
    container.append(fragment);
  }
  function compare() {
    status.textContent='';
    if(left.value.length > MAX_CHARS || right.value.length > MAX_CHARS) {
      status.textContent='Cada configuración debe tener como máximo 250.000 caracteres.';return;
    }
    const a=prepare(left.value), b=prepare(right.value);
    if(a.length>MAX_LINES || b.length>MAX_LINES) {
      status.textContent='Máximo 2.000 líneas por configuración. Reduce los archivos antes de comparar.';return;
    }
    current=diff(a,b);
    const added=current.filter(x=>x.type==='add').length, removed=current.filter(x=>x.type==='del').length;
    const same=current.filter(x=>x.type==='same').length;
    $('cd-summary').textContent=`${added} líneas añadidas · ${removed} eliminadas · ${same} sin cambios`;
    $('cd-result').hidden=false;
    render();
    if(!added && !removed) status.textContent='No hay diferencias con los criterios seleccionados.';
  }
  function escapePatch(text) {return text.replace(/\r\n?/g,'\n');}
  function download() {
    if(!current) return;
    // Formato diff textual legible: no se presenta como parche aplicable automáticamente.
    const output=['--- configuracion-original','+++ configuracion-nueva',
      '# Comparación textual por líneas; NO es un parche aplicable automáticamente.',
      ...current.map(row=>row.type==='same'?'  '+escapePatch(row.old.text):row.type==='del'?'- '+escapePatch(row.old.text):'+ '+escapePatch(row.next.text))].join('\n');
    const url=URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='comparacion-configuraciones.diff';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function readFile(input, target) {
    const file=input.files?.[0];if(!file)return;
    if(file.size > MAX_CHARS*4){status.textContent='Archivo demasiado grande (límite de lectura: 1 MB).';return;}
    try {const content=await file.text();if(content.length>MAX_CHARS){status.textContent='Archivo demasiado grande (máximo 250.000 caracteres).';return;}target.value=content;status.textContent=`Archivo cargado: ${file.name}`;}
    catch {status.textContent='No se pudo leer el archivo.';}
    finally {input.value='';}
  }
  $('cd-compare').addEventListener('click',compare);
  $('cd-view').addEventListener('change',render);
  $('cd-download').addEventListener('click',download);
  $('cd-swap').addEventListener('click',()=>{[left.value,right.value]=[right.value,left.value];compare();});
  $('cd-clear').addEventListener('click',()=>{left.value='';right.value='';current=null;$('cd-result').hidden=true;status.textContent='';});
  $('cd-example').addEventListener('click',()=>{
    left.value='hostname SW-CORE\ninterface GigabitEthernet1/0/1\n description UPLINK\n switchport mode trunk\n switchport trunk allowed vlan 10,20\n!\nlogging host 192.0.2.10';
    right.value='hostname SW-CORE\ninterface GigabitEthernet1/0/1\n description UPLINK-CORE\n switchport mode trunk\n switchport trunk allowed vlan 10,20,30\n!\nlogging host 192.0.2.20';
    compare();
  });
  $('cd-file-left').addEventListener('change',event=>readFile(event.target,left));
  $('cd-file-right').addEventListener('change',event=>readFile(event.target,right));
  ['cd-ignore-space','cd-ignore-case','cd-ignore-empty'].forEach(id=>$(id).addEventListener('change',()=>{if(current)compare();}));
})();
