import type {Metadata} from 'next';
import './styles.css';
export const metadata:Metadata={title:'SurakshaAI · Safety companion',description:'Private alerts, journey check-ins and explainable route conditions.',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
