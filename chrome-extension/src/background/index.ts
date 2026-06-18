import 'webextension-polyfill';
import { registerNavigation } from './navigation.js';

registerNavigation();

console.log('[FocusGate] background loaded');
