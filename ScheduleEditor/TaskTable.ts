/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />

"use strict";

class TaskTableColumn {
    public leftCell: JQuery;
    public timeCell: JQuery;
    public rightCell: JQuery;
    public time: Time;
}

class TaskTable {
    public static cellsPerHour: number;
    public static get minutesPerCell(): number { return 60 / TaskTable.cellsPerHour; }

    private jQueryLeftGrid: JQuery;
    public leftContainer: TaskElementContainer;

    private jQueryTimeGrid: JQuery;

    private jQueryRightGrid: JQuery;
    public rightContainer: TaskElementContainer;

    public static init(config: any) {
        TaskTable.cellsPerHour = config.cellsPerHour;
    }

    public constructor(private jQueryTable: JQuery) {
        this.jQueryLeftGrid = jQueryTable.find("#task-grid-left");
        this.jQueryTimeGrid = jQueryTable.find("#task-grid-time");
        this.jQueryRightGrid = jQueryTable.find("#task-grid-right");

        // テーブルの一番下のイベントで、タスクのアクティブ化解除
        // アクティブ化を解除されたくない場合は、適宜プロパゲーションを止めること
        jQueryTable.click(function () {
            taskElementContainer.activeElement = null;
        });

        // 新しくタスクを追加するためにグリッド選択後は、アクティブ化解除されませんように
        jQueryTable.find("#task-grid-right").click(function () { return false; });

        this.generateCells();

        jQueryTable.width(this.jQueryLeftGrid.outerWidth() + this.jQueryTimeGrid.outerWidth()+ this.jQueryRightGrid.outerWidth());

        this.rightContainer = new TaskElementContainer(jQueryTable.find("#task-list"));
        taskElementContainer = this.rightContainer;
    }

    private generateCells() {
        var fragmentLeft = $(document.createDocumentFragment());
        var fragmentHours = $(document.createDocumentFragment());
        var fragmentRight = $(document.createDocumentFragment());

        for (var i = 0; i < 24; i++) {
            for (var j = 0; j < 60; j += TaskTable.minutesPerCell) {
                var column = new TaskTableColumn();
                column.time = new Time(i, j);

                var inCoreTime = TimeSpan.coretime.includes(column.time);
                var hourStarts = (j == 0);
                

                column.leftCell = $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                    "data": {
                        "column": column,
                    }
                });
                column.rightCell = column.leftCell.clone(true);

                column.timeCell = $("<div />", {
                    "text": (hourStarts ? String(i) : ""),
                    "class": "time-cell" + (inCoreTime ? " core" : "") + (hourStarts ? " hour-starts" : ""),
                    "data": {
                        "column": column,
                    }
                })

                fragmentLeft.append(column.leftCell);
                fragmentRight.append(column.rightCell);
                fragmentHours.append(column.timeCell);
            }
        }

        this.jQueryLeftGrid.append(fragmentLeft);
        this.jQueryTimeGrid.append(fragmentHours);
        this.jQueryRightGrid.append(fragmentRight);

        taskGridHeight = Math.round(this.jQueryTable.find("#table-content .task-cell:first").outerHeight());
        taskGridHeightTotal = Math.round(this.jQueryRightGrid.height());

        this.jQueryTimeGrid.selectable({
            "start": (e: any, ui: any) => { },
            "stop": (e: any, ui: any) => { this.addTask(); return false; },
            "selecting": this.onTimeGridSelecting,
        });

        this.jQueryRightGrid.selectable({
            // .schedule-editorのmouseupでタスクを非アクティブにされないように
            "start": (e: any, ui: any) => {
                // this.leftContainer.activeElement = null;
                this.rightContainer.activeElement = null;
            },
            "stop": (e: any, ui: any) => { this.addTask(); return false; },
            "selecting": (ev: Event, ui: any) => { syncSelectableState(); },
        });
    }

    private syncSelectableState(from: JQuery, to: JQuery) {
        ["ui-selecting", "ui-selected"].forEach((cls) => {
            (from.hasClass(cls) ? to.addClass : to.removeClass)(cls);
        });
    }

    private onTimeGridSelecting(ev: Event, ui: any) { 
        var selectingColumn: TaskTableColumn = $(ui.selecting).data("column");
        selectingColumn.rightCell.addClass("ui-selecting");
    }

    private onRightGridSelecting(ev: Event, ui: any) {
        var selectingColumn: TaskTableColumn = $(ui.selecting).data("column");
        selectingColumn.timeCell.addClass("ui-selecting");
    }

    private addTask() {
        var selectedCells = $(".ui-selected");
        if (selectedCells.length <= 0) return;

        var selectedColumnBegin: TaskTableColumn = <TaskTableColumn>selectedCells.first().data("column");
        var selectedColumnEnd: TaskTableColumn = <TaskTableColumn>selectedCells.last().data("column");

        var timeBegin = selectedColumnBegin.time;
        var timeEnd = selectedColumnEnd.time.putForward(1);

        taskElementContainer.saveState();

        var newTask = new TaskElement(new TimeSpan(timeBegin, timeEnd));

        selectedCells.removeClass("ui-selected");

        taskElementContainer.add(newTask, true);
        taskElementContainer.balloon.show(newTask);
    }

}

