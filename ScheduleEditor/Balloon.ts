﻿/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />

class Balloon {
    private activeElement: TaskElement;

    private jQueryElement: JQuery;
    private typeBox: JQuery;
    private nameBox: JQuery;
    private memoBox: JQuery;
    private timeBeginBox: JQuery;
    private timeEndBox: JQuery;
    private timeSpanLabel: JQuery;
    private okButton: JQuery;
    private cancelButton: JQuery;
    private deleteButton: JQuery;

    public constructor() {
        this.jQueryElement = $("#edit-balloon");
        this.typeBox = $("#balloon-task-type");
        this.nameBox = $("#balloon-task-name");
        this.memoBox = $("#balloon-task-memo");
        this.timeBeginBox = $("#balloon-time-begin");
        this.timeEndBox = $("#balloon-time-end");
        this.timeSpanLabel = $("#balloon-time-span");
        this.okButton = $("#balloon-ok-button");
        this.cancelButton = $("#balloon-cancel-button");
        this.deleteButton = $("#balloon-delete-button");

        var realtimeEvents = "keydown keyup keypress change";
        this.typeBox.change(() => {
            var value: number = this.typeBox.val();

            this.activeElement.type = Number(value);
            this.nameBox.autocomplete({
                "source": taskAutoComplete[this.activeElement.type],
                "minLength": 0,
            });
        });

        this.nameBox.focus(() => {
            this.nameBox.autocomplete("search");
        });

        this.nameBox.on(realtimeEvents, () => { this.activeElement.name = this.nameBox.val(); });
        this.memoBox.on(realtimeEvents, function () { this.activeElement.memo = this.memoBox.val(); });

        this.timeBeginBox.change((e) => { this.timeBoxChanged(e); });
        this.timeEndBox.change((e) => { this.timeBoxChanged(e); });

        this.okButton.click(function () { activateTask(null); });
        this.cancelButton.click(function () { if (lastState) taskElementContainer.restore(lastState); lastState = null; });
        this.deleteButton.click(() => { this.activeElement.remove(); });

        // タスクの種類のコンボボックスを作る
        Task.taskTypes.forEach((v, i) => {
            $("<option>", {
                "text": v,
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
        this.activeElement = element;

        this.nameBox.val(element.name);
        this.memoBox.val(element.memo);

        this.typeBox.val(String(element.type));
        this.nameBox.autocomplete({
            "source": taskAutoComplete[element.type],
            "minLength": 0,
        });

        this.timeBeginBox.val(String(element.timeSpan.begin));
        this.timeEndBox.val(String(element.timeSpan.end));
        this.timeSpanLabel.text(element.timeSpan.span.toFixed(1));

        this.jQueryElement.css("top", element.top + taskGridHeight);
        this.jQueryElement.show();
        this.okButton.focus();
    }

    public hide() {
        this.activeElement = null;
        this.jQueryElement.hide();
    }

    private timeBoxChanged(e: JQueryEventObject){
        var timeBegin: number = Number(this.timeBeginBox.val());
        var timeEnd: number = Number(this.timeEndBox.val());

        if (timeBegin > timeEnd) {
            // beginとendを交換
            var tmp = timeBegin;
            timeBegin = timeEnd;
            timeEnd = tmp;
        } else if (timeBegin === timeEnd) {
            if (e.target === this.timeBeginBox[0]) {
                timeEnd = timeBegin + 0.5;
            } else {
                timeBegin = timeEnd - 0.5;
            }
        }

        this.timeBeginBox.val(String(timeBegin));
        this.timeEndBox.val(String(timeEnd));

        // 時間修正前の開始時間・終了時間
        var newTop = 2.0 * taskGridHeight * (timeBegin - TimeSpan.scheduleTime.begin);
        var newHeight = 2.0 * taskGridHeight * (timeEnd - timeBegin);

        if (timeBegin < this.activeElement.timeSpan.begin) {
            adjustPositionUpward(this.activeElement.jQueryElement, newTop, newTop + newHeight);
        } else if (timeEnd > this.activeElement.timeSpan.end) {
            adjustPositionDownward(this.activeElement.jQueryElement, newTop, newTop + newHeight);
        }

        this.activeElement.timeSpan = new TimeSpan(timeBegin, timeEnd);
        this.timeSpanLabel.text(String(this.activeElement.timeSpan.span));
    }
}

$(() => {
});
