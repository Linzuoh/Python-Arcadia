
/* Python Arcádia V8 — revisão escrita, provas diagnósticas e desafios diários cumulativos */
const V8=window.ARCADIA_V8||{daily:[]};
const DAILY_BANK=V8.daily||[];

function ensureV8State(){
  state.reviewDrafts=state.reviewDrafts||{};
  state.examDiagnostics=state.examDiagnostics||{};
  state.dailyCodeIds=state.dailyCodeIds||{};
  if(!state.version8){
    // V8 mudou o banco de desafios diários. Um rascunho de um desafio antigo
    // não deve aparecer dentro de outro desafio escolhido para a mesma data.
    const d=localDay();
    if(state.dailyCodes?.[d] && !state.dailyCompleted?.[d]){
      delete state.dailyCodes[d];
    }
    state.version8=true;
    save();
  }
}
ensureV8State();

function localDatePlus(days){
  const d=new Date();
  d.setHours(12,0,0,0);
  d.setDate(d.getDate()+Number(days||0));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ---------- Revisão: agora o aluno escreve antes de ver a referência ---------- */
reviewView=function(){
  const due=reviewDue();
  if(!due.length){
    document.getElementById('view').innerHTML=`<span class="eyebrow">revisão espaçada</span><h1>Nada vencido agora.</h1><div class="empty">Quando você conclui níveis ou repete um erro técnico, os conceitos voltam em intervalos diferentes.</div>`;
    return;
  }

  let idx=0, revealed=false, coinsSession=0, revealMode='compare';

  const renderCard=()=>{
    const c=due[idx];
    const draft=state.reviewDrafts?.[c.id]||'';
    document.getElementById('view').innerHTML=`
      <div class="review-wrap review-written">
        <span class="eyebrow">Revisão ${idx+1}/${due.length} · ${c.custom?'do seu Caderno':'N'+String(c.level).padStart(3,'0')}</span>
        <div class="review-card">
          <h2>${escapeHtml(c.q)}</h2>
          <p class="review-instruction">Responda com suas palavras antes de comparar. Não precisa escrever bonito nem usar as mesmas palavras da referência.</p>
          <textarea id="reviewText" class="review-textarea" placeholder="Escreva o que você lembra...">${escapeHtml(draft)}</textarea>
          ${revealed?`
            <div class="review-compare">
              <div><span>Sua resposta</span><p>${escapeHtml(draft||'— não respondi —')}</p></div>
              <div><span>Resposta de referência</span><p>${escapeHtml(c.a)}</p></div>
            </div>
            <p class="review-self-note">${revealMode==='skip'?'Você marcou que não lembrava. Compare a referência e seja rigoroso na autoavaliação.':'Compare a ideia, não palavras idênticas. Depois diga o quanto você realmente lembrava antes de revelar.'}</p>
          `:''}
        </div>
        ${revealed?`
          <div class="review-actions">
            <button onclick="gradeReviewV8('${c.id}',0)">0 · apaguei</button>
            <button onclick="gradeReviewV8('${c.id}',1)">1 · difícil</button>
            <button onclick="gradeReviewV8('${c.id}',2)">2 · bom</button>
            <button onclick="gradeReviewV8('${c.id}',3)">3 · fácil</button>
          </div>
        `:`
          <div class="review-write-actions">
            <button class="primary" id="compareReview">Comparar resposta</button>
            <button class="ghost" id="skipReview">Não lembro · mostrar referência</button>
          </div>
        `}
        <p style="color:var(--muted);font-size:11px">“Bom/fácil” rende 1 ◇. A recompensa vem da recuperação ativa, não de abrir a resposta.</p>
      </div>`;

    const ta=document.getElementById('reviewText');
    if(ta){
      ta.disabled=revealed;
      ta.oninput=()=>{state.reviewDrafts[c.id]=ta.value;save()};
    }
    if(!revealed){
      document.getElementById('compareReview').onclick=()=>{
        const answer=String(ta?.value||'').trim();
        if(answer.length<3){toast('Escreva pelo menos uma ideia antes de comparar.');ta?.focus();return}
        state.reviewDrafts[c.id]=ta.value;save();
        revealed=true;revealMode='compare';renderCard();
      };
      document.getElementById('skipReview').onclick=()=>{
        state.reviewDrafts[c.id]=ta?.value||'';save();
        revealed=true;revealMode='skip';renderCard();
      };
    }
  };

  window.gradeReviewV8=(id,q)=>{
    const old=state.reviews[id]||{interval:1,ease:2.2,reps:0};
    const interval=q===0?1:q===1?Math.max(2,Math.round(old.interval*1.4)):q===2?Math.max(4,Math.round(old.interval*2.1)):Math.max(7,Math.round(old.interval*3));
    state.reviews[id]={interval,due:localDatePlus(interval),ease:old.ease,lastQuality:q,reps:Number(old.reps||0)+1};
    state.reviewAnswers=Number(state.reviewAnswers||0)+1;
    if(q>=2){state.coins++;coinsSession++}
    delete state.reviewDrafts[id];
    markActivity();save();
    idx++;revealed=false;revealMode='compare';
    if(idx>=due.length){
      checkAchievements(false);
      rewardOverlay('Sessão de revisão concluída',{coins:coinsSession,xp:0,detail:`${due.length} respostas recuperadas e comparadas.`,icon:'↻'});
      go('home');
    }else renderCard();
  };
  renderCard();
};

/* ---------- Desafio diário: banco próprio, cumulativo e mais difícil ---------- */
function hashText(text){
  let h=2166136261>>>0;
  for(const ch of text){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)>>>0}
  return h>>>0;
}

dailyChallenge=function(){
  const max=maxCompleted();
  if(max<3)return null;
  const eligible=DAILY_BANK.filter(x=>x.minLevel<=max);
  if(!eligible.length)return null;

  // Prioriza o conteúdo mais recente, mas mantém uma pequena janela acumulativa.
  const topMin=Math.max(...eligible.map(x=>x.minLevel));
  const recentThreshold=Math.max(3, topMin-4);
  let pool=eligible.filter(x=>x.minLevel>=recentThreshold);

  // Quando possível, favorece a menor área de maestria sem obrigar sempre a mesma.
  const weak=weakestSkill();
  const weakPool=pool.filter(x=>x.skill===weak.id);
  if(weakPool.length && (hashText(localDay())%3!==0))pool=weakPool;

  const key=`${localDay()}|${max}|${weak.id}|v8`;
  return pool[hashText(key)%pool.length];
};

dailyReward=function(){
  const p=dailyChallenge();
  const d=p?.difficulty||1, mix=p?.mix||2;
  return {coins:18+d*5+mix*2,xp:8+d*4+mix};
};

homeDaily=function(){
  const ch=dailyChallenge();
  if(!ch)return `<div class="daily-teaser"><div><h3>☀ Desafio diário</h3><p>Libera depois do N003, quando já dá para misturar mais de uma ideia.</p></div><button class="ghost" disabled>Bloqueado até N003</button></div>`;
  const done=!!state.dailyCompleted?.[localDay()],rw=dailyReward();
  return `<div class="daily-teaser">
    <div class="daily-icon">${done?'✓':'☀'}</div>
    <div style="flex:1">
      <span class="eyebrow">${done?'feito hoje':'desafio diário cumulativo'}</span>
      <h3>${escapeHtml(ch.title)}</h3>
      <p>${done?'Recompensa coletada. Amanhã vem outro contexto.':'É mais difícil que uma aula normal: mistura conteúdo antigo com o que você acabou de aprender e usa um contexto diferente.'}</p>
      <div class="reward-pills">
        <span class="reward-pill">+${rw.xp} XP</span>
        <span class="reward-pill">+${rw.coins} ◇</span>
        <span class="reward-pill">${ch.mix} peças misturadas</span>
        <span class="reward-pill">dificuldade ${ch.difficulty}/10</span>
      </div>
    </div>
    <button class="${done?'ghost':'primary'}" onclick="go('daily')">${done?'Ver desafio':'Fazer agora →'}</button>
  </div>`;
};

dailyView=function(){
  const p=dailyChallenge(),date=localDay(),done=!!state.dailyCompleted?.[date];
  if(!p){
    document.getElementById('view').innerHTML='<span class="eyebrow">desafio diário</span><h1>Ainda bloqueado.</h1><div class="empty">Conclua pelo menos até o N003.</div>';
    return;
  }
  const rw=dailyReward();
  if(state.dailyCodeIds?.[date]!==p.id && !done){
    state.dailyCodes[date]=p.starter||'';
    state.dailyCodeIds[date]=p.id;
    save();
  }
  const saved=state.dailyCodes[date]??p.starter??'';
  document.getElementById('view').innerHTML=`
    <section class="daily-shell">
      <span class="eyebrow">desafio diário cumulativo · ${done?'concluído':'disponível'}</span>
      <h1>${escapeHtml(p.title)}</h1>
      <div class="daily-date">${escapeHtml(localDateLabel())}</div>
      <div class="daily-difficulty" style="margin:13px 0">
        <span>Dificuldade ${p.difficulty}/10 · mistura ${p.mix} peças já aprendidas</span>
        <span class="difficulty-dots">${Array.from({length:10},(_,i)=>`<i class="${i<p.difficulty?'on':''}"></i>`).join('')}</span>
      </div>
      <div class="card">
        <p>${escapeHtml(p.contract)}</p>
        <div class="reward-pills">
          <span class="reward-pill">+${rw.xp} XP</span>
          <span class="reward-pill">+${rw.coins} ◇</span>
          <span class="reward-pill">sem dica automática</span>
          <span class="reward-pill">contexto novo</span>
        </div>
      </div>
      <div class="card editor-card">
        <div class="editor-top"><span>mistura acumulativa</span><span>${done?'recompensa coletada':'vale recompensa hoje'}</span></div>
        <div id="dailyEditor" class="editor"></div>
        <div class="editor-actions">
          <button class="secondary" id="dailyRun">▶ Rodar</button>
          <button class="primary" id="dailyCheck">✓ Corrigir</button>
        </div>
        <pre id="dailyOutput" class="output">Tente chegar numa solução antes de procurar ajuda externa.</pre>
        <div id="dailyFeedback" class="feedback">${done?'Pode refazer para treino, mas a recompensa já foi coletada.':'O diário usa um problema diferente das aulas e exige combinar conhecimentos.'}</div>
      </div>
      ${done?'<div class="daily-complete"><b>✓ Recompensa de hoje coletada.</b><p>Amanhã o banco escolhe outro cenário compatível com seu progresso.</p></div>':''}
    </section>`;
  const ed=initAce('dailyEditor',saved);
  ed.session.on('change',()=>{state.dailyCodes[date]=ed.getValue();state.dailyCodeIds[date]=p.id;save()});
  document.getElementById('dailyRun').onclick=async()=>{
    const out=document.getElementById('dailyOutput');out.textContent='Executando…';
    const r=await runPython(ed.getValue());out.textContent=r.ok?(r.stdout||'Executou sem erro.'):r.error
  };
  document.getElementById('dailyCheck').onclick=async()=>{
    const fb=document.getElementById('dailyFeedback');fb.className='feedback';fb.textContent='Corrigindo…';
    const r=await runPython(ed.getValue(),p.test);
    if(r.ok){
      fb.classList.add('success');fb.textContent='✓ Desafio diário resolvido. Você combinou conteúdo em um contexto novo.';
      if(!state.dailyCompleted[date]){
        state.dailyCompleted[date]={id:p.id,skill:p.skill,difficulty:p.difficulty,mix:p.mix};
        grantBonus('Desafio diário concluído',{...rw,detail:`Dificuldade ${p.difficulty}/10 · ${p.mix} peças combinadas.`,icon:'☀'});
      }else toast('Já recompensado hoje.');
    }else{
      fb.classList.add('fail');const entry=recordError(p.minLevel,r.error,ed.getValue(),'diário');
      const last=String(r.error||'').trim().split('\n').slice(-1)[0];
      fb.textContent='Ainda não. '+last+(entry?.ignored?'':'');
    }
  };
};

/* ---------- Provas: diagnóstico detalhado só é liberado depois da aprovação ---------- */
async function gradeExamDetailedV8(code,tasks){
  if(!pyodide){
    const ready=typeof window.ensureArcadiaPythonReady==='function'?await window.ensureArcadiaPythonReady():false;
    if(!ready||!pyodide)return {score:0,details:[],errors:[],error:'Não consegui iniciar o Python.'};
  }
  try{
    pyodide.globals.set('ARC_EXAM_CODE_V8',String(code??''));
    pyodide.globals.set('ARC_EXAM_TASKS_V8',JSON.stringify(tasks||[]));
    const raw=await pyodide.runPythonAsync(`
import json, traceback, types, pathlib, io, contextlib, math, statistics, re, csv, tempfile, sys, time
from datetime import date, datetime, timedelta
from collections import *

TASKS=json.loads(ARC_EXAM_TASKS_V8)

class _Raises:
    def __init__(self, exc): self.exc=exc
    def __enter__(self): return self
    def __exit__(self, typ, val, tb):
        if typ is None: raise AssertionError("Era esperada uma exceção")
        if not issubclass(typ,self.exc): return False
        return True
class _Pytest:
    def fail(self,msg="falhou"): raise AssertionError(msg)
    def skip(self,msg="pendente"): raise AssertionError(msg)
    def raises(self,exc): return _Raises(exc)
pytest=_Pytest()

score=0
details=[]
errors=[]
fatal=""
class _ArcadiaExamTimeout(Exception):
    pass
exam_deadline=time.monotonic()+3.5
def _exam_watchdog(frame,event,arg):
    if event=='line' and frame.f_code.co_filename=='<arcadia_exam_user>' and time.monotonic()>exam_deadline:
        raise _ArcadiaExamTimeout()
    return _exam_watchdog

try:
    ns={}
    sys.settrace(_exam_watchdog)
    exec(compile(ARC_EXAM_CODE_V8,'<arcadia_exam_user>','exec'),ns)
    sys.settrace(None)
    m=types.SimpleNamespace(**{k:v for k,v in ns.items() if not k.startswith("__")})
    tmp_path=pathlib.Path("/tmp/arcadia_exam_v8")
    tmp_path.mkdir(parents=True,exist_ok=True)
except _ArcadiaExamTimeout:
    fatal='Tempo limite: o código da prova entrou em uma execução muito longa. Verifique loops que não alteram sua própria condição.'
except BaseException:
    fatal=traceback.format_exc(limit=5)
finally:
    sys.settrace(None)
else:
    base=globals().copy()
    base.update(ns)
    base.update({"m":m,"tmp_path":tmp_path,"pytest":pytest})
    for task in TASKS[:5]:
        try:
            env=base.copy()
            exec(task,env)
            score+=20
            details.append(True)
            errors.append("")
        except BaseException as exc:
            details.append(False)
            errors.append(f"{type(exc).__name__}: {exc}")
json.dumps({"score":score,"details":details,"errors":errors,"error":fatal},ensure_ascii=False)
`);
    return JSON.parse(typeof raw==='string'?raw:String(raw));
  }catch(err){
    console.error('Arcádia V8: falha ao corrigir prova',err);
    return {score:0,details:[],errors:[],error:'Falha interna na correção: '+(err?.message||String(err))}
  }
}

function examDiagnosticHtml(a,e,result){
  if(result.score<70)return `<div class="exam-diagnostic locked"><b>Diagnóstico detalhado bloqueado</b><p>Ele aparece somente depois que você atingir 70/100. Antes disso, a prova continua medindo sua tentativa sem entregar quais tarefas falharam.</p></div>`;
  if(result.score===100)return `<div class="exam-diagnostic perfect"><span class="eyebrow">diagnóstico liberado</span><h3>100/100 · gabaritou.</h3><p>As cinco tarefas passaram nesta tentativa. Não há ponto perdido para revisar.</p></div>`;
  const meta=e.task_meta||[];
  const rows=(result.details||[]).map((ok,i)=>{
    const item=meta[i]||{title:`Tarefa ${i+1}`,explain:'Revise o contrato dessa tarefa.'};
    return `<div class="exam-diagnostic-row ${ok?'ok':'miss'}"><div class="exam-diagnostic-mark">${ok?'✓':'×'}</div><div><b>Tarefa ${i+1} · ${escapeHtml(item.title)}</b><p>${ok?'Passou nesta tentativa.':escapeHtml(item.explain)}</p>${!ok&&result.errors?.[i]?`<small>Sinal da correção: ${escapeHtml(result.errors[i])}</small>`:''}</div></div>`;
  }).join('');
  return `<div class="exam-diagnostic"><span class="eyebrow">diagnóstico liberado após aprovação</span><h3>Por que não foi 100?</h3><p>Agora que você passou, o curso pode mostrar exatamente quais partes ainda merecem revisão sem ajudar numa tentativa reprovada.</p>${rows}</div>`;
}

examView=function(a){
  const levels=DATA.levels.slice((a-1)*10,a*10);
  if(!levels.every(x=>state.completed.includes(x.level))){
    document.getElementById('view').innerHTML='<div class="empty">Conclua o arco antes da prova.</div>';return;
  }
  const e=exam(a),code=state.examCodes[a]??e.starter;
  const previous=state.examDiagnostics?.[a];
  document.getElementById('view').innerHTML=`<div class="lesson-shell">
    <button class="back" onclick="go('exams')">← provas</button>
    <header class="lesson-head"><span class="eyebrow">Avaliação · Arco ${a}</span><h1>${escapeHtml(e.title)}</h1></header>
    <div class="exam-warning"><b>Modo prova:</b> sem tutor, debugger visual, pet ou dicas. A Wiki continua disponível como documentação do que você já aprendeu. O diagnóstico de tarefas só é revelado quando uma tentativa alcança 70/100.</div>
    <div class="card editor-card" style="margin-top:18px">
      <div class="editor-top"><span>5 tarefas · cada uma vale 20 pontos</span><span id="examScore">${state.examScores[a]?`melhor: ${state.examScores[a]}/100`:''}</span></div>
      <div id="challenge-editor" class="editor" style="height:520px"></div>
      <div class="editor-actions"><button class="secondary" id="runExam">▶ Rodar</button><button class="primary" id="gradeExam">✓ Entregar e corrigir</button></div>
      <pre id="output" class="output">Boa prova.</pre>
      <div id="feedback" class="feedback"></div>
    </div>
    <div id="examDiagnosticHolder">${previous?examDiagnosticHtml(a,e,previous):''}</div>
  </div>`;
  currentEditor=initAce('challenge-editor',code);
  attachWikiClick(currentEditor,0);
  currentEditor.session.on('change',()=>{state.examCodes[a]=currentEditor.getValue();save()});
  document.getElementById('runExam').onclick=async()=>{
    const r=await runPython(currentEditor.getValue());
    document.getElementById('output').textContent=r.ok?(r.stdout||'Executou sem erro.'):r.error
  };
  document.getElementById('gradeExam').onclick=async()=>{
    const oldScore=Number(state.examScores[a]||0),wasPassed=oldScore>=70,oldLv=playerLevel();
    const r=await gradeExamDetailedV8(currentEditor.getValue(),e.tasks);
    const score=r.score;
    state.examScores[a]=Math.max(oldScore,score);
    markActivity();
    if(score>=70){
      state.examDiagnostics[a]={score,details:r.details,errors:r.errors,date:localDay()};
    }
    save();
    const fb=document.getElementById('feedback');
    fb.className='feedback '+(score>=70?'success':'fail');
    fb.textContent=`Nota: ${score}/100 · ${score>=70?'Aprovado. Diagnóstico liberado abaixo.':'Ainda não atingiu 70. O diagnóstico de tarefas continua bloqueado.'}`;
    document.getElementById('examScore').textContent=`melhor: ${state.examScores[a]}/100`;
    document.getElementById('examDiagnosticHolder').innerHTML=examDiagnosticHtml(a,e,r);
    if(score>=70&&!wasPassed&&!state.rewardedExams.includes(a)){
      state.coins+=50;state.rewardedExams.push(a);save();checkAchievements(false);
      rewardOverlay('Prova aprovada',{coins:50,xp:100,oldLevel:oldLv,detail:`${score}/100 no Arco ${a}`,icon:score>=90?'★':'✓'})
    }else checkAchievements(false);
  };
};

/* ---------- Próxima ação: se o arco terminou, aponta para a prova em vez de um nível bloqueado ---------- */
const homeBeforeV8=home;
home=function(){
  homeBeforeV8();
  let pendingExam=null;
  for(let a=1;a<=10;a++){
    const items=DATA.levels.slice((a-1)*10,a*10);
    if(items.every(x=>state.completed.includes(x.level))&&!arcPassed(a)){pendingExam=a;break}
  }
  if(pendingExam){
    const card=document.querySelector('.continue-card');
    if(card){
      const items=DATA.levels.slice((pendingExam-1)*10,pendingExam*10);
      card.innerHTML=`<div><span class="eyebrow">próxima etapa obrigatória</span><h3>Prova do Arco ${pendingExam} · ${escapeHtml(items[0].arc_name)}</h3><p>As 10 etapas do arco estão concluídas. Passe na prova para liberar o próximo arco.</p></div><button class="primary" onclick="go('exam',${pendingExam})">Fazer prova →</button>`;
    }
  }
  // v6 injeta o diário usando a função homeDaily; substituímos o card antigo caso o HTML tenha vindo da versão anterior.
  const oldDaily=document.querySelector('.daily-teaser');
  if(oldDaily)oldDaily.outerHTML=homeDaily();
  applyCosmetics();
};

window.addEventListener('arcadia-python-ready',()=>{const el=document.getElementById('pyStatus');if(el)el.textContent='● Python pronto · v8'});

/* Atualiza imediatamente o rótulo de versão mesmo antes de Python ser carregado. */
setTimeout(()=>{
  const el=document.getElementById('pyStatus');
  if(el&&/sob demanda|offline|iniciando|pronto/i.test(el.textContent)){
    el.textContent=el.textContent.replace(/v7\.?2?|v7\.3|v7\.1/gi,'v8');
  }
},0);
