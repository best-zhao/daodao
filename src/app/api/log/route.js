import redis from '@/app/api/redis'
import { randomUUID } from 'crypto'
import { getSession } from '@auth0/nextjs-auth0';

const getLogs = async ()=>{
  const { user } = await getSession()
  const log_key = `log-${user?.sub}`
  return await redis.get(log_key) || []
}

export async function GET() {
  const data = await getLogs()
  return Response.json({ data })
}

export async function POST(req) {
  const { user } = await getSession()
  const data = await req.json()
  if( !user ) {
    return Response.json({ errno: 401 })
  }
  const log_key = `log-${user.sub}`
  const logs = await getLogs()
  if( data.id ){
    const log = logs.find(o=>o.id==data.id)
    if( !log ){
      return Response.json({ errno: 404 })
    }
    Object.assign(log, {
      ...data,
      updated_at: new Date(),
    })
  }else{
    logs.push({
      ...data,
      id: randomUUID(),    
      created_at: new Date()
    })
  }  
  await redis.set(log_key, logs, {EX:10*365*24*60*60})
  return Response.json({ info: data.id? 'Log Updated' : 'Log Added' })
}

export async function DELETE(req){
  const { user } = await getSession()
  const data = await req.json()
  if( !user ) {
    return Response.json({ errno: 401 })
  }
  const logs = await getLogs()
  const logIndex = logs.findIndex(o=>o.id==data.id)
  const log_key = `log-${user.sub}`
  if( logIndex>=0 ){
    logs.splice(logIndex, 1)
    await redis.set(log_key, logs, {EX:10*365*24*60*60})
    return Response.json({ data: 'Log Deleted' })
  }else{
    return Response.json({ errno: 404 })
  }  
}