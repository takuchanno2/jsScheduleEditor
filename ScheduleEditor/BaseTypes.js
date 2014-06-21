"use strict";
var TimeSpan = (function () {
    function TimeSpan(_begin, _end) {
        this._begin = _begin;
        this._end = _end;
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
            return this._end - this._begin;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TimeSpan.prototype, "beginString", {
        get: function () {
            return TimeSpan.timeToString(this.begin);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TimeSpan.prototype, "endString", {
        get: function () {
            return TimeSpan.timeToString(this.end);
        },
        enumerable: true,
        configurable: true
    });

    TimeSpan.timeToString = function (time) {
        return String(Math.floor(time)) + ":" + (((time * 2) % 2 == 0) ? "00" : "30");
    };

    TimeSpan.fromJSONObject = function (obj) {
        return new TimeSpan(obj._begin, obj._end);
    };
    TimeSpan.coreTime = null;
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
    TimeSpan.coreTime = TimeSpan.fromJSONObject(JSON.parse($("#coretime-span").html()));
    Task.taskTypes = JSON.parse($("#task-types").html());
});
//# sourceMappingURL=BaseTypes.js.map
