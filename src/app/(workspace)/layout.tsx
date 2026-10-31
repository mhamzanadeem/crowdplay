import {Shell,WorkspaceProvider} from '@/components/workspace';
export default function Layout({children}:{children:React.ReactNode}){return <WorkspaceProvider><Shell>{children}</Shell></WorkspaceProvider>}
