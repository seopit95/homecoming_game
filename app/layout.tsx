import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'귀가 · 03:17',description:'음주운전 뺑소니 사고 사흘 뒤, 함께 귀가한 원혼이 찾아온다. 일본의 고층 아파트에서 펼쳐지는 1인칭 공포게임.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>;}
