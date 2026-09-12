export type DemoTranslation={name:string;description:string};
export type DemoTranslations={en:DemoTranslation;ru:DemoTranslation};

const hairStyles=[
  ['Salgutamine + lõikus + föönisoeng','Highlights, haircut and blow-dry','Highlights, haircut and blow-dry styling','Мелирование, стрижка и укладка феном','Мелирование, стрижка и укладка феном'],
  ['Põhi + salk + föön','Root colour, highlights and blow-dry','Root colour, highlights and blow-dry styling','Окрашивание корней, мелирование и укладка феном','Окрашивание корней, мелирование и укладка феном'],
  ['Värvimine + lõikus + föönisoeng','Colour, haircut and blow-dry','Hair colouring, haircut and blow-dry styling','Окрашивание, стрижка и укладка феном','Окрашивание, стрижка и укладка феном'],
] as const;
const hairLengths=[
  ['ülipikad juuksed','extra-long hair','очень длинные волосы'],
  ['pikad juuksed','long hair','длинные волосы'],
  ['poolpikad juuksed','medium-length hair','волосы средней длины'],
  ['lühikesed juuksed','short hair','короткие волосы'],
] as const;

const generated=hairStyles.flatMap(([source,enName,enDescription,ruName,ruDescription])=>hairLengths.map(([length,enLength,ruLength])=>[
  `${source} — ${length}`,
  {
    en:{name:`${enName} — ${enLength}`,description:`${enDescription} for ${enLength}.`},
    ru:{name:`${ruName} — ${ruLength}`,description:`${ruDescription} для ${ruLength}.`},
  },
] as const));

const individual:Record<string,DemoTranslations>={
  'Naiste lõikus':{
    en:{name:"Women's haircut",description:'Hair is cut and shaped to the desired style.'},
    ru:{name:'Женская стрижка',description:'Стрижка волос и создание желаемой формы.'},
  },
  'Meeste lõikus':{
    en:{name:"Men's haircut",description:'Haircut and shaping of the hairstyle.'},
    ru:{name:'Мужская стрижка',description:'Стрижка волос и коррекция формы причёски.'},
  },
  'Masinalõikus':{
    en:{name:'Clipper haircut',description:'A short haircut using clippers.'},
    ru:{name:'Стрижка машинкой',description:'Короткая стрижка с помощью машинки.'},
  },
  'Juuste otste tasandamine':{
    en:{name:'Ends trim',description:'Trimming the ends and evening out the haircut line.'},
    ru:{name:'Подравнивание кончиков',description:'Подравнивание кончиков и линии стрижки.'},
  },
  'Tuka lõikus':{
    en:{name:'Fringe trim',description:'Trimming and shaping the fringe.'},
    ru:{name:'Стрижка чёлки',description:'Коррекция длины и формы чёлки.'},
  },
  'Pesu + föönisoeng':{
    en:{name:'Wash and blow-dry',description:'Hair wash and blow-dry styling.'},
    ru:{name:'Мытьё и укладка феном',description:'Мытьё волос и укладка феном.'},
  },
  'Ülespandud soeng':{
    en:{name:'Updo',description:'Hair styling and securing into an updo.'},
    ru:{name:'Собранная причёска',description:'Укладка и фиксация волос в собранную причёску.'},
  },
  'Osaliselt ülespandud soeng':{
    en:{name:'Half-up hairstyle',description:'Part of the hair is pinned up while the rest remains loose.'},
    ru:{name:'Полусобранная причёска',description:'Часть волос закрепляется, а остальные остаются распущенными.'},
  },
  'Megamõnnatamine, 2 h':{
    en:{name:'Extended relaxation massage, 2 h',description:'A longer relaxing full-body massage.'},
    ru:{name:'Продолжительный расслабляющий массаж, 2 ч',description:'Продолжительный расслабляющий массаж всего тела.'},
  },
  'Klassikaline massaaž, 1,5 h':{
    en:{name:'Classic massage, 1.5 h',description:'A classic massage for relaxation and relief from muscle tension.'},
    ru:{name:'Классический массаж, 1,5 ч',description:'Классический массаж для расслабления и снятия мышечного напряжения.'},
  },
  'Klassikaline massaaž, 1 h':{
    en:{name:'Classic massage, 1 h',description:'A classic massage for relaxation and relief from muscle tension.'},
    ru:{name:'Классический массаж, 1 ч',description:'Классический массаж для расслабления и снятия мышечного напряжения.'},
  },
  'Aroomimassaaž, 1,5 h':{
    en:{name:'Aromatherapy massage, 1.5 h',description:'A relaxing massage with aromatic oils.'},
    ru:{name:'Аромамассаж, 1,5 ч',description:'Расслабляющий массаж с ароматическими маслами.'},
  },
  'Reflektoorne jalabaateraapia, 1,5 h':{
    en:{name:'Reflexology foot therapy, 1.5 h',description:'Reflexology massage focused on the feet.'},
    ru:{name:'Рефлексотерапия стоп, 1,5 ч',description:'Рефлекторный массаж, сосредоточенный на стопах.'},
  },
  'Selg / turi / kael, 30 min':{
    en:{name:'Back / shoulders / neck, 30 min',description:'A massage focused on the back, shoulders and neck.'},
    ru:{name:'Спина / плечи / шея, 30 мин',description:'Массаж спины, плеч и шеи.'},
  },
  'Laste massaaž, 30 min':{
    en:{name:"Children's massage, 30 min",description:'A gentle massage designed for children.'},
    ru:{name:'Детский массаж, 30 мин',description:'Мягкий массаж для детей.'},
  },
  'Jalad, 30 min':{
    en:{name:'Leg massage, 30 min',description:'A massage focused on the legs.'},
    ru:{name:'Массаж ног, 30 мин',description:'Массаж, сосредоточенный на ногах.'},
  },
  'Klassikaliste ripsmete paigaldus':{
    en:{name:'Classic lash extensions',description:'Application of a new set of classic lash extensions.'},
    ru:{name:'Наращивание классических ресниц',description:'Установка нового комплекта классических ресниц.'},
  },
  'Klassikaliste ripsmete hooldus':{
    en:{name:'Classic lash infill',description:'Maintenance and infill of existing classic lash extensions.'},
    ru:{name:'Коррекция классических ресниц',description:'Коррекция и заполнение существующих классических ресниц.'},
  },
  'Hübriidripsmete paigaldus':{
    en:{name:'Hybrid lash extensions',description:'Application of a new set of hybrid lash extensions.'},
    ru:{name:'Наращивание гибридных ресниц',description:'Установка нового комплекта гибридных ресниц.'},
  },
  'Hübriidripsmete hooldus':{
    en:{name:'Hybrid lash infill',description:'Maintenance and infill of existing hybrid lash extensions.'},
    ru:{name:'Коррекция гибридных ресниц',description:'Коррекция и заполнение существующих гибридных ресниц.'},
  },
  'Spa-pediküür + geellakk':{
    en:{name:'Spa pedicure with gel polish',description:'Foot and toenail care with gel polish application.'},
    ru:{name:'Спа-педикюр с гель-лаком',description:'Уход за стопами и ногтями с нанесением гель-лака.'},
  },
  'Spa-pediküür geellakita':{
    en:{name:'Spa pedicure without gel polish',description:'Foot and toenail care without gel polish.'},
    ru:{name:'Спа-педикюр без гель-лака',description:'Уход за стопами и ногтями без гель-лака.'},
  },
};

export const iluteguDemoTranslations:Readonly<Record<string,DemoTranslations>>=Object.fromEntries([...generated,...Object.entries(individual)]);
