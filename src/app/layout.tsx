import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'CrowdPlay Moderation',description:'Your AI co-moderator for a safer Twitch community.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
