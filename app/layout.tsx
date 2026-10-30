import type {Metadata} from 'next';
import './globals.css';
import './title-screen.css';
import './investigation-notebook.css';
import './game-theme.css';
import './ending-screen.css';
import './game-hud.css';
import './pause-menu.css';
import visualPreloads from '../lib/visual-preloads.json';
export const metadata:Metadata={title:'귀가 · 03:17',icons:{icon:'/favicon.svg'},description:'음주운전 뺑소니 사고 사흘 뒤, 함께 귀가한 원혼이 찾아온다. 오래된 고층 아파트에서 펼쳐지는 1인칭 공포게임.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{visualPreloads.map(href=><link key={href} rel="preload" as="fetch" href={href} crossOrigin="anonymous" fetchPriority="low"/>)}{children}</body></html>;}
