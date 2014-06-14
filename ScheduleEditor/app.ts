/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />
/// <reference path="Balloon.ts" />

declare var taskAutoComplete: string[][];
declare var initialTasksJSON: any[]; 

var taskGridHeight: number;
var taskGridHeightTotal: number;

var initialTasks: Task[] = [];
var lastState: Task[] = null;

interface JQuery{
    top(): number;
    top(top: number): JQuery;

    bottom(): number;

    dataAttr(key: string): any;
    dataAttr(key: string, value: any): JQuery;

    taskElement(): TaskElement;
}

interface Window {
    collectGarbage(): void;
}

$(() => {
    $.fn.extend({
        "top": fn_top,
        "bottom": fn_bottom,
        "height": fn_height,
        "dataAttr": fn_dataAttr,
        "taskElement": fn_taskElement,
    });

    $(".add-task").click(addTask);
    $(".output").click(output);
    $(".input").click(input);
    $(".clear").click(clearTasks);
    $(".bench").click(() => {
        for (var i = 0; i < 1000; i++) {
            restoreTasks(initialTasks);
        }

        window.collectGarbage();
    });

    $(".schedule-editor-table").click(function () { return false; });

    // グリッドの外側をクリックしたら、タスクを非アクティブに
    $("#schedule-editor").click(function () {
        // このイベントが呼ばれるとタスクが非アクティブになるので、適宜stopPropagationすること
        activateTask(null);
    });

    initialTasksJSON.forEach((v) => {
        initialTasks.push(Task.fromJSONObject(v));
    });

    initTable();
    initBalloon();

    restoreTasks(initialTasks);
});

var initTable = function () {
    var taskGrid = $("#task-grid");
    var nbsp = String.fromCharCode(160);

    var coreBegin = Math.round(TimeSpan.coreTime.begin * 2);
    var coreEnd = Math.round(TimeSpan.coreTime.end * 2);
    var fragment = $(document.createDocumentFragment());
    for (var i = Math.round(TimeSpan.scheduleTime.begin * 2), end = Math.round(TimeSpan.scheduleTime.end * 2); i < end; i++) {
        var inCoreTime = (coreBegin <= i) && (i < coreEnd);

        var cell = $("<div />", {
            "class": "grid-cell",
        }).appendTo(fragment);

        $("<div />", {
            "class": "task-cell" + (inCoreTime ? " core" : ""),
        }).appendTo(cell);

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

var timeValueToString = function (tv: number) {
    return Math.floor(tv) + ":" + ((Math.round(tv * 2.0) % 2) ? "30" : "00");
};

var initBalloon = function () {
    var realtimeEvents = "keydown keyup keypress change";
    var taskTypeBox = $("#balloon-task-type");
    var taskNameBox = $("#balloon-task-name");

    taskTypeBox.change(function () {
        var value: number = $(this).val();
        var element: TaskElement = $(".task.active").taskElement();

        element.type = value;
        $("#balloon-task-name").autocomplete({
            "source": taskAutoComplete[value],
            "minLength": 0,
        });
    });

    $("#balloon-task-name").focus(function () {
        taskNameBox.autocomplete("search");
    });

    taskNameBox.on(realtimeEvents, function () { $(".task.active .task-name").text($(this).val()); });
    $("#balloon-task-memo").on(realtimeEvents, function () { $(".task.active .task-memo").text($(this).val()); });

    $("#balloon-time-begin").change(function () { balloonTimeBoxChanged(true); });
    $("#balloon-time-end").change(function () { balloonTimeBoxChanged(false); });

    $("#balloon-ok-button").click(function () { activateTask(null); });
    $("#balloon-cancel-button").click(function () { if (lastState) restoreTasks(lastState); lastState = null; });
    $("#balloon-delete-button").click(function () { removeTask($(".task.active")); });

    // タスクの種類のコンボボックスを作る
    taskTypeTable.forEach(function (val: string, i: number) {
        $("<option>", {
            "text": val,
            "value": String(i),
        }).appendTo(taskTypeBox);
    });

    // 時間を選択するコンボボックスを作る
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");

    var timeBegin = Math.round(TimeSpan.scheduleTime.begin * 2);
    var timeEnd = Math.round(TimeSpan.scheduleTime.end * 2);
    for (var i = 0, end = Math.round(TimeSpan.scheduleTime.span * 2.0); i <= end; i++) {
        var currTime = TimeSpan.scheduleTime.begin + (i / 2.0);

        var option = $("<option>", {
            "text": TimeSpan.timeToString(currTime),
            "value": String(currTime),
        });

        if (i < end) {
            option.clone().appendTo(timeBeginBox);
        }
        if (i > 0) {
            option.clone().appendTo(timeEndBox);
        }
    }
};

var balloonTimeBoxChanged = function (changedBeginTime: boolean) {
    var task = $(".task.active");
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");
    var timeSpanBox = $("#balloon-time-span");
    var timeBegin: number = parseInt(timeBeginBox.val());
    var timeEnd: number = parseInt(timeEndBox.val());

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

    var scheduleBegin = Math.round(TimeSpan.scheduleTime.begin * 2);

    timeBegin = timeBeginBox.val();
    timeEnd = timeEndBox.val();

    // 時間修正前の開始時間・終了時間
    var lastTimeSpan = getTimeSpanFromPosition(task);
    var newTop = 2.0 * taskGridHeight * (timeBegin - TimeSpan.scheduleTime.begin);
    var newHeight = 2.0 * taskGridHeight * (timeEnd - timeBegin);

    if (timeBegin < lastTimeSpan.begin) {
        adjustPositionUpward(task, newTop, newTop + newHeight);
    }
    if (timeEnd > lastTimeSpan.end) {
        adjustPositionDownward(task, newTop, newTop + newHeight);
    }

    task.top(newTop);
    task.height(newHeight);
    timeSpanBox.text(timeEnd - timeBegin);

    refreshTaskTimeText(task);
};

var addTask = function () {
    var selectedCells = $(".ui-selected");
    if (selectedCells.length <= 0) return;

    var timeBegin = TimeSpan.scheduleTime.begin + (selectedCells.first().top() / taskGridHeight / 2.0);
    var timeEnd = timeBegin + selectedCells.length / 2.0;

    lastState = dumpTasks();

    var taskList = $("#task-list");

    // var newTask = createNewTask(top, height, taskTemplate);
    var newTask = new TaskElement(new TimeSpan(timeBegin, timeEnd));

    selectedCells.removeClass("ui-selected");

    $(".task").each(function () {
        var curr: TaskElement = $(this).taskElement();
        switch (newTask.getGeometricRelation(curr)) {
            case GeometricRelation.equal:
            case GeometricRelation.outside:
                curr.remove();
                break;

            case GeometricRelation.upside:
                curr.timeSpan = new TimeSpan(curr.timeSpan.begin, newTask.timeSpan.begin);
                break;

            case GeometricRelation.downside:
                curr.timeSpan = new TimeSpan(newTask.timeSpan.end, curr.timeSpan.end);
                break;

            case GeometricRelation.inside:
                // 同、下に居るタスク
                if (Math.round((curr.timeSpan.end - newTask.timeSpan.end) * 2.0) > 0) {
                    var lowerTask = curr.clone();
                    lowerTask.timeSpan = new TimeSpan(newTask.timeSpan.end, curr.timeSpan.end);
                    TaskElement.addToContainer(taskList, lowerTask);
                }

                // 新しいタスクで分断された時に上に居るタスク
                if (Math.round((newTask.timeSpan.begin - curr.timeSpan.begin) * 2.0) > 0) {
                    curr.timeSpan = new TimeSpan(curr.timeSpan.begin, newTask.timeSpan.begin);
                } else {
                    curr.remove();
                }

                break;
        }
    });

    TaskElement.addToContainer(taskList, newTask);

    activateTask(newTask.jQueryElement);
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

var refreshTaskTimeText = function (elm: JQuery, top: number = undefined, height: number = undefined) {
    var timeSpan = getTimeSpanFromPosition(elm, top, height);
    var tiemBeginArea = elm.find(".task-time-begin");
    var timeEndArea = elm.find(".task-time-end");
    var timeSpanArea = elm.find(".task-time-span");

    tiemBeginArea.text(timeValueToString(timeSpan.begin));
    timeEndArea.text(timeValueToString(timeSpan.end));
    timeSpanArea.text(timeSpan.span.toFixed(1));
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
        .toArray().sort(sortByTopInAsc);

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
        .toArray().sort(sortByTopInDesc);

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

// 移植済み
var getTimeSpanFromPosition = function (task: JQuery, top: number = undefined, height: number = undefined) {
    if (top === undefined) top = task.top();
    if (height === undefined) height = task.height();

    return new TimeSpan(
        TimeSpan.scheduleTime.begin + (top / (2.0 * taskGridHeight)),
        TimeSpan.scheduleTime.begin + ((top + height) / (2.0 * taskGridHeight))
        );
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
    var element: TaskElement = $(".task.active").taskElement();
    var balloon = $("#edit-balloon");

    var taskNameBox = $("#balloon-task-name");

    taskNameBox.val(element.name);
    $("#balloon-task-memo").val(element.memo);

    var taskType = element.type;
    $("#balloon-task-type").val(String(taskType));
    taskNameBox.autocomplete({
        "source": taskAutoComplete[taskType],
        "minLength": 0,
    });

    var timeSpan = element.timeSpan;
    var timeBeginBox = $("#balloon-time-begin");
    var timeEndBox = $("#balloon-time-end");
    var timeSpanBox = $("#balloon-time-span");

    timeBeginBox.val(String(timeSpan.begin));
    timeEndBox.val(String(timeSpan.end));
    timeSpanBox.text(timeSpan.span.toFixed(1));

    balloon.css("top", element.top + taskGridHeight);
    balloon.show();
    $("#balloon-ok-button").focus();
};

var hideBalloon = function () {
    $("#edit-balloon").hide();
};

// 移植済み
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

var dumpTasks = function (): Task[] {
    /* ソートするのはサーバに送信するときだけでいい
    var tasks = $(".task")
   .filter(function () { return (this !== elm[0]) && ($(this).bottom() <= bottom); })
   .sort(sortByTopInDesc);
   */

    return $.map($(".task"), function (e, i) { return $(e).taskElement().toTask(); });
};

var restoreTasks = function (dump: Task[]) {
    var fragment = $(document.createDocumentFragment());

    dump.forEach(function (taskJSON) {
        fragment.append(TaskElement.fromTask(Task.fromJSONObject(taskJSON)).jQueryElement)
    });

    clearTasks();
    $("#task-list").append(fragment);

    $(".task").each(function () {
        var curr: TaskElement = $(this).taskElement();
        curr.show();
        curr.registerEvents();
    });
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

// *** 移植済み ***
// top+heightの高さを返す
var fn_bottom = function () {
    if (this.css("display") === "none") throw new Error("Try to access 'bottom' property of an invisible element.");
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

var fn_taskElement = function (): TaskElement {
    return this.data("task-element");
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
    var tasksJSON: any[] = JSON.parse($("#out").text());
    var tasks: Task[] = [];

    tasksJSON.forEach((v) => {
        tasks.push(Task.fromJSONObject(v));
    })

    restoreTasks(tasks);
};

// jsdoのログエリアにログを吐く
function log() {
    console.log(arguments);

    var logarea = $("#log");
    $("<li>", {
        text: $.makeArray(arguments).join(" ")
    }).prependTo(logarea);
};
