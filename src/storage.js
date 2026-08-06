const PROGRESS='typerail-progress-v1', SETTINGS='typerail-settings-v1', SCORES='typerail-leaderboard-v1';
export const loadProgress=()=>JSON.parse(localStorage.getItem(PROGRESS)||'{}');
export const saveProgress=p=>localStorage.setItem(PROGRESS,JSON.stringify(p));
export const loadSettings=()=>JSON.parse(localStorage.getItem(SETTINGS)||'{}');
export const saveSettings=s=>localStorage.setItem(SETTINGS,JSON.stringify(s));
export const playerId=()=>{let id=localStorage.getItem('typerail-player-id');if(!id){id=crypto.randomUUID();localStorage.setItem('typerail-player-id',id)}return id};
const demo=[{id:'demo1',name:'MetroMaven',totalStars:34,bestWpm:72,timestamp:1},{id:'demo2',name:'KeyConductor',totalStars:27,bestWpm:64,timestamp:2},{id:'demo3',name:'SignalSwift',totalStars:19,bestWpm:58,timestamp:3}];
export const leaderboardStore={
 async getLeaderboard(){return [...demo,...JSON.parse(localStorage.getItem(SCORES)||'[]')].sort((a,b)=>b.totalStars-a.totalStars||b.bestWpm-a.bestWpm)},
 async submitScore(score){const rows=JSON.parse(localStorage.getItem(SCORES)||'[]').filter(x=>x.id!==score.id);rows.push(score);localStorage.setItem(SCORES,JSON.stringify(rows))}
};
