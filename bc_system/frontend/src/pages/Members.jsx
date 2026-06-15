import React, { useEffect, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Table, Tag, message, Space, Popconfirm, DatePicker } from 'antd';
import { ChevronDown, ChevronRight, Edit, Trash2, Bell, Eye } from 'lucide-react';
import { api } from '../api/client.js';

const statusOptions = ['active', 'inactive', 'defaulter'].map(x => ({ value: x, label: x }));
const payStatusOptions = ['pending', 'paid', 'late'].map(x => ({ value: x, label: x }));
function activeJoints(r){return (r.jointMembers||[]).filter(j=>!j.isDeleted)}
function memberChildren(row) {
  const joints = activeJoints(row);
  const primaryShare = joints.length ? Math.max(Number(row.ticketAmount || 0) - joints.reduce((s, j) => s + Number(j.shareAmount || 0), 0), 0) : Number(row.ticketAmount||0);
  return [
    { key: row._id + '-primary', memberId: row._id, jointId: '', name: row.primaryName, phone: row.phone, email: row.email, shareAmount: primaryShare, paymentStatus: row.status === 'active' ? 'pending' : row.status, isPrimary: true, ticketNumber: row.ticketNumber, agentName: row.agentName },
    ...joints.map(j => ({ ...j, key: j._id, memberId: row._id, jointId: String(j._id), ticketNumber: row.ticketNumber, agentName: row.agentName }))
  ];
}
function DueTag({ status, amount, date, cycle }) {
  const color = status === 'overdue' ? 'red' : status === 'pending' ? 'orange' : 'green';
  const label = status === 'overdue' ? 'Overdue' : status === 'pending' ? 'Due' : 'Paid';
  return <Space direction="vertical" size={0}><Tag color={color}>{label}</Tag>{amount > 0 && <small>₹{Number(amount || 0).toLocaleString('en-IN')}{cycle ? ` • Cycle ${cycle}` : ''}</small>}{date && status !== 'paid' && <small>{new Date(date).toLocaleDateString('en-IN')}</small>}</Space>;
}
export default function Members() {
  const [rows, setRows] = useState([]), [groups, setGroups] = useState([]), [open, setOpen] = useState(false), [edit, setEdit] = useState(null), [notifyOpen,setNotifyOpen]=useState(false), [notifyTarget,setNotifyTarget]=useState(null);
  const [form] = Form.useForm(); const [notifyForm]=Form.useForm();
  const load = (q = '') => api.get('/members', { params: { q } }).then(r => setRows(r.data));
  useEffect(() => { load(); api.get('/groups').then(r => setGroups(r.data)); }, []);
  const showAdd = () => { setEdit(null); form.resetFields(); form.setFieldsValue({ status: 'active' }); setOpen(true); };
  const showEdit = (r) => { setEdit(r); form.setFieldsValue({ ...r, group: r.group?._id || r.group, jointMembers: activeJoints(r) }); setOpen(true); };
  const save = async (v) => { const body = { ...v, jointMembers: (v.jointMembers || []).filter(j => j?.name) }; if (edit) await api.put('/members/' + edit._id, body); else await api.post('/members', body); message.success(edit ? 'Party ticket updated' : 'Party ticket added'); setOpen(false); load(); };
  const del = async (id) => { await api.delete('/members/' + id); message.success('Party ticket removed'); load(); };
  const openNotify=(target,row)=>{setNotifyTarget(target); notifyForm.setFieldsValue({channel:'whatsapp',to:target.phone || target.email || '',subject:'BC payment reminder',body:`Dear ${target.name}, your BC installment for ticket ${row.ticketNumber} is pending. Please pay on time.`,status:'scheduled'}); setNotifyOpen(true)};
  const sendNotify=async(v)=>{await api.post('/messages',{...v, member:notifyTarget?.memberId, scheduledAt:v.scheduledAt?.toISOString()}); message.success('Notification saved / scheduled'); setNotifyOpen(false)};
  const childColumns=(row)=>[
    { title: 'Ticket No', dataIndex: 'ticketNumber' },{ title: 'Member Name', dataIndex: 'name' }, { title: 'Phone', dataIndex: 'phone' }, { title: 'Email', dataIndex: 'email' },
    { title: 'Share Amount', dataIndex: 'shareAmount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') },
    { title: 'Payment Status', dataIndex: 'paymentStatus', render: v => <Tag color={v === 'paid' || v === 'active' ? 'green' : v === 'late' ? 'red' : 'orange'}>{v}</Tag> },
    { title: 'Actions', render: (_,child) => <Space><Button size="small" icon={<Edit size={13}/>} onClick={() => showEdit(row)}>Edit</Button><Button size="small" icon={<Bell size={13}/>} onClick={()=>openNotify(child,row)}>Notify</Button><Button size="small" icon={<Eye size={13}/>} onClick={() => message.info('Open Transactions page and choose this member/payer')}>Transactions</Button></Space> }
  ];
  return <>
    <div className="toolbar"><h2>Member / Party Management</h2><Input.Search placeholder="Search name / phone / ticket / email / joint member / agent" onSearch={load} style={{ maxWidth: 560 }} /><Button type="primary" onClick={showAdd}>Add Party Ticket</Button></div>
    <Table className="softTable" rowKey="_id" dataSource={rows}
      expandable={{ expandIcon: ({ expanded, onExpand, record }) => memberChildren(record).length > 1 ? <Button type="text" size="small" icon={expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />} onClick={e => onExpand(record, e)} /> : null, expandedRowRender: (r) => <Table pagination={false} size="small" rowKey="key" dataSource={memberChildren(r)} columns={childColumns(r)} /> }}
      columns={[
        { title: 'Ticket No', dataIndex: 'ticketNumber' },{ title: 'Party / Member', render: (_, r) => <b>{activeJoints(r).length ? `${r.primaryName} + ${activeJoints(r).length} joint` : r.primaryName}</b> },{ title: 'Phone', dataIndex: 'phone' },
        { title: 'Ticket Amount', dataIndex: 'ticketAmount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') },{ title: 'Group', render: (_, r) => r.group?.name },{ title: 'Agent', render:(_,r)=> r.agentName || '-' },
        { title: 'Due', render: (_, r) => <DueTag status={r.dueStatus} amount={r.dueAmount || 0} date={r.dueDate} cycle={r.currentCycle} /> },
        { title: 'Status', render: (_, r) => <Tag color={r.status === 'active' ? 'green' : r.status === 'defaulter' ? 'red' : 'orange'}>{r.status}</Tag> },
        { title: 'Joint Members / Shares', render: (_, r) => activeJoints(r).length ? <span className="jointHint">Click arrow to view: {activeJoints(r).map(x => `${x.name} ₹${Number(x.shareAmount || 0).toLocaleString('en-IN')} (${x.paymentStatus})`).join(', ')}</span> : '-' },
        { title: 'Actions', render: (_, r) => <Space><Button icon={<Edit size={14} />} onClick={() => showEdit(r)}>Edit</Button><Button icon={<Bell size={14}/>} onClick={()=>openNotify(memberChildren(r)[0],r)}>Notify</Button><Popconfirm title="Delete this party ticket?" onConfirm={() => del(r._id)}><Button danger icon={<Trash2 size={14} />}>Delete</Button></Popconfirm></Space> }
      ]} />
    <Modal title={edit ? 'Edit Single / Joint Party Ticket' : 'Add Single / Joint Party Ticket'} open={open} onCancel={() => setOpen(false)} footer={null} width={1060} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={save} initialValues={{ status: 'active' }}>
        <div className="form-grid"><Form.Item name="group" label="Group" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={groups.map(g => ({ value: g._id, label: g.name }))} /></Form.Item><Form.Item name="primaryName" label="Primary Member Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="phone" label="Primary Phone" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="email" label="Primary Email"><Input /></Form.Item><Form.Item name="ticketNumber" label="Custom Ticket Number"><Input placeholder="1 / 2 / BC-001" /></Form.Item><Form.Item name="ticketAmount" label="Total Ticket Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name="status" label="Status"><Select options={statusOptions} /></Form.Item></div>
        <h3>Agent Details</h3><div className="form-grid"><Form.Item name="agentName" label="Agent Name"><Input /></Form.Item><Form.Item name="agentCode" label="Agent Code"><Input /></Form.Item><Form.Item name="agentPhone" label="Agent Phone"><Input /></Form.Item><Form.Item name="agentAddress" label="Agent Address"><Input /></Form.Item></div>
        <Form.Item name="address" label="Address"><Input.TextArea /></Form.Item><h3>Joint Members under same Ticket</h3>
        <Form.List name="jointMembers">{(fields, { add, remove }) => <>{fields.map(({ key, name, ...rest }) => <div className="jointEditor" key={key}><div className="form-grid"><Form.Item {...rest} name={[name, '_id']} hidden><Input /></Form.Item><Form.Item {...rest} name={[name, 'name']} label="Joint Name"><Input /></Form.Item><Form.Item {...rest} name={[name, 'phone']} label="Phone"><Input /></Form.Item><Form.Item {...rest} name={[name, 'email']} label="Email"><Input /></Form.Item><Form.Item {...rest} name={[name, 'shareAmount']} label="Share Amount"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item {...rest} name={[name, 'paymentStatus']} label="Payment Status"><Select options={payStatusOptions} /></Form.Item></div><Button danger size="small" onClick={() => remove(name)}>Remove Joint Member</Button></div>)}<Button onClick={() => add({ paymentStatus: 'pending' })}>+ Add Joint Member</Button></>}</Form.List>
        <Form.Item name="notes" label="Notes"><Input.TextArea /></Form.Item><Button type="primary" htmlType="submit">Save</Button>
      </Form>
    </Modal>
    <Modal title={`Send Notification ${notifyTarget?.name ? 'to '+notifyTarget.name : ''}`} open={notifyOpen} onCancel={()=>setNotifyOpen(false)} footer={null} destroyOnClose>
      <Form form={notifyForm} layout="vertical" onFinish={sendNotify}><Form.Item name="channel" label="Channel"><Select options={['sms','whatsapp','email'].map(x=>({value:x,label:x}))}/></Form.Item><Form.Item name="to" label="To"><Input /></Form.Item><Form.Item name="subject" label="Subject"><Input /></Form.Item><Form.Item name="scheduledAt" label="Schedule Date/Time"><DatePicker showTime style={{width:'100%'}}/></Form.Item><Form.Item name="body" label="Custom Message"><Input.TextArea rows={5}/></Form.Item><Button type="primary" htmlType="submit">Save / Schedule Notification</Button></Form>
    </Modal>
  </>;
}
