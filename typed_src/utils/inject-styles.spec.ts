import { injectStyle, removeInjectedStyles } from './inject-styles';

describe('Style injection', () => {
    let element: Element;
    beforeEach(() => {
        element = document.createElement('div');
    });

    describe('#injectStyle', () => {
        it('should inject a style tag into the element', () => {
            injectStyle('.hello { world: 1 }', element);
            expect(element.children).toHaveLength(1);
            expect(element.children[0].tagName === 'STYLE');
        });

        it('should inject the style tag with the content specified', () => {
            const css = '.hello { world: 1 }';
            injectStyle(css, element);
            expect(element.children[0].textContent).toEqual(css);
        });

        it('should allow multiple injections into the same element in reverse order', () => {
            const css = (version: number) => `.hello { world: ${version}; }`;
            injectStyle(css(1), element);
            injectStyle(css(2), element);

            expect(element.children).toHaveLength(2);
            expect(element.children[0].textContent).toEqual(css(2));
            expect(element.children[1].textContent).toEqual(css(1));
        });

        it('should inject before other html content', () => {
            element.appendChild(document.createElement('div'));
            injectStyle('', element);

            expect(element.children).toHaveLength(2);
            expect(element.children[0].tagName).toEqual('STYLE');
        });
    });

    describe('#removeInjectedStyles', () => {
        it('should remove nothing if no injected styles exist', () => {
            element.appendChild(document.createElement('div'));
            const clonedElements = Array.from(element.children);

            removeInjectedStyles(element);

            expect(Array.from(element.children)).toEqual(clonedElements)
        });

        it('should remove an injected style sheet', () => {

            injectStyle('/* css */', element);

            expect(element.children).toHaveLength(1);

            removeInjectedStyles(element);

            expect(element.children).toHaveLength(0);
        });

        it('should remove all injected style sheets', () => {
            injectStyle('/* css */', element);
            injectStyle('/* css 2 */', element);

            expect(element.children).toHaveLength(2);

            removeInjectedStyles(element);

            expect(element.children).toHaveLength(0);
        });

        it('should remove only injected style sheets', () => {
            const style = document.createElement('style');
            injectStyle('/* css */', element);
            element.appendChild(style);
            injectStyle('/* css 2 */', element);

            expect(element.children).toHaveLength(3);

            removeInjectedStyles(element);

            expect(element.children).toHaveLength(1);
            expect(element.children[0]).toBe(style);
        });
    });
});