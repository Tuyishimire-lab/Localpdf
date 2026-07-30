'use client';
import dynamic from 'next/dynamic';
const RepairTool = dynamic(() => import('../../components/tools/RepairTool'), { ssr: false, loading: () => <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}><div className="modal-spinner"></div></div> });
export default function ClientPage() { return <RepairTool />; }
