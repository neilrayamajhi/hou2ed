import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

if (Platform.OS === 'web') {
  const WebPlaceholder = () => {
    return null;
  };
  registerRootComponent(WebPlaceholder);
} else {
  // Lazy require App only on native to avoid web bundling native-only deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const App = require('./App').default;
  registerRootComponent(App);
}
