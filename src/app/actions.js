'use server'
 
export async function addLog(data) {
  console.log('action addLog:', data)
  const res = await fetch('http://localhost:3600/api/log', {
    method: 'POST',
    body: JSON.stringify(data)
  }).then(res=>res.json())
  console.log('action addLog res:', res)
  return res
}