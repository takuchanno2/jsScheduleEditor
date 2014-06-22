"use strict";

class Time {
    public constructor(private _hours: number, private _minutes: number) {
        if (0 < _hours || 0 >= 24 || _minutes < 0 || _minutes >= 60) throw new Error("Invalid Argument");
    }

    public get hours(): number { return this._hours; }
    public get minutes(): number { return this._minutes; }
    public get totalMinutes(): number { return this._hours * 60 + this._minutes; }

    public static subtract(a: Time, b: Time): Time {
        var hours = a._hours - b._hours;
        var minutes = a._minutes - b._minutes;
        if (minutes < 0) {
            hours--;
            minutes = 60 - minutes;
        } else if (minutes >= 60) {
            hours++;
            minutes = minutes - 60;
        }

        return new Time(hours, minutes);
    }

    public toString(): string { return String(this._hours) + ":" + String(100 + this._minutes).slice(1); }
    public static fromString(time: string): Time { 
        var hm = time.split(":");
        return new Time(Number(hm[0]), Number(hm[1]));
    }

    public toDecimalHoursString(): string {
        return String(this._hours) + "." + String(this._minutes / 60.0);
    }

    public static fromJSONObject(obj: any): Time {
        return new Time(obj._hours, obj._minutes);
    }

    public toTableX(): number {
        return Math.floor(this.totalMinutes * TimeSpan.cellsPerHour / 60);
    }

    public static fromTableX(tx: number): Time {
        var totalMinutes = tx * 60 / TimeSpan.cellsPerHour;
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        return new Time(hours, minutes);
    }
}

class TimeSpan {
    public static coretime: TimeSpan = null;
    public static cellsPerHour: number = 2;

    public constructor(private _begin: Time, private _end: Time) {
        if (_end.totalMinutes - _begin.totalMinutes < (60 / TimeSpan.cellsPerHour)) throw new Error("Invalid Argument");
    }

    public get begin(): Time { return this._begin; }
    public get end(): Time { return this._end; }
    public get span(): Time { return Time.subtract(this._end, this._begin); }

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
    var config = JSON.parse($("#config").html());

    TimeSpan.coretime = TimeSpan.fromJSONObject(config.coretimeSpan);
    TimeSpan.cellsPerHour = config.cellsPerHour;

    Task.taskTypes = JSON.parse($("#task-types").html());
});
