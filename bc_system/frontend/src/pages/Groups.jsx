import React, { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag, message, Card, Statistic, Popconfirm, Space } from 'antd';
import { Eye, ArrowLeft, FileText, Users, Edit, Trash2, Trophy, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import dayjs from 'dayjs';
import { api } from '../api/client.js';
import { printLedger, printStatement, printBCChart } from '../utils/printTemplates.js';

const company = { logoUrl: '/logo.png' };

function childRows(m) {
  const joints = (m.jointMembers || []).filter(j => !j.isDeleted);
  const dueMap = m.childDueMap || {};
  const primaryDue = dueMap.primary || {};
  if (!joints.length) return [{ key: 'primary', name: m.primaryName, phone: m.phone, email: m.email, shareAmount: m.ticketAmount, paymentStatus: m.dueStatus || m.status, dueStatus: m.dueStatus, dueAmount: m.dueAmount, dueDate: m.dueDate, currentCycle: m.currentCycle, isPrimary: true }];
  return [
    { key: 'primary', name: m.primaryName, phone: m.phone, email: m.email, shareAmount: Math.max(Number(m.ticketAmount || 0) - joints.reduce((s, j) => s + Number(j.shareAmount || 0), 0), 0), paymentStatus: primaryDue.dueStatus || 'paid', dueStatus: primaryDue.dueStatus || 'paid', dueAmount: primaryDue.dueAmount || 0, dueDate: primaryDue.dueDate, currentCycle: primaryDue.cycleMonth, isPrimary: true },
    ...joints.map(j => { const d = dueMap[String(j._id)] || {}; return ({ ...j, key: j._id, paymentStatus: d.dueStatus || j.paymentStatus || 'paid', dueStatus: d.dueStatus || j.paymentStatus || 'paid', dueAmount: d.dueAmount || 0, dueDate: d.dueDate, currentCycle: d.cycleMonth }); })
  ];
}
function DueTag({ status, amount, date, cycle }) {
  const color = status === 'overdue' ? 'red' : status === 'pending' ? 'orange' : 'green';
  const label = status === 'overdue' ? 'Overdue' : status === 'pending' ? 'Due' : 'Paid';
  return <Space direction="vertical" size={0}><Tag color={color}>{label}</Tag>{amount > 0 && <small>₹{Number(amount || 0).toLocaleString('en-IN')}{cycle ? ` • Cycle ${cycle}` : ''}</small>}{date && status !== 'paid' && <small>{new Date(date).toLocaleDateString('en-IN')}</small>}</Space>;
}

function MemberInside({ memberDetail, back }) {
  const { member, transactions } = memberDetail;
  return <>
    <div className="toolbar"><Button icon={<ArrowLeft size={16} />} onClick={back}>Back</Button><h2>{member.primaryName} - Ticket {member.ticketNumber}</h2><Button icon={<FileText size={16} />} onClick={() => printStatement({ company, member, transactions })}>Download Party Statement PDF</Button></div>
    <div className="memberHero glass"><div><h2>{member.primaryName}</h2><p>{member.phone} | {member.email || '-'}</p><p>Group: {member.group?.name} | Ticket Amount: ₹{Number(member.ticketAmount || 0).toLocaleString('en-IN')}</p></div><Tag color="green">{member.status}</Tag></div>
    <Table className="softTable" rowKey="_id" dataSource={transactions} columns={[
      { title: 'Date', dataIndex: 'paidDate', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '' },
      { title: 'Payer', render: (_, r) => r.payerName || member.primaryName },
      { title: 'Type', dataIndex: 'type' },
      { title: 'Amount', dataIndex: 'amount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') },
      { title: 'Method', dataIndex: 'method' },
      { title: 'Description', dataIndex: 'notes' }
    ]} />
  </>;
}

export default function Groups() {
  const [rows, setRows] = useState([]), [q, setQ] = useState(''), [open, setOpen] = useState(false), [edit, setEdit] = useState(null), [detail, setDetail] = useState(null), [memberDetail, setMemberDetail] = useState(null), [winnerOpen, setWinnerOpen] = useState(false), [memberOpen, setMemberOpen] = useState(false), [memberEdit, setMemberEdit] = useState(null);
  const [form] = Form.useForm(); const [winnerForm] = Form.useForm(); const [memberForm] = Form.useForm();
  const load = (search = q) => api.get('/groups', { params: { q: search } }).then(r => setRows(r.data));
  const openGroup = async (id) => { const { data } = await api.get('/groups/' + id); setDetail(data); setMemberDetail(null); };
  useEffect(() => { load(); }, []);
  const startCreate = () => { setEdit(null); form.resetFields(); form.setFieldsValue({ status: 'active', commissionType: 'percentage', commissionValue: 5, ticketPrefix: 'BC', ticketStartNumber: 1, ticketPadding: 3 }); setOpen(true); };
  const startEdit = (r) => { setEdit(r); form.setFieldsValue({ ...r, startDate: r.startDate ? dayjs(r.startDate) : null }); setOpen(true); };
  const save = async (v) => { const body = { ...v, startDate: v.startDate?.toISOString() }; if (edit) await api.put('/groups/' + edit._id, body); else await api.post('/groups', body); message.success(edit ? 'Group updated' : 'Group created'); setOpen(false); await load(); if (detail?.group?._id === edit?._id) openGroup(edit._id); };
  const del = async (id) => { await api.delete('/groups/' + id); message.success('Group deleted'); load(); setDetail(null); };
  const delMember = async (id) => { await api.delete('/members/' + id); message.success('Party ticket removed'); openGroup(detail.group._id); };
  const addMemberInGroup = () => { setMemberEdit(null); memberForm.resetFields(); memberForm.setFieldsValue({ group: detail.group._id, status: 'active', ticketAmount: detail.group.monthlyContribution }); setMemberOpen(true); };
  const editMemberInGroup = (m) => { setMemberEdit(m); memberForm.setFieldsValue({ ...m, group: m.group?._id || m.group || detail.group._id, jointMembers: (m.jointMembers || []).filter(j => !j.isDeleted) }); setMemberOpen(true); };
  const saveMemberInGroup = async (v) => { const body = { ...v, group: detail.group._id, jointMembers: (v.jointMembers || []).filter(j => j?.name) }; if (memberEdit) await api.put('/members/' + memberEdit._id, body); else await api.post('/members', body); message.success(memberEdit ? 'Member updated' : 'Member added'); setMemberOpen(false); await openGroup(detail.group._id); };
  const submitWinner = async (v) => { const mem = detail.members.find(m => m._id === v.winnerMemberId); await api.post('/groups/' + detail.group._id + '/winner', { ...v, winnerTicket: mem?.ticketNumber }); message.success('Cycle / auction winner saved'); setWinnerOpen(false); openGroup(detail.group._id); };

  if (memberDetail) return <MemberInside memberDetail={memberDetail} back={() => setMemberDetail(null)} />;

  if (detail) {
    const { group, members, transactions } = detail;
    const completed = (group.cycles || []).filter(c => c.status === 'completed').length;
    return <>
      <div className="toolbar groupDetailToolbar"><Button icon={<ArrowLeft size={16} />} onClick={() => setDetail(null)}>Back</Button><h2>{group.name} - Group Detail</h2><Button icon={<FileText size={16} />} onClick={() => printLedger({ company, group, members })}>Group Ledger PDF</Button><Button type="primary" icon={<Plus size={16} />} onClick={addMemberInGroup}>Add Member</Button><Button icon={<Trophy size={16} />} onClick={() => setWinnerOpen(true)}>Add Cycle / Auction Winner</Button><Button onClick={() => printBCChart({ company, plans: group.installmentPlans || [] })}>BC Chart PDF</Button><Button icon={<Edit size={15} />} onClick={() => startEdit(group)}>Edit Group</Button><Popconfirm title="Delete this group?" onConfirm={() => del(group._id)}><Button danger icon={<Trash2 size={15} />}>Delete</Button></Popconfirm></div>
      <div className="grid"><Card className="glass"><Statistic title="Total Amount" prefix="₹" value={group.totalAmount} /></Card><Card className="glass"><Statistic title="Tickets / Limit" value={`${members.length}/${group.memberLimit}`} /></Card><Card className="glass"><Statistic title="Monthly" prefix="₹" value={group.monthlyContribution} /></Card><Card className="glass"><Statistic title="Cycles Completed" value={`${completed}/${group.durationMonths}`} /></Card></div>
      <h3 className="sectionTitle"><Users size={18} /> Members in this Group</h3>
      <Table className="softTable" rowKey="_id" dataSource={members}
        expandable={{
          expandIcon: ({ expanded, onExpand, record }) => childRows(record).length > 1 ? <Button type="text" size="small" icon={expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />} onClick={e => onExpand(record, e)} /> : null,
          expandedRowRender: (m) => <Table pagination={false} size="small" rowKey="key" dataSource={childRows(m)} columns={[
            { title: 'Member Name', dataIndex: 'name' }, { title: 'Phone', dataIndex: 'phone' }, { title: 'Email', dataIndex: 'email' },
            { title: 'Share Amount', dataIndex: 'shareAmount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') },
            { title: 'Due', render: (_, r) => <DueTag status={r.dueStatus || r.paymentStatus} amount={r.dueAmount || 0} date={r.dueDate} cycle={r.currentCycle} /> },
            { title: 'Actions', render: () => <Space><Button type="link" onClick={async () => { const { data } = await api.get('/members/' + m._id); setMemberDetail(data); }}>View Transactions</Button><Button type="link" onClick={() => editMemberInGroup(m)}>Edit</Button></Space> }
          ]} />
        }}
        columns={[
          { title: 'Ticket No', dataIndex: 'ticketNumber' }, { title: 'Party / Member', render: (_, r) => <b>{r.primaryName}</b> }, { title: 'Phone', dataIndex: 'phone' },
          { title: 'Agent', render:(_,r)=>r.agentName || '-' },
          { title: 'Ticket Amount', dataIndex: 'ticketAmount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') },
          { title: 'Joint Members', render: (_, r) => (r.jointMembers || []).filter(j => !j.isDeleted).length ? `${(r.jointMembers || []).filter(j => !j.isDeleted).length} joint member(s) - click arrow` : '-' },
          { title: 'Due', render: (_, r) => <DueTag status={r.dueStatus} amount={r.dueAmount || 0} date={r.dueDate} cycle={r.currentCycle} /> },
          { title: 'Status', render: (_, r) => <Tag color={r.status === 'active' ? 'green' : r.status === 'defaulter' ? 'red' : 'orange'}>{r.status}</Tag> },
          { title: 'Open', render: (_, r) => <Space><Button type="link" onClick={async () => { const { data } = await api.get('/members/' + r._id); setMemberDetail(data); }}>View Transactions</Button><Button type="link" onClick={() => editMemberInGroup(r)}>Edit</Button><Popconfirm title="Delete party ticket?" onConfirm={() => delMember(r._id)}><Button type="link" danger>Delete</Button></Popconfirm></Space> }
        ]} />
      <h3 className="sectionTitle"><Trophy size={18} /> Cycle / Auction Overview</h3>
      <Table className="softTable" size="small" rowKey="monthNo" dataSource={group.cycles || []} columns={[
        { title: 'Cycle', dataIndex: 'monthNo' }, { title: 'Due Date', dataIndex: 'dueDate', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '-' },
        { title: 'Winner Ticket', dataIndex: 'winnerTicket' }, { title: 'Winner', render: (_, r) => r.winnerMember?.primaryName || '-' },
        { title: 'Winner Amount', dataIndex: 'winnerAmount', render: v => v ? '₹' + Number(v).toLocaleString('en-IN') : '-' },
        { title: 'Commission', dataIndex: 'commission', render: v => v ? '₹' + Number(v).toLocaleString('en-IN') : '-' },
        { title: 'Status', dataIndex: 'status', render: v => <Tag color={v === 'completed' ? 'green' : 'orange'}>{v}</Tag> }
      ]} />
      <h3 className="sectionTitle">Recent Group Transactions</h3>
      <Table className="softTable" size="small" rowKey="_id" dataSource={transactions} columns={[{ title: 'Date', dataIndex: 'paidDate', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '' }, { title: 'Payer', render: (_, r) => r.payerName || r.member?.primaryName || '-' }, { title: 'Type', dataIndex: 'type' }, { title: 'Amount', dataIndex: 'amount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') }, { title: 'Description', dataIndex: 'notes' }]} />
      <WinnerModal open={winnerOpen} onCancel={() => setWinnerOpen(false)} form={winnerForm} members={members} cycles={group.cycles || []} onFinish={submitWinner} />
      <GroupModal open={open} onCancel={() => setOpen(false)} form={form} onFinish={save} edit={edit} />
      <GroupMemberModal open={memberOpen} onCancel={() => setMemberOpen(false)} form={memberForm} onFinish={saveMemberInGroup} edit={memberEdit} group={group} />
    </>;
  }

  return <>
    <div className="toolbar"><h2>Group Management</h2><Input.Search placeholder="Search group name" value={q} onChange={e => setQ(e.target.value)} onSearch={load} style={{ maxWidth: 360 }} /><Button type="primary" onClick={startCreate}>Create Group</Button></div>
    <Table className="softTable" rowKey="_id" dataSource={rows} columns={[
      { title: 'Name', dataIndex: 'name' }, { title: 'Total', dataIndex: 'totalAmount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') }, { title: 'Monthly', dataIndex: 'monthlyContribution', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') }, { title: 'Months', dataIndex: 'durationMonths' }, { title: 'Status', render: (_, r) => <Tag color="blue">{r.status}</Tag> }, { title: 'Ticket Format', render: (_, r) => `${r.ticketPrefix}-${String(r.ticketStartNumber).padStart(r.ticketPadding, '0')}` },
      { title: 'Actions', render: (_, r) => <Space><Button type="primary" icon={<Eye size={15} />} onClick={() => openGroup(r._id)}>Open Group</Button><Button onClick={() => startEdit(r)}>Edit</Button><Popconfirm title="Delete group?" onConfirm={() => del(r._id)}><Button danger>Delete</Button></Popconfirm></Space> }
    ]} />
    <GroupModal open={open} onCancel={() => setOpen(false)} form={form} onFinish={save} edit={edit} />
  </>;
}


function GroupMemberModal({ open, onCancel, form, onFinish, edit, group }) {
  const statusOptions = ['active', 'inactive', 'defaulter'].map(x => ({ value: x, label: x }));
  const payStatusOptions = ['pending', 'paid', 'late'].map(x => ({ value: x, label: x }));
  return <Modal title={edit ? 'Edit Member in Group' : 'Add Member in Group'} open={open} onCancel={onCancel} footer={null} width={1060} destroyOnClose>
    <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ status: 'active' }}>
      <div className="form-grid">
        <Form.Item name="group" hidden><Input /></Form.Item><Form.Item label="Group"><Input disabled value={group?.name} /></Form.Item>
        <Form.Item name="primaryName" label="Primary Member Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="phone" label="Primary Phone" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="Primary Email"><Input /></Form.Item>
        <Form.Item name="ticketNumber" label="Custom Ticket Number"><Input placeholder="1 / 2 / BC-001" /></Form.Item>
        <Form.Item name="ticketAmount" label="Total Ticket Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="status" label="Status"><Select options={statusOptions} /></Form.Item>
      </div>
      <h3>Agent Details</h3>
      <div className="form-grid"><Form.Item name="agentName" label="Agent Name"><Input /></Form.Item><Form.Item name="agentCode" label="Agent Code"><Input /></Form.Item><Form.Item name="agentPhone" label="Agent Phone"><Input /></Form.Item><Form.Item name="agentAddress" label="Agent Address"><Input /></Form.Item></div>
      <Form.Item name="address" label="Address"><Input.TextArea /></Form.Item>
      <h3>Joint Members under same Ticket</h3>
      <Form.List name="jointMembers">{(fields, { add, remove }) => <>{fields.map(({ key, name, ...rest }) => <div className="jointEditor" key={key}><div className="form-grid"><Form.Item {...rest} name={[name, '_id']} hidden><Input /></Form.Item><Form.Item {...rest} name={[name, 'name']} label="Joint Name"><Input /></Form.Item><Form.Item {...rest} name={[name, 'phone']} label="Phone"><Input /></Form.Item><Form.Item {...rest} name={[name, 'email']} label="Email"><Input /></Form.Item><Form.Item {...rest} name={[name, 'shareAmount']} label="Share Amount"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item {...rest} name={[name, 'paymentStatus']} label="Payment Status"><Select options={payStatusOptions} /></Form.Item></div><Button danger size="small" onClick={() => remove(name)}>Remove Joint Member</Button></div>)}<Button onClick={() => add({ paymentStatus: 'pending' })}>+ Add Joint Member</Button></>}</Form.List>
      <Form.Item name="notes" label="Notes"><Input.TextArea /></Form.Item>
      <Button type="primary" htmlType="submit">Save Member</Button>
    </Form>
  </Modal>;
}

function WinnerModal({ open, onCancel, form, members, cycles, onFinish }) {
  return <Modal title="Add Cycle / Auction Winner" open={open} onCancel={onCancel} footer={null} destroyOnClose><Form form={form} layout="vertical" onFinish={onFinish}>
    <Form.Item name="monthNo" label="Cycle / Month No" rules={[{ required: true }]}><Select options={cycles.map(c => ({ value: c.monthNo, label: `Cycle ${c.monthNo} - ${c.status}` }))} /></Form.Item>
    <Form.Item name="winnerMemberId" label="Winner Member / Ticket" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={members.map(m => ({ value: m._id, label: `${m.ticketNumber} - ${m.primaryName}` }))} /></Form.Item>
    <Button type="primary" htmlType="submit">Save Winner</Button>
  </Form></Modal>;
}

function GroupModal({ open, onCancel, form, onFinish, edit }) {
  const setDefaultPlans = () => form.setFieldsValue({ installmentPlans: [
    { monthFrom:1, monthTo:1, amount:104000, note:'25 lakh default, 1st month' },
    { monthFrom:2, monthTo:2, amount:100000, note:'25 lakh default, 2nd month' },
    { monthFrom:3, monthTo:9, amount:77000, note:'25 lakh default, 3rd to 9th month' },
    { monthFrom:10, monthTo:16, amount:85800, note:'25 lakh default, 10th to 16th month upper default' },
    { monthFrom:17, monthTo:21, amount:91100, note:'25 lakh default, 17th to 21st month upper default' },
    { monthFrom:22, monthTo:25, amount:100000, note:'25 lakh default, 22nd to 25th month upper default' }
  ]});
  return <Modal title={edit ? 'Edit Group' : 'Create Group'} open={open} onCancel={onCancel} footer={null} width={950} destroyOnClose><Form form={form} layout="vertical" onFinish={onFinish}>
    <div className="form-grid"><Form.Item name="name" label="Group Name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="totalAmount" label="Total Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name="monthlyContribution" label="Monthly Contribution" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name="durationMonths" label="Duration Months" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name="startDate" label="Start Date" rules={[{ required: true }]}><DatePicker style={{ width: '100%' }} /></Form.Item><Form.Item name="memberLimit" label="Member/Ticket Limit" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name="status" label="Status"><Select options={['pending', 'active', 'completed'].map(x => ({ value: x, label: x }))} /></Form.Item></div>
    <h3>Ticket Number Customization</h3><div className="form-grid"><Form.Item name="ticketPrefix" label="Ticket Prefix"><Input placeholder="BC / G1" /></Form.Item><Form.Item name="ticketStartNumber" label="Start Number"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name="ticketPadding" label="Padding"><InputNumber style={{ width: '100%' }} /></Form.Item></div>
    <h3>Monthly Installment / BC Chart Amounts <Button size="small" onClick={setDefaultPlans}>Use Default From Provided Image</Button></h3>
    <Form.List name="installmentPlans">{(fields,{add,remove})=><>{fields.map(({key,name,...rest})=><div className="jointEditor" key={key}><div className="form-grid"><Form.Item {...rest} name={[name,'monthFrom']} label="From Month"><InputNumber style={{width:'100%'}}/></Form.Item><Form.Item {...rest} name={[name,'monthTo']} label="To Month"><InputNumber style={{width:'100%'}}/></Form.Item><Form.Item {...rest} name={[name,'amount']} label="Amount to Add"><InputNumber style={{width:'100%'}}/></Form.Item><Form.Item {...rest} name={[name,'note']} label="Note"><Input/></Form.Item></div><Button danger size="small" onClick={()=>remove(name)}>Remove</Button></div>)}<Button onClick={()=>add()}>+ Add Month Rule</Button></>}</Form.List>
    <h3>Commission & Penalty</h3><div className="form-grid"><Form.Item name="commissionType" label="Commission Type"><Select options={['fixed', 'percentage'].map(x => ({ value: x, label: x }))} /></Form.Item><Form.Item name="commissionValue" label="Commission Value"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name={['penalty', 'graceDays']} label="Grace Days"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name={['penalty', 'type']} label="Penalty Type"><Select options={['fixed', 'percentage'].map(x => ({ value: x, label: x }))} /></Form.Item><Form.Item name={['penalty', 'value']} label="Penalty Value"><InputNumber style={{ width: '100%' }} /></Form.Item><Form.Item name={['penalty', 'frequency']} label="Frequency"><Select options={['per_day', 'per_month'].map(x => ({ value: x, label: x }))} /></Form.Item></div>
    <Button type="primary" htmlType="submit">Save Group</Button>
  </Form></Modal>;
}
