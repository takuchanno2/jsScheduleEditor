"use strict";

declare var scheduleTimeSpan: number[];
declare var coreTimeSpan: number[];
declare var taskTypeTable: string[];

class TimeSpan {
    public static coreTime = new TimeSpan(
        Math.min(coreTimeSpan[0], coreTimeSpan[1]),
        Math.max(coreTimeSpan[0], coreTimeSpan[1])
        );

    public constructor(private _begin: number, private _end: number) { }

    public get begin(): number { return this._begin; }
    public get end(): number { return this._end; }
    public get span(): number { return this._end - this._begin; }

    public get beginString(): string { return TimeSpan.timeToString(this.begin); }
    public get endString(): string { return TimeSpan.timeToString(this.end); }

    public static timeToString(time: number): string {
        return String(Math.floor(time)) + ":" + (((time * 2) % 2 == 0) ? "00" : "30");
    }

    public static fromJSONObject(obj: any): TimeSpan {
        return new TimeSpan(obj._begin, obj._end);
    }
}

class Task {
    public static taskTypes = taskTypeTable;

    public constructor(
        public type: number,
        public name: string,
        public timeSpan: TimeSpan,
        public memo: string
        ) { }

    public get typeString(): string {
        return Task.taskTypes[this.type];
    }

    public static fromJSONObject(obj: any): Task {
        return new Task(obj.type, obj.name, TimeSpan.fromJSONObject(obj.timeSpan), obj.memo);
    }
}
