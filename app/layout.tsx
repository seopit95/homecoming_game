import type {Metadata} from 'next';
import './globals.css';
import './title-screen.css';
import './investigation-notebook.css';
import './game-theme.css';
import './ending-screen.css';
import './game-hud.css';
import './pause-menu.css';
import './mission-note.css';
import visualPreloads from '../lib/visual-preloads.json';
export const metadata:Metadata={title:'Homecoming · 03:17',icons:{icon:'/favicon.svg'},description:'Three days after a drunk-driving hit-and-run, the spirit that followed you home returns. A first-person horror game in an aging high-rise.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{visualPreloads.map(href=><link key={href} rel="preload" as="fetch" href={href} crossOrigin="anonymous" fetchPriority="low"/>)}{children}</body></html>;}
