import { getInitialProps } from './component';

describe('#getInitialProps', () => {
    it('should return an empty object if theres an empty prop list', () => {
        expect(getInitialProps([], { hello: 'one' })).toEqual({});
    });

    it('should filter props not in the prop list', () => {
        expect(getInitialProps([
            'hello'
        ], {
            hello: 'one',
            world: 2
        })).toEqual({
            hello: 'one',
        });
    });

    it('should set non-existent props to undefined', () => {
        expect(getInitialProps([
            'hello'
        ], {
            world: 2
        })).toEqual({
            hello: undefined,
        });
    });
});