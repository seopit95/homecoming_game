import {useContext} from 'react';
import {LanguageContext,localizeTree} from './localization';
import {investigation} from '../lib/investigation';
import type {Story} from '../lib/story';

export function InvestigationNotebook({story,onClose}:{story:Pick<Story,'notes'>;onClose:()=>void}){
 const language=useContext(LanguageContext);
 const book=investigation(story);
 if(!book.count)return localizeTree(<div className="investigation-empty"><p>아직 적어 둔 기록이 없다.</p><p>발견한 문서와 직접 확인한 사실이 여기에 남습니다.</p></div>,language);
 const latest=book.sections.find(s=>s.records.some(r=>r.id===story.notes.at(-1)))?.id??book.sections.at(-1)?.id;
 return localizeTree(<section className="investigation" aria-label="조사 수첩">
  <header className="investigation-heading"><div><span>백로아파트 · 내가 확인한 것</span><h3>그날 밤의 순서</h3></div><div className="investigation-heading-controls"><span>{book.count}개의 기록</span><button onClick={onClose}>수첩 닫기</button></div></header>
  <div className="investigation-columns">
   <div className="investigation-facts" role="region" aria-label="사고 시간대 정리" tabIndex={0}>
    {book.timeline.length>0?<ol className="investigation-timeline">{book.timeline.map(event=><li key={event.id} className={event.confirmed?'confirmed':''}><time>{event.time}</time><div><p className="investigation-source">{event.source}</p><h4>{event.title}</h4><p>{event.text}</p></div></li>)}</ol>:<p className="investigation-muted">아직 그날의 시간대를 대조할 기록은 없다.</p>}
    {book.person.text&&<aside className="investigation-person"><h4>{book.person.name??'남겨진 생활'}</h4><p>{book.person.text}</p></aside>}
    {book.questions.length>0&&<aside className="investigation-questions"><h4>아직 확인하지 못한 것</h4><ul>{book.questions.map(q=><li key={q}>{q}</li>)}</ul></aside>}
    {book.pattern&&<aside className="investigation-pattern"><h4>세 기록에서 반복되는 일</h4><p>{book.pattern}</p></aside>}
   </div>
   <div className="investigation-records" role="region" aria-label="발견한 문서와 기록" tabIndex={0}><h4>발견한 문서와 기록</h4><p className="investigation-muted">장소를 펼쳐 원문을 다시 읽을 수 있습니다.</p>{book.sections.map(section=><details key={section.id} open={section.id===latest}><summary>{section.title}<span>{section.records.length}</span></summary>{section.records.map(record=><article key={record.id}><h5>{record.title}</h5><p>{record.text}</p></article>)}</details>)}</div>
  </div>
 </section>,language);
}
