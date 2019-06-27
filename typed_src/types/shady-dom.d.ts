interface ShadowMutation {
    addedNodes: Node[];
    removedNodes: Node[];
}

interface Observer {
    takeRecords(): ShadowMutation[];
}

interface Window {
    ShadyDOM: {
        observeChildren(node: Node, handler: (mutations: ShadowMutation) => void): Observer;
        unobserveChildren: (observer: Observer) => void,
    }
}