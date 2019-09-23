import {
    toVNodes,
    camelize,
    hyphenate,
    callHooks,
    injectHook,
    getInitialProps,
    createCustomEvent,
    convertAttributeValue,
    isShadyDom,
    getNodeAttributes,
    isIgnoredAttribute,
    getSlottedId,
    getHostId,
} from './utils.js';

export default function wrap(Vue, Component, delegatesFocus, css) {
    const isAsync = typeof Component === 'function' && !Component.cid;
    const styleSheets = css || [];
    let isInitialized = false;
    let hyphenatedPropsList;
    let camelizedPropsList;
    let camelizedPropsMap;

    function initialize(Component) {
        if (isInitialized) return;

        const options =
            typeof Component === 'function' ? Component.options : Component;

        // extract props info
        const propsList = Array.isArray(options.props)
            ? options.props
            : Object.keys(options.props || {});
        hyphenatedPropsList = propsList.map(hyphenate);
        camelizedPropsList = propsList.map(camelize);
        const originalPropsAsObject = Array.isArray(options.props)
            ? {}
            : options.props || {};
        camelizedPropsMap = camelizedPropsList.reduce((map, key, i) => {
            map[key] = originalPropsAsObject[propsList[i]];
            return map;
        }, {});

        // proxy $emit to native DOM events
        injectHook(options, 'beforeCreate', function() {
            const emit = this.$emit;
            this.$emit = (name, ...args) => {
                this.$root.$options.customElement.dispatchEvent(
                    createCustomEvent(name, args),
                );
                return emit.call(this, name, ...args);
            };
        });

        injectHook(options, 'created', function() {
            // sync default props values to wrapper on created
            camelizedPropsList.forEach((key) => {
                this.$root.props[key] = this[key];
            });
        });

        // proxy props as Element properties
        camelizedPropsList.forEach((key) => {
            Object.defineProperty(CustomElement.prototype, key, {
                get() {
                    return this._wrapper && this._wrapper.props[key];
                },
                set(newVal) {
                    if (this._wrapper) {
                        this._wrapper.props[key] = newVal;
                    }
                    this.props[key] = newVal;
                },
                enumerable: false,
                configurable: true,
            });
        });

        isInitialized = true;
    }

    function syncProperty(el, key, syncJsProp) {
        const camelized = camelize(key);
        let value = el.hasAttribute(key) ? el.getAttribute(key) : undefined;

        if (syncJsProp) {
            if (el.props && el.props[camelized] !== undefined) {
                value = el.props[camelized];
            } else {
                value = el[camelized] !== undefined ? el[camelized] : value;
            }
        }

        el._wrapper.props[camelized] = convertAttributeValue(
            value,
            key,
            camelizedPropsMap[camelized],
        );
    }

    function syncAttribute(el, key) {
        if (
            isIgnoredAttribute(key) ||
            hyphenatedPropsList.indexOf(key) !== -1
        ) {
            return;
        }

        const value = el.hasAttribute(key) ? el.getAttribute(key) : undefined;
        const wrapper = el._wrapper;

        if (!wrapper || !wrapper._vnode) {
            return;
        }

        wrapper._update(
            Object.assign({}, wrapper._vnode, {
                data: Object.assign({}, wrapper._vnode.data, {
                    attrs: Object.assign({}, wrapper._vnode.data.attrs, {
                        [key]: value,
                    }),
                }),
            }),
            false,
        );
    }

    class CustomElement extends HTMLElement {
        constructor() {
            const self = super();
            this._el = self;
            this.props = {};
            this.loadedStyles = false;
            this.attachShadow({
                mode: 'open',
                delegatesFocus: delegatesFocus,
            });

            if (styleSheets.length === 0) {
                this.loadedStyles = true;
                this._createWrapper();
                return this;
            }

            Promise.all(styleSheets).then((styles) => {
                this._injectStyles(styles);
                this.loadedStyles = true;

                if (this.isConnected) {
                    this._createWrapper();
                    this._connectComponent();
                }
            });
        }

        _createObserver() {
            const wrapper = this._wrapper;
            const el = this._el;

            let mutationObserverOptions = {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true,
                attributeOldValue: true,
            };

            // if ShadyDOM is available we use observeChildren to detect children changes
            // instead of MutationObserver
            if (isShadyDom() && !this._shadyDOMObserver) {
                this._shadyDOMObserver = window.ShadyDOM.observeChildren(
                    el,
                    (info) => {
                        wrapper.slotChildren = Object.freeze(
                            toVNodes(wrapper.$createElement, el.childNodes, getSlottedId(wrapper)),
                        );
                    },
                );

                mutationObserverOptions = {
                    attributes: true,
                    attributeOldValue: true,
                };
            }

            // Use MutationObserver to react to future attribute & slot content change
            if (!this.observer) {
                this.observer = new MutationObserver((mutations) => {
                    if (!this._wrapper) {
                        return;
                    }
                    let hasChildrenChange = false;
                    for (let i = 0; i < mutations.length; i++) {
                        const m = mutations[i];
                        if (
                            isInitialized &&
                            m.type === 'attributes' &&
                            m.target === el
                        ) {
                            // in some browsers e.g. Edge it may happen that a mutation is triggered twice
                            // before an attribute value is changed and after
                            // the next if avoid syncing props when the value doesn't change
                            if (
                                m.oldValue === el.getAttribute(m.attributeName)
                            ) {
                                continue;
                            }
                            if (
                                hyphenatedPropsList.indexOf(m.attributeName) !==
                                -1
                            ) {
                                syncProperty(el, m.attributeName);
                            } else {
                                syncAttribute(el, m.attributeName);
                            }
                        } else {
                            hasChildrenChange = true;
                        }
                    }
                    if (hasChildrenChange && !this._shadyDOMObserver) {
                        wrapper.slotChildren = Object.freeze(
                            toVNodes(wrapper.$createElement, el.childNodes, getSlottedId(wrapper)),
                        );
                    }
                });

                this.observer.observe(el, mutationObserverOptions);
            }
        }

        _destroyObserver() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
            }
            if (isShadyDom() && this._shadyDOMObserver) {
                window.ShadyDOM.unobserveChildren(this._shadyDOMObserver);
                this._shadyDOMObserver = null;
            }
        }

        _createWrapper() {
            const self = this;
            const wrapper = (this._wrapper = new Vue({
                name: 'shadow-root',
                inheritAttrs: false,
                customElement: self,
                shadowRoot: self.shadowRoot,
                data() {
                    return {
                        props: {},
                        slotChildren: [],
                        attrs: getNodeAttributes(
                            self,
                            hyphenatedPropsList,
                            true,
                        ),
                    };
                },
                mounted() {
                    self.setAttribute(getHostId(wrapper), '');

                    // TODO: Remove unnecessary slot children changes before components mounted.
                    // Update with slotted ID now we're mounted
                    wrapper.slotChildren = Object.freeze(
                        toVNodes(wrapper.$createElement, self.childNodes, getSlottedId(wrapper)),
                    );
                },
                render(h) {
                    return h(
                        Component,
                        {
                            ref: 'inner',
                            props: this.props,
                            attrs: getNodeAttributes(
                                self,
                                hyphenatedPropsList,
                                true,
                            ),
                        },
                        this.slotChildren,
                    );
                },
            }));
            return wrapper;
        }

        get vueComponent() {
            return this._wrapper.$refs.inner;
        }

        connectedCallback() {
            if (!this.loadedStyles) {
                return;
            }

            this._connectComponent();
        }

        _connectComponent() {
            if (!this._wrapper && this.loadedStyles) {
                this._wrapper = this._createWrapper();
            }
            const wrapper = this._wrapper;

            if (wrapper._isMounted) {
                if (this.hasAttribute('keep-alive')) {
                    callHooks(this.vueComponent, 'activated');
                } else {
                    callHooks(this.vueComponent, 'created');
                }

                return;
            }

            // initialize attributes
            const syncInitialProperties = () => {
                wrapper.props = getInitialProps(
                    camelizedPropsList,
                    wrapper.props,
                );
                hyphenatedPropsList.forEach((key) => {
                    syncProperty(this, key, true);
                });
            };

            if (isInitialized) {
                syncInitialProperties();
            } else {
                // async & unresolved
                Component().then((resolved) => {
                    if (
                        resolved.__esModule ||
                        resolved[Symbol.toStringTag] === 'Module'
                    ) {
                        resolved = resolved.default;
                    }
                    initialize(resolved);
                    syncInitialProperties();
                });
            }

            this._createObserver();
            wrapper.$mount();
            this.shadowRoot.appendChild(wrapper.$el);
        }

        disconnectedCallback() {
            if (!this._wrapper) {
                return;
            }

            if (this.hasAttribute('keep-alive')) {
                callHooks(this.vueComponent, 'deactivated');
                return;
            }

            this._wrapper.$destroy();
            this._wrapper = null;
            this._destroyObserver();
            this._cleanDomTree();
        }

        /**
         * Injects a list of css strings into the shadow dom of the
         * component.
         * @param {string[]} styles
         */
        _injectStyles(styles) {
            styles.map((content) => {
                const style = document.createElement('style');
                style.appendChild(document.createTextNode(content));
                this.shadowRoot.appendChild(style);
            });
        }

        /**
         * Removes all content from the web component except
         * for the styles.
         */
        _cleanDomTree() {
            const children = this.shadowRoot.childNodes;
            for (let i = 0; i < children.length; i++) {
                const node = children[i];

                if (node.nodeName !== 'STYLE') {
                    this.shadowRoot.removeChild(children[i])
                }
            }
        }
    }

    if (!isAsync) {
        initialize(Component);
    }

    return CustomElement;
}
