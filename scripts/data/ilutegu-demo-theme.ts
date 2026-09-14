import type {ThemeConfig} from '../../src/lib/theme-contracts';

export const iluteguDemoTheme:ThemeConfig={
  brandDisplay:'logo',font:'modern',headingFont:'editorial',
  light:{
    background:'#F7EDDE',backgroundMid:'#EADBC3',backgroundEdge:'#D5C2A6',
    surface:'#FFFCF6',text:'#181512',heading:'#181512',
    link:'#45413B',border:'#6A655E',button:'#FFFCF6',buttonText:'#181512',
    calendar:'#FFFCF6',calendarText:'#181512',selected:'#45413B',selectedText:'#FFFCF6',
    icons:'#5C554D',navigation:'#45413B',cardBorder:'#D5C2A6',mutedText:'#56514B',
  },
  dark:{
    background:'#191410',backgroundMid:'#100D0A',backgroundEdge:'#090807',
    surface:'#3A393C',text:'#F5EFE5',heading:'#F5EFE5',
    link:'#E2C39E',border:'#A9957B',button:'#323134',buttonText:'#F5EFE5',
    calendar:'#3A393C',calendarText:'#F5EFE5',selected:'#D1B692',selectedText:'#191410',
    icons:'#D1B692',navigation:'#E2C39E',cardBorder:'#68615A',mutedText:'#BDB8B1',
  },
};
