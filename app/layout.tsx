import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'귀가 · 03:17',description:'비 내리는 시라사기 하이츠. 훼손된 원혼과 멈춘 엘리베이터, 반복되는 계단을 마주하는 일본 아파트 배경의 1인칭 공포게임.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
