/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />

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

    public onOkButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = null;
    public onCancelButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = null;
    public onDeleteButtonClicked: (el: TaskElement, ev: JQueryEventObject) => any = null;

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

        this.typeBox.change(() => { this.updateAutoComplete(); });
        this.nameBox.focus(() => { this.nameBox.autocomplete("search"); });

        // IEのバグのため、変なタイミングでinputイベントが発火することがある
        // 変な時に発火してもいいように、変数をチェックする
        //this.nameBox.on("input", () => { this.activeTaskElement.name = this.nameBox.val(); });
        //this.memoBox.on("input", () => { this.activeTaskElement.memo = this.memoBox.val(); });
        this.nameBox.on("input", () => { if (this.activeTaskElement) { this.activeTaskElement.name = this.nameBox.val(); } });
        this.memoBox.on("input", () => { if (this.activeTaskElement) { this.activeTaskElement.memo = this.memoBox.val(); } });
        
        this.timeBeginBox.change((e) => { this.onTimeBoxChanged(e); });
        this.timeEndBox.change((e) => { this.onTimeBoxChanged(e); });

        this.okButton.click((e) => (this.onOkButtonClicked ? this.onOkButtonClicked(this.activeTaskElement, e) : undefined));
        this.cancelButton.click((e) => (this.onCancelButtonClicked ? this.onCancelButtonClicked(this.activeTaskElement, e) : undefined));
        this.deleteButton.click((e) => (this.onDeleteButtonClicked ? this.onDeleteButtonClicked(this.activeTaskElement, e) : undefined));

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
        this.updateAutoComplete();

        this.timeBeginBox.val(String(element.timeSpan.begin));
        this.timeEndBox.val(String(element.timeSpan.end));
        this.timeSpanLabel.text(element.timeSpan.span.toFixed(1));

        this.jQueryElement.css("top", element.top + taskGridHeight);
    }

    public get visible() {
        return (this.jQueryElement.css("display") !== "none");
    }

    private updateAutoComplete() {
        this.nameBox.autocomplete({
            "source": taskAutoComplete[this.activeTaskElement.type],
            "minLength": 0,
            "select": (ev, ui) => { this.activeTaskElement.name = ui.item.value; }
        });
    }

    private onTimeBoxChanged(e: JQueryEventObject){
        var timeBegin: number = Number(this.timeBeginBox.val());
        var timeEnd: number = Number(this.timeEndBox.val());

        if (timeBegin > timeEnd) {
            // beginとendを交換
            var tmp = timeBegin;
            timeBegin = timeEnd;
            timeEnd = tmp;
        } else if (timeBegin === timeEnd) {
            // 今ユーザが弄った方とは違う方のコンボボックスの値を変更する
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
        var element = this.activeTaskElement;

        if (timeBegin < element.timeSpan.begin) {
            adjustPositionUpward(element.jQueryElement, newTop, newTop + newHeight);
        } else if (timeEnd > element.timeSpan.end) {
            adjustPositionDownward(element.jQueryElement, newTop, newTop + newHeight);
        }

        element.timeSpan = new TimeSpan(timeBegin, timeEnd);
        this.timeSpanLabel.text(String(element.timeSpan.span));
    }
}
