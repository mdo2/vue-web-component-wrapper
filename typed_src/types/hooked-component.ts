import { Vue } from 'vue/types/vue';
import { OnlyKeys } from './only';

export type HookedComponent = {
    $options: Vue['$options'] & {
        [P in OnlyKeys<Required<Vue['$options']>, (this: Vue) => void>]: Array<(this: Vue) => void>;
    }
};
