import {
  toVNodes,
  camelize,
  hyphenate,
  callHooks,
  injectHook,
  getInitialProps,
  createCustomEvent,
  convertAttributeValue,
  getNodeAttributes,
  isIgnoredAttribute
} from './utils.js'

export default function wrap (Vue, Component, delegatesFocus) {
  const isAsync = typeof Component === 'function' && !Component.cid
  let isInitialized = false
  let hyphenatedPropsList
  let camelizedPropsList
  let camelizedPropsMap

  function initialize (Component) {
    if (isInitialized) return

    const options = typeof Component === 'function'
      ? Component.options
      : Component

    // extract props info
    const propsList = Array.isArray(options.props)
      ? options.props
      : Object.keys(options.props || {})
    hyphenatedPropsList = propsList.map(hyphenate)
    camelizedPropsList = propsList.map(camelize)
    const originalPropsAsObject = Array.isArray(options.props) ? {} : options.props || {}
    camelizedPropsMap = camelizedPropsList.reduce((map, key, i) => {
      map[key] = originalPropsAsObject[propsList[i]]
      return map
    }, {})

    // proxy $emit to native DOM events
    injectHook(options, 'beforeCreate', function () {
      const emit = this.$emit
      this.$emit = (name, ...args) => {
        this.$root.$options.customElement.dispatchEvent(createCustomEvent(name, args))
        return emit.call(this, name, ...args)
      }
    })

    injectHook(options, 'created', function () {
      // sync default props values to wrapper on created
      camelizedPropsList.forEach(key => {
        this.$root.props[key] = this[key]
      })
    })

    // proxy props as Element properties
    camelizedPropsList.forEach(key => {
      Object.defineProperty(CustomElement.prototype, key, {
        get () {
          return this._wrapper.props[key]
        },
        set (newVal) {
          this._wrapper.props[key] = newVal
        },
        enumerable: false,
        configurable: true
      })
    })

    isInitialized = true
  }

  function syncProperty (el, key, syncJsProp) {
    const camelized = camelize(key)
    let value = el.hasAttribute(key) ? el.getAttribute(key) : undefined

    if (syncJsProp) {
      value = el[key] !== undefined ? el[key] : value
    }

    el._wrapper.props[camelized] = convertAttributeValue(
      value,
      key,
      camelizedPropsMap[camelized]
    )
  }

  function syncAttribute (el, key) {
    if (isIgnoredAttribute(key) || hyphenatedPropsList.indexOf(key) !== -1) {
      return
    }

    const value = el.hasAttribute(key) ? el.getAttribute(key) : undefined
    const wrapper = el._wrapper
    wrapper._update(Object.assign({}, wrapper._vnode, {
      data: Object.assign({}, wrapper._vnode.data, {
        attrs: Object.assign(
          {},
          wrapper._vnode.data.attrs,
          { [key]: value }
        )
      })
    }), false)
  }

  class CustomElement extends HTMLElement {
    constructor () {
      const self = super()
      self.attachShadow({ mode: 'open', delegatesFocus: delegatesFocus })

      self.hasAttribute('keep-alive')

      const wrapper = this._createWrapper()

      // Use MutationObserver to react to future attribute & slot content change
      const observer = new MutationObserver(mutations => {
        if (!this._wrapper) {
          return
        }
        let hasChildrenChange = false
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i]
          if (isInitialized && m.type === 'attributes' && m.target === self) {
            if (hyphenatedPropsList.indexOf(m.attributeName) !== -1) {
              syncProperty(self, m.attributeName)
            } else {
              syncAttribute(self, m.attributeName)
            }
          } else {
            hasChildrenChange = true
          }
        }
        if (hasChildrenChange) {
          wrapper.slotChildren = Object.freeze(toVNodes(
            wrapper.$createElement,
            self.childNodes
          ))
        }
      })
      observer.observe(self, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      })
    }

    _createWrapper() {
      const wrapper = self._wrapper = new Vue({
        name: 'shadow-root',
        inheritAttrs: false,
        customElement: self,
        shadowRoot: self.shadowRoot,
        data () {
          return {
            props: {},
            slotChildren: [],
            attrs: getNodeAttributes(self, hyphenatedPropsList, true)
          }
        },
        render (h) {
          return h(Component, {
            ref: 'inner',
            props: this.props,
            attrs: getNodeAttributes(self, hyphenatedPropsList, true)
          }, this.slotChildren)
        }
      })
      return wrapper
    }

    get vueComponent () {
      return this._wrapper.$refs.inner
    }

    connectedCallback () {
      if (!this._wrapper) {
        this._wrapper = this._createWrapper()
      }
      const wrapper = this._wrapper
      if (!wrapper._isMounted) {
        // initialize attributes
        const syncInitialProperties = () => {
          wrapper.props = getInitialProps(camelizedPropsList, wrapper.props)
          hyphenatedPropsList.forEach(key => {
            syncProperty(this, key, true)
          })
        }

        if (isInitialized) {
          syncInitialProperties()
        } else {
          // async & unresolved
          Component().then(resolved => {
            if (resolved.__esModule || resolved[Symbol.toStringTag] === 'Module') {
              resolved = resolved.default
            }
            initialize(resolved)
            syncInitialProperties()
          })
        }
        // initialize children
        wrapper.slotChildren = Object.freeze(toVNodes(
          wrapper.$createElement,
          this.childNodes
        ))
        wrapper.$mount()
        this.shadowRoot.appendChild(wrapper.$el)
      } else {
        if (this.hasAttribute('keep-alive')) {
          callHooks(this.vueComponent, 'activated')
        } else {
          callHooks(this.vueComponent, 'created')
        }
      }
    }

    disconnectedCallback () {
      if (this.hasAttribute('keep-alive')) {
        callHooks(this.vueComponent, 'deactivated')
      } else {
        callHooks(this.vueComponent, 'destroyed')
        this._wrapper = null
      }
    }
  }

  if (!isAsync) {
    initialize(Component)
  }

  return CustomElement
}
