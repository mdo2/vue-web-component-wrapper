import { OnlyKeys } from './only';
import { assert, IsExact } from 'conditional-type-checks';

// Single Type
{
    interface A {
        hello: string;
        world: boolean;
    }

    type AStrings = OnlyKeys<A, string>;
    assert<IsExact<AStrings, 'hello'>>(true);
}

// Multiple keys of varying type
{
    interface B {
        hello: string;
        world: boolean;
        there: string;
        one: 'green';
        two: number;
    }

    type BStrings = OnlyKeys<B, string>;
    assert<IsExact<BStrings, 'hello' | 'there' | 'one'>>(true);
}


// Function types
{
    interface C {
        hello: () => boolean;
        world: boolean;
        there: () => void;
    }

    type CFunctions = OnlyKeys<C, () => boolean>;
    assert<IsExact<CFunctions, 'hello'>>(true);
}

// Interface types
{
    interface D {
        hello: OtherInterface;
        world: 'there';
    }

    interface OtherInterface {
        something: string;
    }

    type DOtherInterface = OnlyKeys<D, OtherInterface>;
    assert<IsExact<DOtherInterface, 'hello'>>(true);
}
