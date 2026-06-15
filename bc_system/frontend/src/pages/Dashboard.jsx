import React,{useEffect,useState} from 'react';
import { Card, Statistic } from 'antd';
import { api } from '../api/client.js';
export default function Dashboard(){const [d,setD]=useState({}); useEffect(()=>{api.get('/finance/dashboard').then(r=>setD(r.data)).catch(()=>{})},[]); return <><h2>Main Dashboard</h2><div className="grid"><Card><Statistic title="Total Income / Collections" value={d.income||0} prefix="₹"/></Card><Card><Statistic title="Expenses / Winner Payouts" value={d.expense||0} prefix="₹"/></Card><Card><Statistic title="Net Profit" value={d.profit||0} prefix="₹"/></Card><Card><Statistic title="Pending Amount" value={d.pending||0} prefix="₹"/></Card></div><p className="muted">Use Groups, Members, Transactions and Reports tabs for searchable operational data.</p></>}
