import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'귀가 · 03:17',description:'분명 문은 잠갔다. 정전된 집에서 시작되는 짧은 1인칭 심리 공포게임.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
