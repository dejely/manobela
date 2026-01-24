import 'react-native';
import '@react-navigation/native';

declare module '@react-navigation/native' {
  export type ThemeColors = {
    destructive: string;
  };

  export interface Theme {
    colors: DefaultTheme['colors'] & ThemeColors;
  }
}
