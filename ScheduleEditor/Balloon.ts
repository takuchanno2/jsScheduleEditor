/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />

"use strict";

class Balloon {
    private jQueryElement: JQuery;
    private activeTaskElement: TaskElement;

    private typeBox: JQuery;
    private nameBox: JQuery;
    private memoBox: JQuery;
    private timeBeginBox: JQuery;
    private timeEndBox: JQuery;
    private timeSpanLabel: JQuery;
    private okButton: JQuery;
    private cancelButton: JQuery;
    private deleteButton: JQuery;

    public onOkButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = $.noop;
    public onCancelButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = $.noop;
    public onDeleteButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = $.noop;

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

        this.jQueryElement.click(() => false);
        this.typeBox.change((ev) => { this.onTypeBoxChanged(ev); });
        this.nameBox.focus(() => { this.nameBox.autocomplete("search"); });

        // IEのバグのため、変なタイミングでinputイベントが発火することがある
        // 変な時に発火してもいいように、変数をチェックする
        //this.nameBox.on("input", () => { this.activeTaskElement.name = this.nameBox.val(); });
        //this.memoBox.on("input", () => { this.activeTaskElement.memo = this.memoBox.val(); });
        this.nameBox.on("input", () => { if (this.activeTaskElement) { this.activeTaskElement.name = this.nameBox.val(); } });
        this.memoBox.on("input", () => { if (this.activeTaskElement) { this.activeTaskElement.memo = this.memoBox.val(); } });
        
        this.timeBeginBox.change((e) => { this.onTimeBoxChanged(e); });
        this.timeEndBox.change((e) => { this.onTimeBoxChanged(e); });

        this.okButton.click((e) => { this.onOkButtonClicked(this.activeTaskElement, e); return false; });
        this.cancelButton.click((e) => this.onCancelButtonClicked(this.activeTaskElement, e));
        this.deleteButton.click((e) => this.onDeleteButtonClicked(this.activeTaskElement, e));

        // タスクの種類のコンボボックスを作る
        Task.taskTypes.forEach((v, i) => {
            $("<option>", {
                "text": v.name,
                "value": String(i),
            }).appendTo(this.typeBox);
        });

        var makeOption = (t: Time) => $("<option>", {
            "text": t.toString(),
            "value": t.toString(),
            "class": "balloon-time-option " + (TimeSpan.coretime.includes(t) ? "coretime" : "flextime"),
            "data": { "time": t, }
        });

        // 時間を選択するコンボボックスを作る
        for (var i = 0; i < 24; i++) {
            for (var j = 0; j < 60; j += TaskTable.minutesPerCell) {
                var time = new Time(i, j);
                var option = makeOption(time);

                if (time.totalMinutes < 24 * 60) {
                    this.timeBeginBox.append(option.clone(true));
                }
                if (time.totalMinutes > 0) {
                    this.timeEndBox.append(option.clone(true));
                }
            }
        }

        this.timeEndBox.append(makeOption(new Time(24, 0)));
    }

    public show(element: TaskElement) {
        this.update(element);
        this.jQueryElement.show();
        this.okButton.focus();
    }

    public hide() {
        this.jQueryElement.hide();
    }

    public update(element: TaskElement) {
        this.activeTaskElement = element;

        this.nameBox.val(element.name);
        this.memoBox.val(element.memo);

        this.typeBox.val(String(element.type));
        this.updateAutoCompleteCandidates();

        this.timeBeginBox.val(element.timeSpan.begin.toString());
        this.timeEndBox.val(element.timeSpan.end.toString());
        this.timeSpanLabel.text(element.timeSpan.span.deciamlHours.toFixed(1));

        this.jQueryElement.css("top", element.top + taskGridHeight);
    }

    public get visible() {
        return (this.jQueryElement.css("display") !== "none");
    }

    private onTypeBoxChanged(ev: JQueryEventObject = null) {
        this.activeTaskElement.type = Number($(ev.currentTarget).val());
        this.updateAutoCompleteCandidates();
    }

    private updateAutoCompleteCandidates() {
        this.nameBox.autocomplete({
            "source": Task.taskTypes[this.activeTaskElement.type].taskNameCandidates,
            "minLength": 0,
            // 何故かJQueryUI.AutocompleteUIParamsの定義が空……
            // "select": (ev: Event, ui: JQueryUI.AutocompleteUIParams) => { this.activeTaskElement.name = ui.item.value; }
            "select": (ev: Event, ui: any) => {
                this.activeTaskElement.name = ui.item.value;
            }
        });
    }

    private onTimeBoxChanged(e: JQueryEventObject) {
        var timeBegin: Time = this.timeBeginBox.children(":selected").data("time");
        var timeEnd: Time = this.timeEndBox.children(":selected").data("time");;

        if (timeBegin.totalMinutes > timeEnd.totalMinutes) {
            // beginとendを交換
            var tmp = timeBegin;
            timeBegin = timeEnd;
            timeEnd = tmp;
        } else if (timeBegin.totalMinutes === timeEnd.totalMinutes) {
            // 今ユーザが弄った方とは違う方のコンボボックスの値を変更する
            if (e.target === this.timeBeginBox[0]) {
                timeEnd = timeBegin.putForward(1);
            } else {
                timeBegin = timeEnd.putForward(-1);
            }
        }

        this.timeBeginBox.val(String(timeBegin));
        this.timeEndBox.val(String(timeEnd));

        // 時間修正前の開始時間・終了時間
        //var newTop = 2.0 * taskGridHeight * timeBegin;
        //var newHeight = 2.0 * taskGridHeight * (timeEnd - timeBegin);
        var element = this.activeTaskElement;

        //if (timeBegin < element.timeSpan.begin) {
        //    adjustPositionUpward(element.jQueryElement, newTop, newTop + newHeight);
        //} else if (timeEnd > element.timeSpan.end) {
        //    adjustPositionDownward(element.jQueryElement, newTop, newTop + newHeight);
        //}

        element.timeSpan = new TimeSpan(timeBegin, timeEnd);
        this.timeSpanLabel.text(String(element.timeSpan.span.deciamlHours));
    }
}
