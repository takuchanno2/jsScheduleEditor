/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />
var TimeSpan = (function () {
    function TimeSpan(begin, end) {
        this.begin = begin;
        this.end = end;
    }
    return TimeSpan;
})();

var Task = (function () {
    function Task(type, name, timespan, memo) {
        this.type = type;
        this.name = name;
        this.timespan = timespan;
        this.memo = memo;
    }
    return Task;
})();

var taskGridHeight;
var taskGridHeightTotal;
var taskTemplate;

var lastState = null;

$(function () {
    $.fn.extend({
        "top": fn_top,
        "bottom": fn_bottom,
        "height": fn_height,
        "dataAttr": fn_dataAttr,
        "geometricRelation": fn_geometricRelation
    });

    $(".add-task").click(addTask);
    $(".output").click(output);
    $(".input").click(input);
    $(".clear").click(clearTasks);

    $(".schedule-editor-table").click(function () {
        return false;
    });

    // グリッドの外側をクリックしたら、タスクを非アクティブに
    $("#schedule-editor").click(function () {
        // このイベントが呼ばれるとタスクが非アクティブになるので、適宜stopPropagationすること
        activateTask(null);
    });

    initTaskTemplate();
    initTable();
    initBalloon();

    restoreTasks(initialSchedule);
});

var initTaskTemplate = function () {
    taskTemplate = $("#task-template");
    taskTemplate.removeAttr("id");
    taskTemplate.find(".task-name").empty();
    taskTemplate.find(".task-memo").empty();
    taskTemplate.remove();
};

var initTable = function () {
    var taskGrid = $("#task-grid");
    var nbsp = String.fromCharCode(160);

    var coreBegin = Math.round(coreTimeSpan[0] * 2);
    var coreEnd = Math.round(coreTimeSpan[1] * 2);
    var fragment = $(document.createDocumentFragment());
    for (var i = Math.round(scheduleTimeSpan[0] * 2), end = Math.round(scheduleTimeSpan[1] * 2); i < end; i++) {
        var inCoreTime = (coreBegin <= i) && (i < coreEnd);

        var cell = $("<div />", {
            "class": "grid-cell"
        }).appendTo(fragment);

        $("<div />", {
            "text": ((i % 2) ? nbsp : String(i / 2)),
            "class": "half-hour-cell" + (inCoreTime ? " core" : "")
        }).appendTo(cell);

        $("<div />", {
            "class": "task-cell" + (inCoreTime ? " core" : "")
        }).appendTo(cell);
    }

    taskGrid.append(fragment);

    taskGridHeight = Math.round($(".grid-cell:first").outerHeight());
    taskGridHeightTotal = Math.round(taskGrid.height());

    taskGrid.selectable({
        "filter": ".grid-cell",
        // .schedule-editorのmouseupでタスクを非アクティブにされないように
        "start": function (e, ui) {
            activateTask(null);
        },
        "stop": function (e, ui) {
            addTask();
        }
    });
};

var timeValueToString = function (tv) {
    return Math.floor(tv / 2) + ":" + ((tv % 2) ? "30" : "00");
};

var initBalloon = function () {
    var realtimeEvents = "keydown keyup keypress change";
    var taskTypeBox = $("#balloon-task-type");
    var taskNameBox = $("#balloon-task-name");

    taskTypeBox.change(function () {
        var value = $(this).val();
        $(".task.active").dataAttr("task-type", value);
        $(".task.active .task-type").text(taskTypes[value]);
        $("#balloon-task-name").autocomplete({
            "source": taskAutoComplete[value],
            "minLength": 0
        });
    });

    $("#balloon-task-name").focus(function () {
        taskNameBox.autocomplete("search");
    });

    taskNameBox.on(realtimeEvents, function () {
        $(".task.active .task-name").text($(this).val());
    });
    $("#balloon-task-memo").on(realtimeEvents, function () {
        $(".task.active .task-memo").text($(this).val());
    });

    $("#balloon-time-begin").change(function () {
        balloonTimeBoxChanged(true);
    });
    $("#balloon-time-end").change(function () {
        balloonTimeBoxChanged(false);
    });

    $("#balloon-ok-button").click(function () {
        activateTask(null);
    });
    $("#balloon-cancel-button").click(function () {
        if (lastState)
            restoreTasks(lastState);
        lastState = null;
    });
    $("#balloon-delete-button").click(function () {
        removeTask($(".task.active"));
    });

    // タスクの種類のコンボボックスを作る
    taskTypes.forEach(function (val, i) {
        $("<option>", {
            "text": val,
            "value": String(i)
        }).appendTo(taskTypeBox);
    });

    // 時間を選択するコンボボックスを作る
    var timeBegin = Math.round(scheduleTimeSpan[0] * 2);
    var timeEnd = Math.round(scheduleTimeSpan[1] * 2);
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");
    for (var i = timeBegin; i <= timeEnd; i++) {
        var option = $("<option>", {
            "text": timeValueToString(i),
            "value": String(i)
        });

        if (i < timeEnd) {
            option.clone().appendTo(timeBeginBox);
        }
        if (i > timeBegin) {
            option.clone().appendTo(timeEndBox);
        }
    }
};

var balloonTimeBoxChanged = function (changedBeginTime) {
    var task = $(".task.active");
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");
    var timeSpanBox = $("#balloon-time-span");
    var timeBegin = parseInt(timeBeginBox.val());
    var timeEnd = parseInt(timeEndBox.val());

    if (timeBegin > timeEnd) {
        timeBeginBox.val(String(timeEnd));
        timeEndBox.val(String(timeBegin));
    } else if (timeBegin === timeEnd) {
        if (changedBeginTime) {
            timeEndBox.val(String(timeBegin + 1));
        } else {
            timeBeginBox.val(String(timeEnd - 1));
        }
    }

    var scheduleBegin = Math.round(scheduleTimeSpan[0] * 2);

    timeBegin = timeBeginBox.val();
    timeEnd = timeEndBox.val();

    // 時間修正前の開始時間・終了時間
    var lastTimeSpan = getTimeSpanFromPosition(task);
    var newTop = taskGridHeight * (timeBegin - scheduleBegin);
    var newHeight = taskGridHeight * (timeEnd - timeBegin);

    if (timeBegin < lastTimeSpan[0]) {
        adjustPositionUpward(task, newTop, newTop + newHeight);
    }
    if (timeEnd > lastTimeSpan[1]) {
        adjustPositionDownward(task, newTop, newTop + newHeight);
    }

    task.top(newTop);
    task.height(newHeight);
    timeSpanBox.text((timeEnd - timeBegin) / 2);

    refreshTaskTimeText(task);
};

var createNewTask = function (top, height, original) {
    var newTask = original.clone(true);
    var closeButton = newTask.find(".close");
    var taskType = newTask.find(".task-type");

    newTask.top(top);
    newTask.height(height);

    taskType.text(taskTypes[newTask.data("task-type")]);

    // append+showしてからdraggableイベント追加しないと、挙動がおかしくなる
    $("#task-list").append(newTask);
    refreshTaskTimeText(newTask, top, height);
    newTask.show();

    registerTaskEvents(newTask);

    return newTask;
};

var registerTaskEvents = function (newTask) {
    newTask.mousedown(function () {
        lastState = dumpTasks();
        activateTask($(this));
    });
    newTask.click(showBalloon);

    newTask.find(".close").click(function () {
        removeTask(newTask);
    });

    var commonOption = {
        "grid": [0, taskGridHeight],
        "containment": "parent"
    };

    var taskWidth = newTask.width();

    newTask.draggable($.extend(commonOption, {
        "start": startDragEvent,
        "stop": stopEditingEvent,
        "drag": editTaskEvent
    }));

    // draggableが何故か"position: relative"をくっ付けるので削除
    newTask.css("position", "");

    newTask.resizable($.extend(commonOption, {
        "handles": "n, s, ne, se, sw, nw",
        "start": startResizeEvent,
        "stop": stopEditingEvent,
        "resize": editTaskEvent,
        "maxWidth": taskWidth,
        "minWidth": taskWidth
    }));
};

var addTask = function () {
    var selectedCells = $(".ui-selected");
    if (selectedCells.length <= 0)
        return;

    var firstCell = selectedCells.first();
    var top = firstCell.top();
    var height = taskGridHeight * selectedCells.length;
    var bottom = top + height;

    lastState = dumpTasks();

    var newTask = createNewTask(top, height, taskTemplate);

    selectedCells.removeClass("ui-selected");

    $(".task").each(function () {
        var curr = $(this);
        if (this === newTask[0])
            return;
        switch (newTask.geometricRelation(curr)) {
            case "equal":
            case "outside":
                curr.remove();
                break;

            case "upside":
                curr.height(newTask.top() - curr.top());
                break;

            case "downside":
                curr.height(curr.height() - (newTask.bottom() - curr.top()));
                curr.top(newTask.bottom());
                break;

            case "inside":
                var upperTaskHeight = newTask.top() - curr.top();
                var lowerTaskHeight = curr.bottom() - newTask.bottom();

                if (upperTaskHeight > 0) {
                    curr.height(upperTaskHeight);
                } else {
                    curr.remove();
                }

                if (lowerTaskHeight > 0) {
                    createNewTask(newTask.bottom(), lowerTaskHeight, curr);
                }
                break;
        }

        refreshTaskTimeText(curr);
    });

    activateTask(newTask);
    showBalloon();
};

var startDragEvent = function (e, ui) {
    var curr = ui.helper;

    curr.data("original-top", ui.position.top);
    activateTask(curr);
    hideBalloon();
};

var startResizeEvent = function (e, ui) {
    var curr = ui.helper;

    activateTask(curr);
    hideBalloon();
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
    refreshTaskTimeText(curr);
};

var refreshTaskTimeText = function (elm, top, height) {
    if (typeof top === "undefined") { top = undefined; }
    if (typeof height === "undefined") { height = undefined; }
    var timeSpan = getTimeSpanFromPosition(elm, top, height);
    var tiemBeginArea = elm.find(".task-time-begin");
    var timeEndArea = elm.find(".task-time-end");
    var timeSpanArea = elm.find(".task-time-span");

    tiemBeginArea.text(timeValueToString(timeSpan[0]));
    timeEndArea.text(timeValueToString(timeSpan[1]));
    timeSpanArea.text(((timeSpan[1] - timeSpan[0]) / 2).toFixed(1));
};

var stopEditingEvent = function (e, ui) {
    showBalloon();
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
                    refreshTaskTimeText(n);
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
                    refreshTaskTimeText(n);
                    break;
                }
            }
        }

        ct = $(tasks[j]).top(); // current top
    }
};

var removeTask = function (task) {
    if (task.hasClass("active")) {
        activateTask(null);
    }

    task.remove();
};

var getTimeSpanFromPosition = function (task, top, height) {
    if (typeof top === "undefined") { top = undefined; }
    if (typeof height === "undefined") { height = undefined; }
    if (top === undefined)
        top = task.top();
    if (height === undefined)
        height = task.height();

    return [
        scheduleTimeSpan[0] * 2 + Math.round(top / taskGridHeight),
        scheduleTimeSpan[0] * 2 + Math.round((top + height) / taskGridHeight)
    ];
};

var activateTask = function (task) {
    if (task) {
        if (!task.hasClass("active")) {
            $(".task.active").removeClass("active");
            task.addClass("active");
        }
    } else {
        $(".task.active").removeClass("active");
        hideBalloon();
    }

    $(".ui-selected").removeClass("ui-selected");

    return true;
};

var showBalloon = function () {
    var task = $(".task.active");
    var balloon = $("#edit-balloon");

    var taskNameBox = $("#balloon-task-name");

    taskNameBox.val(task.find(".task-name").text());
    $("#balloon-task-memo").val(task.find(".task-memo").text());

    var taskType = task.data("task-type");
    $("#balloon-task-type").val(taskType);
    taskNameBox.autocomplete({
        "source": taskAutoComplete[taskType],
        "minLength": 0
    });

    var timeSpan = getTimeSpanFromPosition(task);
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");
    var timeSpanBox = $("#balloon-time-span");

    timeBeginBox.val(String(timeSpan[0]));
    timeEndBox.val(String(timeSpan[1]));
    timeSpanBox.text(((timeSpan[1] - timeSpan[0]) / 2).toFixed(1));

    balloon.css("top", task.top() + taskGridHeight);
    balloon.show();
    taskNameBox.focus();
};

var hideBalloon = function () {
    $("#edit-balloon").hide();
};

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

var dumpTasks = function () {
    /* ソートするのはサーバに送信するときだけでいい
    var tasks = $(".task")
    .filter(function () { return (this !== elm[0]) && ($(this).bottom() <= bottom); })
    .sort(sortByTopInDesc);
    */
    var dump = [];
    $(".task").each(function () {
        var curr = $(this);
        var timeSpan = getTimeSpanFromPosition(curr);
        dump.push(new Task(curr.data("task-type"), curr.find(".task-name").text(), new TimeSpan((timeSpan[0] / 2), (timeSpan[1] / 2)), curr.find(".task-memo").text()));
    });

    return dump;
};

var restoreTasks = function (dump) {
    var fragment = $(document.createDocumentFragment());

    dump.forEach(function (val) {
        createNewTask2(val, fragment);
    });

    clearTasks();
    $("#task-list").append(fragment);
};

var createNewTask2 = function (dump, appendTo) {
    var newTask = taskTemplate.clone(true);

    var top = (dump.timespan.begin - scheduleTimeSpan[0]) * 2 * taskGridHeight;
    var bottom = (dump.timespan.end - scheduleTimeSpan[0]) * 2 * taskGridHeight;
    var height = bottom - top;
    newTask.top(top);
    newTask.height(height);

    newTask.dataAttr("task-type", dump["type"]);
    newTask.find(".task-type").text(taskTypes[dump["type"]]);

    newTask.find(".task-name").text(dump["name"]);
    newTask.find(".task-memo").text(dump["memo"]);

    // append+showしてからdraggableイベント追加しないと、挙動がおかしくなる
    appendTo.append(newTask);
    refreshTaskTimeText(newTask, top, height);
    newTask.show();

    registerTaskEvents(newTask);

    return newTask;
};

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

// top+heightの高さを返す
var fn_bottom = function () {
    if (this.css("display") === "none")
        throw new Error("Try to access 'bottom' property though this is invisible.");
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

var clearTasks = function () {
    activateTask(null);
    $(".task").remove();
};

var output = function () {
    var out = $("#out");
    out.text(JSON.stringify(dumpTasks(), null, "  "));
    /*
    out.empty();
    $(".task").each(function () {
    out.append($(this).text() + "<br />");
    });
    */
};

var input = function () {
    restoreTasks(JSON.parse($("#out").text()));
};

// 上で交差してる: "upside"
// 下で交差してる: "downside"
// 含んでいる: "outside"
// 含まれている: "inside"
// 関係なし: null
var fn_geometricRelation = function (elm) {
    if (this.top() == elm.top()) {
        if (this.bottom() < elm.bottom()) {
            return "inside";
        } else if (this.bottom() > elm.bottom()) {
            return "outside";
        } else {
            return "equal";
        }
    } else if (this.top() > elm.top()) {
        if (this.bottom() <= elm.bottom()) {
            return "inside";
        } else if (this.top() < elm.bottom()) {
            return "upside";
        } else {
            return null;
        }
    } else {
        if (this.bottom() >= elm.bottom()) {
            return "outside";
        } else if (this.bottom() > elm.top()) {
            return "downside";
        } else {
            return null;
        }
    }
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
