import type {ThemeConfig} from '../../src/lib/theme-contracts';

export const iluteguDemoTheme:ThemeConfig={
  brandDisplay:'logo',font:'modern',headingFont:'editorial',
  light:{
    background:'#F8F6F2',surface:'#FFFDFA',text:'#453C35',heading:'#332B25',
    link:'#805039',border:'#958477',button:'#FFFDFA',buttonText:'#453C35',
    calendar:'#FFFDFA',calendarText:'#453C35',selected:'#493A31',selectedText:'#FFFFFF',
    icons:'#985B40',navigation:'#654939',cardBorder:'#E4DCD2',mutedText:'#786A5F',
  },
  dark:{
    background:'#1C1B19',surface:'#26231F',text:'#E8E2D9',heading:'#F5EFE5',
    link:'#D9B897',border:'#9E9080',button:'#26231F',buttonText:'#E8E2D9',
    calendar:'#26231F',calendarText:'#E8E2D9',selected:'#D9C2A6',selectedText:'#29241E',
    icons:'#D2A783',navigation:'#D9C2A6',cardBorder:'#484037',mutedText:'#BDB4A7',
  },
};
