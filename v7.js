const V7=window.ARCADIA_V7||{};
const PET_POWERS=V7.petPowers||{};
const PET_VISUALS=V7.petVisuals||{};
const PET_MAX_ENERGY=Number(V7.maxEnergy||3);

const v7BaseApplyCosmetics=applyCosmetics;
const v7BasePetSay=petSay;
const v7BaseShopCard=shopCard;
const v7BaseShopView=shopView;
const v7BaseLessonView=lessonView;
const v7BasePracticeView=practiceView;
const v7BaseDailyView=dailyView;
const v7BaseUpdateChrome=updateChrome;

function v7Defaults(){return {
  petEnergy:{day:'',value:PET_MAX_ENERGY},
  petPowerUses:{},
  petBond:{},
  version7:true
}}
function ensureV7State(){
  const d=v7Defaults();
  for(const [k,v] of Object.entries(d)) if(state[k]===undefined) state[k]=structuredClone(v);
  if(!state.petEnergy||state.petEnergy.day!==localDay()) state.petEnergy={day:localDay(),value:PET_MAX_ENERGY};
  state.petEnergy.value=Math.max(0,Math.min(PET_MAX_ENERGY,Number(state.petEnergy.value??PET_MAX_ENERGY)));
  state.petPowerUses=state.petPowerUses||{};
  state.petBond=state.petBond||{};
}
ensureV7State();

function petPowerFor(id=state.equippedPet){return PET_POWERS[id]||null}
function petVisualFor(id=state.equippedPet){return PET_VISUALS[id]||null}
function petEnergy(){ensureV7State();return Number(state.petEnergy.value||0)}
function petBond(id=state.equippedPet){return Number(state.petBond?.[id]||0)}
function petBondStage(id=state.equippedPet){const b=petBond(id);return b>=30?'parceiro':b>=12?'próximo':b>=4?'curioso':'novo'}
function addPetBond(amount=1){if(!state.equippedPet)return;state.petBond[state.equippedPet]=petBond()+amount;localStorage.setItem(KEY,JSON.stringify(state))}
function petPowerAllowed(){
  const [r,a]=parseRoute();
  if(r==='exam') return {ok:false,reason:'Poderes ficam desligados durante provas.'};
  if(r==='practice'){
    const p=practiceById(a);
    if(p?.type==='fluency') return {ok:false,reason:'No Modo Fluência, o pet só acompanha visualmente.'};
  }
  if(!['lesson','practice','daily'].includes(r))return {ok:false,reason:'Abra uma aula, treino ou desafio diário com editor para usar o poder.'};
  return {ok:true,reason:''};
}
function getActivePetEditor(){
  const [r]=parseRoute();
  if(r==='lesson'&&currentEditor)return currentEditor;
  if(r==='practice'&&document.getElementById('practiceEditor')){try{return ace.edit('practiceEditor')}catch{}}
  if(r==='daily'&&document.getElementById('dailyEditor')){try{return ace.edit('dailyEditor')}catch{}}
  return null;
}
function activeCode(){return getActivePetEditor()?.getValue?.()||''}

function ensurePetWorld(){
  let world=document.getElementById('petWorld');
  if(world)return world;
  world=document.createElement('div');
  world.id='petWorld';
  world.className='pet-world hidden';
  world.innerHTML=`<button id="petActor" class="pet-actor" type="button" aria-label="Abrir companheiro"><span class="pet-shadow"></span><span class="pet-body" id="petBody"></span><span class="pet-mini-spark">✦</span></button><div id="petBubble" class="pet-world-bubble" aria-live="polite"></div>`;
  document.body.appendChild(world);
  world.querySelector('#petActor').addEventListener('click',()=>openPetPanel());
  return world;
}
let petMoveTimer=null,petBubbleTimer=null,petCurrentX=null;
function clearPetMoveTimer(){if(petMoveTimer){clearTimeout(petMoveTimer);petMoveTimer=null}}
function walkBounds(){
  const sidebar=document.querySelector('.sidebar');
  const sidebarW=window.innerWidth>900?(sidebar?.getBoundingClientRect().width||250):0;
  return {min:Math.min(window.innerWidth-80,sidebarW+18),max:Math.max(sidebarW+18,window.innerWidth-82)};
}
function placePet(initial=false){
  const actor=document.getElementById('petActor');if(!actor||!state.equippedPet)return;
  const b=walkBounds();
  if(petCurrentX==null||initial)petCurrentX=b.max-22;
  petCurrentX=Math.max(b.min,Math.min(b.max,petCurrentX));
  actor.style.left=`${petCurrentX}px`;
}
function schedulePetWander(delay=null){
  clearPetMoveTimer();
  if(!state.equippedPet||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const wait=delay??(9000+Math.random()*12000);
  petMoveTimer=setTimeout(()=>{
    const actor=document.getElementById('petActor');if(!actor||!state.equippedPet)return;
    const b=walkBounds();const old=petCurrentX??b.max;let target=b.min+Math.random()*(b.max-b.min);
    if(Math.abs(target-old)<140)target=old<(b.min+b.max)/2?b.max-20:b.min+20;
    const dist=Math.abs(target-old),duration=Math.max(2800,Math.min(9000,dist*11));
    actor.dataset.dir=target<old?'left':'right';actor.classList.add('walking');actor.style.setProperty('--walk-ms',`${duration}ms`);petCurrentX=target;actor.style.left=`${target}px`;
    setTimeout(()=>{actor.classList.remove('walking');if(Math.random()<.28)actor.classList.add('doze');setTimeout(()=>actor.classList.remove('doze'),2600)},duration+30);
    schedulePetWander(duration+7000+Math.random()*9000);
  },wait)
}
function renderPetWorld(){
  const world=ensurePetWorld(),actor=world.querySelector('#petActor'),body=world.querySelector('#petBody');
  const pet=itemById(state.equippedPet),visual=petVisualFor();
  if(!pet||!visual){world.classList.add('hidden');clearPetMoveTimer();return}
  world.classList.remove('hidden');actor.className=`pet-actor pet-${visual.className}`;actor.dataset.dir=actor.dataset.dir||'left';body.textContent=visual.glyph;actor.title=`${pet.name} · clique para abrir`;
  placePet(petCurrentX==null);schedulePetWander();
}
function petWorldSay(text){
  const world=ensurePetWorld(),bubble=world.querySelector('#petBubble');
  if(!state.equippedPet||world.classList.contains('hidden'))return;
  bubble.textContent=text;bubble.classList.add('show');
  if(petBubbleTimer)clearTimeout(petBubbleTimer);petBubbleTimer=setTimeout(()=>bubble.classList.remove('show'),3000);
  const actor=world.querySelector('#petActor');actor.classList.remove('celebrate');void actor.offsetWidth;actor.classList.add('celebrate');setTimeout(()=>actor.classList.remove('celebrate'),900)
}
petSay=function(text){v7BasePetSay(text);petWorldSay(text)}

function petDockHtml(pet,power){
  const vis=petVisualFor(pet.id);const energy=petEnergy();
  return `<button class="pet-status-button" id="petStatusButton" type="button"><span class="pet-status-glyph">${vis?.glyph||pet.icon}</span><span><b>${escapeHtml(pet.name)}</b><small>${escapeHtml(power?.name||'companheiro')} · ⚡ ${energy}/${PET_MAX_ENERGY}</small></span></button>`
}
applyCosmetics=function(){
  v7BaseApplyCosmetics();ensureV7State();
  const dock=document.getElementById('petDock'),pet=itemById(state.equippedPet),power=petPowerFor();
  if(dock&&pet){dock.classList.remove('hidden');dock.innerHTML=petDockHtml(pet,power);document.getElementById('petStatusButton')?.addEventListener('click',openPetPanel)}
  renderPetWorld();
}
updateChrome=function(){ensureV7State();v7BaseUpdateChrome();renderPetAssistStatus()}

function powerEnergyPips(){return Array.from({length:PET_MAX_ENERGY},(_,i)=>`<i class="${i<petEnergy()?'on':''}"></i>`).join('')}
function openPetPanel(message=''){
  const pet=itemById(state.equippedPet),power=petPowerFor(),visual=petVisualFor();
  if(!pet||!power){toast('Equipe um pet na Loja primeiro.');return}
  let overlay=document.getElementById('petPanelOverlay');
  if(!overlay){overlay=document.createElement('div');overlay.id='petPanelOverlay';overlay.className='pet-panel-overlay hidden';document.body.appendChild(overlay)}
  const allow=petPowerAllowed();
  overlay.innerHTML=`<div class="pet-panel"><button class="pet-panel-close" type="button">×</button><div class="pet-panel-hero"><div class="pet-panel-creature pet-${visual?.className||''}">${visual?.glyph||pet.icon}</div><div><span class="eyebrow">companheiro animado · vínculo ${escapeHtml(petBondStage())}</span><h2>${escapeHtml(pet.name)}</h2><p>${escapeHtml(power.short)}</p></div></div><div class="pet-power-card"><div class="pet-power-top"><span class="pet-power-icon">${power.icon}</span><div><b>${escapeHtml(power.name)}</b><small>${escapeHtml(power.detail)}</small></div></div><div class="pet-energy-row"><span>Energia de hoje</span><div class="pet-energy-pips">${powerEnergyPips()}</div><b>${petEnergy()}/${PET_MAX_ENERGY}</b></div>${message?`<div class="pet-power-result">${message}</div>`:''}<button class="primary" id="petUsePower" type="button" ${!allow.ok||petEnergy()<=0?'disabled':''}>${petEnergy()<=0?'Energia esgotada':`Usar ${escapeHtml(power.name)} · ⚡ 1`}</button>${!allow.ok?`<p class="pet-power-lock">${escapeHtml(allow.reason)}</p>`:''}</div><p class="pet-panel-note">O poder nunca escreve código, nunca revela testes ocultos e fica desligado em provas e no Modo Fluência.</p></div>`;
  overlay.classList.remove('hidden');overlay.querySelector('.pet-panel-close').onclick=()=>overlay.classList.add('hidden');overlay.onclick=e=>{if(e.target===overlay)overlay.classList.add('hidden')};
  const use=overlay.querySelector('#petUsePower');if(use&&!use.disabled)use.onclick=()=>usePetPower();
}

function renderPetAssistStatus(){
  document.querySelectorAll('.pet-assist-bar').forEach(x=>x.remove());
  const pet=itemById(state.equippedPet),power=petPowerFor();if(!pet||!power)return;
  const allow=petPowerAllowed();if(!allow.ok)return;
  const editor=getActivePetEditor();if(!editor)return;
  const actions=editor.container?.closest('.editor-card')?.querySelector('.editor-actions');if(!actions)return;
  const bar=document.createElement('div');bar.className='pet-assist-bar';bar.innerHTML=`<div><span>${petVisualFor()?.glyph||pet.icon}</span><div><b>${escapeHtml(power.name)}</b><small>ajuda leve · não escreve código · ⚡ ${petEnergy()}/${PET_MAX_ENERGY}</small></div></div><button class="ghost" type="button" ${petEnergy()<=0?'disabled':''}>${petEnergy()<=0?'Sem energia hoje':'Usar poder'}</button>`;
  bar.querySelector('button').onclick=()=>usePetPower();actions.parentElement.insertBefore(bar,actions.nextSibling)
}

function extractErrorKind(text=''){const m=String(text).match(/\b(SyntaxError|IndentationError|NameError|TypeError|ValueError|KeyError|IndexError|AttributeError|AssertionError|ZeroDivisionError)\b/);return m?.[1]||null}
function extractErrorLine(text=''){const ms=[...String(text).matchAll(/line\s+(\d+)/gi)];return ms.length?Number(ms[ms.length-1][1]):null}
function petResult(title,html){
  const pet=itemById(state.equippedPet);openPetPanel(`<div class="pet-result-title">${escapeHtml(title)}</div>${html}`);petWorldSay(title)
}
async function powerSyntax(code){
  if(!pyodide){const ready=await window.ensureArcadiaPythonReady?.();if(!ready||!pyodide)return petResult('Python não iniciou','<p>Clique no indicador da lateral e tente novamente.</p>');}
  try{
    pyodide.globals.set('ARC_PET_CODE',String(code||''));
    const raw=await pyodide.runPythonAsync(`
import ast, json
try:
    ast.parse(ARC_PET_CODE)
    result={'ok':True}
except (SyntaxError, IndentationError) as e:
    result={'ok':False,'kind':type(e).__name__,'line':getattr(e,'lineno',None),'offset':getattr(e,'offset',None),'msg':str(e.msg)}
json.dumps(result,ensure_ascii=False)
`);
    const r=JSON.parse(String(raw));
    if(r.ok)return petResult('A estrutura parece válida','<p>Não encontrei SyntaxError/IndentationError. Se o desafio ainda falha, provavelmente o próximo passo é olhar <b>lógica, valores ou o contrato</b>.</p>');
    const guide=ERROR_GUIDES[r.kind]||'Olhe a estrutura dessa linha e a anterior.';
    petResult(`${r.kind} perto da linha ${r.line||'?'}`,`<p>${escapeHtml(guide)}</p><p class="pet-result-sub">O Slime não corrige a linha: ele só te diz onde concentrar os olhos.</p>`)
  }catch(e){petResult('Não consegui analisar a sintaxe',`<p>${escapeHtml(String(e?.message||e))}</p>`)}
}
async function powerError(code){
  let text=String(lastFeedback||'');
  if(!text||/Todos os testes passaram/.test(text)){const r=await runPython(code);text=r.error||r.stdout||''}
  const kind=extractErrorKind(text),line=extractErrorLine(text);
  if(!kind){return petResult('Ainda não senti um erro claro','<p>Rode ou corrija o código primeiro. Depois a Raposa consegue farejar o traceback e traduzir o ponto de partida.</p>')}
  const guide=ERROR_GUIDES[kind]||ERROR_GUIDES.Outro||'Comece pela linha indicada e pelos valores usados nela.';
  petResult(`${kind}${line?` · linha ${line}`:''}`,`<p>${escapeHtml(guide)}</p><p class="pet-result-sub">Primeiro descubra <b>o que o Python esperava</b> e <b>o que ele recebeu</b>. Não troque várias linhas ao mesmo tempo.</p>`)
}
function codeMentions(code,entry){const names=[entry.term,...(entry.aliases||[])].filter(x=>x&&x.length>1);return names.some(n=>new RegExp(`(^|[^A-Za-z0-9_])${String(n).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Za-z0-9_]|$)`,'i').test(code))}
function powerWiki(code){
  const learned=(window.ARCADIA_WIKI||[]).filter(e=>state.completed.includes(e.unlock));
  let candidates=learned.filter(e=>codeMentions(code,e));
  if(!candidates.length)candidates=learned.filter(e=>e.unlock<=currentLevel()).sort((a,b)=>b.unlock-a.unlock).slice(0,8);
  if(!candidates.length)return petResult('A Wiki ainda está pequena','<p>Conclua mais um nível para a Coruja ter algo já aprendido para recuperar.</p>');
  candidates.sort((a,b)=>b.unlock-a.unlock);const e=candidates[0];
  petResult(`Relembre: ${e.term}`,`<p>${escapeHtml(e.short)}</p><button class="ghost pet-open-wiki" type="button">Abrir esta entrada da Wiki</button>`);
  setTimeout(()=>{document.querySelector('.pet-open-wiki')?.addEventListener('click',()=>openWikiEntry(e))},0)
}
function indentationHint(code){
  const lines=String(code).split('\n');
  for(let i=0;i<lines.length;i++){
    const raw=lines[i],trim=raw.trim();if(!trim||trim.startsWith('#'))continue;
    if(/^(if|elif|else|for|while|def|class|try|except|finally|with)\b.*:\s*(#.*)?$/.test(trim)){
      let j=i+1;while(j<lines.length&&(!lines[j].trim()||lines[j].trim().startsWith('#')))j++;
      if(j<lines.length){const a=(raw.match(/^\s*/)||[''])[0].replace(/\t/g,'    ').length,b=(lines[j].match(/^\s*/)||[''])[0].replace(/\t/g,'    ').length;if(b<=a)return {line:j+1,msg:`A linha ${i+1} abre um bloco, mas a linha ${j+1} não parece estar mais para dentro.`}}
    }
    if(/^(if|elif|else|for|while|def|class|try|except|finally|with)\b/.test(trim)&&!trim.endsWith(':')&&!trim.includes(': #'))return {line:i+1,msg:`A linha ${i+1} parece iniciar um bloco. Confira como essas estruturas terminam antes da parte indentada.`}
  }
  return null
}
function powerIndent(code){const h=indentationHint(code);if(!h)return petResult('Blocos sem suspeita óbvia','<p>Não encontrei um problema simples de indentação. Compare agora as <b>condições</b> e a <b>ordem dos caminhos</b>.</p>');const ed=getActivePetEditor();if(ed&&h.line){try{ed.gotoLine(h.line,0,true);ed.focus()}catch{}}petResult(`Olhe a linha ${h.line}`,`<p>${escapeHtml(h.msg)}</p><p class="pet-result-sub">A Gata só levou o cursor até a região. O código continua exatamente como você escreveu.</p>`)}
async function powerSpark(code){
  const res=await tracePython(code);
  if(!res.steps?.length)return petResult('Sem fotografia de execução',`<p>${escapeHtml(res.error||'O programa não produziu passos observáveis.')}</p>`);
  let idx=-1;
  if(res.error)idx=Math.max(0,res.steps.length-1);
  if(idx<0)idx=res.steps.findIndex(s=>/^(if|elif|while|for)\b/.test(String(s.source||'').trim()));
  if(idx<0)idx=Math.min(res.steps.length-1,Math.floor(res.steps.length/2));
  const st=res.steps[idx],vars=Object.entries(st.locals||{}).slice(0,5),flow=flowHint(res.steps,idx);
  petResult(`Faísca na linha ${st.line}`,`<p><code>${escapeHtml(String(st.source||'').trim()||'(linha vazia)')}</code></p><div class="pet-snapshot">${vars.length?vars.map(([k,v])=>`<span><b>${escapeHtml(k)}</b> = ${escapeHtml(v)}</span>`).join(''):'<span>Nenhuma variável criada neste instante.</span>'}</div><p>${escapeHtml(flow)}</p><p class="pet-result-sub">É só uma fotografia. Se quiser percorrer todos os passos, use “Entender execução”.</p>`)
}

window.usePetPower=async function(){
  ensureV7State();const pet=itemById(state.equippedPet),power=petPowerFor();if(!pet||!power){toast('Equipe um pet na Loja primeiro.');return}
  const allow=petPowerAllowed();if(!allow.ok){toast(allow.reason);openPetPanel();return}
  if(petEnergy()<=0){toast('Seu pet já usou toda a energia de hoje. Amanhã volta para 3/3.');openPetPanel();return}
  const code=activeCode();if(!code.trim()){toast('Escreva alguma coisa no editor antes de usar o poder.');return}
  state.petEnergy.value--;state.petPowerUses[pet.id]=Number(state.petPowerUses[pet.id]||0)+1;addPetBond(1);save();renderPetAssistStatus();
  const overlay=document.getElementById('petPanelOverlay');if(overlay)overlay.classList.add('hidden');petWorldSay('Deixa comigo…');
  if(power.key==='syntax')await powerSyntax(code);
  else if(power.key==='error')await powerError(code);
  else if(power.key==='wiki')powerWiki(code);
  else if(power.key==='indent')powerIndent(code);
  else if(power.key==='spark')await powerSpark(code);
}

shopCard=function(i,lvl){
  if(i.type!=='pet')return v7BaseShopCard(i,lvl);
  const owned=state.inventory.includes(i.id),locked=lvl<i.level,equipped=isEquipped(i),power=PET_POWERS[i.id],visual=PET_VISUALS[i.id];
  let label=equipped?'Equipado':owned?'Equipar':locked?`Libera no Lv. ${i.level}`:`Comprar · ◇ ${i.price}`;
  return `<div class="shop-card pet-shop-card ${locked?'locked':''}">${equipped?'<span class="equipped-tag">equipado</span>':''}<div class="shop-icon pet-shop-preview pet-${visual?.className||''}">${visual?.glyph||i.icon}</div><span class="practice-tag">pet animado</span><h3>${escapeHtml(i.name)}</h3><p>${escapeHtml(i.desc)}</p><div class="shop-pet-power"><span>${power?.icon||'✦'}</span><div><b>${escapeHtml(power?.name||'Poder')}</b><small>${escapeHtml(power?.short||'Ajuda leve no código.')}</small></div></div><div class="shop-meta"><span>requer Lv. ${i.level}</span><span class="shop-price">${owned?'adquirido':'◇ '+i.price}</span></div><button class="${equipped?'ghost':'secondary'}" ${locked||equipped?'disabled':''} onclick="buyOrEquip('${i.id}')">${label}</button></div>`
}
shopView=function(){
  const lvl=playerLevel();document.getElementById('view').innerHTML=`<section class="shop-hero"><span class="eyebrow">recompensas visuais + companheiros</span><h1>Loja Arcádia</h1><p style="color:var(--muted);line-height:1.65">XP nunca é gasto: ele sobe seu level e libera prateleiras. Moedas ◇ compram temas, efeitos e pets. Pets são animados e cada espécie possui <b>um poder leve de estudo</b> com 3 cargas por dia — nunca escreve a solução.</p></section><div class="shop-wallet"><div class="wallet-box"><b>Lv. ${lvl}</b><span>nível de jogador</span></div><div class="wallet-box"><b>${calcXp()} XP</b><span>experiência acumulada</span></div><div class="wallet-box"><b>◇ ${state.coins||0}</b><span>saldo</span></div></div><div style="display:flex;gap:8px;margin-bottom:16px"><button class="ghost" onclick="unequipCosmetic('pet')">Sem pet</button><button class="ghost" onclick="unequipCosmetic('effect')">Sem efeito</button></div><div class="shop-grid">${SHOP.map(i=>shopCard(i,lvl)).join('')}</div>`;applyCosmetics()
}

lessonView=function(n){v7BaseLessonView(n);renderPetAssistStatus()}
practiceView=function(arg){v7BasePracticeView(arg);setTimeout(renderPetAssistStatus,0)}
dailyView=function(){v7BaseDailyView();setTimeout(renderPetAssistStatus,0)}

// Um pouco de vínculo por sessões recompensadas, sem alterar poder/nota.
const v7BaseRewardOverlay=rewardOverlay;
rewardOverlay=function(title,opts={}){if(state.equippedPet)addPetBond(/Nível|Projeto|Prova|Desafio diário/.test(title)?2:1);v7BaseRewardOverlay(title,opts)}

window.addEventListener('resize',()=>placePet());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedulePetWander(2500)});

// V7.2: sem MutationObserver no status. A V7.1 observava o próprio texto e
// reescrevia esse mesmo texto, criando um ciclo de mutações que podia congelar a página.
setTimeout(()=>{ensureV7State();applyCosmetics();renderPetAssistStatus()},100);
