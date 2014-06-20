/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElementContainer.ts" />

"use strict";

enum GeometricRelation {
    unrelated, equal, upside, downside, inside, outside,
}

class TaskElement {
    private static jQueryElementTemplate: JQuery;

    private _taskType: number;
    private _timeSpan: TimeSpan;

    private typeLabel: JQuery;
    private nameLabel: JQuery;
    private memoLabel: JQuery;
    private timeBeginLabel: JQuery;
    private timeEndLabel: JQuery;
    private timeSpanLabel: JQuery;

    public onClicked: (el: TaskElement, ev: JQueryEventObject) => any = $.noop;
    public onMousePressed: (el: TaskElement, ev: JQueryMouseEventObject) => any = $.noop;
    public onCloseButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = $.noop;

    public constructor(timeSpan: TimeSpan, public jQueryElement: JQuery = null) {
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

    public get type(): number { return this._taskType; }
    public get typeString(): string { return Task.taskTypes[this.type]; }
    public set type(value: number) {
        this._taskType = value;
        this.typeLabel.text(this.typeString);
        this.jQueryElement.attr("data-task-type", value);
    }

    public get name(): string { return this.nameLabel.text(); }
    public set name(value: string) { this.nameLabel.text(value); }

    public get memo(): string { return this.memoLabel.text(); }
    public set memo(value: string) { this.memoLabel.text(value); }

    public get timeSpan(): TimeSpan {　return this._timeSpan;　}
    public set timeSpan(value: TimeSpan) {
        this._timeSpan = value;

        this.top = taskGridHeight * (value.begin - TimeSpan.scheduleTime.begin) * 2;
        this.height = taskGridHeight * (value.span) * 2;

        this.timeBeginLabel.text(value.beginString);
        this.timeEndLabel.text(value.endString);
        this.timeSpanLabel.text(value.span.toFixed(1));
    }

    public applyPositionToTimeSpan() {
        throw new Error();
    }

    public get active(): boolean { return this.jQueryElement.hasClass("active"); }
    public set active(value: boolean) {
        if (value) {
            this.jQueryElement.addClass("active");
        } else {
            this.jQueryElement.removeClass("active");
        }
    }

    public get top(): number {
        return Math.round(this.jQueryElement.position().top);
    }

    public set top(value: number) {
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
    }

    public get bottom(): number {
        return Math.round(this.top + this.height);
    }

    public get height(): number {
        var height = this.jQueryElement.height();
        if (height === 0) throw new Error("The height is somehow zero.");
        return Math.round(height);
    }

    public set height(value: number) {
        if (value === 0) throw new Error("Tried to set height zero.");
        this.jQueryElement.height(value);
    }

    // 上で交差してる: "upside"
    // 下で交差してる: "downside"
    // 含んでいる: "outside"
    // 含まれている: "inside"
    // 関係なし: "unrelated"
    public getGeometricRelation(counterpart: TaskElement): GeometricRelation {
        if (this.timeSpan.begin == counterpart.timeSpan.begin) {
            if (this.timeSpan.end < counterpart.timeSpan.end) {
                return GeometricRelation.inside;
            } else if (this.timeSpan.end > counterpart.timeSpan.end) {
                return GeometricRelation.outside;
            } else {
                return GeometricRelation.equal;
            }
        } else if (this.timeSpan.begin > counterpart.timeSpan.begin) {
            if (this.timeSpan.end <= counterpart.timeSpan.end) {
                return GeometricRelation.inside;
            } else if (this.timeSpan.begin < counterpart.timeSpan.end) {
                return GeometricRelation.upside;
            } else {
                return GeometricRelation.unrelated;
            }
        } else {
            if (this.timeSpan.end >= counterpart.timeSpan.end) {
                return GeometricRelation.outside;
            } else if (this.timeSpan.end > counterpart.timeSpan.begin) {
                return GeometricRelation.downside;
            } else {
                return GeometricRelation.unrelated;
            }
        }
    }

    //　jQueryの要素にイベントを登録する
    public registerDefaultEvents() {
        this.jQueryElement.mousedown((ev) => this.onMousePressed(this, ev));
        this.jQueryElement.click((ev) => this.onClicked(this, ev));
        this.jQueryElement.find(".close").click((ev) => this.onCloseButtonClicked(this, ev));

        var commonOption = {
            "grid": [0, taskGridHeight],
            "containment": "parent",
        };

        var taskWidth = this.jQueryElement.width();

        this.jQueryElement.draggable($.extend(commonOption, {
            "start": startDragEvent,
            "stop": stopEditingEvent,
            "drag": editTaskEvent,
        }));

        this.jQueryElement.resizable($.extend(commonOption, {
            "handles": "n, s, ne, se, sw, nw",
            "start": startResizeEvent,
            "stop": stopEditingEvent,
            "resize": editTaskEvent,
            "maxWidth": taskWidth,
            "minWidth": taskWidth,
        }));
    }

    public clone(): TaskElement {
        var element = new TaskElement(this.timeSpan, this.jQueryElement.clone());
        return element;
    }

    public toTask(): Task {
        return new Task(this.type, this.name, this.timeSpan, this.memo);
    }

    public static fromTask(task: Task): TaskElement {
        var element = new TaskElement(task.timeSpan);
        element.type = task.type;
        element.name = task.name;
        element.memo = task.memo;
        return element;
    }

    public static prepareTemplate() {
        this.jQueryElementTemplate = $("#task-template");
        this.jQueryElementTemplate.removeAttr("id");
        this.jQueryElementTemplate.find(".task-type").text(Task.taskTypes[this.jQueryElementTemplate.data("task-type")]);
        this.jQueryElementTemplate.find(".task-name").empty();
        this.jQueryElementTemplate.find(".task-memo").empty();
        this.jQueryElementTemplate.remove();
    }
}

$(function () {
    TaskElement.prepareTemplate();
});
