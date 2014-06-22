/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />
/// <reference path="Balloon.ts" />
"use strict";
var taskGridHeight;
var taskGridHeightTotal;

var initialTasks = [];

var taskElementContainer;

$(function () {
    $.fn.extend({
        "top": fn_top,
        "bottom": fn_bottom,
        "height": fn_height,
        "dataAttr": fn_dataAttr,
        "taskElement": fn_taskElement
    });

    $(".add-task").click(addTask);
    $(".output").click(output);
    $(".input").click(input);
    $(".clear").click(function () {
        taskElementContainer.clear();
    });
    $(".bench").click(function () {
        for (var i = 0; i < 1000; i++) {
            taskElementContainer.restore(initialTasks);
        }

        window.collectGarbage();
    });

    $(".schedule-editor-table").click(function () {
        return false;
    });

    // グリッドの外側をクリックしたら、タスクを非アクティブに
    $("#schedule-editor").click(function () {
        // このイベントが呼ばれるとタスクが非アクティブになるので、適宜stopPropagationすること
        taskElementContainer.activeElement = null;
    });

    //JSON.parse($("#initial-schedule").html()).forEach((v: any) => {
    //    initialTasks.push(Task.fromJSONObject(v));
    //});
    taskElementContainer = new TaskElementContainer($("#task-list"));

    initTable();

    taskElementContainer.restore(initialTasks);
});

var initTable = function () {
    var taskGrid = $("#task-grid");
    var nbsp = String.fromCharCode(160);

    var coreBegin = TimeSpan.coretime.begin.totalMinutes / TimeSpan.tableCellMinutes;
    var coreEnd = TimeSpan.coretime.end.totalMinutes / TimeSpan.tableCellMinutes;
    var fragment = $(document.createDocumentFragment());
    for (var i = 0, end = 24 * 60 / TimeSpan.tableCellMinutes; i < end; i++) {
        var inCoreTime = (coreBegin <= i) && (i < coreEnd);

        var cell = $("<div />", {
            "class": "grid-cell"
        }).appendTo(fragment);

        $("<div />", {
            "class": "task-cell" + (inCoreTime ? " core" : "")
        }).appendTo(cell);

        $("<div />", {
            "text": ((i % 2) ? nbsp : String(i / 2)),
            "class": "half-hour-cell" + (inCoreTime ? " core" : "")
        }).appendTo(cell);

        $("<div />", {
            "class": "task-cell" + (inCoreTime ? " core" : "")
        }).appendTo(cell);
    }

    taskGrid.append(fragment);

    taskGridHeight = Math.round($("#table-content .grid-cell:first").outerHeight());
    taskGridHeightTotal = Math.round(taskGrid.height());

    taskGrid.selectable({
        "filter": ".grid-cell",
        // .schedule-editorのmouseupでタスクを非アクティブにされないように
        "start": function (e, ui) {
            taskElementContainer.activeElement = null;
        },
        "stop": function (e, ui) {
            addTask();
        }
    });
};

var addTask = function () {
    var selectedCells = $(".ui-selected");
    if (selectedCells.length <= 0)
        return;

    var timeBegin = (selectedCells.first().top() / taskGridHeight / 2.0);
    var timeEnd = timeBegin + selectedCells.length / 2.0;

    taskElementContainer.saveState();

    // var newTask = createNewTask(top, height, taskTemplate);
    var newTask = new TaskElement(new TimeSpan(timeBegin, timeEnd));

    selectedCells.removeClass("ui-selected");

    taskElementContainer.add(newTask, true);
    taskElementContainer.balloon.show(newTask);
};

var startDragEvent = function (e, ui) {
    var curr = ui.helper;

    curr.data("original-top", ui.position.top);

    taskElementContainer.balloon.hide();
    taskElementContainer.activeElement = curr.taskElement();
};

var startResizeEvent = function (e, ui) {
    var curr = ui.helper;

    taskElementContainer.balloon.hide();
    taskElementContainer.activeElement = curr.taskElement();
};

var editTaskEvent = function (e, ui) {
    var curr = ui.helper;
    var originalTop = (e.type === "drag") ? curr.data("original-top") : ui.originalPosition.top;

    if (e.type === "resize") {
        // なんか下方向にはみ出るので、それを防止
        if (ui.originalPosition.top <= ui.position.top && ((ui.position.top >= ui.originalPosition.top + ui.originalSize.height) || (ui.size <= 0))) {
            curr.top(Math.min(ui.position.top, taskGridHeightTotal) - taskGridHeight);
            curr.height(taskGridHeight);
            return;
        }
    }

    // ここで設定しなくてもjQueryが勝手に設定してくれるが、一応ここで先に設定しておく
    ui.position.top = taskGridHeight * Math.round(ui.position.top / taskGridHeight);
    curr.top(ui.position.top);
    if (e.type === "resize") {
        curr.height(ui.size.height);
    }

    if ((e.type === "drag") || ((e.type === "resize") && (ui.size.height > ui.originalSize.height))) {
        // 高さの小さい要素をマウスでサッと移動させようとすると、一気に移動するために他の要素の中に入り込む可能性がある
        // そこで、元の位置・サイズから移動先の位置・サイズまでのスペースを考えて、その範囲には今弄っている要素以外に何も要素が来ないよう、他の要素をずらす
        if (ui.position.top < originalTop) {
            // 上に伸びる方向に高さが変化したか、上に移動させた
            adjustPositionUpward(curr, ui.position.top, originalTop + curr.height());
        } else {
            // 下に伸びる方向に高さが変化したか、下に移動させた
            adjustPositionDownward(curr, originalTop, ui.position.top + curr.height());
        }
    }

    setTaskBorder(curr, ui.position.top);
    // refreshTaskTimeText(curr);
};

var stopEditingEvent = function (e, ui) {
    taskElementContainer.balloon.show(taskElementContainer.activeElement);
};

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

// 移植済み
var originalHeight = $.fn.height;
var fn_height = function (height) {
    if (height !== undefined) {
        if (height === 0)
            throw new Error("Try to set zero to height.");
        return originalHeight.apply(this, arguments);
    } else {
        var result = originalHeight.apply(this, arguments);
        if (height === 0)
            throw new Error("'height' property is somehow zero.");
        return result;
    }
};

// *** 移植済み？ ***
// 引数なしの時は、cssのtopを返す
// 引数があるときは、その値をcssのtopに設定
// マイナスの値を設定しようとしたり、グリッドの高さを超えそうなときは適宜設定
var fn_top = function (top) {
    if (top !== undefined) {
        top = Math.round(top);
        var newBottom = Math.round(top + this.height());

        if (top <= 0) {
            var newHeight = newBottom;

            if (newHeight <= 0) {
                this.remove();
                return null;
            } else {
                this.css("top", 0);
                this.height(newHeight);

                setTaskBorder(this, 0);
                return 0;
            }
        } else if (newBottom > taskGridHeightTotal) {
            var newHeight = Math.round(taskGridHeightTotal - top);

            if (newHeight <= 0) {
                this.remove();
                return null;
            } else {
                this.height(newHeight);
            }
        }

        this.css("top", top);
        setTaskBorder(this, top);

        return this;
    } else {
        if (this.css("display") === "none")
            throw new Error("Try to access 'top' property though this is invisible.");
        return Math.round(this.position().top);
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

// *** 移植済み ***
// top+heightの高さを返す
var fn_bottom = function () {
    if (this.css("display") === "none")
        throw new Error("Try to access 'bottom' property of an invisible element.");
    return Math.round(this.top() + this.height());
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
