export interface Merger<S> {
    merge(...states: S[]): S;
}
