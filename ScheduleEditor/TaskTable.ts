/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />

"use strict";

class TaskTable {
    public static cellsPerHour: number;
    public static get minutesPerCell(): number { return 60 / TaskTable.cellsPerHour; }

    private balloon: Balloon;
    private _activeElement: TaskElement;

    private jQueryFixedGrid: JQuery;
    private jQueryTimeGrid: JQuery;
    private jQueryEditableGrid: JQuery;

    private fixedElementContainer: TaskElementContainer;
    /*private*/ public editableElementContainer: TaskElementContainer;

    public static init(config: any) {
        TaskTable.cellsPerHour = config.cellsPerHour;
    }

    public constructor(private jQueryTable: JQuery) {
        this.jQueryFixedGrid = jQueryTable.find("#task-grid-fixed");
        this.jQueryTimeGrid = jQueryTable.find("#task-grid-time");
        this.jQueryEditableGrid = jQueryTable.find("#task-grid-editable");

        this.balloon = new Balloon();
        this.balloon.onOkButtonClicked = this.onBalloonOkButtonClicked;
        this.balloon.onCancelButtonClicked = this.onBalloonCancelButtonClicked;
        this.balloon.onDeleteButtonClicked = this.onBalloonDeleteButtonClicked;

        // テーブルの一番下のイベントで、タスクのアクティブ化解除
        // アクティブ化を解除されたくない場合は、適宜プロパゲーションを止めること
        jQueryTable.click(function () {this.activeElement = null; });

        // 新しくタスクを追加するためにグリッド選択後は、アクティブ化解除されませんように
        [this.jQueryTimeGrid, this.jQueryEditableGrid].forEach((grid) => {
            grid.click(function () { return false; });
        });

        this.generateCells();

        jQueryTable.width(this.jQueryFixedGrid.outerWidth() + this.jQueryTimeGrid.outerWidth()+ this.jQueryEditableGrid.outerWidth());

        this.editableElementContainer = new TaskElementContainer(this, jQueryTable.find("#task-list"));
        taskElementContainer = this.editableElementContainer;
    }

    private generateCells() {
        var fragmentLeft = $(document.createDocumentFragment());
        var fragmentHours = $(document.createDocumentFragment());
        var fragmentRight = $(document.createDocumentFragment());

        for (var i = 0; i < 24; i++) {
            for (var j = 0; j < 60; j += TaskTable.minutesPerCell) {
                var time = new Time(i, j);
                var inCoreTime = TimeSpan.coretime.includes(time);
                var hourStarts = (j == 0);

                var leftCell = $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                    "data": {
                        "time": time,
                    }
                });

                var timeCell = $("<div />", {
                    "text": (hourStarts ? String(i) : ""),
                    "class": "time-cell" + (inCoreTime ? " core" : "") + (hourStarts ? " hour-starts" : ""),
                    "data": {
                        "time": time,
                    }
                });

                var rightCell = leftCell.clone(true);

                rightCell.data("counter-cell", timeCell);
                timeCell.data("counter-cell", rightCell);

                fragmentLeft.append(leftCell);
                fragmentRight.append(rightCell);
                fragmentHours.append(timeCell);
            }
        }

        this.jQueryFixedGrid.append(fragmentLeft);
        this.jQueryTimeGrid.append(fragmentHours);
        this.jQueryEditableGrid.append(fragmentRight);

        taskGridHeight = Math.round(this.jQueryTable.find("#table-content .task-cell:first").outerHeight());
        taskGridHeightTotal = Math.round(this.jQueryEditableGrid.height());

        this.jQueryTimeGrid.selectable({
            "start": (e: any, ui: any) => { this.activeElement = null; },
            "stop": (e: any, ui: any) => { this.addTask(); return false; },
        });

        this.jQueryEditableGrid.selectable({
            // .schedule-editorのmouseupでタスクを非アクティブにされないように
            "start": (e: any, ui: any) => {
                this.activeElement = null;
            },
            "stop": (e: any, ui: any) => { this.addTask(); return false; },
        });

        [this.jQueryTimeGrid, this.jQueryEditableGrid].forEach((grid) => {
            ["selecting", "selected", "unselecting", "unselected"].forEach((evstr) => {
                grid.on("selectable" + evstr, (ev: Event, ui: any) => { this.syncSelectableState($(ui[evstr])); });
            });
        });
    }

    private syncSelectableState(obj: JQuery) {
        var counterCell: JQuery = obj.data("counter-cell");
        ["ui-selecting", "ui-selected"].forEach((cls) => {
            (obj.hasClass(cls) ? $.fn.addClass : $.fn.removeClass).call(counterCell, cls);
        });
    }

    private addTask() {
        var selectedCells = $(".ui-selected");
        if (selectedCells.length <= 0) return;

        var timeBegin = <Time>selectedCells.first().data("time");
        var timeEnd = (<Time>selectedCells.last().data("time")).putForward(1);

        taskElementContainer.saveState();

        var newTask = new TaskElement(new TimeSpan(timeBegin, timeEnd));

        selectedCells.removeClass("ui-selected");

        this.editableElementContainer.add(newTask);
        this.activeElement = newTask;
    }

    public clearEditingTaskElements() {
        if (this.activeElement && this.activeElement.container === this.editableElementContainer) {
            this.activeElement = null;
        }

        this.editableElementContainer.clear();
    }

    private onBalloonOkButtonClicked(el: TaskElement, ev: JQueryEventObject) {
        this.activeElement = null;
    }

    private onBalloonCancelButtonClicked(el: TaskElement, ev: JQueryEventObject) {
        // ここら辺は後ほどうまいことやる
        this.editableElementContainer.rollbackState();
    }

    private onBalloonDeleteButtonClicked(el: TaskElement, ev: JQueryEventObject){
        if (el === this.activeElement && el.container === this.editableElementContainer) {
            this.activeElement = null;
        }
        
         // ここら辺は後ほどうまいことやる
        this.editableElementContainer.remove(el);
    }

    public get activeElement(): TaskElement {
        return this._activeElement;
    }

    public set activeElement(value: TaskElement) {
        if (this._activeElement) {
            this._activeElement.active = false;
        }

        this._activeElement = value;
        if (value) {
            this._activeElement.active = true;
            this.balloon.show(value);
        } else {
            this.balloon.hide();
        }
    }
}

