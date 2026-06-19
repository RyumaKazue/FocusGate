import inlineCss from '../../../dist/focusgate/index.css?inline';
import { initAppWithShadow } from '@extension/shared';
import App from '@src/matches/focusgate/App';

initAppWithShadow({ id: 'focusgate-overlay', app: <App />, inlineCss });
