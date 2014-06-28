/// <reference path="Scripts/typings/jquery/jquery.d.ts" />

"use strict";

class TaskTable {
    public static cellsPerHour: number;
    public static get minutesPerCell(): number { return 60 / TaskTable.cellsPerHour; }

    public static init(config: any) {
        TaskTable.cellsPerHour = config.cellsPerHour;
    }

    public constructor(private jQueryTable: JQuery) {
        // テーブルの一番下のイベントで、タスクのアクティブ化解除
        // アクティブ化を解除されたくない場合は、適宜プロパゲーションを止めること
        jQueryTable.click(function () {
            taskElementContainer.activeElement = null;
        });

        // 新しくタスクを追加するためにグリッド選択後は、アクティブ化解除されませんように
        jQueryTable.find("#task-grid-right").click(function () { return false; });
    }
}

