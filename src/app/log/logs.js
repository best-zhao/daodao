'use client'
import React from 'react'
import { Table, Space } from 'antd'
import dayjs from 'dayjs'

export default function Logs() {
  React.useStore('log')

  const form = React.useLog('form')
  const { logs, loading } = React.useLogItems()
  const { fn: delLog } = React.useLogDelLazy() 

  return (
    <div className="logs">
      <Table 
        style={{background: 'none'}}
        dataSource={logs}
        loading={loading}
        columns={[
          { title: 'Date', dataIndex: 'date' },
          { title: 'Distance', dataIndex: 'v1' },
          { title: 'Time', dataIndex: 'v2' },
          { title: 'Other', dataIndex: 'v3' },
          { render: (item)=>(
            <Space>
              <a onClick={()=>{
                form.setFieldsValue({
                  ...item,
                  date: dayjs(item.date)
                })
              }}>Edit</a>
              <a onClick={()=>delLog(item)}>Delete</a>
            </Space>
          )}
        ]}
      />
      
    </div>
  );
}
