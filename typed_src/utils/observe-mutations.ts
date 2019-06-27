import { hasPolyfill } from './polyfill';

export function getObserveOptions() {
    if (hasPolyfill()) {
        return {
            attributes: true,
            attributeOldValue: true,
        };
    }

    return {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
    };
}

export function toNodeList(nodes: Node[]): NodeList {
    const nodeList = document.createDocumentFragment().childNodes;
    const descriptor: PropertyDescriptorMap & Record<number, Node> = {
        length: { value: nodes.length },
        item: {
            value: function (this: NodeList, i: number) {
                return this[+i || 0];
            },
            enumerable: true
        }
    };
    for (let i = 0; i <= nodes.length; i++) {
        descriptor[i] = nodes[i];
    }
    return  Object.create(nodeList, descriptor);
}

export function convertShadowMutation(mutation: ShadowMutation, target: Node): MutationRecord {
    const node = mutation.addedNodes[0];
    return {
        addedNodes: toNodeList(mutation.addedNodes),
        removedNodes: toNodeList(mutation.removedNodes),
        attributeName: null,
        attributeNamespace: null,
        nextSibling: node ? node.nextSibling : null,
        oldValue: null,
        previousSibling: node ? node.previousSibling : null,
        target,
        type: 'childList',
    };
}

export function observeChanges(element: Node, handler: MutationCallback) {
    // Use MutationObserver to react to future attribute & slot content change
    const observer = new MutationObserver((mutations) => {
        handler(mutations, observer);
    });
    const destructors = [
        () => observer.disconnect()
    ];

    if (hasPolyfill()) {
        const listener = window.ShadyDOM.observeChildren(
            element,
            (mutations) => handler([
                    convertShadowMutation(mutations, element)
            ], observer),
        );
        destructors.push(() => window.ShadyDOM.unobserveChildren(listener))
    }

    observer.observe(element, getObserveOptions());
    return () => {
        destructors.forEach((func) => func());
    };
}