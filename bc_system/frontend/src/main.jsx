import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Layout, Menu, Button, message } from 'antd';
import { BarChart3, Users, Landmark, Receipt, MessageSquare, FileText, Wallet } from 'lucide-react';
import 'antd/dist/reset.css';
import './styles.css';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Groups from './pages/Groups.jsx';
import Members from './pages/Members.jsx';
import Transactions from './pages/Transactions.jsx';
import Finance from './pages/Finance.jsx';
import Messages from './pages/Messages.jsx';
import Reports from './pages/Reports.jsx';
const { Header, Sider, Content } = Layout;
const pages={dashboard:<Dashboard/>,groups:<Groups/>,members:<Members/>,transactions:<Transactions/>,finance:<Finance/>,messages:<Messages/>,reports:<Reports/>};
function App(){ const [token,setToken]=useState(localStorage.getItem('token')); const [page,setPage]=useState('dashboard'); if(!token) return <Login onLogin={(t)=>{localStorage.setItem('token',t);setToken(t)}}/>; return <Layout className="app"><Sider breakpoint="lg" collapsedWidth="0"><div className="logo">BC Manager</div><Menu theme="dark" selectedKeys={[page]} onClick={e=>setPage(e.key)} items={[{key:'dashboard',icon:<BarChart3/>,label:'Dashboard'},{key:'groups',icon:<Landmark/>,label:'Groups'},{key:'members',icon:<Users/>,label:'Members'},{key:'transactions',icon:<Receipt/>,label:'Transactions'},{key:'finance',icon:<Wallet/>,label:'Finance'},{key:'messages',icon:<MessageSquare/>,label:'Messages'},{key:'reports',icon:<FileText/>,label:'Reports'}]}/></Sider><Layout><Header className="top"><b>BC / Chit Fund Management System</b><Button onClick={()=>{localStorage.clear();location.reload()}}>Logout</Button></Header><Content className="content">{pages[page]}</Content></Layout></Layout> }
createRoot(document.getElementById('root')).render(<App/>);
