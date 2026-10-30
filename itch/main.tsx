import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import '../app/globals.css';
import '../app/title-screen.css';
import '../app/investigation-notebook.css';
import '../app/game-theme.css';
import '../app/ending-screen.css';

createRoot(document.getElementById('root')!).render(<Home/>);
