/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />

class Balloon {
    private typeBox: JQuery;
    private nameBox: JQuery;
    private memoBox: JQuery;
    private timeBeginBox: JQuery;
    private timeEndBox: JQuery;
    private okButton: JQuery;
    private cancelButton: JQuery;
    private deleteButton: JQuery;

    public constructor() {
        this.typeBox = $("#balloon-task-type");
        this.nameBox = $("#balloon-task-name");
        this.memoBox = $("#balloon-task-memo");
        this.timeBeginBox = $("#balloon-time-begin");
        this.timeEndBox = $("#balloon-time-end");
        this.okButton = $("#balloon-ok-button");
        this.cancelButton = $("#balloon-cancel-button");
        this.deleteButton = $("#balloon-delete-button");

        var realtimeEvents = "keydown keyup keypress change";
        this.typeBox.change(() => {
            var value: number = this.typeBox.val();
            var element: TaskElement = $(".task.active").taskElement();

            element.type = value;
            this.nameBox.autocomplete({
                "source": taskAutoComplete[value],
                "minLength": 0,
            });
        });

        this.nameBox.focus(() => {
            this.nameBox.autocomplete("search");
        });

        this.nameBox.on(realtimeEvents, function () { $(".task.active .task-name").text($(this).val()); });
        this.memoBox.on(realtimeEvents, function () { $(".task.active .task-memo").text($(this).val()); });

        this.timeBeginBox.change(function () { balloonTimeBoxChanged(true); });
        this.timeEndBox.change(function () { balloonTimeBoxChanged(false); });

        this.okButton.click(function () { activateTask(null); });
        this.cancelButton.click(function () { if (lastState) restoreTasks(lastState); lastState = null; });
        this.deleteButton.click(function () { removeTask($(".task.active")); });

        // タスクの種類のコンボボックスを作る
        taskTypeTable.forEach(function (val: string, i: number) {
            $("<option>", {
                "text": val,
                "value": String(i),
            }).appendTo(this.typeBox);
        });

        // 時間を選択するコンボボックスを作る
        var timeBegin = Math.round(TimeSpan.scheduleTime.begin * 2);
        var timeEnd = Math.round(TimeSpan.scheduleTime.end * 2);
        for (var i = 0, end = Math.round(TimeSpan.scheduleTime.span * 2.0); i <= end; i++) {
            var currTime = TimeSpan.scheduleTime.begin + (i / 2.0);

            var option = $("<option>", {
                "text": TimeSpan.timeToString(currTime),
                "value": String(currTime),
            });

            if (i < end) {
                option.clone().appendTo(this.timeBeginBox);
            }
            if (i > 0) {
                option.clone().appendTo(this.timeEndBox);
            }
        }
    }

    public show(element: TaskElement) {
    }

    public hide() {
    }
}

$(() => {
});
