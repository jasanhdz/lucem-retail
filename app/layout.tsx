import './globals.css';
import '@fontsource-variable/inter';
import '@fontsource-variable/plus-jakarta-sans';
import type { Metadata } from 'next';
export const metadata: Metadata={title:'Lucem Retail',description:'Operacion retail para American Outfit'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es"><body>{children}</body></html>}
