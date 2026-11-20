import type { RegionId } from '../core/types/content.js';

export interface MapRoom { id:string; name:string; x:number; y:number; radiusX:number; radiusY:number; kind:'main'|'landmark'|'hidden' }
export interface MapCorridor { id:string; from:string; to:string; controlX:number; controlY:number; width:number }
export interface RegionMapLayout { regionId:RegionId; width:number; height:number; rooms:readonly MapRoom[]; corridors:readonly MapCorridor[] }

function createLayout(regionId:RegionId,variant:number):RegionMapLayout {
  const shift=variant*12;
  const rooms:MapRoom[]=[
    {id:'heart',name:'Merkez Alanı',x:1200,y:900,radiusX:480+variant*5,radiusY:370,kind:'main'},
    {id:'northwest',name:'Kuzeybatı Harabeleri',x:350+shift,y:320+shift,radiusX:310,radiusY:230,kind:'landmark'},
    {id:'northeast',name:'Kuzeydoğu Mabedi',x:2050-shift,y:350+shift,radiusX:310,radiusY:230,kind:'landmark'},
    {id:'southwest',name:'Güneybatı Geçidi',x:350+shift,y:1480-shift,radiusX:310,radiusY:230,kind:'landmark'},
    {id:'southeast',name:'Güneydoğu Avlusu',x:2050-shift,y:1450-shift,radiusX:310,radiusY:230,kind:'landmark'},
    {id:'hidden',name:'Saklı Alt Bölge',x:1200+variant*18,y:255,radiusX:205,radiusY:145,kind:'hidden'}
  ];
  const link=(id:string,to:string,controlX:number,controlY:number,width:number):MapCorridor=>({id,from:'heart',to,controlX,controlY,width});
  return {regionId,width:2400,height:1800,rooms,corridors:[
    link('root-nw','northwest',790,520,104),link('root-ne','northeast',1610,520,104),
    link('root-sw','southwest',790,1280,104),link('root-se','southeast',1610,1280,104),
    link('hidden-neck','hidden',1200,545,72)
  ]};
}
export const REGION_MAP_LAYOUTS:readonly RegionMapLayout[]=[
  createLayout('cursed-forest',0),createLayout('forgotten-graveyard',1),createLayout('deep-dungeon',2),
  createLayout('rotten-swamp',3),createLayout('cursed-castle',4)
];
export function getRegionMapLayout(regionId:RegionId):RegionMapLayout {
  return REGION_MAP_LAYOUTS.find(layout=>layout.regionId===regionId)??REGION_MAP_LAYOUTS[0]!;
}
function distanceToSegment(px:number,py:number,ax:number,ay:number,bx:number,by:number):number {
  const dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy||1;
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len));
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}
function corridorContains(layout:RegionMapLayout,corridor:MapCorridor,x:number,y:number):boolean {
  const from=layout.rooms.find(room=>room.id===corridor.from),to=layout.rooms.find(room=>room.id===corridor.to);
  if(!from||!to)return false;
  let previousX=from.x,previousY=from.y;
  for(let step=1;step<=24;step++){
    const t=step/24,u=1-t;
    const nextX=u*u*from.x+2*u*t*corridor.controlX+t*t*to.x;
    const nextY=u*u*from.y+2*u*t*corridor.controlY+t*t*to.y;
    if(distanceToSegment(x,y,previousX,previousY,nextX,nextY)<=corridor.width)return true;
    previousX=nextX;previousY=nextY;
  }
  return false;
}
export function isRegionMapWalkable(layout:RegionMapLayout,x:number,y:number,margin=0):boolean {
  if(x<margin||y<margin||x>layout.width-margin||y>layout.height-margin)return false;
  if(layout.rooms.some(room=>((x-room.x)/(room.radiusX-margin))**2+((y-room.y)/(room.radiusY-margin))**2<=1))return true;
  return layout.corridors.some(corridor=>corridorContains(layout,corridor,x,y));
}
export function resolveRegionMapPosition(layout:RegionMapLayout,x:number,y:number,margin=20):{x:number;y:number} {
  if(isRegionMapWalkable(layout,x,y,margin))return {x,y};
  for(let radius=16;radius<=720;radius+=16)for(let step=0;step<32;step++){
    const angle=step*Math.PI/16,candidate={x:x+Math.cos(angle)*radius,y:y+Math.sin(angle)*radius};
    if(isRegionMapWalkable(layout,candidate.x,candidate.y,margin))return candidate;
  }
  const room=layout.rooms[0]!;
  return {x:room.x,y:room.y};
}
export function buildRegionMapBoundary(layout:RegionMapLayout,cellSize=32):{x:number;y:number}[] {
  const walls:{x:number;y:number}[]=[],half=cellSize/2;
  for(let y=half;y<layout.height;y+=cellSize)for(let x=half;x<layout.width;x+=cellSize){
    if(isRegionMapWalkable(layout,x,y))continue;
    if(isRegionMapWalkable(layout,x-cellSize,y)||isRegionMapWalkable(layout,x+cellSize,y)||isRegionMapWalkable(layout,x,y-cellSize)||isRegionMapWalkable(layout,x,y+cellSize))walls.push({x,y});
  }
  return walls;
}
export function validateRegionMapConnectivity(layout:RegionMapLayout):boolean {
  const center=layout.rooms.find(room=>room.id==='heart');
  if(!center)return false;
  return layout.rooms.every(room=>{
    if(!isRegionMapWalkable(layout,room.x,room.y))return false;
    const corridor=layout.corridors.find(item=>item.to===room.id);
    if(!corridor)return room.id==='heart';
    for(let step=1;step<=24;step++){
      const t=step/24,u=1-t;
      const x=u*u*center.x+2*u*t*corridor.controlX+t*t*room.x;
      const y=u*u*center.y+2*u*t*corridor.controlY+t*t*room.y;
      if(!isRegionMapWalkable(layout,x,y))return false;
    }
    return true;
  });
}
