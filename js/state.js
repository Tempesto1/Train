// Общее состояние приложения. P (вес тела, возраст) меняется только через Object.assign.
import {isoWeek} from './util.js';

export const S={sessions:new Map(),mode:'pending',db:null,readOnly:false,loaded:false,pLoaded:false,view:'scale',week:null,range:12,today:new Date(),scaleY:0};
export const P={weight:null,age:null};
export const curKey=()=>isoWeek(S.today).key;
