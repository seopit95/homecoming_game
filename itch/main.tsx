import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import '../app/title-screen.css';
import '../app/investigation-notebook.css';
import '../app/game-theme.css';
import '../app/ending-screen.css';
import '../app/game-hud.css';
import '../app/pause-menu.css';
import '../app/mission-note.css';

createRoot(document.getElementById('root')!).render(<Home/>);
