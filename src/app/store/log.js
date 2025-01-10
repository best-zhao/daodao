

export default {
  name: 'log',   
  state: {
    logs: [],
    types: [
      { label: '跑步', value: 1 },
      { label: '俯卧撑', value: 2 },
      { label: '深蹲', value: 3 },
      { label: '引体向上', value: 4 },
      { label: '抬腿', value: 5 },
    ]
  },
  services: {
    add: async({fetch, data, call})=>{
      const res = await fetch('/api/log', {
        method: 'POST',
        data
      })
      call('items')
      return res
    },
    items: async({fetch, update, })=>{
      const res = await fetch('/api/log')
      update({
        logs: res.data||[]
      })
    },
    del: async({fetch, data, call})=>{
      const res = await fetch('/api/log', {
        method: 'DELETE',
        data: {id: data.id}
      })
      call('items')
      return res
    },
  }
}