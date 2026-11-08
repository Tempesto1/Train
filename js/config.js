// Справочники: дни тренировок, группы мышц, библиотека упражнений, тренажёры кардио.
import {norm} from './util.js';

const MUS={
  chest:{name:'Грудь',c:'t-chest'}, triceps:{name:'Трицепс',c:'t-chest'}, shoulders:{name:'Плечи',c:'t-sh'},
  back:{name:'Спина',c:'t-back'}, biceps:{name:'Бицепс',c:'t-back'}, legs:{name:'Ноги',c:'t-legs'}
};
const MUS_ORDER=['chest','triceps','back','biceps','legs','shoulders'];
const TYPES={
  back:{name:'Спина · бицепс',short:'Спина',kind:'strength',muscles:['back','biceps'],opt:[]},
  legs:{name:'Ноги',short:'Ноги',kind:'strength',muscles:['legs'],opt:['shoulders']},
  chest:{name:'Грудь · трицепс',short:'Грудь',kind:'strength',muscles:['chest','triceps'],opt:['shoulders']},
  cardio:{name:'Кардио',short:'Кардио',kind:'cardio',muscles:[],opt:[]}
};
const ORDER=['back','legs','chest','cardio'];
const LIB={
  chest:[['Жим штанги лёжа'],['Жим гантелей на наклонной'],['Разводка гантелей'],['Кроссовер'],['Жим в тренажёре'],['Отжимания на брусьях',1]],
  triceps:[['Французский жим'],['Разгибание на блоке'],['Жим узким хватом'],['Разгибание из-за головы'],['Обратные отжимания от скамьи',1]],
  shoulders:[['Жим гантелей сидя'],['Махи в стороны'],['Армейский жим'],['Махи в наклоне'],['Тяга к подбородку']],
  back:[['Подтягивания',1],['Тяга верхнего блока'],['Тяга штанги в наклоне'],['Тяга гантели одной рукой'],['Тяга горизонтального блока'],['Гиперэкстензия']],
  biceps:[['Подъём штанги на бицепс'],['Молотки'],['Подъём гантелей с супинацией'],['Сгибания на скамье Скотта'],['Подтягивания обратным хватом',1]],
  legs:[['Приседания со штангой'],['Жим ногами'],['Румынская тяга'],['Выпады с гантелями'],['Разгибание ног'],['Сгибание ног'],['Подъёмы на носки']]
};
const LIBMAP=new Map();
Object.keys(LIB).forEach(m=>LIB[m].forEach(([n,bw])=>LIBMAP.set(norm(n),{muscle:m,bw:!!bw})));
LIBMAP.set(norm('Отжимания'),{muscle:'chest',bw:true});
const DEFAULT_PICK={chest:[['chest',3],['triceps',2]],back:[['back',3],['biceps',2]],legs:[['legs',4]]};
const CK={
  treadmill:{name:'Беговая дорожка',f:['min','km','speed','incline','hr']},
  bike:{name:'Велотренажёр',f:['min','km','level','hr']},
  ellipse:{name:'Эллипс',f:['min','level','hr']},
  rower:{name:'Гребной тренажёр',f:['min','m','hr']},
  stairs:{name:'Степпер',f:['min','floors','hr']},
  rope:{name:'Скакалка',f:['min','hr']},
  other:{name:'Другое',f:['min','km','hr']}
};
const FIELD={
  min:{l:'Время',u:'мин'}, km:{l:'Дистанция',u:'км'}, m:{l:'Дистанция',u:'м'},
  speed:{l:'Скорость',u:'км/ч'}, incline:{l:'Наклон',u:'%'}, level:{l:'Уровень',u:''},
  floors:{l:'Этажи',u:''}, hr:{l:'Пульс',u:'уд/мин'}
};
const STEP=2.5, CACHE='rv.sessions.v1', PCACHE='rv.profile.v1', MIN_WEEKS=8;

export {MUS,MUS_ORDER,TYPES,ORDER,LIB,LIBMAP,DEFAULT_PICK,CK,FIELD,STEP,CACHE,PCACHE,MIN_WEEKS};
