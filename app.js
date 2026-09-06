const DATA=window.ARCADIA_DATA;
const WIKI=window.ARCADIA_WIKI||[];
const KEY='python-arcadia-web-v4';
let pyodide=null, currentEditor=null, sandboxEditor=null, lastFeedback='';
const today=()=>new Date().toISOString().slice(0,10);
function initial(){return {completed:[],passed:{},examScores:{},codes:{},examCodes:{},reviews:{},activity:[],started:new Date().toISOString(),xp:0};}
function loadState(){try{return {...initial(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return initial()}}
let state=loadState();
function save(){localStorage.setItem(KEY,JSON.stringify(state));updateChrome()}
function toast(s){const el=document.getElementById('toast');el.textContent=s;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
function markActivity(){if(!state.activity.includes(today()))state.activity.push(today());save()}
function level(n){return DATA.levels[n-1]}
function exam(i){return DATA.exams[i-1]}
function arcPassed(a){return Number(state.examScores[a]||0)>=70}
function isUnlocked(n){if(n===1)return true; const prevArc=Math.floor((n-1)/10); if(n%10===1 && prevArc>=1 && !arcPassed(prevArc))return false; for(let i=1;i<n;i++){if(!state.completed.includes(i))return false;}return true}
function currentLevel(){for(let i=1;i<=100;i++)if(!state.completed.includes(i)&&isUnlocked(i))return i;return 100}
function calcXp(){return state.completed.reduce((s,n)=>s+(level(n)?.xp||0),0)+Object.values(state.examScores).reduce((s,v)=>s+(v>=70?100:0),0)}
function rank(){const x=calcXp(); if(x<500)return'Aprendiz';if(x<1200)return'Explorador';if(x<2300)return'Construtor';if(x<3600)return'Desenvolvedor';if(x<5200)return'Engenheiro';return'Naturalizado'}
function streak(){let dates=new Set(state.activity);let d=new Date();let s=0;for(;;){let k=d.toISOString().slice(0,10);if(dates.has(k)){s++;d.setDate(d.getDate()-1)}else{if(s===0){d.setDate(d.getDate()-1);let y=d.toISOString().slice(0,10);if(dates.has(y)){s++;d.setDate(d.getDate()-1);continue}}break}}return s}
function reviewDue(){const done=new Set(state.completed);return DATA.cards.filter(c=>done.has(c.level)).filter(c=>!state.reviews[c.id]||state.reviews[c.id].due<=today())}
function updateChrome(){const n=currentLevel(), pct=state.completed.length;document.getElementById('sideLevel').textContent=`Nível ${String(n).padStart(3,'0')} · ${rank()}`;document.getElementById('sideBar').style.width=pct+'%';document.getElementById('sideXp').textContent=`${calcXp()} XP · ${pct}%`;document.getElementById('reviewBadge').textContent=reviewDue().length}
function escapeHtml(s=''){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function simpleMd(md=''){let out=[],inCode=false,code=[];for(const line of md.split('\n')){if(line.startsWith('```')){if(inCode){out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);code=[]}inCode=!inCode;continue}if(inCode){code.push(line);continue}if(/^### /.test(line))out.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);else if(/^## /.test(line))out.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);else if(/^# /.test(line))out.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);else if(/^[-*] /.test(line))out.push(`<li>${escapeHtml(line.slice(2))}</li>`);else if(/^\d+\. /.test(line))out.push(`<li>${escapeHtml(line.replace(/^\d+\. /,''))}</li>`);else if(line.trim())out.push(`<p>${escapeHtml(line).replace(/`([^`]+)`/g,'<code>$1</code>')}</p>`)}return out.join('')}
function setNav(route){document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.route===route))}
function go(route,arg){location.hash=arg?`${route}/${arg}`:route}
function parseRoute(){const h=location.hash.replace(/^#/,'')||'home';const [r,a]=h.split('/');return[r,a]}
function render(){const [r,a]=parseRoute();setNav(['lesson','exam'].includes(r)?'home':r);if(r==='home')home();else if(r==='lesson')lessonView(Number(a));else if(r==='review')reviewView();else if(r==='wiki')wikiView();else if(r==='exams')examsView();else if(r==='exam')examView(Number(a));else if(r==='progress')progressView();else home();window.scrollTo(0,0);updateChrome()}
function home(){const cur=currentLevel();let arcs='';for(let a=1;a<=10;a++){const items=DATA.levels.slice((a-1)*10,a*10);const done=items.filter(x=>state.completed.includes(x.level)).length;const cards=items.map(x=>{const unlocked=isUnlocked(x.level),complete=state.completed.includes(x.level),current=x.level===cur;return `<button class="level-card ${complete?'done':''} ${current?'current':''}" ${unlocked?'': 'disabled'} onclick="go('lesson',${x.level})"><span class="n">${complete?'✓ ':''}N${String(x.level).padStart(3,'0')}</span>${!unlocked?'<span class="lock">⌁</span>':''}<strong>${unlocked?escapeHtml(x.title):'Conteúdo bloqueado'}</strong><small>${unlocked?escapeHtml(x.kind==='arena'?'Arena':x.kind==='project'?'Projeto':x.concept):'Conclua a etapa anterior'}</small></button>`}).join('');const canExam=done===10,score=state.examScores[a];arcs+=`<section class="arc"><div class="arc-head"><div><h2>Arco ${a} — ${escapeHtml(items[0].arc_name)}</h2><p>${escapeHtml(items[0].arc_goal)}</p></div><span>${done}/10</span></div><div class="level-grid">${cards}</div><div class="exam-strip"><span>Prova do Arco ${a} ${score?`· melhor nota <b>${score}/100</b>`:''}</span><button class="ghost" ${canExam?'':'disabled'} onclick="go('exam',${a})">${score>=70?'Refazer prova':canExam?'Fazer prova':'Bloqueada'}</button></div></section>`}
const l=level(cur);document.getElementById('view').innerHTML=`<section class="hero"><span class="eyebrow">Jornada de fluência</span><h1>Aprenda Python<br>sem morar no terminal.</h1><p>Você vê apenas a próxima parte da jornada. Leia, experimente código no navegador, resolva o desafio, receba correção automática e use o ChatGPT como tutor quando precisar.</p></section><div class="stats"><div class="stat"><b>${state.completed.length}/100</b><span>níveis concluídos</span></div><div class="stat"><b>${calcXp()}</b><span>XP</span></div><div class="stat"><b>${streak()}</b><span>dias de sequência</span></div><div class="stat"><b>${reviewDue().length}</b><span>revisões hoje</span></div></div>${l?`<div class="continue-card"><div><span class="eyebrow">Continue daqui</span><h3>N${String(cur).padStart(3,'0')} · ${escapeHtml(l.title)}</h3><p>${escapeHtml(l.goal)}</p></div><button class="primary" onclick="go('lesson',${cur})">Continuar →</button></div>`:''}${arcs}`}
function initAce(id,value,readonly=false){
  const host=document.getElementById(id);
  if(window.ace&&typeof window.ace.edit==='function'){
    const e=window.ace.edit(id);e.setTheme('ace/theme/tomorrow_night_eighties');e.session.setMode('ace/mode/python');e.setOptions({fontSize:'14px',showPrintMargin:false,wrap:true,useWorker:false,readOnly:readonly});e.setValue(value||'',-1);return e
  }
  // Fallback local: o curso continua utilizável mesmo se o CDN do editor estiver lento/bloqueado.
  host.innerHTML='';
  const ta=document.createElement('textarea');ta.className='fallback-editor';ta.value=value||'';ta.readOnly=readonly;ta.spellcheck=false;ta.setAttribute('aria-label','Editor Python');host.appendChild(ta);
  const pos=()=>{const before=ta.value.slice(0,ta.selectionStart);const rows=before.split('\n');return {row:rows.length-1,column:rows[rows.length-1].length}};
  const tokenAt=(row,column)=>{const line=(ta.value.split('\n')[row]||'');let a=Math.min(column,line.length),b=a;while(a>0&&/[A-Za-z0-9_@.]/.test(line[a-1]))a--;while(b<line.length&&/[A-Za-z0-9_@.]/.test(line[b]))b++;return {value:line.slice(a,b)}};
  return {
    getValue:()=>ta.value,setValue:v=>{ta.value=String(v??'')},focus:()=>ta.focus(),
    gotoLine:(line)=>{const lines=ta.value.split('\n');let at=0;for(let i=0;i<Math.max(0,line-1)&&i<lines.length;i++)at+=lines[i].length+1;ta.focus();ta.setSelectionRange(at,at)},
    on:(type,cb)=>{if(type==='click')ta.addEventListener('click',ev=>cb({domEvent:ev,getDocumentPosition:pos}))},
    session:{setMode(){},on:(type,cb)=>{if(type==='change')ta.addEventListener('input',cb)},getTokenAt:tokenAt}
  }
}
async function runPython(code,testBody=null){
  if(!pyodide){
    const ready = typeof window.ensureArcadiaPythonReady==='function' ? await window.ensureArcadiaPythonReady() : false;
    if(!ready || !pyodide) return {ok:false,stdout:'',error:'Não consegui iniciar o Python. Clique no indicador da lateral para tentar novamente.'};
  }
  try{
    // O curso usa apenas a biblioteca padrão nos exercícios-base. Não tentamos analisar
    // imports do código do aluno antes de executá-lo: código incompleto/sintaticamente
    // incorreto é justamente algo que o botão Rodar precisa conseguir mostrar como erro.
    pyodide.globals.set('ARC_USER_CODE', String(code ?? ''));
    pyodide.globals.set('ARC_TEST_BODY', String(testBody ?? ''));
    const raw = await pyodide.runPythonAsync(`
import io, contextlib, traceback, types, pathlib, os, json, math, statistics, re, csv, tempfile
from datetime import date, datetime, timedelta
from collections import *

out = io.StringIO()
result = {"ok": True, "stdout": "", "error": ""}

class _Raises:
    def __init__(self, exc): self.exc = exc
    def __enter__(self): return self
    def __exit__(self, typ, val, tb):
        if typ is None:
            raise AssertionError("Era esperada uma exceção")
        if not issubclass(typ, self.exc):
            return False
        return True

class _Pytest:
    def fail(self, msg="Teste falhou"): raise AssertionError(msg)
    def skip(self, msg="Pendente"): raise AssertionError(msg)
    def raises(self, exc): return _Raises(exc)

pytest = _Pytest()

def pending(value):
    if value is None:
        pytest.fail("Sua função ainda retorna None")
    return value

try:
    ns = {}
    with contextlib.redirect_stdout(out):
        exec(ARC_USER_CODE, ns)
    if ARC_TEST_BODY:
        m = types.SimpleNamespace(**{k:v for k,v in ns.items() if not k.startswith('__')})
        tmp_path = pathlib.Path('/tmp/arcadia_case')
        tmp_path.mkdir(parents=True, exist_ok=True)
        env = globals().copy()
        env.update(ns)
        env.update({'m':m, 'tmp_path':tmp_path, 'pytest':pytest, 'pending':pending})
        exec(ARC_TEST_BODY, env)
except BaseException:
    result['ok'] = False
    result['error'] = traceback.format_exc(limit=6)

result['stdout'] = out.getvalue()
json.dumps(result, ensure_ascii=False)
`);
    const text = typeof raw === 'string' ? raw : String(raw);
    const parsed = JSON.parse(text);
    if(!parsed || typeof parsed.ok !== 'boolean'){
      throw new Error('O executor retornou uma resposta inválida.');
    }
    return parsed;
  }catch(err){
    console.error('Arcádia: falha interna no executor Python', err);
    return {
      ok:false,
      stdout:'',
      error:'Falha interna do executor Python: ' + (err?.message || String(err)) + '\nRecarregue a página. Se continuar, envie este texto ao ChatGPT.'
    };
  }
}

function learnedWikiEntries(){
  const done=new Set(state.completed);
  return WIKI.filter(e=>done.has(e.unlock));
}
function findWikiEntry(token){
  const raw=String(token||'').trim();
  if(!raw)return null;
  const normalized=raw.replace(/^['"]+|['"]+$/g,'');
  return WIKI.find(e=>{
    const names=[e.term,...(e.aliases||[])];
    return names.some(x=>String(x).toLowerCase()===normalized.toLowerCase());
  })||null;
}
function wikiUnlocked(entry){return !!entry && state.completed.includes(entry.unlock)}
function wikiEntryHtml(e){
  return `<div class="wiki-detail-head"><span class="eyebrow">${escapeHtml(e.category)} · desbloqueado no N${String(e.unlock).padStart(3,'0')}</span><h2>${escapeHtml(e.term)}</h2><p>${escapeHtml(e.short)}</p></div>
  <div class="wiki-detail-grid">
    <section><h3>O que é</h3><p>${escapeHtml(e.meaning)}</p></section>
    <section><h3>Como se escreve</h3><pre><code>${escapeHtml(e.syntax||'')}</code></pre></section>
    <section><h3>Microexemplo</h3><pre><code>${escapeHtml(e.example||'')}</code></pre></section>
    <section class="wiki-common"><h3>Erro comum</h3><p>${escapeHtml(e.common||'')}</p></section>
  </div>`;
}
function openWikiEntry(entry, lessonN=null){
  if(!entry)return;
  if(!wikiUnlocked(entry)){
    const same=Number(lessonN)===Number(entry.unlock);
    toast(same?'Esse termo está sendo ensinado nesta aula. Conclua o nível para desbloqueá-lo na Wiki.':'Esse termo ainda não foi desbloqueado na sua jornada.');
    return;
  }
  let overlay=document.getElementById('wikiOverlay');
  if(!overlay){
    overlay=document.createElement('div');
    overlay.id='wikiOverlay';
    overlay.className='wiki-overlay hidden';
    overlay.innerHTML='<div class="wiki-modal"><button class="wiki-close" aria-label="Fechar">×</button><div id="wikiModalBody"></div></div>';
    document.body.appendChild(overlay);
    overlay.querySelector('.wiki-close').onclick=()=>overlay.classList.add('hidden');
    overlay.onclick=e=>{if(e.target===overlay)overlay.classList.add('hidden')};
  }
  document.getElementById('wikiModalBody').innerHTML=wikiEntryHtml(entry);
  overlay.classList.remove('hidden');
}
function attachWikiClick(editor,lessonN){
  if(!editor)return;
  editor.on('click',e=>{
    const ev=e.domEvent||{};
    if(!(ev.ctrlKey||ev.metaKey))return;
    ev.preventDefault?.();
    const pos=e.getDocumentPosition();
    const token=editor.session.getTokenAt(pos.row,pos.column);
    if(!token)return;
    const entry=findWikiEntry(token.value);
    if(entry)openWikiEntry(entry,lessonN);
    else toast('Essa palavra ainda não tem uma entrada disponível na sua Wiki.');
  });
}
function renderLessonTerms(n){
  const terms=WIKI.filter(e=>e.unlock===n);
  if(!terms.length)return '';
  return `<div class="new-terms"><div class="new-terms-head"><span>Peças novas desta aula</span><small>Abra apenas quando precisar de mais detalhe.</small></div>${terms.map(e=>`<details class="term-detail"><summary><code>${escapeHtml(e.term)}</code><span>${escapeHtml(e.short)}</span></summary><div class="term-body"><p>${escapeHtml(e.meaning)}</p><div class="term-mini-grid"><div><b>Forma</b><pre><code>${escapeHtml(e.syntax||'')}</code></pre></div><div><b>Exemplo curto</b><pre><code>${escapeHtml(e.example||'')}</code></pre></div></div><div class="callout mistake"><b>Erro comum</b><br>${escapeHtml(e.common||'')}</div></div></details>`).join('')}</div>`;
}
function wikiView(){
  const entries=learnedWikiEntries();
  const categories=[...new Set(entries.map(e=>e.category))].sort();
  document.getElementById('view').innerHTML=`<section class="wiki-page"><span class="eyebrow">Referência cumulativa</span><h1>Sua Wiki de Python</h1><p class="wiki-intro">Aqui só aparece o que você <b>já concluiu</b>. A ideia não é decorar tudo: é poder reencontrar rapidamente uma peça que você já aprendeu até ela ficar natural.</p><div class="wiki-tip"><b>Atalho dentro dos editores:</b> segure <kbd>Ctrl</kbd> (ou <kbd>⌘</kbd> no Mac) e clique numa palavra já aprendida. Na própria aula em que uma peça é apresentada, esse atalho fica bloqueado para ela de propósito.</div>${entries.length?`<div class="wiki-tools"><input id="wikiSearch" type="search" placeholder="Buscar: if, lista, return..." autocomplete="off"><select id="wikiCategory"><option value="">Todas as categorias</option>${categories.map(c=>`<option>${escapeHtml(c)}</option>`).join('')}</select><span>${entries.length} entradas desbloqueadas</span></div><div id="wikiGrid" class="wiki-grid"></div>`:`<div class="empty">Sua Wiki ainda está vazia. Conclua o primeiro nível e as primeiras referências começam a aparecer aqui.</div>`}</section>`;
  if(!entries.length)return;
  const draw=()=>{
    const q=(document.getElementById('wikiSearch').value||'').toLowerCase().trim();
    const cat=document.getElementById('wikiCategory').value;
    const filtered=entries.filter(e=>(!cat||e.category===cat)&&(!q||[e.term,e.short,e.meaning,...(e.aliases||[])].join(' ').toLowerCase().includes(q)));
    document.getElementById('wikiGrid').innerHTML=filtered.length?filtered.map((e,i)=>`<button class="wiki-card" data-wiki-index="${entries.indexOf(e)}"><span>${escapeHtml(e.category)}</span><code>${escapeHtml(e.term)}</code><p>${escapeHtml(e.short)}</p><small>N${String(e.unlock).padStart(3,'0')}</small></button>`).join(''):'<div class="empty">Nenhuma entrada desbloqueada bate com essa busca.</div>';
    document.querySelectorAll('[data-wiki-index]').forEach(b=>b.onclick=()=>openWikiEntry(entries[Number(b.dataset.wikiIndex)]));
  };
  document.getElementById('wikiSearch').oninput=draw;
  document.getElementById('wikiCategory').onchange=draw;
  draw();
}

function lessonView(n){const l=level(n);if(!l||!isUnlocked(n)){document.getElementById('view').innerHTML='<div class="empty">Esse conteúdo ainda está bloqueado.</div>';return}const done=state.completed.includes(n);const newTerms=renderLessonTerms(n);let mission;if(l.kind==='project'){mission=`<div class="card project-md"><span class="eyebrow">Projeto do arco</span>${simpleMd(l.project||`# ${l.title}\n${l.goal}`)}</div><div class="card"><h3>Seu espaço de construção</h3><p>Use este editor para rascunhar ou construir a versão principal. Projetos maiores podem depois ir para um repositório próprio; aqui o foco é você pensar antes de pedir ajuda.</p><div class="editor-card"><div id="challenge-editor" class="editor"></div><div class="editor-actions"><button class="secondary" id="runBtn">▶ Rodar</button><button class="ghost" id="chatBtn">Pedir code review ao ChatGPT</button></div><pre id="output" class="output">A saída aparece aqui.</pre></div><div class="project-checks"><label><input type="checkbox" class="pc"> Eu transformei o objetivo em requisitos verificáveis.</label><label><input type="checkbox" class="pc"> Tenho uma versão mínima que funciona de ponta a ponta.</label><label><input type="checkbox" class="pc"> Testei pelo menos três cenários, incluindo um caso de borda.</label><label><input type="checkbox" class="pc"> Consigo explicar por que organizei o código desse jeito.</label></div><button class="primary" id="completeProject">Concluir projeto</button></div>`}else{mission=`<div class="card"><span class="eyebrow">03 · Desafio valendo</span><h2>Agora é você</h2><p>${escapeHtml(l.contract||l.goal)}</p>${l.symbols?.map(s=>s.doc?`<div class="callout"><b>${escapeHtml(s.name)}</b><br>${escapeHtml(s.doc)}</div>`:'').join('')}</div><div class="card editor-card"><div class="editor-top"><span>seu código · salvo automaticamente neste navegador</span><span>N${String(n).padStart(3,'0')}</span></div><div class="editor-wiki-hint">⌨ <b>Ctrl/⌘ + clique</b> em uma palavra já aprendida para abrir sua Wiki.</div><div id="challenge-editor" class="editor"></div><div class="editor-actions"><button class="secondary" id="runBtn">▶ Rodar</button><button class="primary" id="checkBtn">✓ Corrigir</button><button class="ghost" id="hintBtn">Dica</button><button class="ghost" id="chatBtn">Perguntar ao ChatGPT</button></div><pre id="output" class="output">Seu código roda aqui, sem terminal.</pre><div id="hint" class="hint"></div><div id="feedback" class="feedback">Clique em Corrigir quando terminar. Se falhar, eu mostro o que ainda não bateu com a tarefa.</div></div><div id="completeBox" class="complete-box ${state.passed[n]?'':'hidden'}"><b>Desafio aprovado.</b><label class="reflection"><input id="reflect" type="checkbox"> Eu consigo explicar em voz alta por que minha solução funciona e citar um caso em que ela poderia falhar.</label><button id="completeBtn" class="primary" ${done?'disabled':''}>${done?'Nível concluído ✓':'Concluir nível'}</button></div>`}
document.getElementById('view').innerHTML=`<div class="lesson-shell"><button class="back" onclick="go('home')">← voltar para a jornada</button><header class="lesson-head"><span class="eyebrow">Arco ${l.arc} · ${escapeHtml(l.arc_name)}</span><h1>${escapeHtml(l.title)}</h1><div class="lesson-meta"><span class="pill">${l.kind==='arena'?'Arena':l.kind==='project'?'Projeto':'Aula'}</span><span class="pill">+${l.xp} XP</span><span class="pill">${done?'Concluído':'Em progresso'}</span></div></header><div class="lesson-layout"><div class="content-stack"><div class="card"><span class="eyebrow">01 · Entender</span><h2>O que precisa ficar natural</h2><p>${escapeHtml(l.goal)}</p><div class="concept">${escapeHtml(l.concept)}</div><div class="lesson-teach">${simpleMd(l.teach||'')}</div>${newTerms}<h3>Modelo mental</h3><p>${escapeHtml(l.mental)}</p><div class="callout mistake"><b>Erro comum</b><br>${escapeHtml(l.mistake)}</div></div><div class="card editor-card"><div class="editor-top"><span>02 · Experimentar (área de teste)</span><span>não vale como resposta</span></div><div class="editor-wiki-hint">⌨ Em aulas futuras, use <b>Ctrl/⌘ + clique</b> em palavras já aprendidas para relembrá-las sem sair do código.</div><div id="sandbox-editor" class="editor" style="height:220px"></div><div class="editor-actions"><button class="secondary" id="sandboxRun">▶ Experimentar</button><button class="ghost" id="restoreExample">Restaurar exemplo</button></div><pre id="sandboxOutput" class="output">Aqui você pode brincar com o exemplo. A resposta do desafio fica na próxima caixa.</pre></div>${mission}</div><aside class="lesson-side"><div class="step-list"><div class="ok">01 · Entender</div><div class="ok">02 · Experimentar</div><div class="${state.passed[n]||l.kind==='project'?'ok':''}">03 · Resolver</div><div class="${done?'ok':''}">04 · Explicar e concluir</div></div><button class="ghost" id="copyContext">Copiar contexto para esta conversa</button><small style="color:var(--muted);line-height:1.5">O botão copia aula, seu código e último erro. Cole aqui no ChatGPT e eu consigo atuar como tutor sem você explicar tudo de novo.</small></aside></div></div>`;
sandboxEditor=initAce('sandbox-editor',l.example||'# experimente aqui');currentEditor=initAce('challenge-editor',state.codes[n]??l.starter??'# escreva aqui');attachWikiClick(sandboxEditor,n);attachWikiClick(currentEditor,n);currentEditor.session.on('change',()=>{state.codes[n]=currentEditor.getValue();save()});document.getElementById('sandboxRun').onclick=async()=>{const out=document.getElementById('sandboxOutput');out.textContent='Executando…';let r=await runPython(sandboxEditor.getValue());out.textContent=r.ok?(r.stdout||'Executou sem saída.'):r.error};document.getElementById('restoreExample').onclick=()=>sandboxEditor.setValue(l.example||'',-1);document.getElementById('runBtn').onclick=async()=>{const out=document.getElementById('output');out.textContent='Executando…';let r=await runPython(currentEditor.getValue());out.textContent=r.ok?(r.stdout||'Executou sem erro. Agora use “Corrigir”.'):r.error;lastFeedback=r.error||r.stdout};if(l.kind!=='project'){document.getElementById('checkBtn').onclick=async()=>{const fb=document.getElementById('feedback');fb.className='feedback';fb.textContent='Corrigindo…';let r=await runPython(currentEditor.getValue(),l.test);lastFeedback=r.error||'Todos os testes passaram.';if(r.ok){state.passed[n]=true;markActivity();save();fb.classList.add('success');fb.textContent='✓ Passou nos testes. Agora explique sua solução antes de concluir.';document.getElementById('completeBox').classList.remove('hidden')}else{fb.classList.add('fail');let last=(r.error||'').trim().split('\n').slice(-2).join('\n');fb.textContent='Ainda não. '+last}};let hintStep=0;document.getElementById('hintBtn').onclick=()=>{hintStep=Math.min(3,hintStep+1);const hints=[`Descreva primeiro a entrada e a saída. O objetivo é: ${l.goal}`,`O conceito central deste nível é “${l.concept}”. Qual parte do contrato pede exatamente isso?`,`Volte ao microexemplo da etapa Experimentar. Não copie: compare a forma dele com a responsabilidade da sua função.`];const h=document.getElementById('hint');h.textContent=`Dica ${hintStep}/3 · ${hints[hintStep-1]}`;h.classList.add('show')};document.getElementById('completeBtn').onclick=()=>{if(!document.getElementById('reflect').checked){toast('Marque a explicação antes de concluir.');return}if(!state.completed.includes(n))state.completed.push(n);markActivity();unlockCards(n);save();toast(`Nível ${n} concluído`);setTimeout(()=>go('home'),450)}}else{document.getElementById('completeProject').onclick=()=>{if([...document.querySelectorAll('.pc')].some(x=>!x.checked)){toast('Feche os quatro critérios do projeto primeiro.');return}if(!state.completed.includes(n))state.completed.push(n);markActivity();unlockCards(n);save();toast('Projeto concluído');setTimeout(()=>go('home'),450)}}document.getElementById('chatBtn').onclick=()=>copyTutorContext(l,currentEditor.getValue());document.getElementById('copyContext').onclick=()=>copyTutorContext(l,currentEditor.getValue())}
function unlockCards(n){for(const c of DATA.cards.filter(x=>x.level===n)){if(!state.reviews[c.id]){let d=new Date();d.setDate(d.getDate()+1);state.reviews[c.id]={interval:1,due:d.toISOString().slice(0,10),ease:2.2}}}}
async function copyTutorContext(l,code){const text=`Estou fazendo o Python Arcádia e estou no Nível ${l.level}: ${l.title}.\nObjetivo: ${l.goal}\nConceito: ${l.concept}\n\nMeu código atual:\n\n${code}\n\nÚltimo feedback/teste:\n${lastFeedback||'Ainda não rodei a correção.'}\n\nAtue como meu tutor. Não entregue a solução pronta. Primeiro identifique meu raciocínio, faça no máximo uma pergunta curta se realmente precisar e me dê uma dica progressiva. Se meu código estiver certo, peça que eu explique por que funciona e proponha um caso de borda.`;await navigator.clipboard.writeText(text);toast('Contexto copiado. Cole nesta conversa do ChatGPT.')}
function reviewView(){const due=reviewDue();if(!due.length){document.getElementById('view').innerHTML=`<span class="eyebrow">Revisão espaçada</span><h1>Nada vencido agora.</h1><div class="empty">Quando você conclui níveis, conceitos voltam em intervalos diferentes conforme sua dificuldade.</div>`;return}let idx=0,revealed=false;const renderCard=()=>{const c=due[idx];document.getElementById('view').innerHTML=`<div class="review-wrap"><span class="eyebrow">Revisão ${idx+1}/${due.length} · N${String(c.level).padStart(3,'0')}</span><div class="review-card"><h2>${escapeHtml(c.q)}</h2>${revealed?`<div class="review-answer">${escapeHtml(c.a)}</div>`:''}</div>${revealed?`<div class="review-actions"><button onclick="gradeReview('${c.id}',0)">0 · apaguei</button><button onclick="gradeReview('${c.id}',1)">1 · difícil</button><button onclick="gradeReview('${c.id}',2)">2 · bom</button><button onclick="gradeReview('${c.id}',3)">3 · fácil</button></div>`:`<button class="primary" style="margin-top:14px" id="reveal">Revelar resposta</button>`}</div>`;if(!revealed)document.getElementById('reveal').onclick=()=>{revealed=true;renderCard()}};window.gradeReview=(id,q)=>{const old=state.reviews[id]||{interval:1,ease:2.2};let interval=q===0?1:q===1?Math.max(2,Math.round(old.interval*1.4)):q===2?Math.max(4,Math.round(old.interval*2.1)):Math.max(7,Math.round(old.interval*3));let d=new Date();d.setDate(d.getDate()+interval);state.reviews[id]={interval,due:d.toISOString().slice(0,10),ease:old.ease};markActivity();save();idx++;revealed=false;if(idx>=due.length){toast('Revisões concluídas');go('home')}else renderCard()};renderCard()}
function examsView(){let rows='';for(let a=1;a<=10;a++){const levels=DATA.levels.slice((a-1)*10,a*10),unlocked=levels.every(x=>state.completed.includes(x.level)),score=state.examScores[a]||0;rows+=`<div class="exam-row"><div><b>Prova ${a} · ${escapeHtml(levels[0].arc_name)}</b><p>5 tarefas práticas · aprovação em 70/100 · sem tutor durante a tentativa.</p></div><div style="display:flex;gap:12px;align-items:center"><span class="score">${score?score+'/100':'—'}</span><button class="${unlocked?'primary':'ghost'}" ${unlocked?'':'disabled'} onclick="go('exam',${a})">${score?'Refazer':'Começar'}</button></div></div>`}document.getElementById('view').innerHTML=`<span class="eyebrow">Avaliação</span><h1>Provas práticas</h1><p style="color:var(--muted);max-width:700px">A prova é o ponto em que as dicas desaparecem. Você recebe contratos e escreve Python. A correção acontece no navegador e o próximo arco só abre com 70 ou mais.</p><div class="exam-list">${rows}</div>`}
function examView(a){const levels=DATA.levels.slice((a-1)*10,a*10);if(!levels.every(x=>state.completed.includes(x.level))){document.getElementById('view').innerHTML='<div class="empty">Conclua o arco antes da prova.</div>';return}const e=exam(a),code=state.examCodes[a]??e.starter;document.getElementById('view').innerHTML=`<div class="lesson-shell"><button class="back" onclick="go('exams')">← provas</button><header class="lesson-head"><span class="eyebrow">Avaliação · Arco ${a}</span><h1>${escapeHtml(e.title)}</h1></header><div class="exam-warning"><b>Modo prova:</b> o botão de tutor some de propósito. Consulte apenas a documentação que você normalmente consultaria trabalhando.</div><div class="card editor-card" style="margin-top:18px"><div class="editor-top"><span>5 tarefas · cada uma vale 20 pontos</span><span id="examScore">${state.examScores[a]?`melhor: ${state.examScores[a]}/100`:''}</span></div><div id="challenge-editor" class="editor" style="height:520px"></div><div class="editor-actions"><button class="secondary" id="runExam">▶ Rodar</button><button class="primary" id="gradeExam">✓ Entregar e corrigir</button></div><pre id="output" class="output">Boa prova.</pre><div id="feedback" class="feedback"></div></div></div>`;currentEditor=initAce('challenge-editor',code);currentEditor.session.on('change',()=>{state.examCodes[a]=currentEditor.getValue();save()});document.getElementById('runExam').onclick=async()=>{let r=await runPython(currentEditor.getValue());document.getElementById('output').textContent=r.ok?(r.stdout||'Executou sem erro.'):r.error};document.getElementById('gradeExam').onclick=async()=>{let r=await gradeExamDetailed(currentEditor.getValue(),e.tasks);let score=r.score;state.examScores[a]=Math.max(Number(state.examScores[a]||0),score);markActivity();save();const fb=document.getElementById('feedback');fb.className='feedback '+(score>=70?'success':'fail');fb.textContent=`Nota: ${score}/100 · ${score>=70?'Aprovado. O próximo arco foi liberado.':'Ainda não atingiu 70. Revise os pontos fracos e tente novamente.'}`;document.getElementById('examScore').textContent=`melhor: ${state.examScores[a]}/100`}}
async function gradeExamDetailed(code,tasks){
  if(!pyodide){
    const ready = typeof window.ensureArcadiaPythonReady==='function' ? await window.ensureArcadiaPythonReady() : false;
    if(!ready || !pyodide) return {score:0,details:[],error:'Não consegui iniciar o Python.'};
  }
  try{
    pyodide.globals.set('ARC_EXAM_CODE', String(code ?? ''));
    pyodide.globals.set('ARC_EXAM_TASKS_JSON', JSON.stringify(tasks || []));
    const raw = await pyodide.runPythonAsync(`
import io, contextlib, traceback, types, pathlib, os, json, math, statistics, re, csv, tempfile
from datetime import date, datetime, timedelta
from collections import *

TASKS = json.loads(ARC_EXAM_TASKS_JSON)

class _Raises:
    def __init__(self, exc): self.exc = exc
    def __enter__(self): return self
    def __exit__(self, typ, val, tb):
        if typ is None: raise AssertionError('Era esperada uma exceção')
        if not issubclass(typ, self.exc): return False
        return True

class _Pytest:
    def fail(self, msg='falhou'): raise AssertionError(msg)
    def skip(self, msg='pendente'): raise AssertionError(msg)
    def raises(self, exc): return _Raises(exc)

pytest = _Pytest()
score = 0
details = []
error = ''

try:
    ns = {}
    exec(ARC_EXAM_CODE, ns)
    m = types.SimpleNamespace(**{k:v for k,v in ns.items() if not k.startswith('__')})
    tmp_path = pathlib.Path('/tmp/arcadia_exam')
    tmp_path.mkdir(parents=True, exist_ok=True)
except BaseException:
    error = traceback.format_exc(limit=5)
else:
    base = globals().copy()
    base.update(ns)
    base.update({'m':m, 'tmp_path':tmp_path, 'pytest':pytest})
    for task in TASKS[:5]:
        try:
            env = base.copy()
            exec(task, env)
            score += 20
            details.append(True)
        except BaseException:
            details.append(False)

json.dumps({'score':score, 'details':details, 'error':error}, ensure_ascii=False)
`);
    return JSON.parse(typeof raw === 'string' ? raw : String(raw));
  }catch(err){
    console.error('Arcádia: falha ao corrigir prova', err);
    return {score:0,details:[],error:'Falha interna na correção: '+(err?.message||String(err))};
  }
}
function progressView(){const pct=state.completed.length;const badges=[['Primeiro passo',pct>=1,'Conclua o primeiro nível'],['Primeiro arco',pct>=10&&arcPassed(1),'Passe pela primeira prova'],['Coleções naturais',pct>=20&&arcPassed(2),'Conclua o arco 2'],['Metade da jornada',pct>=50,'Chegue ao nível 50'],['Engenheiro',pct>=90,'Chegue ao arco final'],['Naturalizado',pct>=100&&arcPassed(10),'Conclua todos os níveis e provas']];document.getElementById('view').innerHTML=`<span class="eyebrow">Seu histórico</span><h1>${rank()}</h1><p style="color:var(--muted)">${calcXp()} XP · ${streak()} dias de sequência · ${Object.values(state.examScores).filter(x=>x>=70).length}/10 provas aprovadas</p><div class="progress-big"><i style="width:${pct}%"></i></div><h2 class="section-title">Conquistas</h2><div class="badges">${badges.map(b=>`<div class="badge-card ${b[1]?'':'locked'}"><b>${b[1]?'✓ ':'⌁ '}${b[0]}</b><p style="color:var(--muted);font-size:12px">${b[2]}</p></div>`).join('')}</div><h2 class="section-title">Segurança do progresso</h2><div class="card"><p>O progresso fica salvo no navegador. Exporte um arquivo JSON de vez em quando para ter backup e poder continuar em outro computador.</p><button class="secondary" onclick="document.getElementById('exportBtn').click()">Exportar agora</button></div>`}
async function boot(){document.getElementById('boot').classList.add('hidden');document.getElementById('app').classList.remove('hidden');updateChrome();render();try{if(typeof loadPyodide!=='function')throw new Error('Biblioteca Pyodide não carregou');pyodide=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'});const warm=await pyodide.runPythonAsync('40 + 2');if(Number(warm)!==42)throw new Error('Teste interno do Python falhou');const el=document.getElementById('pyStatus');if(el){el.textContent='● Python pronto · v6';el.classList.add('ready')}}catch(e){console.error('Arcádia: falha ao iniciar Python',e);const el=document.getElementById('pyStatus');if(el){el.textContent='● Python indisponível';el.classList.remove('ready')}toast('Não consegui iniciar o Python. Recarregue a página.')}}
document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>go(b.dataset.route));document.getElementById('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='python-arcadia-progresso.json';a.click();URL.revokeObjectURL(a.href)};document.getElementById('importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{state={...initial(),...JSON.parse(await f.text())};save();render();toast('Progresso importado')}catch{toast('Arquivo de progresso inválido')}};/* boot delegado para v6.js */