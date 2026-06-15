import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Statistic, message, Table, Space, Popconfirm } from 'antd';
import { api } from '../api/client.js';

export default function Finance() {
  const [d, setD] = useState({ entries: [] }), [open, setOpen] = useState(false), [edit, setEdit] = useState(null);
  const [form] = Form.useForm();
  const load = () => api.get('/finance/dashboard').then(r => setD(r.data));
  useEffect(() => { load(); }, []);
  const showAdd = () => { setEdit(null); form.resetFields(); form.setFieldsValue({ type: 'income', status: 'paid' }); setOpen(true); };
  const showEdit = (r) => { setEdit(r); form.setFieldsValue(r); setOpen(true); };
  const save = async (v) => { if (edit) await api.put('/transactions/' + edit._id, v); else await api.post('/finance/entry', v); message.success(edit ? 'Finance entry updated' : 'Finance entry saved'); setOpen(false); load(); };
  const del = async (id) => { await api.delete('/transactions/' + id); message.success('Finance entry removed'); load(); };
  return <>
    <div className="toolbar"><h2>Personal & Business Finance</h2><Button type="primary" onClick={showAdd}>Add Income / Expense</Button></div>
    <div className="grid"><Card className="glass"><Statistic title="Income" value={d.income || 0} prefix="₹" /></Card><Card className="glass"><Statistic title="Expense" value={d.expense || 0} prefix="₹" /></Card><Card className="glass"><Statistic title="Profit / Loss" value={d.profit || 0} prefix="₹" /></Card><Card className="glass"><Statistic title="Pending" value={d.pending || 0} prefix="₹" /></Card></div>
    <h3 className="sectionTitle">Finance Entries</h3>
    <Table className="softTable" rowKey="_id" dataSource={d.entries || []} columns={[
      { title: 'Date', dataIndex: 'createdAt', render: v => v ? new Date(v).toLocaleDateString('en-IN') : '' }, { title: 'Type', dataIndex: 'type' }, { title: 'Category', dataIndex: 'category' }, { title: 'Status', dataIndex: 'status' }, { title: 'Amount', dataIndex: 'amount', render: v => '₹' + Number(v || 0).toLocaleString('en-IN') }, { title: 'Notes', dataIndex: 'notes' },
      { title: 'Actions', render: (_, r) => <Space><Button onClick={() => showEdit(r)}>Edit</Button><Popconfirm title="Delete this entry?" onConfirm={() => del(r._id)}><Button danger>Delete</Button></Popconfirm></Space> }
    ]} />
    <Modal title={edit ? 'Edit Finance Entry' : 'Finance Entry'} open={open} onCancel={() => setOpen(false)} footer={null} destroyOnClose><Form form={form} layout="vertical" onFinish={save}>
      <Form.Item name="type" label="Type" rules={[{ required: true }]}><Select options={['income', 'expense', 'payable', 'receivable'].map(x => ({ value: x, label: x }))} /></Form.Item>
      <Form.Item name="category" label="Category"><Input placeholder="Personal, business, rent, salary, operation etc" /></Form.Item>
      <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
      <Form.Item name="status" label="Status"><Select options={['paid', 'pending'].map(x => ({ value: x, label: x }))} /></Form.Item>
      <Form.Item name="notes" label="Notes"><Input.TextArea /></Form.Item>
      <Button type="primary" htmlType="submit">Save</Button>
    </Form></Modal>
  </>;
}
