const camelizeRE = /-(\w)/g
export const camelize = str => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
}

const hyphenateRE = /\B([A-Z])/g
export const hyphenate = str => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
}

export function getInitialProps (propsList, currProps) {
  const res = {}
  propsList.forEach(key => {
    res[key] = currProps[key] || undefined
  })
  return res
}

export function injectHook (options, key, hook) {
  options[key] = [].concat(options[key] || [])
  options[key].unshift(hook)
}

export function callHooks (vm, hook) {
  if (vm) {
    const hooks = vm.$options[hook] || []
    hooks.forEach(hook => {
      hook.call(vm)
    })
  }
}

export function createCustomEvent (name, args) {
  return new CustomEvent(name, {
    bubbles: false,
    cancelable: false,
    detail: args
  })
}

export function isIgnoredAttribute (attr) {
  return ['class', 'style', 'id', 'key', 'ref', 'slot', 'slot-scope', 'is'].indexOf(
    attr
  ) !== -1
}

const isBoolean = val => /function Boolean/.test(String(val))
const isNumber = val => /function Number/.test(String(val))

export function convertAttributeValue (value, name, { type } = {}) {
  if (isBoolean(type)) {
    if (value === 'true' || value === 'false') {
      return value === 'true'
    }
    if (value === '' || value === name) {
      return true
    }
    return value != null
  } else if (isNumber(type)) {
    const parsed = parseFloat(value, 10)
    return isNaN(parsed) ? value : parsed
  } else {
    return value
  }
}

export function toVNodes (h, children) {
  const res = []
  for (let i = 0, l = children.length; i < l; i++) {
    res.push(toVNode(h, children[i]))
  }
  return res
}

function toVNode (h, node) {
  if (node.nodeType === 3) {
    return node.data.trim() ? node.data : null
  } else if (node.nodeType === 1) {
    const slotName = node.getAttribute('slot')
    return h('slot', slotName ? {
      slot: slotName,
      attrs: { name: slotName }
    } : null)
  } else {
    return null
  }
}

export function getNodeAttributes (node, ignoreAttributes, ignoreReserved) {
  const res = {}
  for (let i = 0, l = node.attributes.length; i < l; i++) {
    const attr = node.attributes[i]
    const name = attr.name || attr.nodeName
    const value = attr.value || attr.nodeValue

    if (
      (ignoreAttributes && ignoreAttributes.indexOf(name) !== -1) &&
      (ignoreReserved && isIgnoredAttribute(name))
    ) {
      continue
    }

    res[name] = value
  }
  return res
}
