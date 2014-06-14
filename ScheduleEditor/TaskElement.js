/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElementContainer.ts" />
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
            return Task.taskTypes[this.type];
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
            this._timeSpan = value;

            this.top = taskGridHeight * (value.begin - TimeSpan.scheduleTime.begin) * 2;
            this.height = taskGridHeight * (value.span) * 2;

            this.timeBeginLabel.text(value.beginString);
            this.timeEndLabel.text(value.endString);
            this.timeSpanLabel.text(value.span.toFixed(1));
        },
        enumerable: true,
        configurable: true
    });


    TaskElement.prototype.applyPositionToTimeSpan = function () {
        throw new Error();
    };

    TaskElement.prototype.show = function () {
        this.jQueryElement.show();
    };
    TaskElement.prototype.hide = function () {
        this.jQueryElement.hide();
    };
    Object.defineProperty(TaskElement.prototype, "visible", {
        get: function () {
            return this.jQueryElement.css("display") !== "none";
        },
        enumerable: true,
        configurable: true
    });

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
            if (!this.visible)
                throw new Error("Tried to access 'top' property of an invisible element.");
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
            if (!this.visible)
                throw new Error("Tried to access 'bottom' property of an invisible element.");
            return Math.round(this.top + this.height);
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(TaskElement.prototype, "height", {
        get: function () {
            if (!this.visible)
                throw new Error("Tried to access 'height' property of an invisible element.");
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


    // 上で交差してる: "upside"
    // 下で交差してる: "downside"
    // 含んでいる: "outside"
    // 含まれている: "inside"
    // 関係なし: "unrelated"
    TaskElement.prototype.getGeometricRelation = function (counterpart) {
        if (this.timeSpan.begin == counterpart.timeSpan.begin) {
            if (this.timeSpan.end < counterpart.timeSpan.end) {
                return 4 /* inside */;
            } else if (this.timeSpan.end > counterpart.timeSpan.end) {
                return 5 /* outside */;
            } else {
                return 1 /* equal */;
            }
        } else if (this.timeSpan.begin > counterpart.timeSpan.begin) {
            if (this.timeSpan.end <= counterpart.timeSpan.end) {
                return 4 /* inside */;
            } else if (this.timeSpan.begin < counterpart.timeSpan.end) {
                return 2 /* upside */;
            } else {
                return 0 /* unrelated */;
            }
        } else {
            if (this.timeSpan.end >= counterpart.timeSpan.end) {
                return 5 /* outside */;
            } else if (this.timeSpan.end > counterpart.timeSpan.begin) {
                return 3 /* downside */;
            } else {
                return 0 /* unrelated */;
            }
        }
    };

    //　jQueryの要素にイベントを登録する
    TaskElement.prototype.registerEvents = function () {
        var _this = this;
        if (!this.visible)
            throw new Error("Event registration of hidden elements is now allowed.");

        this.jQueryElement.mousedown(function () {
            lastState = taskElementContainer.dump();
            activateTask(_this.jQueryElement);
        });
        this.jQueryElement.click(function () {
            balloon.show(taskElementContainer.activeElement);
        });

        this.jQueryElement.find(".close").click(function () {
            removeTask(_this.jQueryElement);
        });

        var commonOption = {
            "grid": [0, taskGridHeight],
            "containment": "parent"
        };

        var taskWidth = this.jQueryElement.width();

        this.jQueryElement.draggable($.extend(commonOption, {
            "start": startDragEvent,
            "stop": stopEditingEvent,
            "drag": editTaskEvent
        }));

        // draggableが何故か"position: relative"をくっ付けるので削除
        // this.jQueryElement.css("position", "");
        this.jQueryElement.resizable($.extend(commonOption, {
            "handles": "n, s, ne, se, sw, nw",
            "start": startResizeEvent,
            "stop": stopEditingEvent,
            "resize": editTaskEvent,
            "maxWidth": taskWidth,
            "minWidth": taskWidth
        }));
    };

    TaskElement.prototype.clone = function () {
        var element = new TaskElement(this.timeSpan, this.jQueryElement.clone());
        return element;
    };

    TaskElement.prototype.remove = function () {
        this.container.remove(this);
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
        this.jQueryElementTemplate = $("#task-template");
        this.jQueryElementTemplate.removeAttr("id");
        this.jQueryElementTemplate.find(".task-type").text(Task.taskTypes[this.jQueryElementTemplate.data("task-type")]);
        this.jQueryElementTemplate.find(".task-name").empty();
        this.jQueryElementTemplate.find(".task-memo").empty();
        this.jQueryElementTemplate.remove();
    };
    return TaskElement;
})();

$(function () {
    TaskElement.prepareTemplate();
});
//# sourceMappingURL=TaskElement.js.map
