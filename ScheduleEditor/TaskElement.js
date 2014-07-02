/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElementContainer.ts" />
"use strict";
var GeometricRelation;
(function (GeometricRelation) {
    GeometricRelation[GeometricRelation["unrelated"] = 0] = "unrelated";
    GeometricRelation[GeometricRelation["equal"] = 1] = "equal";
    GeometricRelation[GeometricRelation["upside"] = 2] = "upside";
    GeometricRelation[GeometricRelation["downside"] = 3] = "downside";
    GeometricRelation[GeometricRelation["inside"] = 4] = "inside";
    GeometricRelation[GeometricRelation["outside"] = 5] = "outside";
})(GeometricRelation || (GeometricRelation = {}));

var TaskElement = (function () {
    function TaskElement(timeSpan, jQueryElement) {
        if (typeof jQueryElement === "undefined") { jQueryElement = null; }
        this.jQueryElement = jQueryElement;
        this.onRemoved = null;
        if (!this.jQueryElement) {
            this.jQueryElement = TaskElement.jQueryElementTemplate.clone();
        }

        if (this.jQueryElement.taskElement()) {
            throw new Error("This object is bound to an other TaskElement.");
        }

        this.jQueryElement.data("task-element", this);

        this.typeLabel = this.jQueryElement.find(".task-type");
        this.nameLabel = this.jQueryElement.find(".task-name");
        this.memoLabel = this.jQueryElement.find(".task-memo");
        this.timeBeginLabel = this.jQueryElement.find(".task-time-begin");
        this.timeEndLabel = this.jQueryElement.find(".task-time-end");
        this.timeSpanLabel = this.jQueryElement.find(".task-time-span");

        this._taskType = this.jQueryElement.data("task-type");
        this.timeSpan = timeSpan;
    }
    Object.defineProperty(TaskElement.prototype, "type", {
        get: function () {
            return this._taskType;
        },
        set: function (value) {
            this._taskType = value;
            this.typeLabel.text(this.typeString);
            this.jQueryElement.attr("data-task-type", value);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(TaskElement.prototype, "typeString", {
        get: function () {
            return Task.taskTypes[this.type].name;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "name", {
        get: function () {
            return this.nameLabel.text();
        },
        set: function (value) {
            this.nameLabel.text(value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "memo", {
        get: function () {
            return this.memoLabel.text();
        },
        set: function (value) {
            this.memoLabel.text(value);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "timeSpan", {
        get: function () {
            return this._timeSpan;
        },
        set: function (value) {
            if (value.span.totalMinutes === 0 || value.begin.totalMinutes % TaskTable.minutesPerCell != 0 || value.end.totalMinutes % TaskTable.minutesPerCell != 0) {
                throw new Error("Invalid TimeSpan");
            }

            var oldTimeSpan = this._timeSpan;
            this._timeSpan = value;

            this.top = taskGridHeight * this.top2;
            this.height = taskGridHeight * this.height2;

            this.timeBeginLabel.text(value.begin.toString());
            this.timeEndLabel.text(value.end.toString());
            this.timeSpanLabel.text(value.span.deciamlHours.toFixed(1));

            if (this.container) {
                this.container.onElementTimeSpanChanged(this, oldTimeSpan, value);
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "top2", {
        get: function () {
            return Math.floor(this._timeSpan.begin.totalMinutes / TaskTable.minutesPerCell);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "bottom2", {
        get: function () {
            return Math.floor(this._timeSpan.end.totalMinutes / TaskTable.minutesPerCell);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "height2", {
        get: function () {
            return Math.floor(this._timeSpan.span.totalMinutes / TaskTable.minutesPerCell);
        },
        enumerable: true,
        configurable: true
    });

    TaskElement.prototype.applyPositionToTimeSpan = function () {
        throw new Error();
    };

    Object.defineProperty(TaskElement.prototype, "active", {
        get: function () {
            return this.jQueryElement.hasClass("active");
        },
        set: function (value) {
            if (value) {
                this.jQueryElement.addClass("active");
            } else {
                this.jQueryElement.removeClass("active");
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "top", {
        get: function () {
            return Math.round(this.jQueryElement.position().top);
        },
        set: function (value) {
            // setterとしてのfn_topの戻り値を見ているのは、adjust……だけ。
            // nullかどうかチェックしてるのみ
            // throw new Error();
            this.jQueryElement.css("top", value);
            //value = Math.round(value);
            //var newBottom = Math.round(value + this.height);
            //if (value <= 0) {
            //    var newHeight = newBottom;
            //    if (newHeight <= 0) {
            //        this.remove();
            //        return null;
            //    } else {
            //        this.jQueryElement.css("top", 0);
            //        this.height = newHeight;
            //        setTaskBorder(this, 0);
            //        return 0;
            //    }
            //} else if (newBottom > taskGridHeightTotal) {
            //    var newHeight = Math.round(taskGridHeightTotal - value);
            //    if (newHeight <= 0) {
            //        this.remove();
            //        return null;
            //    } else {
            //        this.height = newHeight;
            //    }
            //}
            //this.jQueryElement.css("top", value);
            //setTaskBorder(this, value);
            //return this;
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(TaskElement.prototype, "bottom", {
        get: function () {
            return Math.round(this.top + this.height);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "height", {
        get: function () {
            var height = this.jQueryElement.height();
            if (height === 0)
                throw new Error("The height is somehow zero.");
            return Math.round(height);
        },
        set: function (value) {
            if (value === 0)
                throw new Error("Tried to set height zero.");
            this.jQueryElement.height(value);
        },
        enumerable: true,
        configurable: true
    });


    //　jQueryの要素にイベントを登録する
    TaskElement.prototype.registerDefaultEvents = function () {
        var _this = this;
        this.jQueryElement.mousedown(function (ev) {
            if (_this.container)
                return _this.container.onElementMousePressed(_this, ev);
        });
        this.jQueryElement.click(function (ev) {
            if (_this.container)
                return _this.container.onElementClicked(_this, ev);
        });
        this.jQueryElement.find(".close").click(function (ev) {
            if (_this.container)
                return _this.container.onElementCloseButtonClicked(_this, ev);
        });

        var commonOption = {
            "grid": [0, taskGridHeight],
            "containment": "parent"
        };

        var taskWidth = this.jQueryElement.width();

        this.jQueryElement.draggable($.extend(commonOption, {
            //"start": startDragEvent,
            //"stop": stopEditingEvent,
            //"drag": editTaskEvent,
            "scroll": true
        }));

        this.jQueryElement.resizable($.extend(commonOption, {
            "handles": "n, s, ne, se, sw, nw",
            //"start": startResizeEvent,
            //"stop": stopEditingEvent,
            //"resize": editTaskEvent,
            "maxWidth": taskWidth,
            "minWidth": taskWidth
        }));
    };

    TaskElement.prototype.clone = function () {
        return new TaskElement(this.timeSpan, this.jQueryElement.clone());
    };

    TaskElement.prototype.toTask = function () {
        return new Task(this.type, this.name, this.timeSpan, this.memo);
    };

    TaskElement.fromTask = function (task) {
        var element = new TaskElement(task.timeSpan);
        element.type = task.type;
        element.name = task.name;
        element.memo = task.memo;
        return element;
    };

    TaskElement.prepareTemplate = function () {
        this.jQueryElementTemplate = $($.parseHTML($("#task-template").html().trim()));
        this.jQueryElementTemplate.find(".task-type").text(Task.taskTypes[this.jQueryElementTemplate.data("task-type")].name);
        this.jQueryElementTemplate.find(".task-name").empty();
        this.jQueryElementTemplate.find(".task-memo").empty();
        this.jQueryElementTemplate.remove();
    };
    return TaskElement;
})();
//# sourceMappingURL=TaskElement.js.map
