/// <reference path="Scripts/typings/jquery/jquery.d.ts" />

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
                var time = new Time(i, j);
                var inCoreTime = TimeSpan.coretime.includes(time);
                var hourStarts = (j == 0);

                $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                    "data": { "time": time, }
                }).appendTo(fragmentLeft);

                $("<div />", {
                    "text": (hourStarts ? String(i) : ""),
                    "class": "half-hour-cell" + (inCoreTime ? " core" : "") + (hourStarts ? " hour-starts" : ""),
                    "data": { "time": time, }
                }).appendTo(fragmentHours);

                $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                    "data": { "time": time, }
                }).appendTo(fragmentRight);
            }
        }

        this.jQueryLeftGrid.append(fragmentLeft);
        this.jQueryTimeGrid.append(fragmentHours);
        this.jQueryRightGrid.append(fragmentRight);

        taskGridHeight = Math.round(this.jQueryTable.find("#table-content .task-cell:first").outerHeight());
        taskGridHeightTotal = Math.round(this.jQueryRightGrid.height());

        this.jQueryRightGrid.selectable({
            "filter": ".task-cell",
            // .schedule-editorのmouseupでタスクを非アクティブにされないように
            "start": (e: any, ui: any) => {
                // this.leftContainer.activeElement = null;
                this.rightContainer.activeElement = null;
            },
            "stop": (e: any, ui: any) => { addTask(); return false },
        });
    }
}

