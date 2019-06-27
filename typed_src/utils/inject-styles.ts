const INJECTED_STYLE_ATTRIBUTE = 'data-vue-style';

/**
 * Injects string based css content into the node specified.
 * @param content The CSS string
 * @param node The element to inject into
 */
export function injectStyle(content: string, node: Element) {
    // TODO: Use constructable stylesheets if available?
    const style = document.createElement('style');
    style.setAttribute(INJECTED_STYLE_ATTRIBUTE, '');
    style.appendChild(document.createTextNode(content));
    node.prepend(style);
}

/**
 * Removes all of the injected styles that were injected by
 * the `injectStyle` method.
 * @param node The node to remove style elements from.
 */
export function removeInjectedStyles(node: Element) {
    const children = node.querySelectorAll(`[${INJECTED_STYLE_ATTRIBUTE}]`);

    for (let i = 0; i < children.length; i++) {
        node.removeChild(children[i]);
    }
}