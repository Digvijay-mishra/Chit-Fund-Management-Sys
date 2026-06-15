import React, { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, Table, message, Space, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { printReceipt } from '../utils/printTemplates.js';
import { api } from '../api/client.js';

function payerOptions(memberId, members) {
  const m = members.find(x => x._id === memberId);
  if (!m) return [];
  const opts = [{ value: 'primary', label: `${m.primaryName} - ${m.phone || ''} - primary`, meta: { payerType: 'primary', payerName: m.primaryName, payerPhone: m.phone } }];
  (m.jointMembers || []).filter(j => !j.isDeleted).forEach(j => opts.push({ value: String(j._id), label: `${j.name} - ${j.phone || ''} - joint ₹${Number(j.shareAmount || 0).toLocaleString('en-IN')}`, meta: { payerType: 'joint', payerJointId: String(j._id), payerName: j.name, payerPhone: j.phone } }));
  return opts;
}

export default function Transactions() {
  const [rows, setRows] = useState([]), [groups, setGroups] = useState([]), [members, setMembers] = useState([]), [open, setOpen] = useState(false), [edit, setEdit] = useState(null), [selectedMember, setSelectedMember] = useState(null);
  const [form] = Form.useForm();
  const load = (q = '') => api.get('/transactions', { params: { q } }).then(r => setRows(r.data));
  useEffect(() => { load(); api.get('/groups').then(r => setGroups(r.data)); api.get('/members').then(r => setMembers(r.data)); }, []);
  const showAdd = () => { setEdit(null); setSelectedMember(null); form.resetFields(); form.setFieldsValue({ type: 'member_payment', method: 'cash', status: 'paid', paidDate: dayjs() }); setOpen(true); };
  const showEdit = (r) => { setEdit(r); const mid = r.member?._id || r.member; setSelectedMember(mid); form.setFieldsValue({ ...r, group: r.group?._id || r.group, member: mid, payerSelector: r.payerJointId || 'primary', dueDate: r.dueDate ? dayjs(r.dueDate) : null, paidDate: r.paidDate ? dayjs(r.paidDate) : null }); setOpen(true); };
  const makeBody = (v) => {
    const opts = payerOptions(v.member, members); const selected = opts.find(o => o.value === v.payerSelector)?.meta || {};
    return { ...v, ...selected, payerJointId: selected.payerJointId || '', dueDate: v.dueDate?.toISOString(), paidDate: v.paidDate?.toISOString() };
  };
  const save = async (v) => { const body = makeBody(v); if (edit) await api.put('/transactions/' + edit._id, body); else await api.post('/transactions', body); message.success(edit ? 'Transaction updated' : 'Transaction saved'); setOpen(false); load(); };
  const del = async (id) => { await api.delete('/transactions/' + id); message.success('Transaction removed'); load(); };
  const makePdf = (r) => printReceipt({ tx: r, member: r.member || {}, group: r.group || {}, company: { logoUrl: '/logo.png' } });
  const currentPayerOptions = payerOptions(selectedMember, members);

  return <>
    <div className="toolbar"><h2>Transactions & Receipts</h2><Input.Search placeholder="Search receipt / description / method / payer" onSearch={load} style={{ maxWidth: 430 }} /><Button type="primary" onClick={showAdd}>Add Transaction</Button></div>
    <Table className="softTable" rowKey="_id" dataSource={rows} columns={[
      { title: 'Date', dataIndex: 'paidDate', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '' },
      { title: 'Type', dataIndex: 'type' },
      { title: 'Group', render: (_, r) => r.group?.name },
      { title: 'Party / Ticket', render: (_, r) => r.member ? `${r.member.primaryName} (${r.member.ticketNumber})` : '' },
      { title: 'Paid By', render: (_, r) => r.payerName || r.member?.primaryName || '-' },
      { title: 'Amount', dataIndex: 'amount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') },
      { title: 'Method', dataIndex: 'method' },
      { title: 'Status', dataIndex: 'status' },
      { title: 'Receipt', dataIndex: 'receiptNo' },
      { title: 'Actions', render: (_, r) => <Space><Button onClick={() => makePdf(r)}>Preview/PDF</Button><Button onClick={() => showEdit(r)}>Edit</Button><Popconfirm title="Delete/cancel this transaction?" onConfirm={() => del(r._id)}><Button danger>Delete</Button></Popconfirm></Space> }
    ]} />
    <Modal title={edit ? 'Edit Transaction / Receipt Fields' : 'Add Transaction / Receipt Fields'} open={open} onCancel={() => setOpen(false)} footer={null} width={860} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={save}>
        <Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={['member_payment', 'winner_payout', 'commission', 'penalty', 'income', 'expense', 'payable', 'receivable'].map(x => ({ value: x, label: x }))} /></Form.Item>
        <div className="form-grid">
          <Form.Item name="group" label="Group"><Select allowClear showSearch optionFilterProp="label" options={groups.map(g => ({ value: g._id, label: g.name }))} /></Form.Item>
          <Form.Item name="member" label="Party Ticket"><Select allowClear showSearch optionFilterProp="label" onChange={(v) => { setSelectedMember(v); form.setFieldsValue({ payerSelector: 'primary' }); }} options={members.map(m => ({ value: m._id, label: `${m.primaryName} - ${m.phone} - Ticket ${m.ticketNumber}` }))} /></Form.Item>
          <Form.Item name="payerSelector" label="Actual Paid By"><Select allowClear options={currentPayerOptions} placeholder="Primary or joint member" /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="method" label="Payment By"><Select options={['Cash', 'Online', 'Cheque', 'Other'].map(x => ({ value: x.toLowerCase(), label: x }))} /></Form.Item>
          <Form.Item name="cycleMonth" label="Inst / Cycle No"><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="receiptNo" label="Receipt No"><Input placeholder="Auto/manual receipt number" /></Form.Item>
          <Form.Item name="status" label="Status"><Select options={['paid', 'pending', 'waived'].map(x => ({ value: x, label: x }))} /></Form.Item>
          <Form.Item name="dueDate" label="Due Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="paidDate" label="Receipt Date"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </div>
        <Form.Item name="notes" label="Editable Receipt Description"><Input.TextArea rows={4} placeholder="Whatever you write here will print exactly in receipt PDF" /></Form.Item>
        <Space><Button type="primary" htmlType="submit">Save Transaction</Button>{edit && <Button onClick={() => makePdf({ ...edit, ...makeBody(form.getFieldsValue()), member: members.find(m => m._id === form.getFieldValue('member')) || edit.member, group: groups.find(g => g._id === form.getFieldValue('group')) || edit.group })}>Preview PDF</Button>}</Space>
      </Form>
    </Modal>
  </>;
}
