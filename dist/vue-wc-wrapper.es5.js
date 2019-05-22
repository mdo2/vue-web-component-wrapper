function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: true,
      configurable: true
    }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

function _possibleConstructorReturn(self, call) {
  if (call && (typeof call === "object" || typeof call === "function")) {
    return call;
  }

  return _assertThisInitialized(self);
}

var camelizeRE = /-(\w)/g;
var camelize = function camelize(str) {
  return str.replace(camelizeRE, function (_, c) {
    return c ? c.toUpperCase() : '';
  });
};
var hyphenateRE = /\B([A-Z])/g;
var hyphenate = function hyphenate(str) {
  return str.replace(hyphenateRE, '-$1').toLowerCase();
};
function getInitialProps(propsList, currProps) {
  var res = {};
  propsList.forEach(function (key) {
    res[key] = currProps[key] || undefined;
  });
  return res;
}
function injectHook(options, key, hook) {
  options[key] = [].concat(options[key] || []);
  options[key].unshift(hook);
}
function callHooks(vm, hook) {
  if (vm) {
    var hooks = vm.$options[hook] || [];
    hooks.forEach(function (hook) {
      hook.call(vm);
    });
  }
}
function createCustomEvent(name, args) {
  return new CustomEvent(name, {
    bubbles: true,
    cancelable: true,
    composed: true,
    detail: args
  });
}
function isIgnoredAttribute(attr) {
  return ['class', 'style', 'id', 'key', 'ref', 'slot', 'slot-scope', 'is'].indexOf(attr) !== -1;
}

var isBoolean = function isBoolean(val) {
  return /function Boolean/.test(String(val));
};

var isNumber = function isNumber(val) {
  return /function Number/.test(String(val));
};

function convertAttributeValue(value, name) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      type = _ref.type;

  if (isBoolean(type)) {
    if (value === 'true' || value === 'false') {
      return value === 'true';
    }

    if (value === '' || value === name) {
      return true;
    }

    return value != null;
  } else if (isNumber(type)) {
    var parsed = parseFloat(value, 10);
    return isNaN(parsed) ? value : parsed;
  } else {
    return value;
  }
}
function toVNodes(h, children) {
  var unnamed = false;
  var named = {};

  for (var i = 0, l = children.length; i < l; i++) {
    var childSlot = children[i].getAttribute && children[i].getAttribute('slot');

    if (childSlot && !named[childSlot]) {
      named[childSlot] = h('slot', {
        slot: childSlot,
        attrs: {
          name: childSlot
        }
      });
    } else if (!childSlot && !unnamed) {
      unnamed = h('slot', null);
    }
  }

  var res = Array.from(Object.values(named));

  if (unnamed) {
    res.push(unnamed);
  }

  return res;
}
function getNodeAttributes(node, ignoreAttributes, ignoreReserved) {
  var res = {};

  for (var i = 0, l = node.attributes.length; i < l; i++) {
    var attr = node.attributes[i];
    var name = attr.name || attr.nodeName;
    var value = attr.value || attr.nodeValue;

    if (ignoreAttributes && ignoreAttributes.indexOf(name) !== -1 && ignoreReserved && isIgnoredAttribute(name)) {
      continue;
    }

    res[name] = value;
  }

  return res;
}

function _CustomElement() {
  return Reflect.construct(HTMLElement, [], this.__proto__.constructor);
}
Object.setPrototypeOf(_CustomElement.prototype, HTMLElement.prototype);
Object.setPrototypeOf(_CustomElement, HTMLElement);
function wrap(Vue, Component, delegatesFocus, css) {
  var isAsync = typeof Component === 'function' && !Component.cid;
  var isInitialized = false;
  var hyphenatedPropsList;
  var camelizedPropsList;
  var camelizedPropsMap;

  function initialize(Component) {
    if (isInitialized) return;
    var options = typeof Component === 'function' ? Component.options : Component; // extract props info

    var propsList = Array.isArray(options.props) ? options.props : Object.keys(options.props || {});
    hyphenatedPropsList = propsList.map(hyphenate);
    camelizedPropsList = propsList.map(camelize);
    var originalPropsAsObject = Array.isArray(options.props) ? {} : options.props || {};
    camelizedPropsMap = camelizedPropsList.reduce(function (map, key, i) {
      map[key] = originalPropsAsObject[propsList[i]];
      return map;
    }, {}); // proxy $emit to native DOM events

    injectHook(options, 'beforeCreate', function () {
      var _this = this;

      var emit = this.$emit;

      this.$emit = function (name) {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        _this.$root.$options.customElement.dispatchEvent(createCustomEvent(name, args));

        return emit.call.apply(emit, [_this, name].concat(args));
      };
    });
    injectHook(options, 'created', function () {
      var _this2 = this;

      // sync default props values to wrapper on created
      camelizedPropsList.forEach(function (key) {
        _this2.$root.props[key] = _this2[key];
      });
    }); // proxy props as Element properties

    camelizedPropsList.forEach(function (key) {
      Object.defineProperty(CustomElement.prototype, key, {
        get: function get() {
          return this._wrapper && this._wrapper.props[key];
        },
        set: function set(newVal) {
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

  function syncProperty(el, key, syncJsProp) {
    var camelized = camelize(key);
    var value = el.hasAttribute(key) ? el.getAttribute(key) : undefined;

    if (syncJsProp) {
      if (el.props && el.props[camelized] !== undefined) {
        value = el.props[camelized];
      } else {
        value = el[camelized] !== undefined ? el[camelized] : value;
      }
    }

    el._wrapper.props[camelized] = convertAttributeValue(value, key, camelizedPropsMap[camelized]);
  }

  function syncAttribute(el, key) {
    if (isIgnoredAttribute(key) || hyphenatedPropsList.indexOf(key) !== -1) {
      return;
    }

    var value = el.hasAttribute(key) ? el.getAttribute(key) : undefined;
    var wrapper = el._wrapper;

    if (!wrapper || !wrapper._vnode) {
      return;
    }

    wrapper._update(Object.assign({}, wrapper._vnode, {
      data: Object.assign({}, wrapper._vnode.data, {
        attrs: Object.assign({}, wrapper._vnode.data.attrs, _defineProperty({}, key, value))
      })
    }), false);
  }

  var CustomElement =
  /*#__PURE__*/
  function (_CustomElement2) {
    _inherits(CustomElement, _CustomElement2);

    function CustomElement() {
      var _this3;

      _classCallCheck(this, CustomElement);

      var self = _this3 = _possibleConstructorReturn(this, _getPrototypeOf(CustomElement).call(this));

      _this3._el = self;
      _this3.props = {};
      var shadow = self.attachShadow({
        mode: 'open',
        delegatesFocus: delegatesFocus
      });
      css && css.forEach(function (promise) {
        return promise.then(function (res) {
          return res.clone().text().then(function (content) {
            var style = document.createElement('style');
            style.appendChild(document.createTextNode(content));
            shadow.appendChild(style);
          });
        });
      });

      _this3._createWrapper();

      _this3._createObserver();

      return _this3;
    }

    _createClass(CustomElement, [{
      key: "_createObserver",
      value: function _createObserver() {
        var _this4 = this;

        var wrapper = this._wrapper;
        var el = this._el;
        var mutationObserverOptions = {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeOldValue: true
        }; // if ShadyDOM is available we use observeChildren to detect children changes
        // instead of MutationObserver

        if (window.ShadyDOM && !this._shadyDOMObserver) {
          this._shadyDOMObserver = window.ShadyDOM.observeChildren(el, function (info) {
            wrapper.slotChildren = Object.freeze(toVNodes(wrapper.$createElement, el.childNodes));
          });
          mutationObserverOptions = {
            attributes: true,
            attributeOldValue: true
          };
        } // Use MutationObserver to react to future attribute & slot content change


        if (!this.observer) {
          this.observer = new MutationObserver(function (mutations) {
            if (!_this4._wrapper) {
              return;
            }

            var hasChildrenChange = false;

            for (var i = 0; i < mutations.length; i++) {
              var m = mutations[i];

              if (isInitialized && m.type === 'attributes' && m.target === el) {
                // in some browsers e.g. Edge it may happen that a mutation is triggered twice
                // before an attribute value is changed and after
                // the next if avoid syncing props when the value doesn't change
                if (m.oldValue === el.getAttribute(m.attributeName)) {
                  return;
                }

                if (hyphenatedPropsList.indexOf(m.attributeName) !== -1) {
                  syncProperty(el, m.attributeName);
                } else {
                  syncAttribute(el, m.attributeName);
                }
              } else {
                hasChildrenChange = true;
              }
            }

            if (hasChildrenChange && !_this4._shadyDOMObserver) {
              wrapper.slotChildren = Object.freeze(toVNodes(wrapper.$createElement, el.childNodes));
            }
          });
          this.observer.observe(el, mutationObserverOptions);
        }
      }
    }, {
      key: "_destroyObserver",
      value: function _destroyObserver() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }

        if (window.ShadyDOM && this._shadyDOMObserver) {
          window.ShadyDOM.unobserveChildren(this._shadyDOMObserver);
          this._shadyDOMObserver = null;
        }
      }
    }, {
      key: "_createWrapper",
      value: function _createWrapper() {
        var self = this;
        var wrapper = this._wrapper = new Vue({
          name: 'shadow-root',
          inheritAttrs: false,
          customElement: self,
          shadowRoot: self.shadowRoot,
          data: function data() {
            return {
              props: {},
              slotChildren: [],
              attrs: getNodeAttributes(self, hyphenatedPropsList, true)
            };
          },
          render: function render(h) {
            return h(Component, {
              ref: 'inner',
              props: this.props,
              attrs: getNodeAttributes(self, hyphenatedPropsList, true)
            }, this.slotChildren);
          }
        });
        return wrapper;
      }
    }, {
      key: "connectedCallback",
      value: function connectedCallback() {
        var _this5 = this;

        if (!this._wrapper) {
          this._wrapper = this._createWrapper();
        }

        var wrapper = this._wrapper;

        if (!wrapper._isMounted) {
          // initialize attributes
          var syncInitialProperties = function syncInitialProperties() {
            wrapper.props = getInitialProps(camelizedPropsList, wrapper.props);
            hyphenatedPropsList.forEach(function (key) {
              syncProperty(_this5, key, true);
            });
          };

          if (isInitialized) {
            syncInitialProperties();
          } else {
            // async & unresolved
            Component().then(function (resolved) {
              if (resolved.__esModule || resolved[Symbol.toStringTag] === 'Module') {
                resolved = resolved.default;
              }

              initialize(resolved);
              syncInitialProperties();
            });
          } // initialize children


          wrapper.slotChildren = Object.freeze(toVNodes(wrapper.$createElement, this.childNodes));

          this._createObserver();

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
    }, {
      key: "disconnectedCallback",
      value: function disconnectedCallback() {
        if (this.hasAttribute('keep-alive')) {
          callHooks(this.vueComponent, 'deactivated');
        } else {
          this._wrapper.$destroy();

          this._wrapper = null;

          this._destroyObserver(); // delete all children except for the first one (the style tag)


          var children = this.shadowRoot.childNodes;

          for (var i = 0; i < children.length; i++) {
            if (children[i].tagName !== "STYLE") {
              this.shadowRoot.removeChild(children[i]);
            }
          }
        }
      }
    }, {
      key: "vueComponent",
      get: function get() {
        return this._wrapper.$refs.inner;
      }
    }]);

    return CustomElement;
  }(_CustomElement);

  if (!isAsync) {
    initialize(Component);
  }

  return CustomElement;
}

export default wrap;
