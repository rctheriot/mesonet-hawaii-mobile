// Index 0 is the most recently selected variable; index 1 is the previous.
// The chart always shows at most two variables — newest on the left axis, previous on the right.
export type ChartVarPair = [string | null, string | null];
