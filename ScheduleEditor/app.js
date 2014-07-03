﻿/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />
/// <reference path="Balloon.ts" />
/// <reference path="TaskTable.ts" />
"use strict";
var taskGridHeight;
var taskGridHeightTotal;

var taskTable;
var taskElementContainer;

$(function () {
    $.fn.extend({
        "dataAttr": fn_dataAttr,
        "taskElement": fn_taskElement
    });

    $(".output").click(output);
    $(".input").click(input);
    $(".clear").click(function () {
        taskTable.clearEditingTaskElements();
    });
    $(".bench").click(function () {
        for (var i = 0; i < 1000; i++) {
            taskElementContainer.restore(initialTasks);
        }

        window.collectGarbage();
    });

    var config = JSON.parse($("#config").html());

    TaskTable.init(config);
    TimeSpan.init(config);
    Task.init(config);
    TaskElement.prepareTemplate();

    Task.taskTypes = JSON.parse($("#task-types").html());

    taskTable = new TaskTable($("#schedule-editor-table"));

    var initialTasks = [];
    JSON.parse($("#initial-schedule").html()).forEach(function (v) {
        initialTasks.push(Task.fromJSONObject(v));
    });

    // taskTable.leftContainer.restore(initialTasks);
    taskTable.editableElementContainer.restore(initialTasks);
});

//var startDragEvent = function (e: any, ui: any) {
//    var curr: JQuery = ui.helper;
//    curr.data("original-top", ui.position.top);
//    taskElementContainer.balloon.hide();
//    taskElementContainer.activeElement = curr.taskElement();
//};
//var startResizeEvent = function (e: any, ui: any) {
//    var curr: JQuery = ui.helper;
//    taskElementContainer.balloon.hide();
//    taskElementContainer.activeElement = curr.taskElement();
//};
//var editTaskEvent = function (e: any, ui: any) {
//    var curr = ui.helper; // 今、移動orサイズ変更しようとしている要素
//    var originalTop = (e.type === "drag") ? curr.data("original-top") : ui.originalPosition.top;
//    if (e.type === "resize") {
//        // なんか下方向にはみ出るので、それを防止
//        if (ui.originalPosition.top <= ui.position.top && ( // 引き下げている途中
//            (ui.position.top >= ui.originalPosition.top + ui.originalSize.height) || // 元の位置より下に行かない
//            (ui.size <= 0)
//            )) {
//            curr.top(Math.min(ui.position.top, taskGridHeightTotal) - taskGridHeight);
//            curr.height(taskGridHeight);
//            return;
//        }
//    }
//    // ここで設定しなくてもjQueryが勝手に設定してくれるが、一応ここで先に設定しておく
//    ui.position.top = taskGridHeight * Math.round(ui.position.top / taskGridHeight);
//    curr.top(ui.position.top);
//    if (e.type === "resize") {
//        curr.height(ui.size.height);
//    }
//    if ((e.type === "drag") ||
//        ((e.type === "resize") && (ui.size.height > ui.originalSize.height))) {
//        // 高さの小さい要素をマウスでサッと移動させようとすると、一気に移動するために他の要素の中に入り込む可能性がある
//        // そこで、元の位置・サイズから移動先の位置・サイズまでのスペースを考えて、その範囲には今弄っている要素以外に何も要素が来ないよう、他の要素をずらす
//        if (ui.position.top < originalTop) {
//            // 上に伸びる方向に高さが変化したか、上に移動させた
//            adjustPositionUpward(curr, ui.position.top, originalTop + curr.height());
//        } else {
//            // 下に伸びる方向に高さが変化したか、下に移動させた
//            adjustPositionDownward(curr, originalTop, ui.position.top + curr.height());
//        }
//    }
//    setTaskBorder(curr, ui.position.top);
//    // refreshTaskTimeText(curr);
//};
//var stopEditingEvent = function (e: any, ui: any) {
//    taskElementContainer.balloon.show(taskElementContainer.activeElement);
//};
var sortByTopInAsc = function (a, b) {
    return ($(a).top() - $(b).top());
};
var sortByTopInDesc = function (a, b) {
    return ($(b).top() - $(a).top());
};

// 要素elmが、top～bottomの間のスペースを確保していると考えて、それより下の要素を適当にずらす
var adjustPositionDownward = function (elm, top, bottom) {
    // 自分より下で、上に配置されている方が先に来るようにソート
    var tasks = $(".task").filter(function () {
        return (this !== elm[0]) && (top <= $(this).top());
    }).toArray().sort(sortByTopInAsc);

    // currより下の要素と重なりがないか確認
    var cb = bottom;
    for (var j = 0; j < tasks.length; j++) {
        for (var i = j; i < tasks.length; i++) {
            var n = $(tasks[i]);
            var nt = $(tasks[i]).top();
            if (nt < cb) {
                var newTop = nt + (cb - nt);
                if (n.top(newTop) !== null) {
                    break;
                }
            }
        }

        cb = $(tasks[j]).bottom();
    }
};

// 要素elmが、top～bottomの間のスペースを確保していると考えて、それより上の要素を適当にずらす
var adjustPositionUpward = function (elm, top, bottom) {
    // 自分より上で、下に配置されている方が先に来るようにソート
    var tasks = $(".task").filter(function () {
        return (this !== elm[0]) && ($(this).bottom() <= bottom);
    }).toArray().sort(sortByTopInDesc);

    // currより上の要素と重なりがないか確認
    var ct = top;
    for (var j = 0; j < tasks.length; j++) {
        for (var i = j; i < tasks.length; i++) {
            var n = $(tasks[i]);
            var nt = n.top();
            var no = n.bottom();

            if (ct < no) {
                var newTop = nt - (no - ct);
                if (n.top(newTop) !== null) {
                    break;
                }
            }
        }

        ct = $(tasks[j]).top(); // current top
    }
};

var setTaskBorder = function (elm, top) {
    if (top === undefined) {
        top = elm.top();
    }

    if (top <= 0) {
        // 先頭要素には上のボーダーを消す
        elm.children(".task-content").addClass("topmost");
    } else {
        // 先頭要素以外では上のボーダーを付ける
        elm.children(".task-content").removeClass("topmost");
    }
};

var fn_dataAttr = function (key, value) {
    if (value !== undefined) {
        this.data(key, value);
        this.attr("data-" + key, value);
        return this;
    } else {
        return this.attr("data-" + key);
    }
};

var fn_taskElement = function () {
    return this.data("task-element");
};

var output = function () {
    var out = $("#out");
    out.text(JSON.stringify(taskElementContainer.dump(), null, "  "));
    /*
    out.empty();
    $(".task").each(function () {
    out.append($(this).text() + "<br />");
    });
    */
};

var input = function () {
    var tasksJSON = JSON.parse($("#out").text());
    var tasks = [];

    tasksJSON.forEach(function (v) {
        tasks.push(Task.fromJSONObject(v));
    });

    taskElementContainer.restore(tasks);
};

// jsdoのログエリアにログを吐く
function log() {
    console.log(arguments);

    var logarea = $("#log");
    $("<li>", {
        text: $.makeArray(arguments).join(" ")
    }).prependTo(logarea);
}
;
//# sourceMappingURL=app.js.map
