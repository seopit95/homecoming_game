// Plain data stays independent of scene builders and their surveillance imports.
export const apartmentEscapeLayout={
 annex:{x:6,z:9,name:'1F · 공동현관',exit:'관리사무소 연결문',rooms:['우편함','경비실','단지 안내도','관리사무소'],patrol:[{x:0,z:6},{x:-3.5,z:4},{x:-3.5,z:0},{x:0,z:-6}]},
 archive:{x:4.5,z:7,name:'1F · 관리문서 보관실',exit:'지하 비상계단',rooms:['사고기록','통화기록','입차기록','CCTV'],patrol:[{x:0,z:4},{x:0,z:1},{x:0,z:-3},{x:0,z:-5.5}]},
 plant:{x:3,z:8,name:'1F → B1 · 비상계단',exit:'B1 지하주차장',rooms:['1층 계단참','중간 계단참','지하 계단참','주차장 연결문'],patrol:[{x:0,z:5},{x:-1.35,z:4},{x:-1.35,z:-1},{x:1.35,z:-1},{x:1.35,z:-6.5},{x:0,z:-7}]},
} as const;
