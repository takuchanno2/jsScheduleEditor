/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />

"use strict";

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
        [this.jQueryTimeGrid, this.jQueryRightGrid].forEach((grid) => {
            grid.click(function () {
                return false;
            });
        });

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

        this.jQueryLeftGrid.append(fragmentLeft);
        this.jQueryTimeGrid.append(fragmentHours);
        this.jQueryRightGrid.append(fragmentRight);

        taskGridHeight = Math.round(this.jQueryTable.find("#table-content .task-cell:first").outerHeight());
        taskGridHeightTotal = Math.round(this.jQueryRightGrid.height());

        this.jQueryTimeGrid.selectable({
            "start": (e: any, ui: any) => { this.rightContainer.activeElement = null; },
            "stop": (e: any, ui: any) => { this.addTask(); return false; },
        });

        this.jQueryRightGrid.selectable({
            // .schedule-editorのmouseupでタスクを非アクティブにされないように
            "start": (e: any, ui: any) => {
                // this.leftContainer.activeElement = null;
                this.rightContainer.activeElement = null;
            },
            "stop": (e: any, ui: any) => { this.addTask(); return false; },
        });

        [this.jQueryTimeGrid, this.jQueryRightGrid].forEach((grid) => {
            ["selecting", "selected", "unselecting", "unselected"].forEach((evstr) => {
                grid.on("selectable" + evstr, (ev: Event, ui: any) => { this.syncSelectableState($(ui[evstr])); });
            });
        });
    }

    private syncSelectableState(obj: JQuery) {
        var counterCell: JQuery = obj.data("counter-cell");
        ["ui-selecting", "ui-selected"].forEach((cls) => {
            //if (obj.hasClass(cls)) {
            //    counterCell.addClass(cls);
            //} else {
            //    counterCell.removeClass(cls);
            //}

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

        taskElementContainer.add(newTask, true);
        taskElementContainer.balloon.show(newTask);
    }

}

