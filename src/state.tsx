import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode, Dispatch, SetStateAction } from 'react';
import { seed } from './fixtures/seed';
import { Icon } from './icons';

type Question = typeof seed.apps[number]['questions'][number];
type Job = typeof seed.jobs[number];
type Action = (action: string,id?:string,value?:string,trigger?:HTMLElement)=>void;
type State = {
 route:string;act:Action; saved:string[];tab:string; search:string;setSearch:Dispatch<SetStateAction<string>>;
 experience:string;setExperience:Dispatch<SetStateAction<string>>;deadline:string;setDeadline:Dispatch<SetStateAction<string>>;
 questions:Question[];question:Question;count:number;within:boolean;updateQuestion:(value:string)=>void;
 evidence:Record<string,boolean>;setEvidence:Dispatch<SetStateAction<Record<string,boolean>>>;
};
const Context=createContext<State|null>(null);
export function useFixture(){const state=useContext(Context);if(!state)throw new Error('Fixture provider is required');return state;}
const validRoutes=['home','jobs','write/a1'];
function readRoute(){const hash=location.hash.slice(1);return validRoutes.includes(hash)?hash:'home';}
export function countText(q:Question){const value=q.spaces?q.text:q.text.replace(/\s/g,'');return q.unit==='bytes'?new TextEncoder().encode(value).length:Array.from(value).length;}
export function FixtureProvider({children}:{children:ReactNode}){
 const [route,setRoute]=useState(readRoute),[saved,setSaved]=useState(seed.saved),[tab,setTab]=useState('all');
 const [search,setSearch]=useState(''),[experience,setExperience]=useState('all'),[deadline,setDeadline]=useState('all');
 const [questions,setQuestions]=useState(()=>structuredClone(seed.apps[0].questions)),[questionId,setQuestionId]=useState('q1');
 const [evidence,setEvidence]=useState<Record<string,boolean>>({});
 const [modal,setModal]=useState<string|null>(null),[message,setMessage]=useState('');
 const trigger=useRef<HTMLElement|null>(null),dialog=useRef<HTMLElement|null>(null);
 const question=questions.find(q=>q.id===questionId)||questions[0],count=countText(question),within=count>=question.min&&count<=question.max;
 useEffect(()=>{const onHash=()=>setRoute(readRoute());window.addEventListener('hashchange',onHash);return()=>window.removeEventListener('hashchange',onHash);},[]);
 useEffect(()=>{if(!message)return;const timer=window.setTimeout(()=>setMessage(''),5000);return()=>window.clearTimeout(timer);},[message]);
 useEffect(()=>{if(!modal)return;const before=document.body.style.overflow;document.body.style.overflow='hidden';dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();return()=>{document.body.style.overflow=before;trigger.current?.focus();};},[modal]);
 function close(){setModal(null);}
 function navigate(value:string){if(validRoutes.includes(value)){location.hash=value;setRoute(value);close();window.scrollTo(0,0);}else setModal('이 화면은 초기 시각 검증 이후 연결합니다. 입력한 초안은 현재 탭에서 유지됩니다.');}
 const act:Action=(action,id='',value='',element)=>{
  if(element)trigger.current=element;
  if(action==='go'){navigate(value);return;}
  if(action==='bookmark'){setSaved(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);return;}
  if(action==='jobs-tab'){setTab(value);return;}
  if(action==='reset-filters'){setSearch('');setExperience('all');setDeadline('all');setTab('all');return;}
  if(action==='select-question'){setQuestionId(id);return;}
  if(action==='screen-map'){setModal('map');return;}
  if(action==='copy-draft'){navigator.clipboard.writeText(question.text).then(()=>setMessage('답변을 복사했습니다. 실제 제출과 제출본 확정은 수행하지 않았습니다.')).catch(()=>setMessage('복사 권한을 확인하거나 답변을 직접 선택해 복사해 주세요.'));return;}
  if(action==='skip'){document.getElementById('main-content')?.focus();return;}
  if(action==='generate'||action==='review-draft'||action==='run-batch'){setModal('AI · 검색 실행기가 미연결 상태입니다. 실제 요청을 보내거나 예시 결과를 생성하지 않았습니다.');return;}
  setModal('아직 연결되지 않은 기능입니다. 이 개발 화면은 격리된 예시 데이터로 시각과 입력 흐름을 검증합니다. DB 저장 · 실제 계정 · AI · Slack 연결은 수행하지 않습니다.');
 };
 return <Context.Provider value={{route,act,saved,tab,search,setSearch,experience,setExperience,deadline,setDeadline,questions,question,count,within,updateQuestion:value=>setQuestions(qs=>qs.map(q=>q.id===question.id?{...q,text:value}:q)),evidence,setEvidence}}>{children}
 {modal&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialog} tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){const nodes=dialog.current?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex="0"]');if(nodes?.length){const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}}}><header className="modal-header"><h2 id="modal-title">{modal==='map'?'초기 검증 화면':'연결 상태 안내'}</h2><button className="btn ghost icon-only" onClick={close} aria-label="창 닫기"><Icon name="close"/></button></header><div className="modal-body">{modal==='map'?<div className="screen-map">{[['home','홈 · 오늘의 준비'],['jobs','공고 찾기'],['write/a1','자기소개서 편집']].map(([path,name])=><button key={path} onClick={()=>navigate(path)}><strong>{name}</strong></button>)}</div>:<p>{modal}</p>}</div><footer className="modal-footer"><button className="btn" onClick={close}>닫기</button></footer></section></div>}
 <div id="toasts" className="toast-stack" role="status" aria-live="polite" aria-atomic="false">{message&&<div className="toast"><Icon name="info"/>{message}</div>}</div></Context.Provider>;
}
export function Tag({children,tone=''}:{children:ReactNode;tone?:string}){return <span className={`tag ${tone}`}>{children}</span>;}
export function Logo({job,big=false}:{job:Job;big?:boolean}){return <span className={`company-logo ${job.color||''} ${big?'big':''}`} aria-hidden="true">{job.mark}</span>;}
function daysUntil(date:string){return Math.round((new Date(date+'T12:00:00+09:00').getTime()-new Date('2026-09-16T12:00:00+09:00').getTime())/86400000);}
function shortDate(date:string|null){return date?date.slice(5).replace('-','.'): '미확인';}
function deadlineInfo(job:Job){if(job.closeType==='rolling')return {label:'상시채용',tone:'green'};if(!job.deadline)return {label:'기한 미확인',tone:''};const days=daysUntil(job.deadline);return{label:days<0?'접수기간 종료':days===0?'오늘 마감':`D-${days}`,tone:days>=0&&days<=3?'amber':''};}
function useFilteredJobs(){const {tab,saved,search,experience,deadline}=useFixture();return seed.jobs.filter(j=>(tab!=='saved'||saved.includes(j.id))&&(tab!=='new'||j.new)).filter(j=>!search||[j.company,j.title,...j.skills,j.domain].join(' ').toLowerCase().includes(search.toLowerCase())).filter(j=>experience==='all'||j.exp===experience).filter(j=>deadline==='all'||(deadline==='ended'?j.deadline&&daysUntil(j.deadline)<0:deadline==='fixed'?j.closeType==='fixed'&&j.deadline&&daysUntil(j.deadline)>=0:j.closeType===deadline));}
export function JobTable({compact=false,jobs}:{compact?:boolean;jobs?:Job[]}){const {saved,act}=useFixture();const rows=jobs??seed.jobs.filter(j=>j.new).slice(0,4);if(!rows.length)return <div className="empty"><div className="empty-icon"><Icon name="search"/></div><h3>조건에 맞는 예시 공고가 없습니다.</h3><p>필터를 바꾸거나 검색어를 지워보세요.</p><button className="btn small" onClick={()=>act('reset-filters')}><Icon name="refresh"/><span>필터 초기화</span></button></div>;
return <div className="table-wrap"><table className={`job-table ${compact?'compact':''}`}><thead><tr><th style={{width:40}}><span className="sr-only">관심 저장</span></th><th>회사 · 직무</th><th>경력 조건</th>{!compact&&<th>게시일</th>}<th>마감</th>{!compact&&<th>출처</th>}<th style={{width:45}}><span className="sr-only">상세 보기</span></th></tr></thead><tbody>{rows.map(j=>{const d=deadlineInfo(j),isSaved=saved.includes(j.id);return <tr key={j.id}><td><button className={`bookmark ${isSaved?'saved':''}`} data-action="bookmark" data-id={j.id} onClick={()=>act('bookmark',j.id)} aria-label={`${j.company} 관심 ${isSaved?'해제':'저장'}`} aria-pressed={isSaved}><Icon name="bookmark" small/></button></td><td><div className="row gap-12"><Logo job={j}/><div><div className="company-label">{j.company}{j.new&&<span className="accent" style={{marginLeft:7,fontSize:10}}>새로 발견</span>}</div><button className="job-title-btn" data-action="go" data-val={`job/${j.id}`} onClick={e=>act('go','',`job/${j.id}`,e.currentTarget)}>{j.title}</button><div className="fine" style={{fontSize:10,marginTop:3}}>{j.region} · {j.domain}</div></div></div></td><td><span className="nowrap">{j.exp}</span><div className="fine" style={{fontSize:10,marginTop:3}}>{j.type}</div></td>{!compact&&<td className="muted nowrap">{shortDate(j.posted)}</td>}<td><Tag tone={d.tone}>{d.label}</Tag><div className="fine" style={{fontSize:10,marginTop:5}}>{j.deadline?shortDate(j.deadline)+(j.time?' '+j.time:' · 시간 미확인'):j.closeType==='rolling'?'개인 목표일로 준비':'원문 확인 필요'}</div></td>{!compact&&<td><button className="link-btn" onClick={e=>act('source-job',j.id,'',e.currentTarget)}>원문 {j.sources}곳 <Icon name="external" small/></button></td>}<td><button type="button" className="btn ghost icon-only" title="공고 상세 보기" aria-label="공고 상세 보기" onClick={e=>act('go','',`job/${j.id}`,e.currentTarget)}><Icon name="chevron"/></button></td></tr>;})}</tbody></table></div>;
}
export function JobTabs(){const {saved,tab,act}=useFixture();return <div className="tabs" role="tablist" aria-label="공고 분류">{[['all','전체 공고',seed.jobs.length],['new','새로 발견',seed.jobs.filter(j=>j.new).length],['saved','관심 공고',saved.length]].map(([v,label,count])=><button key={v} className={`tab ${tab===v?'active':''}`} role="tab" aria-selected={tab===v} data-action="jobs-tab" data-val={v} onClick={()=>act('jobs-tab','',String(v))}>{label}<span className="mini-count">{count}</span></button>)}</div>;}
export function JobResults(){const jobs=useFilteredJobs(),{search}=useFixture();return <div id="job-results"><div className="row between mb-16"><span className="fine"><strong>{jobs.length}</strong>개 공고 {search?`· “${search}” 검색`:''}</span><span className="fine">최신 발견순 · 시안 데이터</span></div><section className="panel"><JobTable jobs={jobs}/><div className="table-bottom"><span>예시 {jobs.length}건 표시 · 원문은 미리보기로 열립니다.</span><span>1 / 1</span></div></section></div>;}
export function QuestionNav(){const {question,questions,act}=useFixture();return <nav className="question-nav" aria-label="자기소개서 문항">{questions.map((q,i)=><button key={q.id} data-action="select-question" data-id={q.id} className={q.id===question.id?'active':''} aria-current={q.id===question.id?'page':undefined} onClick={()=>act('select-question',q.id)}><div className="q-no">QUESTION {String(i+1).padStart(2,'0')}</div><div className="q-name">{q.title}</div><div className="q-foot">{q.text?countText(q)+(q.unit==='bytes'?' bytes':'자'):'아직 작성하지 않음'}</div></button>)}<button type="button" className="btn ghost small w-full" data-action="add-question" onClick={e=>act('add-question','a1','',e.currentTarget)}><Icon name="plus"/><span>문항 추가</span></button></nav>;}
export function EditorQuestion(){const {question,questions,act}=useFixture();return <div className="editor-question"><div className="row between mb-16"><span className="eyebrow" style={{margin:0}}>QUESTION {String(questions.indexOf(question)+1).padStart(2,'0')}</span><button type="button" className="btn ghost small" data-action="edit-question" onClick={e=>act('edit-question','a1','',e.currentTarget)}><Icon name="edit"/><span>문항 수정</span></button></div><h2>{question.prompt}</h2><div className="row wrap gap-6 mt-12"><Tag tone="outline">{question.min}–{question.max}{question.unit==='bytes'?' bytes':'자'}</Tag><Tag tone="outline">{question.spaces?'공백 포함':'공백 제외'}</Tag><Tag tone="green">초안</Tag></div></div>;}
