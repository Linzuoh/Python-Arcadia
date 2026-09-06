const V6=window.ARCADIA_V6||{};
const SKILLS=V6.skills||[];
const SHOP=V6.shop||[];
const PRACTICE=V6.practice||[];
const PROJECT_STAGES=V6.projectStages||{};
const WHY=V6.why||{};
const ERROR_GUIDES=V6.errorGuides||{};
const ACHIEVEMENTS=V6.achievements||[];

const coreInitial=initial;
const coreSave=save;
const coreUpdateChrome=updateChrome;
const coreHome=home;
const coreLessonView=lessonView;
const coreExamView=examView;
const coreWikiView=wikiView;

function v6Defaults(){return {
  bonusXp:0, coins:0, inventory:['theme_default'], equippedTheme:'theme_default', equippedPet:null, equippedEffect:null,
  rewardedLevels:[], rewardedExams:[], economyMigrated:false,
  practiceRewards:{}, practiceCodes:{}, practiceMistakes:{},
  dailyCompleted:{}, dailyCodes:{},
  attempts:{}, errorNotebook:{}, customReviews:[], reflections:{}, projectStages:{},
  achievementClaims:[], reviewAnswers:0, hintUses:{}, debugUses:{},
  version6:true
}}
initial=function(){return {...coreInitial(),...v6Defaults()}}

function rewardCoinsForLevel(n){const k=level(n)?.kind;return k==='project'?35:k==='arena'?20:10}
function ensureV6State(){
  const d=v6Defaults();
  for(const [k,v] of Object.entries(d)) if(state[k]===undefined) state[k]=structuredClone(v);
  if(!Array.isArray(state.inventory))state.inventory=['theme_default'];
  if(!state.inventory.includes('theme_default'))state.inventory.unshift('theme_default');
  if(!state.economyMigrated){
    let migrated=0;
    for(const n of state.completed||[]) migrated+=rewardCoinsForLevel(Number(n));
    for(const [a,s] of Object.entries(state.examScores||{})) if(Number(s)>=70)migrated+=50;
    state.coins=Number(state.coins||0)+migrated;
    state.rewardedLevels=[...(state.completed||[])];
    state.rewardedExams=Object.entries(state.examScores||{}).filter(([,s])=>Number(s)>=70).map(([a])=>Number(a));
    state.economyMigrated=true;
  }
}
ensureV6State();

const baseCalcXp=calcXp;
calcXp=function(){return baseCalcXp()+Number(state.bonusXp||0)}
function playerLevel(xp=calcXp()){return 1+Math.floor(Math.max(0,xp)/150)}
function xpIntoLevel(){return calcXp()%150}
function rankName(){const l=playerLevel();if(l<3)return'Aprendiz';if(l<6)return'Explorador';if(l<10)return'Construtor';if(l<15)return'Desenvolvedor';if(l<21)return'Engenheiro';return'Naturalizado'}
rank=function(){return rankName()}
function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function localDateLabel(){return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'2-digit',month:'long'}).format(new Date())}
function maxCompleted(){return state.completed.length?Math.max(...state.completed.map(Number)):0}
function skillForLevel(n){return SKILLS.find(s=>n>=s.start&&n<=s.end)||SKILLS[0]}
function itemById(id){return SHOP.find(x=>x.id===id)}
function practiceById(id){return PRACTICE.find(x=>x.id===id)}
function hasPracticeReward(id){return !!state.practiceRewards?.[id]}

save=function(){
  localStorage.setItem(KEY,JSON.stringify(state));
  applyCosmetics();
  updateChrome();
}

function applyCosmetics(){
  const theme=itemById(state.equippedTheme)?.value||'default';
  document.body.dataset.theme=theme;
  [...document.body.classList].filter(x=>x.startsWith('effect-')).forEach(x=>document.body.classList.remove(x));
  const effect=itemById(state.equippedEffect)?.value;
  if(effect)document.body.classList.add('effect-'+effect);
  const dock=document.getElementById('petDock');
  if(dock){
    const pet=itemById(state.equippedPet);
    if(pet){dock.classList.remove('hidden');dock.innerHTML=`<div class="pet">${pet.icon}</div><div><b>${escapeHtml(pet.name)}</b><small>seu companheiro de código</small></div><div class="pet-speech" id="petSpeech">Boa sessão.</div>`}
    else{dock.classList.add('hidden');dock.innerHTML=''}
  }
}
function petSay(text){const dock=document.getElementById('petDock'),s=document.getElementById('petSpeech');if(!dock||!s)return;s.textContent=text;dock.classList.add('talk');setTimeout(()=>dock.classList.remove('talk'),2600)}

function naturalCount(){return SKILLS.filter(s=>masteryForSkill(s).state==='NATURAL').length}
function reviewDueV6(){
  const done=new Set(state.completed);
  const regular=DATA.cards.filter(c=>done.has(c.level)).filter(c=>!state.reviews[c.id]||state.reviews[c.id].due<=today());
  const custom=(state.customReviews||[]).filter(c=>!state.reviews[c.id]||state.reviews[c.id].due<=today());
  return [...regular,...custom]
}
reviewDue=reviewDueV6;

updateChrome=function(){
  const n=currentLevel(),pct=state.completed.length;
  const sideLevel=document.getElementById('sideLevel'), sideBar=document.getElementById('sideBar'),sideXp=document.getElementById('sideXp');
  if(sideLevel)sideLevel.textContent=`Curso N${String(n).padStart(3,'0')} · Lv. ${playerLevel()}`;
  if(sideBar)sideBar.style.width=pct+'%';
  if(sideXp)sideXp.textContent=`${calcXp()} XP · ◇ ${state.coins||0}`;
  const rb=document.getElementById('reviewBadge');if(rb)rb.textContent=reviewDue().length;
  const cb=document.getElementById('coinBadge');if(cb)cb.textContent=state.coins||0;
  const eb=document.getElementById('errorBadge');if(eb)eb.textContent=Object.values(state.errorNotebook||{}).filter(x=>x.count>=2).length;
  const db=document.getElementById('dailyBadge');if(db)db.textContent=maxCompleted()>=3&&!state.dailyCompleted?.[localDay()]?'1':'0';
  applyCosmetics();
}

function rewardOverlay(title,{coins=0,xp=0,oldLevel=null,detail='',icon='✦'}={}){
  let el=document.getElementById('rewardOverlay');
  if(!el){el=document.createElement('div');el.id='rewardOverlay';el.className='reward-overlay hidden';document.body.appendChild(el)}
  const newLv=playerLevel();
  const leveled=oldLevel!=null&&newLv>oldLevel;
  const unlocked=leveled?SHOP.filter(i=>i.level>oldLevel&&i.level<=newLv).map(i=>i.name):[];
  el.innerHTML=`<div class="reward-card"><div class="reward-burst">${icon}</div>${leveled?`<div class="levelup">Level up · Lv. ${newLv}</div>`:''}<h2>${escapeHtml(title)}</h2>${detail?`<p>${escapeHtml(detail)}</p>`:''}<div class="reward-values">${xp?`<b>+${xp} XP</b>`:''}${coins?`<b>+${coins} ◇</b>`:''}</div>${unlocked.length?`<p><b>Loja:</b> ${escapeHtml(unlocked.join(', '))} ${unlocked.length===1?'foi liberado':'foram liberados'}.</p>`:''}<button class="primary" id="rewardClose">Continuar</button></div>`;
  el.classList.remove('hidden');
  document.getElementById('rewardClose').onclick=()=>el.classList.add('hidden');
  el.onclick=e=>{if(e.target===el)el.classList.add('hidden')};
  petSay(levedText(title));
}
function levedText(title){if(/prova/i.test(title))return'Boa prova!';if(/diário/i.test(title))return'Desafio do dia fechado!';if(/treino/i.test(title))return'Treino extra concluído!';return'Mais um passo.'}
function grantBonus(title,{coins=0,xp=0,detail='',icon='✦'}={}){const old=playerLevel();state.coins=Number(state.coins||0)+coins;state.bonusXp=Number(state.bonusXp||0)+xp;markActivity();save();checkAchievements(false);rewardOverlay(title,{coins,xp,oldLevel:old,detail,icon})}

function achievementCondition(id){
  const reps=Number(state.reviewAnswers||0), extra=Object.keys(state.practiceRewards||{}).length, dailies=Object.keys(state.dailyCompleted||{}).length;
  if(id==='first')return state.completed.length>=1;
  if(id==='streak3')return streak()>=3;
  if(id==='reviews10')return reps>=10;
  if(id==='exam90')return Object.values(state.examScores||{}).some(x=>Number(x)>=90);
  if(id==='extras5')return extra>=5;
  if(id==='daily3')return dailies>=3;
  if(id==='pet')return !!state.equippedPet;
  if(id==='natural')return naturalCount()>=1;
  if(id==='half')return state.completed.length>=50;
  if(id==='finish')return state.completed.length>=100&&arcPassed(10);
  return false
}
function checkAchievements(silent=true){
  let earned=[];
  state.achievementClaims=state.achievementClaims||[];
  for(const a of ACHIEVEMENTS){if(!state.achievementClaims.includes(a.id)&&achievementCondition(a.id)){state.achievementClaims.push(a.id);state.coins+=a.coins;earned.push(a)}}
  if(earned.length){localStorage.setItem(KEY,JSON.stringify(state));updateChrome();if(!silent)toast(`Conquista: ${earned[0].name} · +${earned.reduce((s,a)=>s+a.coins,0)} ◇`)}
}
checkAchievements(true);

function reviewStats(skill){
  const ids=DATA.cards.filter(c=>c.level>=skill.start&&c.level<=skill.end).map(c=>c.id);
  const recs=ids.map(id=>state.reviews[id]).filter(Boolean);
  if(!recs.length)return {quality:0,retention:0,count:0};
  const quality=recs.reduce((s,r)=>s+Number(r.lastQuality??1),0)/(recs.length*3);
  const retention=recs.filter(r=>Number(r.interval||0)>=7).length/recs.length;
  return {quality,retention,count:recs.length}
}
function masteryForSkill(skill){
  const levels=DATA.levels.filter(l=>l.level>=skill.start&&l.level<=skill.end);
  const complete=levels.filter(l=>state.completed.includes(l.level)).length/levels.length;
  const arc=Math.ceil(skill.start/10), exam=Math.min(1,Number(state.examScores?.[arc]||0)/100);
  const rs=reviewStats(skill);
  const extras=PRACTICE.filter(p=>p.skill===skill.id&&hasPracticeReward(p.id)).length;
  const extra=Math.min(1,extras/3);
  let score=Math.round((complete*.35+exam*.25+rs.quality*.15+rs.retention*.15+extra*.10)*100);
  let st='NOVO';
  if(score>0)st='ENTENDIDO';if(score>=35)st='PRATICADO';if(score>=55)st='RETIDO';if(score>=75&&exam>=.7&&rs.retention>=.35)st='NATURAL';
  return {score,state:st,complete,exam,quality:rs.quality,retention:rs.retention,extra,extras}
}
function weakestSkill(){const eligible=SKILLS.filter(s=>s.start<=Math.max(1,maxCompleted()));if(!eligible.length)return SKILLS[0];return eligible.map(s=>[s,masteryForSkill(s)]).sort((a,b)=>a[1].score-b[1].score)[0][0]}

function errorKind(error,code=''){
  const e=String(error||'');
  if(/if[^\n]*\s=\s[^=]/.test(code)&&!/==/.test(code))return'Condição com =';
  for(const k of ['IndentationError','SyntaxError','NameError','TypeError','ValueError','KeyError','IndexError','AttributeError','AssertionError'])if(e.includes(k))return k;
  if(/timeout|limite|infinito/i.test(e))return'Timeout';
  return'Outro'
}
function guideFor(kind){if(kind==='Condição com =')return'`=` guarda um valor; `==` compara. Dentro de uma pergunta lógica, confirme se você queria comparar.';return ERROR_GUIDES[kind]||ERROR_GUIDES.Outro||'Isole o menor caso que reproduz o erro.'}
function recordAttempt(n,ok){state.attempts[n]=state.attempts[n]||{tries:0,failures:0,successes:0};state.attempts[n].tries++;if(ok)state.attempts[n].successes++;else state.attempts[n].failures++;state.attempts[n].last=localDay()}
function recordError(n,error,code='',source='desafio'){
  const kind=errorKind(error,code),skill=skillForLevel(n);const key=`${skill?.id||'geral'}:${kind}`;
  const last=String(error||'').trim().split('\n').filter(Boolean).slice(-1)[0]||'Falha de comportamento';
  const e=state.errorNotebook[key]||{key,kind,skill:skill?.id||'geral',count:0,levels:[],first:localDay()};
  e.count++;e.last=localDay();e.message=last.slice(0,260);e.source=source;e.sample=String(code||'').slice(0,350);if(!e.levels.includes(n))e.levels.push(n);state.errorNotebook[key]=e;
  if(e.count===2){const id='custom-'+key.replace(/[^a-z0-9]+/gi,'-').toLowerCase();if(!(state.customReviews||[]).some(c=>c.id===id)){state.customReviews.push({id,level:n,q:`Você encontrou ${kind} mais de uma vez. O que esse erro costuma indicar e qual é sua primeira verificação?`,a:guideFor(kind),custom:true})}}
  save();return e
}

function homePlayerStrip(){return `<div class="player-strip"><div class="player-level"><div><b>${playerLevel()}</b><small>level</small></div></div><div class="player-copy"><b>${rankName()}</b><p>${calcXp()} XP total · faltam ${150-xpIntoLevel()} XP para o próximo level</p><div class="xp-line"><i style="width:${(xpIntoLevel()/150)*100}%"></i></div></div><div class="player-coins">◇ ${state.coins||0}</div></div>`}
function dailyChallenge(){
  const max=maxCompleted();if(max<3)return null;
  const weak=weakestSkill();let pool=PRACTICE.filter(p=>['fix','fluency'].includes(p.type)&&p.unlock<=max&&p.skill===weak.id);if(!pool.length)pool=PRACTICE.filter(p=>['fix','fluency'].includes(p.type)&&p.unlock<=max);if(!pool.length)return null;
  let hash=0;for(const ch of (localDay()+weak.id))hash=(hash*31+ch.charCodeAt(0))>>>0;return pool[hash%pool.length]
}
function dailyReward(){const tier=Math.max(1,Math.ceil(maxCompleted()/10));return {coins:18+tier*4,xp:8+tier*3}}
function homeDaily(){const ch=dailyChallenge();if(!ch)return `<div class="daily-teaser"><div><h3>☀ Desafio diário</h3><p>Libera depois de você ter base suficiente para misturar conceitos sem receber coisa do futuro.</p></div><button class="ghost" disabled>Bloqueado até N003</button></div>`;const done=!!state.dailyCompleted?.[localDay()],rw=dailyReward();return `<div class="daily-teaser"><div class="daily-icon">${done?'✓':'☀'}</div><div style="flex:1"><span class="eyebrow">${done?'feito hoje':'desafio diário'}</span><h3>${escapeHtml(ch.title)}</h3><p>${done?'Você já coletou a recompensa de hoje. Amanhã vem outra combinação.':'O desafio puxa uma área que ainda merece prática e nunca usa conteúdo futuro.'}</p><div class="reward-pills"><span class="reward-pill">+${rw.xp} XP</span><span class="reward-pill">+${rw.coins} ◇</span><span class="reward-pill">dificuldade ${Math.ceil(maxCompleted()/10)}/10</span></div></div><button class="${done?'ghost':'primary'}" onclick="go('daily')">${done?'Ver desafio':'Fazer agora →'}</button></div>`}

home=function(){
  coreHome();
  const view=document.getElementById('view');const hero=view.querySelector('.hero');
  if(hero)hero.insertAdjacentHTML('afterend',homePlayerStrip()+homeDaily());
  const stats=view.querySelector('.stats');if(stats)stats.innerHTML=`<div class="stat"><b>${state.completed.length}/100</b><span>curso</span></div><div class="stat"><b>Lv. ${playerLevel()}</b><span>nível de jogador</span></div><div class="stat"><b>◇ ${state.coins||0}</b><span>moedas</span></div><div class="stat"><b>${naturalCount()}/10</b><span>áreas naturais</span></div>`;
  const weak=weakestSkill();const wm=masteryForSkill(weak);const cont=view.querySelector('.continue-card');if(cont)cont.insertAdjacentHTML('afterend',`<div class="bonus-card" style="margin-bottom:28px"><span class="eyebrow">Foco inteligente</span><h4>${escapeHtml(weak.name)} · ${wm.state}</h4><p>Sua menor maestria desbloqueada está em ${escapeHtml(weak.name.toLowerCase())}. Revisões, treinos extras e a prova do arco fazem essa barra subir.</p><button class="ghost" onclick="go('practice')">Treinar fraquezas →</button></div>`);
  applyCosmetics();
}

function extraForLevel(n){const s=skillForLevel(n);let pool=PRACTICE.filter(p=>p.unlock<=n&&p.skill===s.id&&!hasPracticeReward(p.id));if(!pool.length)pool=PRACTICE.filter(p=>p.unlock<=n&&!hasPracticeReward(p.id));pool.sort((a,b)=>b.unlock-a.unlock);return pool[0]||null}
function practiceReward(p){if(p.type==='read')return {coins:8,xp:4};if(p.type==='fix')return {coins:14,xp:7};return {coins:20,xp:11}}

lessonView=function(n){
  coreLessonView(n);
  const l=level(n);if(!l||!isUnlocked(n))return;
  // Debug visual: sandbox + challenge. Exams intentionally do not get this.
  const srun=document.getElementById('sandboxRun');if(srun){const b=document.createElement('button');b.className='ghost';b.textContent='🧭 Entender execução';b.onclick=()=>openTrace(sandboxEditor?.getValue()||'');srun.parentElement.appendChild(b)}
  const run=document.getElementById('runBtn');if(run){const b=document.createElement('button');b.className='ghost';b.textContent='🧭 Entender execução';b.onclick=()=>openTrace(currentEditor?.getValue()||'');run.parentElement.appendChild(b)}
  // Optional extra challenge, unlocked by what this lesson already exposed.
  const side=document.querySelector('.lesson-side');const extra=extraForLevel(n);if(side&&extra){const rw=practiceReward(extra);side.insertAdjacentHTML('beforeend',`<div class="bonus-card"><span class="practice-tag">missão extra</span><h4>${escapeHtml(extra.title)}</h4><p>${extra.type==='read'?'Leia código sem executar primeiro.':extra.type==='fix'?'Conserte um bug usando o que já sabe.':'Resolva sem pista de ferramenta.'}</p><div class="reward-pills"><span class="reward-pill">+${rw.xp} XP</span><span class="reward-pill">+${rw.coins} ◇</span></div><button class="ghost" style="width:100%;margin-top:10px" onclick="go('practice','${extra.id}')">Abrir desafio extra</button></div>`)}
  // Visual roadmap for projects, with saved check state.
  if(l.kind==='project'){
    const holder=document.querySelector('.project-checks'),steps=PROJECT_STAGES[n]||[];state.projectStages[n]=state.projectStages[n]||[];
    if(holder&&steps.length){holder.innerHTML=`<h3>Roadmap do projeto</h3><div class="project-progress"><i id="projectStageBar"></i></div><div class="project-roadmap">${steps.map((s,i)=>`<label class="project-step ${state.projectStages[n].includes(i)?'done':''}"><input class="pc project-stage-cb" type="checkbox" data-stage="${i}" ${state.projectStages[n].includes(i)?'checked':''}><span><b>Etapa ${i+1}</b><br>${escapeHtml(s)}</span></label>`).join('')}</div>`;const upd=()=>{const boxes=[...document.querySelectorAll('.project-stage-cb')];state.projectStages[n]=boxes.filter(x=>x.checked).map(x=>Number(x.dataset.stage));boxes.forEach(x=>x.closest('.project-step')?.classList.toggle('done',x.checked));const bar=document.getElementById('projectStageBar');if(bar)bar.style.width=(state.projectStages[n].length/steps.length*100)+'%';save()};document.querySelectorAll('.project-stage-cb').forEach(x=>x.onchange=upd);upd()}
  }
  // Intelligent correction and error notebook.
  if(l.kind!=='project'){
    const check=document.getElementById('checkBtn');if(check)check.onclick=async()=>{const fb=document.getElementById('feedback');fb.className='feedback';fb.textContent='Corrigindo…';const code=currentEditor.getValue();let r=await runPython(code,l.test);recordAttempt(n,r.ok);lastFeedback=r.error||'Todos os testes passaram.';if(r.ok){state.passed[n]=true;markActivity();save();fb.classList.add('success');fb.textContent='✓ Passou nos testes. Agora explique sua solução antes de concluir.';document.getElementById('completeBox').classList.remove('hidden');petSay('Os testes passaram!')}else{const entry=recordError(n,r.error,code,'aula');fb.classList.add('fail');let last=(r.error||'').trim().split('\n').slice(-2).join('\n');fb.innerHTML=`Ainda não.<br><code>${escapeHtml(last)}</code>${entry.count>=2?`<div style="margin-top:8px;color:var(--warn)">Padrão percebido: esse tipo de erro já apareceu ${entry.count} vezes. Ele entrou no seu Caderno de Erros.</div>`:''}`}}
  }
  // Why does it work? Selected key levels require a short explanation.
  const prompt=WHY[n],completeBox=document.getElementById('completeBox');if(prompt&&completeBox){const saved=state.reflections[n]||'';completeBox.insertAdjacentHTML('afterbegin',`<div class="why-card"><span class="eyebrow">Por que funciona?</span><p>${escapeHtml(prompt)}</p><textarea id="whyText" placeholder="Explique com suas palavras. Não precisa escrever bonito; precisa mostrar o raciocínio.">${escapeHtml(saved)}</textarea><small>Essa resposta fica apenas no seu navegador e ajuda a separar “acertei” de “entendi”.</small></div>`);const ta=document.getElementById('whyText');ta.oninput=()=>{state.reflections[n]=ta.value;save()}}
  // Wrap course completion for coins, level-up and achievements.
  const complete=document.getElementById('completeBtn');if(complete){const oldHandler=complete.onclick;complete.onclick=()=>{if(prompt&&String(document.getElementById('whyText')?.value||'').trim().length<20){toast('Explique um pouco mais o “por quê” antes de concluir.');return}const was=state.completed.includes(n),oldLv=playerLevel();oldHandler();if(!was&&state.completed.includes(n)){if(!state.rewardedLevels.includes(n)){const coins=rewardCoinsForLevel(n);state.coins+=coins;state.rewardedLevels.push(n);save();checkAchievements(false);rewardOverlay('Nível concluído',{coins,xp:l.xp,oldLevel:oldLv,detail:`N${String(n).padStart(3,'0')} · ${l.title}`,icon:l.kind==='arena'?'⚔':'✓'})}}}}
  const cp=document.getElementById('completeProject');if(cp){const oldHandler=cp.onclick;cp.onclick=()=>{const was=state.completed.includes(n),oldLv=playerLevel();oldHandler();if(!was&&state.completed.includes(n)){if(!state.rewardedLevels.includes(n)){const coins=rewardCoinsForLevel(n);state.coins+=coins;state.rewardedLevels.push(n);save();checkAchievements(false);rewardOverlay('Projeto concluído',{coins,xp:l.xp,oldLevel:oldLv,detail:l.title,icon:'🏗'})}}}}
}

async function tracePython(code){
  if(!pyodide)return {ok:false,steps:[],error:'Python ainda está carregando.'};
  if(/\binput\s*\(/.test(code))return {ok:false,steps:[],error:'O visualizador não executa `input()` porque ficaria esperando uma resposta. Troque temporariamente a entrada por um valor fixo para observar o fluxo.'};
  try{
    pyodide.globals.set('ARC_TRACE_CODE',String(code||''));
    const raw=await pyodide.runPythonAsync(`
import sys, io, contextlib, json, traceback
source = ARC_TRACE_CODE
lines = source.splitlines()
steps=[]
out=io.StringIO()
error=''
def safe(v):
    try:
        r=repr(v)
    except BaseException:
        r='<valor não representável>'
    return r if len(r)<=160 else r[:157]+'...'
def tracer(frame,event,arg):
    if frame.f_code.co_filename != '<arcadia>':
        return tracer
    if event == 'line':
        if len(steps) >= 120:
            raise RuntimeError('Visualização interrompida após 120 passos. O código pode estar repetindo demais.')
        loc={k:safe(v) for k,v in frame.f_locals.items() if not k.startswith('__')}
        ln=frame.f_lineno
        steps.append({'line':ln,'source':lines[ln-1] if 0 < ln <= len(lines) else '', 'locals':loc,'stdout':out.getvalue()})
    return tracer
ns={}
try:
    with contextlib.redirect_stdout(out):
        sys.settrace(tracer)
        exec(compile(source,'<arcadia>','exec'),ns)
except BaseException:
    error=traceback.format_exc(limit=5)
finally:
    sys.settrace(None)
json.dumps({'ok':not bool(error),'steps':steps,'stdout':out.getvalue(),'error':error},ensure_ascii=False)
`);
    return JSON.parse(typeof raw==='string'?raw:String(raw));
  }catch(e){return {ok:false,steps:[],error:'Falha no visualizador: '+(e?.message||String(e))}}
}
function flowHint(steps,i){const cur=steps[i],next=steps[i+1];if(!cur)return'';const src=String(cur.source||'').trim();if(!next)return'Este é o último passo observado.';const indent=s=>(String(s).match(/^\s*/)?.[0].length||0);if(/^(if|elif|while)\b/.test(src)){if(next.line===cur.line+1&&indent(next.source)>indent(cur.source))return'O próximo passo entrou no bloco indentado: essa condição permitiu esse caminho.';return`O fluxo pulou para a linha ${next.line}: o bloco imediatamente abaixo não foi escolhido neste passo.`}if(/^for\b/.test(src))return`O loop vai continuar pelo próximo caminho observado na linha ${next.line}.`;return`Depois desta linha, o próximo passo observado é a linha ${next.line}.`}
function openTrace(code){
  let overlay=document.getElementById('traceOverlay');if(!overlay){overlay=document.createElement('div');overlay.id='traceOverlay';overlay.className='trace-overlay hidden';document.body.appendChild(overlay)}
  overlay.classList.remove('hidden');overlay.innerHTML='<div class="trace-modal"><div class="trace-head"><h3>🧭 Entender execução</h3><button class="trace-close">×</button></div><div style="padding:30px;color:var(--muted)">Executando em modo visual…</div></div>';overlay.querySelector('.trace-close').onclick=()=>overlay.classList.add('hidden');overlay.onclick=e=>{if(e.target===overlay)overlay.classList.add('hidden')};
  tracePython(code).then(res=>{if(!res.steps?.length){overlay.querySelector('.trace-modal').innerHTML=`<div class="trace-head"><h3>🧭 Entender execução</h3><button class="trace-close">×</button></div><pre>${escapeHtml(res.error||'Nenhum passo foi produzido.')}</pre>`;overlay.querySelector('.trace-close').onclick=()=>overlay.classList.add('hidden');return}let idx=0;state.debugUses[currentLevel()]=(state.debugUses[currentLevel()]||0)+1;save();const lines=String(code).split('\n');const draw=()=>{const st=res.steps[idx],vars=Object.entries(st.locals||{});overlay.querySelector('.trace-modal').innerHTML=`<div class="trace-head"><div><span class="eyebrow">visualizador · antes da linha executar</span><h3>Linha ${st.line}</h3></div><button class="trace-close">×</button></div><div class="trace-body"><div class="trace-code">${lines.map((ln,i)=>`<div class="trace-line ${i+1===st.line?'active':''}"><span class="ln">${i+1}</span><span>${escapeHtml(ln||' ')}</span></div>`).join('')}</div><div class="trace-side"><h4>Variáveis neste momento</h4><div class="trace-vars">${vars.length?vars.map(([k,v])=>`<div class="trace-var"><b>${escapeHtml(k)}</b><span>${escapeHtml(v)}</span></div>`).join(''):'<span style="color:var(--muted);font-size:12px">Nenhuma variável criada ainda.</span>'}</div><div class="trace-flow">${escapeHtml(flowHint(res.steps,idx))}</div><h4>Saída até aqui</h4><pre style="min-height:65px">${escapeHtml(st.stdout||'(sem saída ainda)')}</pre>${res.error&&idx===res.steps.length-1?`<h4>Erro final</h4><pre>${escapeHtml(res.error)}</pre>`:''}</div></div><div class="trace-controls"><button class="ghost" id="tracePrev" ${idx===0?'disabled':''}>← anterior</button><button class="primary" id="traceNext" ${idx===res.steps.length-1?'disabled':''}>próximo →</button><span>passo ${idx+1}/${res.steps.length}</span></div>`;overlay.querySelector('.trace-close').onclick=()=>overlay.classList.add('hidden');document.getElementById('tracePrev').onclick=()=>{if(idx>0){idx--;draw()}};document.getElementById('traceNext').onclick=()=>{if(idx<res.steps.length-1){idx++;draw()}}};draw()})
}

function renderPracticeList(type){const max=maxCompleted();const list=PRACTICE.filter(p=>p.type===type&&p.unlock<=max).sort((a,b)=>b.unlock-a.unlock);const labels={read:'Ler código',fix:'Consertar bugs',fluency:'Modo Fluência'};document.getElementById('view').innerHTML=`<button class="back" onclick="go('practice')">← treino</button><span class="eyebrow">${labels[type]}</span><h1>${labels[type]}</h1><p style="color:var(--muted);max-width:720px">${type==='read'?'Treine prever o que o computador fará antes de executar.':type==='fix'?'Você recebe um programa quase certo e precisa localizar a causa.':'Sem indicação de ferramenta, sem dica e sem esqueleto confortável. O foco é escolher sozinho como resolver.'}</p><div class="practice-list">${list.length?list.map(p=>{const rw=practiceReward(p);return `<div class="practice-row"><div><span class="practice-tag">${hasPracticeReward(p.id)?'✓ concluído':'N'+String(p.unlock).padStart(3,'0')}</span><b style="display:block;margin:4px 0">${escapeHtml(p.title)}</b><small>${hasPracticeReward(p.id)?'Pode refazer sem nova recompensa':`+${rw.xp} XP · +${rw.coins} ◇`}</small></div><button class="ghost" onclick="go('practice','${p.id}')">${hasPracticeReward(p.id)?'Refazer':'Começar'}</button></div>`}).join(''):'<div class="empty">Conclua mais níveis para liberar treinos deste modo.</div>'}</div>`}
function practiceView(arg){
  if(['read','fix','fluency'].includes(arg))return renderPracticeList(arg);
  if(arg){const p=practiceById(arg);if(!p||p.unlock>maxCompleted()){document.getElementById('view').innerHTML='<div class="empty">Esse treino ainda não está disponível.</div>';return}return practiceChallengeView(p)}
  const weak=weakestSkill();const recommended=extraForLevel(maxCompleted());document.getElementById('view').innerHTML=`<section class="practice-hero"><span class="eyebrow">laboratório de fluência</span><h1>Treinar sem avançar aula.</h1><p style="color:var(--muted);line-height:1.65">Aqui você reforça o que já aprendeu por ângulos diferentes. Esses exercícios dão XP extra e moedas, mas nunca liberam conteúdo futuro.</p></section><div class="practice-modes"><button class="practice-mode" onclick="go('practice','read')"><b>👁 Ler código</b><span>Prever valores e fluxo antes de apertar Rodar.</span></button><button class="practice-mode" onclick="go('practice','fix')"><b>🛠 Consertar bugs</b><span>Encontrar a causa em programas quase certos.</span></button><button class="practice-mode" onclick="go('practice','fluency')"><b>∞ Modo Fluência</b><span>Problema puro. Sem dizer qual ferramenta usar.</span></button></div><div class="card"><span class="eyebrow">recomendado agora · ${escapeHtml(weak.name)}</span>${recommended?`<h2>${escapeHtml(recommended.title)}</h2><p>${escapeHtml(recommended.contract||recommended.question||'Treino acumulativo.')}</p><button class="primary" onclick="go('practice','${recommended.id}')">Começar recomendado →</button>`:'<div class="empty">Conclua mais uma aula para receber uma recomendação.</div>'}</div>`}
function practiceChallengeView(p){
  const rewarded=hasPracticeReward(p.id),rw=practiceReward(p);
  if(p.type==='read'){
    document.getElementById('view').innerHTML=`<button class="back" onclick="go('practice','read')">← leitura de código</button><span class="eyebrow">treino extra · ${rewarded?'já recompensado':`+${rw.xp} XP · +${rw.coins} ◇`}</span><h1>${escapeHtml(p.title)}</h1><div class="card"><p>${escapeHtml(p.question)}</p><pre class="read-code"><code>${escapeHtml(p.code)}</code></pre><div class="choice-grid" id="choices">${p.options.map((o,i)=>`<button data-choice="${i}">${String.fromCharCode(65+i)} · ${escapeHtml(o)}</button>`).join('')}</div><div id="readFeedback" class="feedback">Escolha antes de executar mentalmente o código.</div></div>`;document.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>answerRead(p,Number(b.dataset.choice)));return
  }
  const isFlu=p.type==='fluency';const saved=state.practiceCodes[p.id]??p.starter??'';document.getElementById('view').innerHTML=`<button class="back" onclick="go('practice','${p.type}')">← ${isFlu?'fluência':'consertar bugs'}</button><span class="eyebrow">${isFlu?'modo fluência':'treino de debugging'} · ${rewarded?'recompensa já coletada':`+${rw.xp} XP · +${rw.coins} ◇`}</span><h1>${escapeHtml(p.title)}</h1><div class="card"><p>${escapeHtml(p.contract)}</p>${isFlu?'<div class="exam-warning"><b>Ajuda reduzida:</b> o curso não diz qual conceito usar e não oferece dica nesta missão.</div>':''}</div><div class="card editor-card"><div class="editor-top"><span>${isFlu?'pasta mental vazia':'encontre e corrija a causa'}</span><span>${escapeHtml(p.skill)}</span></div><div id="practiceEditor" class="editor"></div><div class="editor-actions"><button class="secondary" id="practiceRun">▶ Rodar</button><button class="primary" id="practiceCheck">✓ Corrigir</button>${!isFlu?'<button class="ghost" id="practiceDebug">🧭 Entender execução</button>':''}</div><pre id="practiceOutput" class="output">A saída aparece aqui.</pre><div id="practiceFeedback" class="feedback">${isFlu?'Resolva sem pista.':'Conserte o comportamento e depois corrija.'}</div></div>`;const ed=initAce('practiceEditor',saved);if(!isFlu)attachWikiClick(ed,0);ed.session.on('change',()=>{state.practiceCodes[p.id]=ed.getValue();save()});document.getElementById('practiceRun').onclick=async()=>{const out=document.getElementById('practiceOutput');out.textContent='Executando…';const r=await runPython(ed.getValue());out.textContent=r.ok?(r.stdout||'Executou sem erro.'):r.error};if(!isFlu)document.getElementById('practiceDebug').onclick=()=>openTrace(ed.getValue());document.getElementById('practiceCheck').onclick=async()=>{const fb=document.getElementById('practiceFeedback');fb.className='feedback';fb.textContent='Corrigindo…';const r=await runPython(ed.getValue(),p.test);if(r.ok){fb.classList.add('success');fb.textContent='✓ Treino concluído.';completePracticeReward(p)}else{fb.classList.add('fail');const entry=recordError(p.unlock,r.error,ed.getValue(),'treino');fb.textContent='Ainda não. '+String(r.error||'').trim().split('\n').slice(-1)[0]+(entry.count>=2?' · Isso também foi registrado no Caderno.':'')}}}
function answerRead(p,choice){const buttons=[...document.querySelectorAll('[data-choice]')],fb=document.getElementById('readFeedback');buttons.forEach(x=>x.disabled=true);if(choice===p.answer){buttons[choice].classList.add('correct');fb.className='feedback success';fb.textContent='✓ '+p.explain;completePracticeReward(p)}else{buttons[choice].classList.add('wrong');buttons[p.answer].classList.add('correct');fb.className='feedback fail';fb.textContent='Não era essa. '+p.explain;state.practiceMistakes[p.id]=(state.practiceMistakes[p.id]||0)+1;save()}}
function completePracticeReward(p){if(hasPracticeReward(p.id)){toast('Treino concluído novamente. A recompensa só conta na primeira vez.');return}const rw=practiceReward(p);state.practiceRewards[p.id]={date:localDay(),type:p.type,skill:p.skill};grantBonus('Treino extra concluído',{...rw,detail:p.title,icon:p.type==='read'?'👁':p.type==='fix'?'🛠':'∞'})}

function dailyView(){
  const p=dailyChallenge(),date=localDay(),done=!!state.dailyCompleted?.[date];if(!p){document.getElementById('view').innerHTML='<span class="eyebrow">desafio diário</span><h1>Ainda bloqueado.</h1><div class="empty">Conclua pelo menos até o N003. Assim o desafio diário já consegue misturar mais de uma ideia sem usar conteúdo futuro.</div>';return}const rw=dailyReward(),skill=skillForLevel(p.unlock),saved=state.dailyCodes[date]??p.starter??'';document.getElementById('view').innerHTML=`<section class="daily-shell"><span class="eyebrow">desafio diário · ${done?'concluído':'disponível'}</span><h1>${escapeHtml(p.title)}</h1><div class="daily-date">${escapeHtml(localDateLabel())}</div><div class="daily-difficulty" style="margin:13px 0"><span>Dificuldade adaptativa</span><span class="difficulty-dots">${Array.from({length:10},(_,i)=>`<i class="${i<Math.ceil(maxCompleted()/10)?'on':''}"></i>`).join('')}</span></div><div class="card"><p>${escapeHtml(p.contract)}</p><div class="reward-pills"><span class="reward-pill">+${rw.xp} XP</span><span class="reward-pill">+${rw.coins} ◇</span><span class="reward-pill">mistura conteúdo já liberado</span></div></div><div class="card editor-card"><div class="editor-top"><span>sem dica automática</span><span>${done?'recompensa coletada':'vale recompensa hoje'}</span></div><div id="dailyEditor" class="editor"></div><div class="editor-actions"><button class="secondary" id="dailyRun">▶ Rodar</button><button class="primary" id="dailyCheck">✓ Corrigir</button></div><pre id="dailyOutput" class="output">Tente resolver antes de procurar uma resposta.</pre><div id="dailyFeedback" class="feedback">${done?'Você pode refazer, mas a recompensa diária já foi coletada.':'O desafio escolhe algo compatível com seu progresso e tende a puxar sua área mais fraca.'}</div></div>${done?'<div class="daily-complete"><b>✓ Recompensa de hoje coletada.</b><p>Amanhã a seleção é recalculada usando seu progresso e sua maestria.</p></div>':''}</section>`;const ed=initAce('dailyEditor',saved);ed.session.on('change',()=>{state.dailyCodes[date]=ed.getValue();save()});document.getElementById('dailyRun').onclick=async()=>{const out=document.getElementById('dailyOutput');out.textContent='Executando…';const r=await runPython(ed.getValue());out.textContent=r.ok?(r.stdout||'Executou sem erro.'):r.error};document.getElementById('dailyCheck').onclick=async()=>{const fb=document.getElementById('dailyFeedback');fb.className='feedback';fb.textContent='Corrigindo…';const r=await runPython(ed.getValue(),p.test);if(r.ok){fb.classList.add('success');fb.textContent='✓ Desafio diário resolvido.';if(!state.dailyCompleted[date]){state.dailyCompleted[date]={id:p.id,skill:p.skill};grantBonus('Desafio diário concluído',{...rw,detail:`Hoje o foco adaptativo foi ${skill?.name||'revisão acumulativa'}.`,icon:'☀'})}else toast('Já recompensado hoje.')}else{fb.classList.add('fail');recordError(p.unlock,r.error,ed.getValue(),'diário');fb.textContent='Ainda não. '+String(r.error||'').trim().split('\n').slice(-1)[0]}}
}

function shopView(){const lvl=playerLevel();document.getElementById('view').innerHTML=`<section class="shop-hero"><span class="eyebrow">recompensas visuais</span><h1>Loja Arcádia</h1><p style="color:var(--muted);line-height:1.65">XP nunca é gasto: ele sobe seu level e libera prateleiras. As moedas ◇ vêm de estudo, provas, revisões e desafios; elas compram apenas cosméticos.</p></section><div class="shop-wallet"><div class="wallet-box"><b>Lv. ${lvl}</b><span>nível de jogador</span></div><div class="wallet-box"><b>${calcXp()} XP</b><span>experiência acumulada</span></div><div class="wallet-box"><b>◇ ${state.coins||0}</b><span>saldo</span></div></div><div style="display:flex;gap:8px;margin-bottom:16px"><button class="ghost" onclick="unequipCosmetic('pet')">Sem pet</button><button class="ghost" onclick="unequipCosmetic('effect')">Sem efeito</button></div><div class="shop-grid">${SHOP.map(i=>shopCard(i,lvl)).join('')}</div>`}
function isEquipped(i){return (i.type==='theme'&&state.equippedTheme===i.id)||(i.type==='pet'&&state.equippedPet===i.id)||(i.type==='effect'&&state.equippedEffect===i.id)}
function shopCard(i,lvl){const owned=state.inventory.includes(i.id),locked=lvl<i.level,equipped=isEquipped(i);let label=equipped?'Equipado':owned?'Equipar':locked?`Libera no Lv. ${i.level}`:`Comprar · ◇ ${i.price}`;return `<div class="shop-card ${locked?'locked':''}">${equipped?'<span class="equipped-tag">equipado</span>':''}<div class="shop-icon">${i.icon}</div><span class="practice-tag">${i.type==='theme'?'tema':i.type==='pet'?'pet':'efeito'}</span><h3>${escapeHtml(i.name)}</h3><p>${escapeHtml(i.desc)}</p><div class="shop-meta"><span>requer Lv. ${i.level}</span><span class="shop-price">${owned?'adquirido':'◇ '+i.price}</span></div><button class="${equipped?'ghost':'secondary'}" ${locked||equipped?'disabled':''} onclick="buyOrEquip('${i.id}')">${label}</button></div>`}
window.buyOrEquip=function(id){const i=itemById(id);if(!i)return;if(playerLevel()<i.level){toast(`Esse item libera no Lv. ${i.level}.`);return}if(!state.inventory.includes(id)){if(state.coins<i.price){toast('Moedas insuficientes. Desafios extras e o diário dão mais ◇.');return}state.coins-=i.price;state.inventory.push(id);toast(`${i.name} comprado.`)}if(i.type==='theme')state.equippedTheme=id;if(i.type==='pet')state.equippedPet=id;if(i.type==='effect')state.equippedEffect=id;save();checkAchievements(false);shopView();petSay('Visual novo!')}
window.unequipCosmetic=function(type){if(type==='pet')state.equippedPet=null;if(type==='effect')state.equippedEffect=null;save();shopView()}

function notebookView(){const rows=Object.values(state.errorNotebook||{}).sort((a,b)=>b.count-a.count),repeated=rows.filter(x=>x.count>=2),total=rows.reduce((s,x)=>s+x.count,0);document.getElementById('view').innerHTML=`<span class="eyebrow">aprendizado a partir dos erros</span><h1>Caderno de Erros</h1><p style="color:var(--muted);max-width:760px;line-height:1.65">O curso agrupa padrões em vez de tratar cada falha como um acidente isolado. Ao repetir um tipo de erro, ele também cria uma revisão futura para você.</p><div class="error-summary"><div class="error-stat"><b>${total}</b><span>erros registrados</span></div><div class="error-stat"><b>${repeated.length}</b><span>padrões recorrentes</span></div><div class="error-stat"><b>${state.customReviews?.length||0}</b><span>revisões criadas por erros</span></div></div><div class="error-list">${rows.length?rows.map(e=>`<div class="error-card ${e.count>=2?'repeated':''}"><div class="error-head"><div><span>${escapeHtml(e.skill)} · ${escapeHtml(e.source||'desafio')}</span><h3 style="margin:4px 0">${escapeHtml(e.kind)}</h3></div><b>${e.count}×</b></div><p>Último sinal: <code>${escapeHtml(e.message||'')}</code></p><p class="error-guide"><b>Primeira hipótese:</b> ${escapeHtml(guideFor(e.kind))}</p><span style="font-size:10px;color:var(--muted)">níveis: ${(e.levels||[]).map(n=>'N'+String(n).padStart(3,'0')).join(', ')}</span></div>`).join(''):'<div class="empty">Seu caderno ainda está vazio. Quando uma correção falhar, o curso começa a registrar padrões — sem transformar erro em punição.</div>'}</div>`}

reviewView=function(){const due=reviewDue();if(!due.length){document.getElementById('view').innerHTML=`<span class="eyebrow">revisão espaçada</span><h1>Nada vencido agora.</h1><div class="empty">Quando você conclui níveis ou repete um erro, conceitos voltam em intervalos diferentes conforme sua dificuldade.</div>`;return}let idx=0,revealed=false,coinsSession=0;const renderCard=()=>{const c=due[idx];document.getElementById('view').innerHTML=`<div class="review-wrap"><span class="eyebrow">Revisão ${idx+1}/${due.length} · ${c.custom?'do seu Caderno':'N'+String(c.level).padStart(3,'0')}</span><div class="review-card"><h2>${escapeHtml(c.q)}</h2>${revealed?`<div class="review-answer">${escapeHtml(c.a)}</div>`:''}</div>${revealed?`<div class="review-actions"><button onclick="gradeReviewV6('${c.id}',0)">0 · apaguei</button><button onclick="gradeReviewV6('${c.id}',1)">1 · difícil</button><button onclick="gradeReviewV6('${c.id}',2)">2 · bom</button><button onclick="gradeReviewV6('${c.id}',3)">3 · fácil</button></div>`:`<button class="primary" style="margin-top:14px" id="reveal">Revelar resposta</button>`}<p style="color:var(--muted);font-size:11px">Respostas “bom/fácil” rendem 1 ◇ porque revisar no dia certo também é progresso.</p></div>`;if(!revealed)document.getElementById('reveal').onclick=()=>{revealed=true;renderCard()}};window.gradeReviewV6=(id,q)=>{const old=state.reviews[id]||{interval:1,ease:2.2,reps:0};let interval=q===0?1:q===1?Math.max(2,Math.round(old.interval*1.4)):q===2?Math.max(4,Math.round(old.interval*2.1)):Math.max(7,Math.round(old.interval*3));let d=new Date();d.setDate(d.getDate()+interval);state.reviews[id]={interval,due:d.toISOString().slice(0,10),ease:old.ease,lastQuality:q,reps:Number(old.reps||0)+1};state.reviewAnswers=Number(state.reviewAnswers||0)+1;if(q>=2){state.coins++;coinsSession++}markActivity();save();idx++;revealed=false;if(idx>=due.length){checkAchievements(false);rewardOverlay('Sessão de revisão concluída',{coins:coinsSession,xp:0,detail:`${due.length} cartões revistos. Os intervalos foram recalculados.`,icon:'↻'});go('home')}else renderCard()};renderCard()}

function progressViewV6(){const pct=state.completed.length;const masteries=SKILLS.map(s=>[s,masteryForSkill(s)]);const claims=new Set(state.achievementClaims||[]);document.getElementById('view').innerHTML=`<section class="mastery-hero"><span class="eyebrow">progresso real</span><h1>Mapa de Maestria</h1><p style="color:var(--muted);line-height:1.65">Concluir uma aula não significa “naturalizado”. Cada área combina prática, prova, revisões espaçadas e desafios extras. O estado <b>NATURAL</b> só aparece depois de retenção real.</p></section>${homePlayerStrip()}<div class="mastery-grid">${masteries.map(([s,m])=>`<div class="mastery-card"><div class="mastery-top"><div><b>${escapeHtml(s.name)}</b><p>${escapeHtml(s.desc)}</p></div><span class="mastery-state ${m.state}">${m.state}</span></div><div class="mastery-bar"><i style="width:${m.score}%"></i></div><div class="mastery-breakdown"><span>${m.score}/100</span><span>aula ${Math.round(m.complete*100)}%</span><span>prova ${Math.round(m.exam*100)}%</span><span>retenção ${Math.round(m.retention*100)}%</span></div></div>`).join('')}</div><h2 class="section-title">Conquistas</h2><div class="achievement-grid">${ACHIEVEMENTS.map(a=>`<div class="achievement ${claims.has(a.id)?'':'locked'}"><div class="ach-icon">${a.icon}</div><b>${escapeHtml(a.name)}</b><p>${escapeHtml(a.desc)}</p><small>${claims.has(a.id)?'✓ conquistada':`recompensa: +${a.coins} ◇`}</small></div>`).join('')}</div><h2 class="section-title">Segurança do progresso</h2><div class="card"><p>Seu progresso fica neste navegador. Exporte um backup de vez em quando — ele inclui níveis, maestria, moedas, cosméticos e caderno de erros.</p><button class="secondary" onclick="document.getElementById('exportBtn').click()">Exportar agora</button></div>`}
progressView=progressViewV6;

examView=function(a){
  const levels=DATA.levels.slice((a-1)*10,a*10);if(!levels.every(x=>state.completed.includes(x.level))){document.getElementById('view').innerHTML='<div class="empty">Conclua o arco antes da prova.</div>';return}const e=exam(a),code=state.examCodes[a]??e.starter;document.getElementById('view').innerHTML=`<div class="lesson-shell"><button class="back" onclick="go('exams')">← provas</button><header class="lesson-head"><span class="eyebrow">Avaliação · Arco ${a}</span><h1>${escapeHtml(e.title)}</h1></header><div class="exam-warning"><b>Modo prova:</b> sem tutor, debugger visual ou dicas. A Wiki continua disponível como documentação do que você já aprendeu.</div><div class="card editor-card" style="margin-top:18px"><div class="editor-top"><span>5 tarefas · cada uma vale 20 pontos</span><span id="examScore">${state.examScores[a]?`melhor: ${state.examScores[a]}/100`:''}</span></div><div id="challenge-editor" class="editor" style="height:520px"></div><div class="editor-actions"><button class="secondary" id="runExam">▶ Rodar</button><button class="primary" id="gradeExam">✓ Entregar e corrigir</button></div><pre id="output" class="output">Boa prova.</pre><div id="feedback" class="feedback"></div></div></div>`;currentEditor=initAce('challenge-editor',code);attachWikiClick(currentEditor,0);currentEditor.session.on('change',()=>{state.examCodes[a]=currentEditor.getValue();save()});document.getElementById('runExam').onclick=async()=>{let r=await runPython(currentEditor.getValue());document.getElementById('output').textContent=r.ok?(r.stdout||'Executou sem erro.'):r.error};document.getElementById('gradeExam').onclick=async()=>{const oldScore=Number(state.examScores[a]||0),wasPassed=oldScore>=70,oldLv=playerLevel();let r=await gradeExamDetailed(currentEditor.getValue(),e.tasks);let score=r.score;state.examScores[a]=Math.max(oldScore,score);markActivity();save();const fb=document.getElementById('feedback');fb.className='feedback '+(score>=70?'success':'fail');fb.textContent=`Nota: ${score}/100 · ${score>=70?'Aprovado. O próximo arco foi liberado.':'Ainda não atingiu 70. Revise os pontos fracos e tente novamente.'}`;document.getElementById('examScore').textContent=`melhor: ${state.examScores[a]}/100`;if(score<70){recordError(a*10,r.error||'AssertionError: tarefas da prova falharam',currentEditor.getValue(),'prova')}if(score>=70&&!wasPassed&&!state.rewardedExams.includes(a)){state.coins+=50;state.rewardedExams.push(a);save();checkAchievements(false);rewardOverlay('Prova aprovada',{coins:50,xp:100,oldLevel:oldLv,detail:`${score}/100 no Arco ${a}`,icon:score>=90?'★':'✓'})}else checkAchievements(false)}
}

function shopUnlockedCount(){return SHOP.filter(i=>i.level<=playerLevel()).length}

render=function(){const [r,a]=parseRoute();setNav(['lesson','exam'].includes(r)?'home':r);if(r==='home')home();else if(r==='lesson')lessonView(Number(a));else if(r==='daily')dailyView();else if(r==='practice')practiceView(a);else if(r==='review')reviewView();else if(r==='wiki')coreWikiView();else if(r==='shop')shopView();else if(r==='notebook')notebookView();else if(r==='exams')examsView();else if(r==='exam')examView(Number(a));else if(r==='progress')progressView();else home();window.scrollTo(0,0);updateChrome()}

boot=async function(){
  ensureV6State();applyCosmetics();document.getElementById('boot').classList.add('hidden');document.getElementById('app').classList.remove('hidden');updateChrome();render();
  // Override import so old backups also receive V6 fields safely.
  document.getElementById('importInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{state={...initial(),...JSON.parse(await f.text())};ensureV6State();save();render();toast('Progresso importado')}catch{toast('Arquivo de progresso inválido')}};
  try{if(typeof loadPyodide!=='function')throw new Error('Biblioteca Pyodide não carregou');pyodide=await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'});const warm=await pyodide.runPythonAsync('40 + 2');if(Number(warm)!==42)throw new Error('Teste interno do Python falhou');const el=document.getElementById('pyStatus');if(el){el.textContent='● Python pronto · v6';el.classList.add('ready')}}catch(e){console.error('Arcádia: falha ao iniciar Python',e);const el=document.getElementById('pyStatus');if(el){el.textContent='● Python indisponível';el.classList.remove('ready')}toast('Não consegui iniciar o Python. Recarregue a página.')}
}

window.addEventListener('hashchange',render);
boot();
