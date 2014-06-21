"use strict";

class TimeSpan {
    public static coreTime: TimeSpan = null;

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
    public static taskTypes: { name: string; taskNameCandidates: string[]; }[] = null;

    public constructor(
        public type: number,
        public name: string,
        public timeSpan: TimeSpan,
        public memo: string
        ) { }

    public get typeString(): string {
        return Task.taskTypes[this.type].name;
    }

    public static fromJSONObject(obj: any): Task {
        return new Task(obj.type, obj.name, TimeSpan.fromJSONObject(obj.timeSpan), obj.memo);
    }
}

$(() => {
    TimeSpan.coreTime = TimeSpan.fromJSONObject(JSON.parse($("#coretime-span").html()));
    Task.taskTypes = JSON.parse($("#task-types").html());
});
