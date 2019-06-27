/**
 * RegEx for converting between kebab
 * and camel case.
 */
const PROP_REGEX = {
    CAMEL_CASE: /\B([A-Z])/g,
    KEBAB_CASE: /-(\w)/g,
};

/**
 * Converts a kebab case string to camel case.
 * @param string Kebab case subject to convert
 */
export function toCamelCase(string: string) {
    return string.replace(
        PROP_REGEX.KEBAB_CASE,
        (_, letter) => (letter ? letter.toUpperCase() : ''),
    );
}

/**
 * Converts a string from camel case to kebab case.
 * @param string Camel case subject string to convert
 */
export function toKebabCase(string: string) {
    return string.replace(
        PROP_REGEX.CAMEL_CASE,
        '-$1',
    ).toLowerCase();
}