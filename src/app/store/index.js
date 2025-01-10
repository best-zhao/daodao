'use client'
import { addStore, storeConfig } from './reducer'


import log from './log'


const items = [
  log,  
]

items.map(item => {
  addStore(item)
})
