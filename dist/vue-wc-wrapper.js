const camelizeRE = /-(\w)/g;
const camelize = str => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
};

const hyphenateRE = /\B([A-Z])/g;
const hyphenate = str => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
};

function getInitialProps (propsList, currProps) {
  const res = {};
  propsList.forEach(key => {
    res[key] = currProps[key] || undefined;
  });
  return res
}

function injectHook (options, key, hook) {
  options[key] = [].concat(options[key] || []);
  options[key].unshift(hook);
}

function callHooks (vm, hook) {
  if (vm) {
    const hooks = vm.$options[hook] || [];
    hooks.forEach(hook => {
      hook.call(vm);
    });
  }
}

function createCustomEvent (name, args) {
  return new CustomEvent(name, {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail: args
  })
}

function isIgnoredAttribute (attr) {
  return ['class', 'style', 'id', 'key', 'ref', 'slot', 'slot-scope', 'is'].indexOf(
    attr
  ) !== -1
}

const isBoolean = val => /function Boolean/.test(String(val));
const isNumber = val => /function Number/.test(String(val));

function convertAttributeValue (value, name, { type } = {}) {
  if (isBoolean(type)) {
    if (value === 'true' || value === 'false') {
      return value === 'true'
    }
    if (value === '' || value === name) {
      return true
    }
    return value != null
  } else if (isNumber(type)) {
    const parsed = parseFloat(value, 10);
    return isNaN(parsed) ? value : parsed
  } else {
    return value
  }
}

function toVNodes (h, children) {
  let unnamed = false;
  const named = {};
  for (let i = 0, l = children.length; i < l; i++) {
    const childSlot = children[i].getAttribute && children[i].getAttribute('slot');
    if (childSlot && !named[childSlot]) {
      named[childSlot] = h('slot', {
        slot: childSlot,
        attrs: { name: childSlot }
      });
    } else if (!childSlot && !unnamed) {
      unnamed = h('slot', null);
    }
  }
  const res = Array.from(Object.values(named));
  if (unnamed) {
    res.push(unnamed);
  }
  return res
}

function getNodeAttributes (node, ignoreAttributes, ignoreReserved) {
  const res = {};
  for (let i = 0, l = node.attributes.length; i < l; i++) {
    const attr = node.attributes[i];
    const name = attr.name || attr.nodeName;
    const value = attr.value || attr.nodeValue;

    if (
      (ignoreAttributes && ignoreAttributes.indexOf(name) !== -1) &&
      (ignoreReserved && isIgnoredAttribute(name))
    ) {
      continue
    }

    res[name] = value;
  }
  return res
}

function wrap (Vue, Component, delegatesFocus) {
  const isAsync = typeof Component === 'function' && !Component.cid;
  let isInitialized = false;
  let hyphenatedPropsList;
  let camelizedPropsList;
  let camelizedPropsMap;

  function initialize (Component) {
    if (isInitialized) return

    const options = typeof Component === 'function'
      ? Component.options
      : Component;

    // extract props info
    const propsList = Array.isArray(options.props)
      ? options.props
      : Object.keys(options.props || {});
    hyphenatedPropsList = propsList.map(hyphenate);
    camelizedPropsList = propsList.map(camelize);
    const originalPropsAsObject = Array.isArray(options.props) ? {} : options.props || {};
    camelizedPropsMap = camelizedPropsList.reduce((map, key, i) => {
      map[key] = originalPropsAsObject[propsList[i]];
      return map
    }, {});

    // proxy $emit to native DOM events
    injectHook(options, 'beforeCreate', function () {
      const emit = this.$emit;
      this.$emit = (name, ...args) => {
        this.$root.$options.customElement.dispatchEvent(createCustomEvent(name, args));
        return emit.call(this, name, ...args)
      };
    });

    injectHook(options, 'created', function () {
      // sync default props values to wrapper on created
      camelizedPropsList.forEach(key => {
        this.$root.props[key] = this[key];
      });
    });

    // proxy props as Element properties
    camelizedPropsList.forEach(key => {
      Object.defineProperty(CustomElement.prototype, key, {
        get () {
          return this._wrapper && this._wrapper.props[key]
        },
        set (newVal) {
          if (this._wrapper) {
            this._wrapper.props[key] = newVal;
          }
          this.props[key] = newVal;
        },
        enumerable: false,
        configurable: true
      });
    });

    isInitialized = true;
  }

  function syncProperty (el, key, syncJsProp) {
    const camelized = camelize(key);
    let value = el.hasAttribute(key) ? el.getAttribute(key) : undefined;

    if (syncJsProp) {
      if (el.props && el.props[key] !== undefined) {
        value = el.props[key];
      } else {
        value = el[key] !== undefined ? el[key] : value;
      }
    }

    el._wrapper.props[camelized] = convertAttributeValue(
      value,
      key,
      camelizedPropsMap[camelized]
    );
  }

  function syncAttribute (el, key) {
    if (isIgnoredAttribute(key) || hyphenatedPropsList.indexOf(key) !== -1) {
      return
    }

    const value = el.hasAttribute(key) ? el.getAttribute(key) : undefined;
    const wrapper = el._wrapper;
    wrapper._update(Object.assign({}, wrapper._vnode, {
      data: Object.assign({}, wrapper._vnode.data, {
        attrs: Object.assign(
          {},
          wrapper._vnode.data.attrs,
          { [key]: value }
        )
      })
    }), false);
  }

  class CustomElement extends HTMLElement {
    constructor () {
      const self = super();
      this.props = {};
      self.attachShadow({ mode: 'open', delegatesFocus: delegatesFocus });

      const wrapper = this._createWrapper();

      // Use MutationObserver to react to future attribute & slot content change
      const observer = new MutationObserver(mutations => {
        if (!this._wrapper) {
          return
        }
        let hasChildrenChange = false;
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (isInitialized && m.type === 'attributes' && m.target === self) {
            if (hyphenatedPropsList.indexOf(m.attributeName) !== -1) {
              syncProperty(self, m.attributeName);
            } else {
              syncAttribute(self, m.attributeName);
            }
          } else {
            hasChildrenChange = true;
          }
        }
        if (hasChildrenChange) {
          wrapper.slotChildren = Object.freeze(toVNodes(
            wrapper.$createElement,
            self.childNodes
          ));
        }
      });
      observer.observe(self, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true
      });
    }

    _createWrapper() {
      const self = this;
      const wrapper = this._wrapper = new Vue({
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
      });
      return wrapper
    }

    get vueComponent () {
      return this._wrapper.$refs.inner
    }

    connectedCallback () {
      if (!this._wrapper) {
        this._wrapper = this._createWrapper();
      }
      const wrapper = this._wrapper;
      if (!wrapper._isMounted) {
        // initialize attributes
        const syncInitialProperties = () => {
          wrapper.props = getInitialProps(camelizedPropsList, wrapper.props);
          hyphenatedPropsList.forEach(key => {
            syncProperty(this, key, true);
          });
        };

        if (isInitialized) {
          syncInitialProperties();
        } else {
          // async & unresolved
          Component().then(resolved => {
            if (resolved.__esModule || resolved[Symbol.toStringTag] === 'Module') {
              resolved = resolved.default;
            }
            initialize(resolved);
            syncInitialProperties();
          });
        }
        // initialize children
        wrapper.slotChildren = Object.freeze(toVNodes(
          wrapper.$createElement,
          this.childNodes
        ));
        wrapper.$mount();
        this.shadowRoot.appendChild(wrapper.$el);
      } else {
        if (this.hasAttribute('keep-alive')) {
          callHooks(this.vueComponent, 'activated');
        } else {
          callHooks(this.vueComponent, 'created');
        }
      }
    }

    disconnectedCallback () {
      if (this.hasAttribute('keep-alive')) {
        callHooks(this.vueComponent, 'deactivated');
      } else {
        this._wrapper.$destroy();
        this._wrapper = null;

        // delete all children except for the first one (the style tag)
        const children = this.shadowRoot.childNodes;
        for (let i = 0; i < children.length; i++) {
          if (children[i].tagName !== "STYLE") {
            this.shadowRoot.removeChild(children[i]);
          }
        }
      }
    }
  }

  if (!isAsync) {
    initialize(Component);
  }

  return CustomElement
}

export default wrap;
