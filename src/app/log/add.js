'use client'
import React, { useEffect } from 'react'
import { Form, DatePicker, Select, InputNumber, Button } from 'antd'
import dayjs from 'dayjs'

const today = dayjs()

export default function Page() {
  const [ form ] = Form.useForm()
  const { types, update } = React.useLog()
  const { fn: addLog } = React.useLogAddLazy()

  useEffect(()=>{
    update({form})
  }, [form])

  return (
    <div className="log-page">      
      <Form
        layout='inline'
        form={form}
        onFinish={()=>addLog(form.getFieldsValue(true))}
      >
        <Form.Item name="type" initialValue={1}>
          <Select 
            options={types}
          />
        </Form.Item>
        <Form.Item name="date" initialValue={today}>
          <DatePicker />
        </Form.Item>
        <Form.Item name="v1">
          <InputNumber placeholder='距离/个数' />
        </Form.Item>
        <Form.Item name="v2">
          <InputNumber placeholder='时长(min)' />
        </Form.Item>
        <Form.Item name="v3">
          <InputNumber placeholder='其他' />
        </Form.Item>
        <Form.Item shouldUpdate noStyle>
          {({getFieldValue})=>(
            <Button type="primary" htmlType="submit">
              {getFieldValue('id')?'Update':'Submit'}
            </Button>
          )}
        </Form.Item>
      </Form>
    </div>
  );
}
