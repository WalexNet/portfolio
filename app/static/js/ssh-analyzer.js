(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const input = $('ssh-input'), upload = $('ssh-upload'), error = $('ssh-error');
  const results = $('ssh-results'), findings = $('ssh-findings');
  let report = null;
  const names = {high:'Alta',medium:'Media',low:'Baja',info:'Información'};
  const el = (tag, cls, content) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (content !== undefined) node.textContent = String(content);
    return node;
  };
  const failure = msg => {error.textContent=msg;error.classList.remove('d-none')};
  const resetError = () => {error.textContent='';error.classList.add('d-none')};
  const updateCount = () => {$('ssh-count').textContent = `${input.value.length.toLocaleString('es-ES')} caracteres`};
  const renderFindings = () => {
    findings.replaceChildren();
    const filter = $('ssh-filter').value;
    const items = report.findings.filter(f => filter === 'all' || f.severity === filter);
    if (!items.length) {findings.append(el('p','ssh-muted','No hay hallazgos en esta categoría.'));return}
    for (const f of items) {
      const card = el('article',`ssh-finding ${f.severity}`);
      const title = el('div','d-flex justify-content-between gap-2 flex-wrap');
      title.append(el('h4','',f.title),el('span','ssh-severity',names[f.severity] || f.severity));
      card.append(title,el('p','',f.explanation),el('p','',`Recomendación: ${f.recommendation}`));
      if (f.line) card.append(el('small','',`Línea ${f.line}`));
      findings.append(card);
    }
  };
  const render = data => {
    report = data;
    const s = data.summary, stats = $('ssh-stats');stats.replaceChildren();
    for (const [name,value] of [['Directivas',s.directives],['Bloques Match',s.match_blocks],['Include',s.includes],['Riesgo alto',s.high],['Riesgo medio',s.medium],['Riesgo bajo',s.low],['Información',s.info]]) {
      const box=el('div','ssh-stat');box.append(el('strong','',value),el('span','',name));stats.append(box);
    }
    $('ssh-limitations').textContent = data.limitations;
    results.classList.remove('d-none');renderFindings();
  };
  input.addEventListener('input',updateCount);
  upload.addEventListener('change',async () => {
    resetError();const file=upload.files?.[0];if(!file)return;
    if(file.size>256*1024){failure('El archivo supera 256 KiB.');return}
    try {input.value=await file.text();updateCount()} catch {failure('No se pudo leer el archivo.')} 
  });
  $('ssh-clear').addEventListener('click',()=>{input.value='';upload.value='';report=null;updateCount();resetError();results.classList.add('d-none')});
  $('ssh-filter').addEventListener('change',()=>{if(report)renderFindings()});
  $('ssh-analyze').addEventListener('click',async () => {
    resetError();const button=$('ssh-analyze');button.disabled=true;
    try {
      const response=await fetch('/tools/ssh-analyzer/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({config:input.value})});
      const data=await response.json();if(!response.ok)throw new Error(data.error || 'No se pudo analizar la configuración.');render(data);
    } catch(e) {failure(e.message || 'Error inesperado.')} finally {button.disabled=false}
  });
  $('ssh-export').addEventListener('click',()=>{
    if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ssh-audit-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();
