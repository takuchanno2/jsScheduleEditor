"use strict";
var Time = (function () {
    function Time(x, y) {
        if (y === undefined) {
            // constructor(totalMinutes: number)
            this._totalMinutes = x;
        } else {
            // constructor(hours: number, minutes: number)
            this._totalMinutes = Time.getTotalMinutes(x, y);
        }

        if (this._totalMinutes < 0 || this._totalMinutes >= 24 * 60 || this._totalMinutes % TaskTable.minutesPerCell != 0) {
            throw new Error("Invalid constructor parameters");
        }
    }
    Object.defineProperty(Time.prototype, "hours", {
        get: function () {
            return Math.floor(this._totalMinutes / 60);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Time.prototype, "minutes", {
        get: function () {
            return this._totalMinutes % 60;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Time.prototype, "totalMinutes", {
        get: function () {
            return this._totalMinutes;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Time.prototype, "deciamlHours", {
        get: function () {
            return this.hours + (this.minutes / 60.0);
        },
        enumerable: true,
        configurable: true
    });

    Time.subtract = function (x, y) {
        return new Time(x._totalMinutes - y._totalMinutes);
    };

    Time.prototype.putForward = function (unitTime) {
        return new Time(this._totalMinutes + unitTime * TaskTable.minutesPerCell);
    };

    Time.prototype.toString = function () {
        return String(this.hours) + ":" + String(100 + this.minutes).slice(1);
    };
    Time.fromString = function (time) {
        var hm = time.split(":");
        return new Time(Number(hm[0]), Number(hm[1]));
    };

    Time.fromJSONObject = function (obj) {
        return new Time(obj._totalMinutes);
    };

    Object.defineProperty(Time.prototype, "tableIndex", {
        get: function () {
            return Time.getTableIndex(this._totalMinutes);
        },
        enumerable: true,
        configurable: true
    });

    Time.fromTableIndex = function (tx) {
        return new Time(tx * TaskTable.minutesPerCell);
    };

    Time.getTotalMinutes = function (hours, minutes) {
        return (hours * 60 + minutes);
    };

    Time.getTableIndex = function (x, y) {
        if (y === undefined) {
            return Math.floor(x / TaskTable.minutesPerCell);
        } else {
            return Time.getTableIndex(x, y);
        }
    };
    return Time;
})();

var TimeSpan = (function () {
    function TimeSpan(_begin, _end) {
        this._begin = _begin;
        this._end = _end;
        if (this.span.totalMinutes < TaskTable.minutesPerCell)
            throw new Error("Invalid Argument");
    }
    TimeSpan.init = function (config) {
        TimeSpan.coretime = TimeSpan.fromJSONObject(config.coretimeSpan);
    };

    Object.defineProperty(TimeSpan.prototype, "begin", {
        get: function () {
            return this._begin;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSpan.prototype, "end", {
        get: function () {
            return this._end;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSpan.prototype, "span", {
        get: function () {
            return Time.subtract(this._end, this._begin);
        },
        enumerable: true,
        configurable: true
    });

    TimeSpan.prototype.includes = function (time) {
        return (this._begin.totalMinutes <= time.totalMinutes) && (time.totalMinutes < this._end.totalMinutes);
    };

    TimeSpan.fromJSONObject = function (obj) {
        return new TimeSpan(Time.fromJSONObject(obj._begin), Time.fromJSONObject(obj._end));
    };
    TimeSpan.coretime = null;
    return TimeSpan;
})();

var Task = (function () {
    function Task(type, name, timeSpan, memo) {
        this.type = type;
        this.name = name;
        this.timeSpan = timeSpan;
        this.memo = memo;
    }
    Task.init = function (config) {
        Task.taskTypes = JSON.parse($("#task-types").html());
    };

    Object.defineProperty(Task.prototype, "typeString", {
        get: function () {
            return Task.taskTypes[this.type].name;
        },
        enumerable: true,
        configurable: true
    });

    Task.fromJSONObject = function (obj) {
        return new Task(obj.type, obj.name, TimeSpan.fromJSONObject(obj.timeSpan), obj.memo);
    };
    Task.taskTypes = null;
    return Task;
})();
//# sourceMappingURL=BaseTypes.js.map
