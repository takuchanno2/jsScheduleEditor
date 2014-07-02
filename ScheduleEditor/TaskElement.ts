/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElementContainer.ts" />

"use strict";

enum GeometricRelation {
    unrelated, equal, upside, downside, inside, outside,
}

class TaskElement {
    public container: TaskElementContainer;

    private static jQueryElementTemplate: JQuery;

    private _taskType: number;
    private _timeSpan: TimeSpan;

    private typeLabel: JQuery;
    private nameLabel: JQuery;
    private memoLabel: JQuery;
    private timeBeginLabel: JQuery;
    private timeEndLabel: JQuery;
    private timeSpanLabel: JQuery;

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
    public get typeString(): string { return Task.taskTypes[this.type].name; }
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
    }

    public get top2(): number {
        return Math.floor(this._timeSpan.begin.totalMinutes / TaskTable.minutesPerCell);
    }

    public get bottom2(): number {
        return Math.floor(this._timeSpan.end.totalMinutes / TaskTable.minutesPerCell);
    }

    public get height2(): number {
        return Math.floor(this._timeSpan.span.totalMinutes / TaskTable.minutesPerCell);
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

    //　jQueryの要素にイベントを登録する
    public registerDefaultEvents() {
        this.jQueryElement.mousedown((ev) => { if(this.container) return this.container.onElementMousePressed(this, ev) });
        this.jQueryElement.click((ev) => { if (this.container) return this.container.onElementClicked(this, ev) });
        this.jQueryElement.find(".close").click((ev) => { if (this.container) return this.container.onElementCloseButtonClicked(this, ev) });

        var commonOption = {
            "grid": [0, taskGridHeight],
            "containment": "parent",
        };

        var taskWidth = this.jQueryElement.width();

        this.jQueryElement.draggable($.extend(commonOption, {
            "start": startDragEvent,
            "stop": stopEditingEvent,
            "drag": editTaskEvent,
            "scroll": true,
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
        return new TaskElement(this.timeSpan, this.jQueryElement.clone());
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
        this.jQueryElementTemplate = $($.parseHTML($("#task-template").html().trim()));
        this.jQueryElementTemplate.find(".task-type").text(Task.taskTypes[this.jQueryElementTemplate.data("task-type")].name);
        this.jQueryElementTemplate.find(".task-name").empty();
        this.jQueryElementTemplate.find(".task-memo").empty();
        this.jQueryElementTemplate.remove();
    }
}

