const camelizeRE = /-(\w)/g;
export const camelize = (str) => {
    return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
};

const hyphenateRE = /\B([A-Z])/g;
export const hyphenate = (str) => {
    return str.replace(hyphenateRE, '-$1').toLowerCase();
};

export function getInitialProps(propsList, currProps) {
    const res = {};
    propsList.forEach((key) => {
        res[key] = currProps[key] || undefined;
    });
    return res;
}

export function injectHook(options, key, hook) {
    options[key] = [].concat(options[key] || []);
    options[key].unshift(hook);
}

export function callHooks(vm, hook) {
    if (vm) {
        const hooks = vm.$options[hook] || [];
        hooks.forEach((hook) => {
            hook.call(vm);
        });
    }
}

export function createCustomEvent(name, args) {
    return new CustomEvent(name, {
        bubbles: true,
        cancelable: true,
        composed: true,
        detail: args,
    });
}

export function isIgnoredAttribute(attr) {
    return (
        [
            'class',
            'style',
            'id',
            'key',
            'ref',
            'slot',
            'slot-scope',
            'is',
        ].indexOf(attr) !== -1
    );
}

const isBoolean = (val) => /function Boolean/.test(String(val));
const isNumber = (val) => /function Number/.test(String(val));

export function convertAttributeValue(value, name, { type } = {}) {
    if (isBoolean(type)) {
        if (value === 'true' || value === 'false') {
            return value === 'true';
        }
        if (value === '' || value === name) {
            return true;
        }
        return value != null;
    } else if (isNumber(type)) {
        const parsed = parseFloat(value, 10);
        return isNaN(parsed) ? value : parsed;
    } else {
        return value;
    }
}

export function toVNodes(h, children) {
    let unnamed = false;
    const named = {};
    for (let i = 0, l = children.length; i < l; i++) {
        const childSlot =
            children[i].getAttribute && children[i].getAttribute('slot');
        if (childSlot && !named[childSlot]) {
            named[childSlot] = h('slot', {
                slot: childSlot,
                attrs: { name: childSlot },
            });
        } else if (!childSlot && !unnamed) {
            unnamed = h('slot', null);
        }
    }
    const res = Array.from(Object.values(named));
    if (unnamed) {
        res.push(unnamed);
    }
    return res;
}

export function getNodeAttributes(node, ignoreAttributes, ignoreReserved) {
    const res = {};
    for (let i = 0, l = node.attributes.length; i < l; i++) {
        const attr = node.attributes[i];
        const name = attr.name || attr.nodeName;
        const value = attr.value || attr.nodeValue;

        if (
            ignoreAttributes &&
            ignoreAttributes.indexOf(name) !== -1 &&
            (ignoreReserved && isIgnoredAttribute(name))
        ) {
            continue;
        }

        res[name] = value;
    }
    return res;
}
