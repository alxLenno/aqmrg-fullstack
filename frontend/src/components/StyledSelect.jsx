import { Children, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './StyledSelect.css';
export default function StyledSelect({value,onChange,children,disabled,...props}) {
  const options=Children.toArray(children).filter(Boolean).map(child=>({value:String(child.props.value),label:child.props.children,disabled:child.props.disabled}));
  const selected=options.findIndex(option=>option.value===String(value));
  const [open,setOpen]=useState(false),[index,setIndex]=useState(0),[position,setPosition]=useState({});
  const trigger=useRef(null),menu=useRef(null),search=useRef({text:'',time:0}),id=useId();
  const close=()=>setOpen(false);
  const choose=i=>{if(!options[i]||options[i].disabled)return;onChange?.({target:{value:options[i].value}});close();trigger.current?.focus();};
  const show=()=>{
    if(disabled)return;
    const theme=getComputedStyle(trigger.current);
    const tokens=Object.fromEntries(['--accent','--bg-secondary','--bg-card','--border','--text-primary'].map(name=>[name,theme.getPropertyValue(name)]));
    const rect=trigger.current.getBoundingClientRect(),height=Math.min(280,options.length*38+12);
    const above=window.innerHeight-rect.bottom<height && rect.top>height;
    setPosition({...tokens,position:'fixed',left:Math.max(8,Math.min(rect.left,window.innerWidth-rect.width-8)),top:above?Math.max(8,rect.top-height-6):rect.bottom+6,width:Math.min(rect.width,window.innerWidth-16),maxHeight:above?Math.min(280,rect.top-16):Math.min(280,window.innerHeight-rect.bottom-16)});
    setIndex(Math.max(0,selected));setOpen(true);
  };
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!trigger.current?.contains(e.target)&&!menu.current?.contains(e.target))setOpen(false);};
    const dismiss=e=>{if(!menu.current?.contains(e.target))setOpen(false);};
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',dismiss);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',dismiss);};
  },[open]);
  useEffect(()=>{if(open) { const item=menu.current?.querySelector(`[data-index="${index}"]`); if(item && menu.current) { const top=item.offsetTop, bottom=top+item.offsetHeight; if(top<menu.current.scrollTop)menu.current.scrollTop=top; else if(bottom>menu.current.scrollTop+menu.current.clientHeight)menu.current.scrollTop=bottom-menu.current.clientHeight; } }},[index,open]);
  const keydown=e=>{
    if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key))e.preventDefault();
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key==='Tab'){close();return;}
    if(!open){if(['ArrowDown','ArrowUp','Enter',' '].includes(e.key))show();return;}
    if(e.key==='Enter'||e.key===' '){choose(index);return;}
    if(e.key==='ArrowDown')setIndex(i=>(i+1)%options.length);
    else if(e.key==='ArrowUp')setIndex(i=>(i+options.length-1)%options.length);
    else if(e.key==='Home')setIndex(0);
    else if(e.key==='End')setIndex(options.length-1);
    else if(e.key.length===1){const now=Date.now();search.current={text:(now-search.current.time<700?search.current.text:'')+e.key.toLowerCase(),time:now};const found=options.findIndex(o=>String(o.label).toLowerCase().startsWith(search.current.text));if(found>=0)setIndex(found);}
  };
  return <><button {...props} ref={trigger} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${index}`:undefined} disabled={disabled} className="uil-select" onClick={()=>open?close():show()} onKeyDown={keydown}><span>{options[selected]?.label||'Select'}</span><svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m5 7 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg></button>{open&&createPortal(<div ref={menu} id={id} role="listbox" aria-label={props['aria-label']||'Options'} className="uil-select-menu" style={position} onPointerDown={e=>e.preventDefault()}>{options.map((option,i)=><div key={option.value} id={`${id}-${i}`} role="option" aria-selected={i===selected} aria-disabled={option.disabled||undefined} data-index={i} className={`uil-select-option ${i===index?'is-focused':''}`} onPointerMove={()=>setIndex(i)} onClick={()=>choose(i)}><span>{option.label}</span>{i===selected&&<span aria-hidden="true">✓</span>}</div>)}</div>,document.body)}</>;
}
