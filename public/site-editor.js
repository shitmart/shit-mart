(()=> {
 const editing=new URLSearchParams(location.search).has("site_editor");
 let saved={};
 const sel="h1,h2,h3,h4,p,a,button,label,li,span,strong,small,figcaption";
 const key=el=>{
  let parts=[];
  while(el&&el.nodeType===1&&el!==document.documentElement){
   if(el.id){parts.unshift("#"+CSS.escape(el.id));break;}
   let n=1,s=el;while((s=s.previousElementSibling))if(s.tagName===el.tagName)n++;
   parts.unshift(el.tagName.toLowerCase()+":nth-of-type("+n+")");el=el.parentElement;
  }
  return location.pathname+"|"+parts.join(">");
 };
 const ok=el=>el&&el.matches&&el.matches(sel)&&!el.children.length&&el.textContent.trim()&&!el.closest("script,style,svg,iframe");
 function apply(){document.querySelectorAll(sel).forEach(el=>{if(ok(el)&&typeof saved[key(el)]==="string"&&el.textContent!==saved[key(el)])el.textContent=saved[key(el)]})}
 fetch("/api/site-content").then(r=>r.ok?r.json():{}).then(d=>{saved=d||{};apply()}).catch(()=>{});
 new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
 if(!editing)return;
 document.documentElement.style.cursor="crosshair";
 document.addEventListener("click",e=>{
  const el=e.target.closest(sel);if(!ok(el))return;
  e.preventDefault();e.stopPropagation();
  parent.postMessage({type:"shitmart-text-selected",key:key(el),value:el.textContent},location.origin);
 },true);
 document.addEventListener("mouseover",e=>{const el=e.target.closest(sel);if(ok(el))el.style.outline="2px dashed #7c3aed"});
})();
