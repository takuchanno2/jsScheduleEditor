const scheduleTimeSpan = [8, 20];
const coreTimeSpan = [9.5, 16.5];
const taskTypes = ["研究系", "勉強系", "その他"];

var taskGridHeight;
var taskGridHeightTotal;
var taskTemplate;

$(function () {
    $.fn.extend({
        "top": fn_top,
        "bottom": fn_bottom,
        "height": fn_height,
        "dataAttr": fn_dataAttr,
        "geometricRelation": fn_geometricRelation,
    });

    $(".add-task").click(addTask);
    $(".output").click(output);
    $(".clear").click(clearTasks);

    $(".schedule-editor-table").click(function () { return false; });

    // グリッドの外側をクリックしたら、タスクを非アクティブに
    $("#schedule-editor").click(function () {
        // このイベントが呼ばれるとタスクが非アクティブになるので、適宜stopPropagationすること
        activateTask(null);
    });

    initTaskTemplate();
    initTable();
    initBalloon();
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
    for (var i = Math.round(scheduleTimeSpan[0] * 2), end = Math.round(scheduleTimeSpan[1] * 2) ; i < end; i++) {
        var inCoreTime = (coreBegin <= i) && (i < coreEnd);

        var cell = $("<div />", {
            "class": "grid-cell",
        }).appendTo(fragment);

        $("<div />", {
            "text": ((i % 2) ? nbsp : String(i / 2)),
            "class": "half-hour-cell" + (inCoreTime ? " core" : ""),
        }).appendTo(cell);

        $("<div />", {
            "class": "task-cell" + (inCoreTime ? " core" : ""),
        }).appendTo(cell);
    }

    taskGrid.append(fragment);

    taskGridHeight = Math.round($(".grid-cell:first").outerHeight());
    taskGridHeightTotal = Math.round(taskGrid.height());

    taskGrid.selectable({
        "filter": ".grid-cell",
        // .schedule-editorのmouseupでタスクを非アクティブにされないように
        "start": function (e, ui) { activateTask(null); },
        "stop": function (e, ui) { addTask(); },
    });
};

var timeValueToString = function (tv) {
    return Math.floor(tv / 2) + ":" + ((tv % 2) ? "30" : "00");
};

var initBalloon = function () {
    var realtimeEvents = "keydown keyup keypress change";
    var taskTypeBox = $("#balloon-task-type");
    taskTypeBox.change(function () { $(".task.active").dataAttr("task-type", $(this).val()); });

    $("#balloon-task-type").change(function () { $(".task.active .task-type").text(taskTypes[$(this).val()]); });

    $("#balloon-task-name").on(realtimeEvents, function () { $(".task.active .task-name").text($(this).val()); });
    $("#balloon-task-memo").on(realtimeEvents, function () { $(".task.active .task-memo").text($(this).val()); });

    $("#balloon-time-begin").change(function () { balloonTimeBoxChanged(true); });
    $("#balloon-time-end").change(function () { balloonTimeBoxChanged(false); });

    $("#balloon-ok-button").click(function () { activateTask(null); });
    $("#balloon-cancel-button").click(function () { activateTask(null); });
    $("#balloon-delete-button").click(function () { removeTask($(".task.active")); });

    // タスクの種類のコンボボックスを作る
    taskTypes.forEach(function (val, i) {
        $("<option>", {
            "text": val,
            "value": String(i),
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
            "value": String(i),
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
        timeBeginBox.val(timeEnd);
        timeEndBox.val(timeBegin);
    } else if (timeBegin === timeEnd) {
        if (changedBeginTime) {
            timeEndBox.val(timeBegin + 1);
        } else {
            timeBeginBox.val(timeEnd - 1);
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
    newTask.mousedown(function () { activateTask($(this)); });
    newTask.click(showBalloon);

    closeButton.click(function () { removeTask(newTask); });

    taskType.text(taskTypes[newTask.data("task-type")]);

    var commonOption = {
        "grid": [0, taskGridHeight],
        "containment": "parent",
    };

    // appendしてからdraggableしないと、挙動がおかしくなる
    $("#task-list").append(newTask);
    refreshTaskTimeText(newTask, top, height);
    newTask.show();

    var taskWidth = newTask.width();

    newTask.draggable($.extend(commonOption, {
        "start": startDragEvent,
        "stop": stopEditingEvent,
        "drag": editTaskEvent,
    }));
    newTask.resizable($.extend(commonOption, {
        "handles": "n, s, ne, se, sw, nw",
        "start": startResizeEvent,
        "stop": stopEditingEvent,
        "resize": editTaskEvent,
        "maxWidth": taskWidth,
        "minWidth": taskWidth,
    }));

    return newTask;
};

var addTask = function () {
    var selectedCells = $(".ui-selected");
    if (selectedCells.length <= 0) return;

    var firstCell = selectedCells.first();
    var top = firstCell.top();
    var height = taskGridHeight * selectedCells.length;
    var bottom = top + height;

    var newTask = createNewTask(top, height, taskTemplate);

    selectedCells.removeClass("ui-selected");

    $(".task").each(function () {
        var curr = $(this);
        if (this === newTask[0]) return;
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
    var curr = ui.helper; // 今、移動orサイズ変更しようとしている要素
    var originalTop = (e.type === "drag") ? curr.data("original-top") : ui.originalPosition.top;

    if (e.type === "resize") {
        // なんか下方向にはみ出るので、それを防止
        if (ui.originalPosition.top <= ui.position.top && ( // 引き下げている途中
           (ui.position.top >= ui.originalPosition.top + ui.originalSize.height) || // 元の位置より下に行かない
           (ui.size <= 0)
          )) {
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

    if ((e.type === "drag") ||
      ((e.type === "resize") && (ui.size.height > ui.originalSize.height))) {
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

var sortByTopInAsc = function (a, b) { return ($(a).top() - $(b).top()); };
var sortByTopInDesc = function (a, b) { return ($(b).top() - $(a).top()); }

// 要素elmが、top～bottomの間のスペースを確保していると考えて、それより下の要素を適当にずらす
var adjustPositionDownward = function (elm, top, bottom) {
    // 自分より下で、上に配置されている方が先に来るようにソート
    var tasks = $(".task")
   .filter(function () { return (this !== elm[0]) && (top <= $(this).top()); })
   .sort(sortByTopInAsc);

    // currより下の要素と重なりがないか確認
    var cb = bottom; // current bottom
    for (var j = 0; j < tasks.length; j++) {
        for (var i = j; i < tasks.length; i++) {
            var n = $(tasks[i]); // next
            var nt = $(tasks[i]).top(); // next top
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
    var tasks = $(".task")
   .filter(function () { return (this !== elm[0]) && ($(this).bottom() <= bottom); })
   .sort(sortByTopInDesc);

    // currより上の要素と重なりがないか確認
    var ct = top;
    for (var j = 0; j < tasks.length; j++) {
        for (var i = j; i < tasks.length; i++) {
            var n = $(tasks[i]); // next
            var nt = n.top(); // next top
            var no = n.bottom(); // next bottom

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
    if (top === undefined) top = task.top();
    if (height === undefined) height = task.height();

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
    $("#balloon-task-memo").text(task.find(".task-memo").text());
    $("#balloon-task-type").val(task.data("task-type"));

    var timeSpan = getTimeSpanFromPosition(task);
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");
    var timeSpanBox = $("#balloon-time-span");

    timeBeginBox.val(timeSpan[0]);
    timeEndBox.val(timeSpan[1]);
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
        if (height === 0) throw new Error("Try to set zero to height.");
        return originalHeight.apply(this, arguments);
    } else {
        var result = originalHeight.apply(this, arguments);
        if (height === 0) throw new Error("'height' property is somehow zero.");
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
        dump.push({
            "type": curr.data("task-type"),
            "name": curr.find(".task-name").text(),
            "time-begin": (timeSpan[0] / 2),
            "time-end": (timeSpan[1] / 2),
            "memo": curr.find(".task-memo").text(),
        });
    });
    
    return dump;
};

var restoreTasks = function (dump) {

    clearTasks();
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

        return top;
    } else {
        if (this.css("display") === "none") throw new Error("Try to access 'top' property though this is invisible.");
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
    if (this.css("display") === "none") throw new Error("Try to access 'bottom' property though this is invisible.");
    return Math.round(this.top() + this.height());
};

var fn_dataAttr = function (key, value) {
    if (value !== undefined) {
        this.data(key, value);
        this.attr("data-" + key, value);
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
    out.text(JSON.stringify(dumpTasks()));
    /*
    out.empty();
    $(".task").each(function () {
        out.append($(this).text() + "<br />");
    });
    */
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
};
