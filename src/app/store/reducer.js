/**
 * hooks store (namespace & Finer particle size control)
 * 
 * step1: init once - React.useStore('user')
 * step2: use in compoent - const info = React.useUser('info')
 * step3: update state - React.updateUser({info: {}})
 */
import React, { useState, useEffect, createContext, useContext, useMemo } from 'react'

const gconfig = {}
const namespaces = {}
const models = {}
const destroy_timer = {}
const storeInstanceContexts = {}

export const storeConfig = (conf)=>{
  Object.assign(gconfig, conf)
}

export const addStore = (item)=>{
  models[item.name] = {
    ...item,
    init_pos: [],
  }
} 

export const initStore = (name, defaultState)=>{  
  const { state={}, services={}, instance, utils={} } = models[name] || {name}
  if( !name || (namespaces[name]&&!instance) ) return 
  const { id: instanceId, _instance_id } = defaultState || {}
  const namespace = name
  const default_state = {...state}
  let model = namespaces[name] = namespaces[name] || {
    state: default_state,
    default_state,
    hooks: {},
    utils,
    services,
    service_hooks: {},
    methods: [],
    instances: {}
  }
  if( instance ){
    if( instanceId ){
      model = model.instances[instanceId] = model.instances[instanceId] || {
        id: instanceId,
        default_state: {...default_state},
        state: {...default_state, ...defaultState},
        hooks: {},
        methods: [],
        service_hooks: {},
      }
    }  
  }

  const { loadStore } = gconfig.events || {}
  loadStore && loadStore({name, defaultState, instanceId, model})
  
  // !model.is_init && console.log('init store', name, defaultState)
  model.is_init = true
  
  const _name = name.replace(/^\w/, a=>a.toUpperCase())
  const hookKey = 'use'+_name
  const updateKey = 'update'+_name

  const getHooKey = (name, type='use')=>{
    const _name = name.replace(/^\w/, a=>a.toUpperCase())
    return type+_name
  }

  const useInstance = (name=namespace)=>{    
    // let _model = model
    const instance_id = useContext(storeInstanceContexts[name])
    // model.instances = model.instances || {}
    // _model = model.instances[instance_id] = model.instances[instance_id] || {
    //   id: instance_id,
    //   state: {...default_state},
    //   hooks: {},
    // }  
    return { model: namespaces[name].instances[instance_id]||model, instance_id }
  }
  
  function _useUpdate(data, ns=model){
    if( !data ){      
      return (data, opts)=>{
        const { scope, shouldUpdate } = opts || {}
        if( scope=='all' ){//update all instances
          const { instances } = namespaces[name]
          Object.keys(instances).map(id=>{
            const res = typeof shouldUpdate=='function' ? shouldUpdate(instances[id]?.state) : true
            res && _useUpdate(data||{}, instances[id])
          })
          return
        }
        _useUpdate(data||{}, ns)
      }
    }

    if( typeof data=='function' ){
      data = data(ns.state)
    }
    ns.state = {
      ...ns.state,
      ...data,
    }
    
    try{
      Object.keys(data).map(k=>{        
        if( typeof data[k]=='function' ) {
          return
        }
        const v = ns.state[k]
        const hooks = ns.hooks[k] || []
        hooks.map(o=>o[1]&&o[1](v))
      })

      
      if( instance && namespaces[name].instances ){//update parent model hooks       
        Object.keys(data).map(k=>{        
          if( typeof data[k]=='function' ) {
            return
          }
          // const v = {}
          // const hooks = namespaces[name].hooks[k] || []
          // Object.keys(namespaces[name].instances).map(id=>{
          //   v[id] = namespaces[name].instances[id].state[k]
          // })
          // hooks.map(o=>o[1]&&o[1](v))          
          updateAllInstancesToParent(name, k)
        })
      }
    }catch(e){
      console.error('reducer err:', e)
    }
  }

  function useKeys(keys=[], default_value, _model=model){ 
    const _key = keys
    const single = typeof _key=='string'
    keys = single ? [_key] : keys
    const states = {     
      ..._model.state,
      ...utils,
    }    
    for( let i in utils ){
      states[i] = (...args)=>{
        return utils[i].apply(null, [...args, {
          get: (type)=>React.getStore(type, namespace)
        }])
      }
    }
    const _hooks = {}    

    const useWatchKey = (key)=>{ 
      let _hook
      let watch_vals = [0]
      let watch_props = {}
      const isWatchkey = typeof default_state[key]=='function' && !models[name].temp

      if( isWatchkey ){
        const depend_hooks = []
        watch_props = {
          get: (type)=>{
            const { name, key } = parsePath(type, namespace)
            depend_hooks.push({name, key})
            if( _model.id && name==namespace ){
              return namespaces[name].instances[_model.id].state[key]
            }
            return namespaces[name].state[key]//React[getHooKey(name)](key)           
          }
        }        
        const val = default_state[key](watch_props)
        // call depend hooks
        watch_vals = depend_hooks.map(({name, key})=>React[getHooKey(name)](key))

        // _hook =  useState(val) 
        default_value = val          

      }else{
        default_value = single && default_value!==undefined ? default_value : _model.state[key]
        // if( typeof defaultValue=='function' ){//if state is function, will not add to hooks
        //   _hook = [defaultValue]
        // }else{
        //   _hook =  useState(defaultValue)   
        // }       
         
        if( instance && _model.instances ){//get all intances state          
          default_value = {}
          Object.keys(_model.instances).map(id=>{
            default_value[id] = _model.instances[id].state[key]
          })            
        }
        if( key=='$instanceId' && _model.id ) {
          default_value = _model.id
        }
      }
      _hook =  useState(typeof default_value!='function' && default_value)
      
      useEffect(()=>{ 
        if( !isWatchkey ) return;    
        const val = default_state[key](watch_props)
        _useUpdate({
          [key]: val
        }, _model)
      }, watch_vals)

      if( !isWatchkey && typeof default_value=='function' ){
        return [default_value]
      }      
      return _hook
    }

    const useKey = key=>{      
      _model.hooks[key] = _model.hooks[key] || []     
      const state = _hooks[key] = useWatchKey(key)
      states[key] = state[0]

      const hook_id = [key, Math.ceil(Math.random()*1e+10)].join('-')
      const [ hookId ] = useState(hook_id)
      if( hookId==hook_id ){
        _model.hooks[key].push(state)
      }     
    }

    keys.map(useKey)

    //auto remove hooks
    useEffect(()=>{ 
      return ()=>{
        Object.keys(_hooks).map(k=>{
          const i = _model.hooks[k].indexOf(_hooks[k])
          i>=0 && _model.hooks[k].splice(i, 1)
        })        
      }
    }, [])

    return single ? states[_key] : {
      ...states,
      update: (data)=>_useUpdate(data, _model),
      get: (type)=>{
        if( type.split('/').length==1 && _model.id ){
          type = [namespace, _model.id, type].join('/')
        }
        return React.getStore(type, namespace)
      },
    }
  }  

  if( instance && _instance_id ){
    React[hookKey] = function useKeysFn(keys, default_value){
      const {model} = useInstance()
      return useKeys(keys, default_value, model)
    }
    React[updateKey] = function useUpdateFn(data){      
      let {model} = useInstance()      
      return _useUpdate(data, model)
    }
    !model.methods.includes(hookKey) && model.methods.push(hookKey)
    !model.methods.includes(updateKey) && model.methods.push(updateKey)
  }else if( instance && !instanceId ){//watch all instances
    React[hookKey+'All'] = useKeys
    !model.methods.includes(hookKey+'All') && model.methods.push(hookKey+'All')
    return
  }else{
    React[hookKey] = useKeys
    React[updateKey] =  _useUpdate    
    !model.methods.includes(hookKey) && model.methods.push(hookKey)
    !model.methods.includes(updateKey) && model.methods.push(updateKey)
  }

  Object.keys(services).map(key=>{   
    const k = key.replace(/^\w/, a=>a.toUpperCase())    
    const fetchKey = 'use'+_name+k
    const fetchLazyKey = 'use'+_name+k+'Lazy'    

    const useServiceFn = function(params, opts){
      const { depends=[], refetchInterval, refetchOnFocus, key: _key=key } = Object.assign({}, gconfig, opts)
      const watch_vals = depends ? depends.map(type=>{
        const { name, key } = parsePath(type, namespace)
        return React[getHooKey(name)](key)    
      }) : []      

      const { init=true, model: _model=model, loading: need_loading=true, callback } = opts || {}
      const [ _state ] = useState({})
      const [ loading, setLoading ] = useState() 
      const [ data, setData ] = useState(_model.state) 
      const [ error, setError ] = useState()     
      const hooks = model.service_hooks[key] = model.service_hooks[key] || []   
      const self_service = [name, key].join('/')   

      const fn = async (d, serviceOpts)=>{
        const { quiet, service_key=key, name: _name=name, instance=_model.id, need_loading: _need_loading, is_call } = serviceOpts || {}
        const curr_service = [_name, service_key].join('/')
        let _model_ = namespaces[_name]
        let is_instance_service
        if( instance && _model_.instances && _model_.instances[instance] ){
          _model_ = _model_.instances[instance]
          is_instance_service = true
        }
        const { services } = namespaces[_name] 
        const service_fn = services[service_key]
        const payload = {        
          ...d
        }
        const needLoading = _need_loading!=undefined ? _need_loading : need_loading       
        
        let response
        let is_update   

        const updateLoading = loading=>{        
          setLoading(loading)
          _useUpdate({
            [`${_key}Loading`]: loading
          }, is_instance_service ? _model_ : _model)
        }     
        
        const { beforeFetch } = gconfig.events || {}
        const _payload = beforeFetch ? beforeFetch({
          service: service_key,
          name: _name,
          data: payload,
          get: React.getStore
        }) : payload

        const res = await service_fn({
          data: _payload,   
          instance_id: instance,       
          options: {
            ...opts,
          },
          updateLoading,
          fetch: async (url, options={})=>{
            let cache_key
            let cache_data
            const { cache, data: body, method='get', rawResponse, headers={}, ...opts } = options
            if( cache && gconfig.cache ){
              const input = [service_key, url, JSON.stringify(body||{})].join('/')
              cache_key = [_name, fnv1aHash(input)].join('-')
              cache_data = await gconfig.cache.get({cache_key, payload: _payload})
            }

            if( cache_data==undefined ){
              _state.has_fetch = true
              !quiet && needLoading && updateLoading(true)             

              const fetchOptions = { method: method.toUpperCase(), headers, ...opts }
              if( body ){
                if( ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method) && !(body instanceof FormData) ){
                  fetchOptions.body = JSON.stringify(body)
                  fetchOptions.headers['content-type'] = 'application/json'
                }else{
                  fetchOptions.body = body
                }               
              }              
              let _res = {}             
              let data = await fetch(url, fetchOptions)
              .then(res=>{               
                _res.response = res                
                if( rawResponse ){
                  return res
                }
                const contentType = res.headers.get('content-type') || '';                
                if (contentType.includes('application/json')) {
                  return res.json();
                } else if (contentType.includes('multipart/form-data')) {
                  return res.formData();
                } else if (contentType.includes('image/') || contentType.includes('application/octet-stream')) {
                  return res.blob();
                } else {
                  return res.text(); 
                }
              })
              .catch(error=>({
                errno: -1,
                info: error.message
              }))  
              
              if( !_res.response?.ok ){
                data = data || {} //data maybe =''
                data.errno = data.errno || _res.response.status
                data.info =  data.info || data.err_msg || data.message || _res.response.statusText
              }

              response = data               
                  
              if( !quiet ){
                // needLoading && updateLoading(false)
                setError(data.errno ? {
                  not_found: _res.response?.status==404,
                  errno: data.errno,
                  info: data.info,
                } : null)
              }

              if( !data.errno && cache_key ){
                try{
                  gconfig.cache.set({cache_key, response, age: cache.age, payload: _payload})
                }catch(e){}
              }             

            }else{
              response = cache_data
            }
            
            return response
          },
          get: (type)=>{    
            const arr = type.split('/') 
            const is_curr_ns = arr.length==1 || arr[0]==_name
            const default_instance = is_curr_ns && models[_name].instance && instance 
            const new_type = arr.length>1 ? type : [_name, default_instance, type].filter(n=>n).join('/')
            return React.getStore(new_type, _name)
          },
          update: (values)=>{
            // if( !React[updateKey] ) return;
            _useUpdate(values, _model_)

            const hooks = _model_.service_hooks[service_key] || []

            for( let k in values){//Reverse Update: if state if updated, internal hook in service will be updated too.
              _model_.hooks[k] = _model_.hooks[k] || []
              !_model_.hooks[k].includes(setData) && _model_.hooks[k].push([data,setData])
            }

            _state.key = Date.now()     
            _state.res = response

            hooks.map(update=>{              
              if( update===setData ){
                update(prevValues=>({...prevValues,...values}))      
              }else{// use call
                update(prevValues=>({...prevValues, ..._state, ...values}))  
              }                     
            })
            is_update = true
          },
          // call current namespace: call('items')
          // call other namespace: call('label/customLabels')
          call: async (type, data, opt)=>{
            const { name, instance, key } = parsePath(type, _name)
            if( !models[name] ) return;
            if( !namespaces[name] ) initStore(name)
            let { quiet=true } = opt || {}
            if( _need_loading!=undefined ){//if fn(data, {need_loading: false}), force set quiet=true
              quiet = !_need_loading
            }
            // console.log('call service:', _name, _key, data, name, key)
            return await fn(data, {
              quiet,
              name,
              instance,
              service_key: key,
              is_call: true, //prevent callback repeat called    
            })
          }
        })  
        
        !quiet && !is_call && callback && callback((is_instance_service ? _model_ : _model).state, response, res)

        if( !is_update && res && curr_service==self_service ) {
          setData({data: res})
        }

        _state.has_fetch && curr_service==self_service && !quiet && needLoading && updateLoading(false) //after update

        return res!=undefined ? res : response
      } 

      useEffect(()=>{
        if( !init ) return;        
        if( watch_vals.findIndex(v=>!v)>=0 ) return //not ready depend
        
        _state.params = params
        hooks.push(setData)

        fn(params)
        
        if( refetchInterval ){
          _state._refetch_timer = setInterval(()=>{
            _state.is_focus && fn(params)
          }, refetchInterval)
        }
        
        return ()=>{
          const i = hooks.indexOf(setData)          
          i>=0 && hooks.splice(i, 1)

          if( _state._refetch_timer ){
            clearInterval(_state._refetch_timer)
            delete _state._refetch_timer
          }          
        }        
      }, [...watch_vals, JSON.stringify(params)])

      useEffect(()=>{        
        const handleFocus = ()=>{
          _state.is_focus = true
          if( !refetchOnFocus ) return;
          fn(_state.params)
        }

        const handleBlur = ()=>{
          delete _state.is_focus
        }

        window.addEventListener('focus', handleFocus)
        window.addEventListener('blur', handleBlur)

        return ()=>{
          window.removeEventListener('focus', handleFocus)
          window.removeEventListener('blur', handleBlur)
        }
      }, [])

      const res = {        
        ..._state, 
        ...data,     
        ..._model.state,  
        loading,        
        error,
        fn
      }
      return res
    }

    React[fetchKey] = useServiceFn    

    if( instance && _instance_id ){
      React[fetchKey] = function useFetchfn(params, opts){
        const {model} = useInstance()
        return useServiceFn(params, {...opts, model})
      }      
    }
    !model.methods.includes(fetchKey) && model.methods.push(fetchKey)

    const LazyFetch = function(opts){
      return useServiceFn(null, {...opts, init: false})
    }
    React[fetchLazyKey] = LazyFetch

    if( instance && _instance_id ){
      React[fetchLazyKey] = function useLazyFetchfn(opts){
        const {model} = useInstance()
        return useServiceFn(null, {...opts, init: false, model})
      }
    }
    !model.methods.includes(fetchLazyKey) && model.methods.push(fetchLazyKey)
  })

  return { type: instance && instanceId ? 'add_instance' : 'add_store' }
}

const parsePath = (type, default_name)=>{
  const keys = type.split('/')
  let _name = default_name
  let _key = type
  let _instance
  if( keys.length>2 ) {// name/instance/key
    _name = keys[0]
    _instance = keys[1]
    _key = keys[2]
  }else if( keys.length>1 ){// name/key
    _name = keys[0]
    _key = keys[1]
  }
  return {
    name: _name,
    key: _key,
    instance: _instance
  }
}

const updateAllInstancesToParent = (name, key)=>{//update all instances to parent store 
  if( !models[name].init_pos.length ) return  
  const { instances, hooks } = namespaces[name]  

  const updateKey = (k)=>{
    const v = {}      
    Object.keys(instances).map(id=>{
      v[id] = instances[id].state[k]
    });
    (hooks[k]||[]).map(o=>o[1]&&o[1](v))
  }

  if( key ){
    updateKey(key)
  }else{
    Object.keys(hooks).map(updateKey)
  }  
}

const destroyStore = (name, instanceId)=>{
  if( !namespaces[name] ) return;  
  const { methods, instances } = namespaces[name]
  if( models[name].instance && !instanceId && Object.keys(instances).length ) return
  if( instanceId && Object.keys(instances).length ){
    delete instances[instanceId]  

    console.log('destroy instance', name, instanceId)

    if( Object.keys(instances).length || models[name].init_pos.length ){
      updateAllInstancesToParent(name)
      return
    }
  }
  methods.map(key=>{
    delete React[key]
  })
  delete namespaces[name]
  delete storeInstanceContexts[name]

  for( let i in models[name] ){
    if( i.indexOf('init_instance_pos')==0 ) delete models[name][i]
  }

  if( models[name]?.temp ) delete models[name]

  console.log('destroy store', name)
}

function fnv1aHash(str) {
  var hash = BigInt("0xcbf29ce484222325"); // FNV-1a 64-bit hash offset basis
  const FNV_64_PRIME = BigInt("0x100000001b3");

  for (var i = 0; i < str.length; i++) {
      hash ^= BigInt(str.charCodeAt(i));
      hash *= FNV_64_PRIME;
  }
  return hash.toString(16).padStart(16, '0').slice(-16); 
}

React.useStore = (name, default_state)=>{
  const names = typeof name=='string' ? [name] : name
  const actions = []
  const { id: instanceId, instance } = default_state || {}
  const init_store = ()=>{      
    names.map(n=>{
      if( !models[n] ){
        addStore({
          name: n,
          temp: true,
          instance,
          state: instance ? {} : default_state
        })
      }  
      const res = initStore(n, default_state)
      res?.type && actions.push(res)

      const { onLoad } = models[n].events || {}
      const model = namespaces[n]

      if( onLoad ){ 
        const isServer = typeof location=='undefined'
        if( isServer || model.prev_page!==location.href ){                   
          const loadData = onLoad({
            state: model.state,             
            get: (type)=>React.getStore(type, n)
          })
          const { url } = loadData || {}
          model.prev_page = typeof url!='undefined' ? url : (!isServer && location.href)
        }
      }      
    })  
  }
  init_store()  

  useEffect(()=>{   
    const posKey = instanceId ? `init_instance_pos_${instanceId}`: 'init_pos'
    const nameKey = instanceId ? [name, instanceId].join('-') : name

    names.map(n=>{
      const pos = models[n][posKey] = models[n][posKey] || []
      pos.push(pos.length)
    })
    
    destroy_timer[nameKey] = clearTimeout(destroy_timer[nameKey])

    if( instanceId && actions.find(o=>o.type=='add_instance') ){
      updateAllInstancesToParent(name)
    }

    return ()=>{
      destroy_timer[nameKey] = setTimeout(()=>{
        names.map(n=>{         
          const pos = models[n][posKey] = models[n][posKey] || []
          pos.pop()
          
          if( !models[n]?.global && !pos.length ) {
            destroyStore(n, instanceId) 
          }       
        })
      }, 50)
    }
  }, [instanceId])
  
  useEffect(()=>{
    if( typeof name=='string' && default_state && !models[name].instance ){
      if( JSON.stringify(models[name].state)===JSON.stringify(default_state) ){// not update
        return
      }
      const updateKey = 'update'+name.replace(/^\w/, a=>a.toUpperCase())
      React[updateKey](default_state)
    }       
  }, [JSON.stringify(default_state)])  

  /**
   * create instance StoreProvider
   * const { GraphStore } = React.useStore('graph', {id: '<id>'})
   */
  const instanceProviders = {}
  names.map(n=>{
    if( models[n].instance && instanceId ){
      instanceProviders[n.replace(/^\w/, a=>a.toUpperCase())+'Store'] = useMemo(() => (props) => (
        <StoreProvider {...props} id={instanceId} store={n} values={default_state}/>
      ), [])      
    }
  })  
  return instanceProviders
}

React.getStore = (type, default_name) => {
  const { name, instance, key } = parsePath(type, default_name)
  const { state={}, instances } = namespaces[name] || {}

  const showState = (state={}, key)=>{
    const callFn = (d)=>typeof d=='function' ? d({get: (type)=>React.getStore(type, name)}) : d

    if( key=='*' ){
      const data = {...state}  
      for( let i in data ){
        data[i] = callFn(data[i])        
      }
      return data
    }else if(key=='$instanceId') {
      return instance
    }else{
      return callFn(state[key])
    }   
  }

  if( instance && models[name]?.instance && instances ){    
    return showState(instances[instance]?.state, key)
  }
  return showState(state, key)
}

export const StoreProvider = ({  
  id,
  store,
  children,
  values,
  parent,
})=>{
  if( store ){
    if( !models[store] ){
      addStore({
        ...models[parent],
        name: store,
        temp: true,
        instance: true,       
      })
    }  
    storeInstanceContexts[store] = storeInstanceContexts[store] || createContext(null)    
  } 
  React.useStore(store, {...values, id, _instance_id: id} )
  const StoreContext = storeInstanceContexts[store]

  if( !id ) return null

  return (
    <StoreContext.Provider value={id} key={id}>
      {children}
    </StoreContext.Provider>
  )
}

export default namespaces

if( typeof window!='undefined' ){
  window.__APP_STORE__ = {
    react: React,
    getState: React.getStore,
  }
  if( process.env.NODE_ENV=='development' ){
    Object.assign(window.__APP_STORE__, {
      namespaces,
      models
    })
  }
}