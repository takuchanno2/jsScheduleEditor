"use strict";

class Time {
    public static cellsPerHour: number = 2;
    public static get minutesPerCell(): number { return 60 / Time.cellsPerHour; }

    private _totalMinutes: number;

    public constructor(totalMinutes: number);
    public constructor(hours: number, minutes: number);
    public constructor(x: number, y?: number) {
        if (y === undefined) {
            // constructor(totalMinutes: number)
            this._totalMinutes = x;
        } else {
            // constructor(hours: number, minutes: number)
            this._totalMinutes = Time.getTotalMinutes(x, y);
        }

        if (this._totalMinutes < 0 || this._totalMinutes >= 24 * 60 || this._totalMinutes % (60 / Time.cellsPerHour) != 0) {
            throw new Error("Invalid constructor parameters");
        }
    }

    public get hours(): number { return Math.floor(this._totalMinutes / 60); }
    public get minutes(): number { return this._totalMinutes % 60; }
    public get totalMinutes(): number { return this._totalMinutes; }
    public get deciamlHours(): number { return this.hours + (this.minutes / 60.0); }

    public static subtract(x: Time, y: Time) {
        return new Time(x._totalMinutes - y._totalMinutes);
    }

    public putForward(unitTime: number): Time { return new Time(this._totalMinutes + unitTime * (60 / Time.cellsPerHour)); }

    public toString(): string { return String(this.hours) + ":" + String(100 + this.minutes).slice(1); }
    public static fromString(time: string): Time { 
        var hm = time.split(":");
        return new Time(Number(hm[0]), Number(hm[1]));
    }

    public static fromJSONObject(obj: any): Time {
        return new Time(obj._totalMinutes);
    }

    public get tableIndex(): number {
        return Time.getTableIndex(this._totalMinutes);
    }

    public static fromTableIndex(tx: number): Time {
        return new Time(tx * 60 / Time.cellsPerHour); 
    }

    public static getTotalMinutes(hours: number, minutes: number) {
        return (hours * 60 + minutes);
    }

    public static getTableIndex(totalMinutes: number): number;
    public static getTableIndex(hours: number, minutes: number): number;
    public static getTableIndex(x: number, y?: number): number {
        if (y === undefined) {
            return Math.floor(x * Time.cellsPerHour / 60);
        } else {
            return Time.getTableIndex(x, y);
        }
        
    }
}

class TimeSpan {
    public static coretime: TimeSpan = null;

    public constructor(private _begin: Time, private _end: Time) {
        if (this.span.totalMinutes < (60 / Time.cellsPerHour)) throw new Error("Invalid Argument");
    }

    public get begin(): Time { return this._begin; }
    public get end(): Time { return this._end; }
    public get span(): Time { return Time.subtract(this._end, this._begin); }

    public includes(time: Time): boolean {
        return (this._begin.totalMinutes <= time.totalMinutes) && (time.totalMinutes < this._end.totalMinutes);
    }

    public static fromJSONObject(obj: any): TimeSpan {
        return new TimeSpan(Time.fromJSONObject(obj._begin), Time.fromJSONObject(obj._end));
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
    var config = JSON.parse($("#config").html());

    TimeSpan.coretime = TimeSpan.fromJSONObject(config.coretimeSpan);
    Time.cellsPerHour = config.cellsPerHour;

    Task.taskTypes = JSON.parse($("#task-types").html());
});
