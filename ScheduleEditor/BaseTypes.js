"use strict";
var Time = (function () {
    function Time(_hours, _minutes) {
        this._hours = _hours;
        this._minutes = _minutes;
        if (0 < _hours || 0 >= 24 || _minutes < 0 || _minutes >= 60)
            throw new Error("Invalid Argument");
    }
    Object.defineProperty(Time.prototype, "hours", {
        get: function () {
            return this._hours;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Time.prototype, "minutes", {
        get: function () {
            return this._minutes;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Time.prototype, "totalMinutes", {
        get: function () {
            return this._hours * 60 + this._minutes;
        },
        enumerable: true,
        configurable: true
    });

    Time.subtract = function (a, b) {
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
    };

    Time.prototype.toString = function () {
        return String(this._hours) + ":" + String(100 + this._minutes).slice(1);
    };
    Time.fromString = function (time) {
        var hm = time.split(":");
        return new Time(Number(hm[0]), Number(hm[1]));
    };

    Time.prototype.toDecimalHoursString = function () {
        return String(this._hours) + "." + String(this._minutes / 60.0);
    };

    Time.fromJSONObject = function (obj) {
        return new Time(obj._hours, obj._minutes);
    };

    Time.prototype.toTableX = function () {
        return Math.floor(this.totalMinutes * TimeSpan.cellsPerHour / 60);
    };

    Time.fromTableX = function (tx) {
        var totalMinutes = tx * 60 / TimeSpan.cellsPerHour;
        var hours = Math.floor(totalMinutes / 60);
        var minutes = totalMinutes % 60;
        return new Time(hours, minutes);
    };
    return Time;
})();

var TimeSpan = (function () {
    function TimeSpan(_begin, _end) {
        this._begin = _begin;
        this._end = _end;
        if (_end.totalMinutes - _begin.totalMinutes < (60 / TimeSpan.cellsPerHour))
            throw new Error("Invalid Argument");
    }
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

    TimeSpan.fromJSONObject = function (obj) {
        return new TimeSpan(obj._begin, obj._end);
    };
    TimeSpan.coretime = null;
    TimeSpan.cellsPerHour = 2;
    return TimeSpan;
})();

var Task = (function () {
    function Task(type, name, timeSpan, memo) {
        this.type = type;
        this.name = name;
        this.timeSpan = timeSpan;
        this.memo = memo;
    }
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

$(function () {
    var config = JSON.parse($("#config").html());

    TimeSpan.coretime = TimeSpan.fromJSONObject(config.coretimeSpan);
    TimeSpan.cellsPerHour = config.cellsPerHour;

    Task.taskTypes = JSON.parse($("#task-types").html());
});
//# sourceMappingURL=BaseTypes.js.map
