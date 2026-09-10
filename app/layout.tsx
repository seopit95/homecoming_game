import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'귀가 · 03:17',description:'28층 집에서 시작된 밤. 멈춘 엘리베이터와 반복되는 계단을 지나 탈출하는 1인칭 심리 공포게임.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
