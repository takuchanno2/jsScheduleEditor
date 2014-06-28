/// <reference path="Scripts/typings/jquery/jquery.d.ts" />

"use strict";

class TaskTable {
    public static cellsPerHour: number;
    public static get minutesPerCell(): number { return 60 / TaskTable.cellsPerHour; }

    private jQueryLeftGrid: JQuery;
    private jQueryRightGrid: JQuery;

    public static init(config: any) {
        TaskTable.cellsPerHour = config.cellsPerHour;
    }

    public constructor(private jQueryTable: JQuery) {
        this.jQueryLeftGrid = jQueryTable.find("#task-grid-left");
        this.jQueryRightGrid = jQueryTable.find("#task-grid-right");

        // テーブルの一番下のイベントで、タスクのアクティブ化解除
        // アクティブ化を解除されたくない場合は、適宜プロパゲーションを止めること
        jQueryTable.click(function () {
            taskElementContainer.activeElement = null;
        });

        // 新しくタスクを追加するためにグリッド選択後は、アクティブ化解除されませんように
        jQueryTable.find("#task-grid-right").click(function () { return false; });

        this.generateCells();
    }

    private generateCells() {
        var nbsp = String.fromCharCode(160);
        var fragmentLeft = $(document.createDocumentFragment());
        var fragmentRight = $(document.createDocumentFragment());

        for (var i = 0; i < 24; i++) {
            for (var j = 0; j < 60; j += TaskTable.minutesPerCell) {
                var time = new Time(i, j);
                var inCoreTime = TimeSpan.coretime.includes(time);
                var hourStarts = (j == 0);

                var leftCells = $("<div />", {
                    "class": "grid-cell",
                    "data": {
                        "time": time,
                    }
                }).appendTo(fragmentLeft);

                $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                }).appendTo(leftCells);

                var rightCells = $("<div />", {
                    "class": "grid-cell",
                    "data": {
                        "time": time,
                    }
                }).appendTo(fragmentRight);

                $("<div />", {
                    "text": (hourStarts ? String(i) : nbsp),
                    "class": "half-hour-cell" + (inCoreTime ? " core" : "") + (hourStarts ? " hour-starts" : ""),
                }).appendTo(rightCells);

                $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                }).appendTo(rightCells);
            }
        }

        this.jQueryLeftGrid.append(fragmentLeft);
        this.jQueryRightGrid.append(fragmentRight);

        taskGridHeight = Math.round($("#table-content .grid-cell:first").outerHeight());
        taskGridHeightTotal = Math.round(this.jQueryRightGrid.height());

        this.jQueryRightGrid.selectable({
            "filter": ".grid-cell",
            // .schedule-editorのmouseupでタスクを非アクティブにされないように
            "start": function (e: any, ui: any) { taskElementContainer.activeElement = null; },
            "stop": function (e: any, ui: any) { addTask(); return false },
        });
    }
}

