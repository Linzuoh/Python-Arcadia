/* Python Arcádia V9 — camada didática guiada */
const V9=window.ARCADIA_V9||{lessons:{}};
const V9_LESSONS=V9.lessons||{};
const v9BaseLessonView=lessonView;

function v9Md(text){return simpleMd(String(text||'')).replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')}
function v9WalkHtml(items){return `<ol class="v9-walk">${(items||[]).map((x,i)=>`<li><span>${i+1}</span><div class="v9-walk-text">${v9Md(x)}</div></li>`).join('')}</ol>`}
function v9VariationHtml(items){return `<div class="v9-variations">${(items||[]).map(x=>`<div>${v9Md(x)}</div>`).join('')}</div>`}
function v9TeachCard(n,d){
  const diagram=d.diagram?`<pre class="v9-diagram">${escapeHtml(d.diagram)}</pre>`:'';
  return `<section class="card v9-teach-card" data-v9-lesson="${n}">
    <div class="v9-teach-head"><div><span class="eyebrow">Aula guiada · V9</span><h2>Entenda antes de decorar</h2></div><span class="v9-depth">explicação detalhada</span></div>
    <div class="v9-why"><h3>Por que isso existe?</h3>${v9Md(d.why)}</div>
    <div class="v9-model"><h3>Como pensar</h3>${v9Md(d.mental)}</div>
    ${diagram}
    <details class="v9-details" open><summary>Executando o raciocínio passo a passo</summary>${v9WalkHtml(d.walk)}</details>
    <details class="v9-details"><summary>Variações que você precisa reconhecer</summary>${v9VariationHtml(d.variations)}</details>
  </section>`
}
function v9PracticeCard(n,d){
  const saved=state.v9Predictions?.[n]||'';
  return `<section class="card v9-practice-card" data-v9-practice="${n}">
    <span class="eyebrow">02 · Prática guiada</span>
    <h2>Preveja antes de executar</h2>
    <p>Use o exemplo da caixa <b>Experimentar</b> logo abaixo. Mude <b>uma coisa pequena</b> — um valor, texto ou condição — sem trocar o conceito principal da aula.</p>
    <div class="v9-practice-flow"><span>1 · altere o exemplo</span><b>→</b><span>2 · preveja o resultado</span><b>→</b><span>3 · rode e compare</span></div>
    <textarea id="v9Prediction" placeholder="O que você acha que vai acontecer quando rodar?">${escapeHtml(saved)}</textarea>
    <small>Isso é opcional, mas é uma das melhores formas de deixar o conceito menos “mágico”.</small>
  </section>`
}
function v9AttachPrediction(n){
  state.v9Predictions=state.v9Predictions||{};
  const ta=document.getElementById('v9Prediction');
  if(ta)ta.oninput=()=>{state.v9Predictions[n]=ta.value;save()};
}
function v9CheckCard(n,d){
  const saved=state.v9LessonChecks?.[n]||'';
  return `<section class="card v9-check-card" data-v9-check="${n}">
    <span class="eyebrow">Antes do desafio · cheque rápido</span>
    <h2>Explique sem executar</h2>
    <div class="v9-check-question">${v9Md(d.checkQ)}</div>
    <textarea id="v9CheckText" placeholder="Responda com suas palavras. Não precisa escrever bonito; tente recuperar a ideia da memória.">${escapeHtml(saved)}</textarea>
    <div class="v9-check-actions"><button class="secondary" id="v9Compare">Comparar meu raciocínio</button><button class="ghost" id="v9Skip">Não lembro · ver referência</button></div>
    <div id="v9Reference" class="v9-reference hidden"><span>Resposta de referência</span><div>${v9Md(d.checkRef)}</div><p>Não precisa estar com as mesmas palavras. Procure a mesma ideia.</p></div>
  </section>`
}
function v9AttachCheck(n,d){
  state.v9LessonChecks=state.v9LessonChecks||{};
  const ta=document.getElementById('v9CheckText'),ref=document.getElementById('v9Reference');
  if(!ta||!ref)return;
  ta.oninput=()=>{state.v9LessonChecks[n]=ta.value;save()};
  const reveal=(skip=false)=>{
    const value=String(ta.value||'').trim();
    if(!skip&&value.length<3){toast('Tente escrever pelo menos uma ideia antes de comparar.');ta.focus();return}
    state.v9LessonChecks[n]=ta.value;save();ref.classList.remove('hidden');
    ref.scrollIntoView({behavior:'smooth',block:'nearest'});
  };
  document.getElementById('v9Compare').onclick=()=>reveal(false);
  document.getElementById('v9Skip').onclick=()=>reveal(true);
}
function v9EnhanceLesson(n){
  const l=level(n),d=V9_LESSONS[String(n)];
  if(!l||l.kind!=='lesson'||!d)return;
  const stack=document.querySelector('.lesson-layout .content-stack');
  if(!stack)return;
  const cards=[...stack.children];
  const understand=cards.find(x=>x.querySelector?.('.eyebrow')?.textContent?.includes('01 · Entender'));
  const sandbox=cards.find(x=>x.querySelector?.('.editor-top span')?.textContent?.includes('02 · Experimentar'));
  const challenge=cards.find(x=>x.querySelector?.('.eyebrow')?.textContent?.includes('03 · Desafio'));
  if(understand && !stack.querySelector('[data-v9-lesson]')) understand.insertAdjacentHTML('afterend',v9TeachCard(n,d));
  const guide=stack.querySelector('[data-v9-lesson]');
  if(guide && !stack.querySelector('[data-v9-practice]')) guide.insertAdjacentHTML('afterend',v9PracticeCard(n,d));
  const practice=stack.querySelector('[data-v9-practice]');
  // Keep Experimentar immediately after the guided prediction step.
  if(practice&&sandbox&&practice.nextElementSibling!==sandbox)practice.insertAdjacentElement('afterend',sandbox);
  if(challenge && !stack.querySelector('[data-v9-check]')) challenge.insertAdjacentHTML('beforebegin',v9CheckCard(n,d));
  v9AttachPrediction(n);v9AttachCheck(n,d);
  const side=document.querySelector('.lesson-side .step-list');
  if(side&&!side.querySelector('.v9-side-step')){
    const steps=[...side.children];
    if(steps[1])steps[1].insertAdjacentHTML('afterend','<div class="v9-side-step">02½ · Explicar com suas palavras</div>');
  }
}
lessonView=function(n){v9BaseLessonView(n);v9EnhanceLesson(n)};

// Migration is intentionally non-destructive; current progress/codes survive.
state.v9LessonChecks=state.v9LessonChecks||{};
state.v9Predictions=state.v9Predictions||{};
if(!state.version9){state.version9=true;save()}

// Keep visible status/version coherent once Python is loaded.
const v9BaseUpdateChrome=updateChrome;
updateChrome=function(){v9BaseUpdateChrome();const el=document.getElementById('pyStatus');if(el&&/Python pronto/.test(el.textContent))el.textContent='● Python pronto · v9'};
setTimeout(()=>{const el=document.getElementById('pyStatus');if(el&&/Python pronto/.test(el.textContent))el.textContent='● Python pronto · v9'},200);

window.addEventListener('arcadia-python-ready',()=>{const el=document.getElementById('pyStatus');if(el)el.textContent='● Python pronto · v9'});
