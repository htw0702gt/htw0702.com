// Charts calculated from the archived public matches; no third-party scripts or image requests.
export function renderCharts(data, esc) {
  const matches=(Array.isArray(data.matches)?data.matches:[]).filter(m=>m&&typeof m==='object');
  const chronological=[...matches].sort((a,b)=>String(a.playedAt||a.date||'').localeCompare(String(b.playedAt||b.date||'')));
  const won=m=>String(m.result||'').includes('勝');
  const lost=m=>String(m.result||'').includes('敗');
  const finished=chronological.filter(m=>won(m)||lost(m));
  if(!finished.length)return '<section><h2>對戰圖表</h2><p>尚無可計算的勝敗資料。</p></section>';
  const svg=(body,label,view='0 0 600 220')=>`<svg viewBox="${view}" role="img" aria-label="${esc(label)}" preserveAspectRatio="none">${body}</svg>`;
  const line=(values,color,max=100)=>{
    if(!values.length)return '';
    const span=Math.max(1,values.length-1);
    const points=values.map((v,i)=>`${(20+i*560/span).toFixed(1)},${(195-Math.max(0,Math.min(max,v))*165/max).toFixed(1)}`).join(' ');
    return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  };
  const grid=Array.from({length:5},(_,i)=>`<line x1="20" x2="580" y1="${30+i*41.25}" y2="${30+i*41.25}" stroke="rgba(255,255,255,.13)"/>`).join('');
  const rates=finished.map((m,i)=>{
    const part=finished.slice(Math.max(0,i-9),i+1);
    return Math.round(part.filter(won).length/part.length*100);
  });
  let wins=0;
  const cumulative=finished.map((m,i)=>{if(won(m))wins++;return Math.round(wins/(i+1)*100)});
  const kdas=chronological.map(m=>[Number(m.kills),Number(m.deaths),Number(m.assists)]).filter(a=>a.every(Number.isFinite));
  const recentKda=kdas.slice(-40);
  const maxKda=Math.max(10,...recentKda.flat());
  const kdaBars=recentKda.map((row,i)=>row.map((v,j)=>{
    const width=540/Math.max(1,recentKda.length),h=150*v/maxKda;
    return `<rect x="${(30+i*width+j*width/3).toFixed(2)}" y="${(195-h).toFixed(2)}" width="${Math.max(1,width/3-1).toFixed(2)}" height="${h.toFixed(2)}" fill="${['#72d9df','#e88da7','#eecb88'][j]}"/>`;
  }).join('')).join('');
  const grouped=(rows,key)=>{
    const map=new Map();for(const m of rows){const name=key(m);if(!name)continue;const item=map.get(name)||{name,count:0,wins:0};item.count++;if(won(m))item.wins++;map.set(name,item)}return [...map.values()].sort((a,b)=>b.count-a.count);
  };
  const heroes=grouped(finished,m=>m.hero).slice(0,10),modes=grouped(finished,m=>m.mode||m.label).slice(0,10);
  const bars=(rows)=>rows.map(item=>`<div class="aov-chart-row"><span>${esc(item.name)}</span><div class="aov-track"><i style="width:${(item.count/rows[0].count*100).toFixed(1)}%"></i></div><strong>${item.count} 場 · ${Math.round(item.wins/item.count*100)}%</strong></div>`).join('')||'<p>來源未提供此欄位。</p>';
  const hours=Array.from({length:24},(_,hour)=>({hour,count:0,wins:0}));
  const weekdays=Array.from({length:7},(_,day)=>({day,count:0,wins:0}));
  for(const m of finished){const stamp=String(m.playedAt||'');const hour=Number(stamp.match(/\b(\d{1,2}):\d{2}/)?.[1]);if(Number.isInteger(hour)&&hour>=0&&hour<24){hours[hour].count++;if(won(m))hours[hour].wins++}const date=String(m.date||stamp.slice(0,10));if(/^\d{4}-\d{2}-\d{2}$/.test(date)){const day=new Date(`${date}T12:00:00Z`).getUTCDay();if(Number.isInteger(day)){const index=(day+6)%7;weekdays[index].count++;if(won(m))weekdays[index].wins++}}}
  const heat=(rows,label)=>`<div class="aov-heat">${rows.map((r,i)=>`<span title="${esc(label(i))}：${r.count} 場，${r.wins} 勝" style="--intensity:${r.count/Math.max(1,...rows.map(x=>x.count))}"><b>${esc(label(i))}</b><small>${r.count}</small></span>`).join('')}</div>`;
  const total=finished.length,rate=Math.round(wins/total*100),radius=42,circ=2*Math.PI*radius;
  const ring=svg(`<circle cx="60" cy="60" r="${radius}" fill="none" stroke="#ffffff22" stroke-width="10"/><circle cx="60" cy="60" r="${radius}" fill="none" stroke="#7dd9e7" stroke-width="10" stroke-dasharray="${(circ*rate/100).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="66" text-anchor="middle" fill="#f0f5fb" font-size="18">${rate}%</text>`,`${total} 場，${wins} 勝，勝率 ${rate}%`,'0 0 120 120');
  return `<section class="aov-charts"><h2>對戰圖表</h2><p>依 ${total} 筆有勝敗結果的對戰計算；遊戲內總戰績與這裡的對局範圍可能不同。</p><div class="aov-chart-grid">
    <article class="mos aov-chart"><h3>勝率</h3><div class="aov-ring">${ring}<span>${wins} 勝 ${total-wins} 敗</span></div></article>
    <article class="mos aov-chart"><h3>近 10 場勝率與累計勝率</h3>${svg(grid+line(rates,'#eecb88')+line(cumulative,'#e88da7'),'勝率趨勢：金色為近十場，粉色為累計')}<p>金色：近 10 場　粉色：累計</p></article>
    <article class="mos aov-chart"><h3>每場擊殺、死亡與助攻</h3>${recentKda.length?svg(grid+kdaBars,'最近 40 場擊殺、死亡與助攻長條圖'):'<p>來源未提供擊殺、死亡與助攻。</p>'}<p>藍：擊殺　粉：死亡　金：助攻</p></article>
    <article class="mos aov-chart"><h3>英雄使用比例與勝率</h3>${bars(heroes)}</article>
    <article class="mos aov-chart"><h3>模式分布</h3>${bars(modes)}</article>
    <article class="mos aov-chart"><h3>時段分布</h3>${heat(hours,i=>`${String(i).padStart(2,'0')}時`)}</article>
    <article class="mos aov-chart"><h3>星期分布</h3>${heat(weekdays,i=>['一','二','三','四','五','六','日'][i])}</article>
  </div></section>`;
}
