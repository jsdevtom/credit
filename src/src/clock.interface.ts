import {Map} from 'immutable';

interface StringNumMap {[key: string]: number}


export interface ClockImmutable extends Map<string, number> {
}

export interface DocIdToClockImmutable extends Map<string, ClockImmutable> {
}

export interface Clock extends StringNumMap {
}
