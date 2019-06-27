import { Vue, VueConstructor } from 'vue/types/vue';
import { OnlyKeys } from '../types/only';
import { HookedComponent } from '../types/hooked-component';

/**
 * Gets the full components initial props based on the
 * components current properties and list of available
 * properties.
 * @param propsList list of properties of the component
 * @param currProps current properties
 */
export function getInitialProps(propsList: string[], currProps: Record<string, unknown>): Record<string, unknown> {
	const res: Record<string, unknown> = {};
	for (const key of propsList) {
		res[key] = currProps[key] || undefined;
	}
	return res;
}

function isHookedComponent(component: Vue['$options'], key: keyof Vue['$options']): component is HookedComponent['$options'] {
    return Array.isArray(component[key]);
}

/**
 * Injects a hook into the vue instance
 * @param vueOptions Options for the vue component
 * @param key
 * @param hook
 */
export function injectHook(
	vueOptions: Vue['$options'] | HookedComponent['$options'],
	key: OnlyKeys<Required<Vue['$options']>, (this: Vue) => void>,
	hook: (this: Vue) => void,
): void {
    const hookedComponent = vueOptions as HookedComponent['$options'];
    const hooks: Array<(this: Vue) => void> = [];

    if (!isHookedComponent(vueOptions, key)) {
        hooks.push(hook);
        if (vueOptions[key]) {
            hooks.push(vueOptions[key]!);
        }
        const x = hookedComponent[key];
        hookedComponent[key] = hooks;
        return;
    }
    vueOptions[key].unshift(hook);
}

/**
 * Calls the hook
 * @param vm
 * @param hook
 */
export function callHooks(
	vueInstance: HookedComponent,
	hook: OnlyKeys<Required<Vue['$options']>, () => void>,
) {
	if (!vueInstance) {
		return;
	}

	const options = vueInstance.$options;
	const hooks = options[hook] || [];

	for (const hook of hooks) {
		hook.call(vueInstance);
	}
}

/**
 * Typeguard to determine if a component is
 * a asynchronously loaded.
 * @param component
 */
export function isAsyncComponent(
	component: VueConstructor | Promise<VueConstructor>
): component is Promise<VueConstructor> {
	return !component.hasOwnProperty('options');
}

/**
 * Typeguard to determine if a component is
 * synchronously loaded.
 * @param component
 */
export function isSyncComponent(component: VueConstructor | Promise<VueConstructor>): component is VueConstructor {
	return !isAsyncComponent(component);
}
