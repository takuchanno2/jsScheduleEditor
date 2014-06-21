/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />
"use strict";
var Balloon = (function () {
    function Balloon() {
        var _this = this;
        this.onOkButtonClicked = $.noop;
        this.onCancelButtonClicked = $.noop;
        this.onDeleteButtonClicked = $.noop;
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

        this.typeBox.change(function (ev) {
            _this.onTypeBoxChanged(ev);
        });
        this.nameBox.focus(function () {
            _this.nameBox.autocomplete("search");
        });

        // IEのバグのため、変なタイミングでinputイベントが発火することがある
        // 変な時に発火してもいいように、変数をチェックする
        //this.nameBox.on("input", () => { this.activeTaskElement.name = this.nameBox.val(); });
        //this.memoBox.on("input", () => { this.activeTaskElement.memo = this.memoBox.val(); });
        this.nameBox.on("input", function () {
            if (_this.activeTaskElement) {
                _this.activeTaskElement.name = _this.nameBox.val();
            }
        });
        this.memoBox.on("input", function () {
            if (_this.activeTaskElement) {
                _this.activeTaskElement.memo = _this.memoBox.val();
            }
        });

        this.timeBeginBox.change(function (e) {
            _this.onTimeBoxChanged(e);
        });
        this.timeEndBox.change(function (e) {
            _this.onTimeBoxChanged(e);
        });

        this.okButton.click(function (e) {
            return _this.onOkButtonClicked(_this.activeTaskElement, e);
        });
        this.cancelButton.click(function (e) {
            return _this.onCancelButtonClicked(_this.activeTaskElement, e);
        });
        this.deleteButton.click(function (e) {
            return _this.onDeleteButtonClicked(_this.activeTaskElement, e);
        });

        // タスクの種類のコンボボックスを作る
        Task.taskTypes.forEach(function (v, i) {
            $("<option>", {
                "text": v.name,
                "value": String(i)
            }).appendTo(_this.typeBox);
        });

        for (var i = 0, end = 24 * 2; i <= end; i++) {
            var currTime = (i / 2.0);

            var option = $("<option>", {
                "text": TimeSpan.timeToString(currTime),
                "value": String(currTime)
            });

            if (i < end) {
                option.clone().appendTo(this.timeBeginBox);
            }
            if (i > 0) {
                option.clone().appendTo(this.timeEndBox);
            }
        }
    }
    Balloon.prototype.show = function (element) {
        this.update(element);
        this.jQueryElement.show();
        this.okButton.focus();
    };

    Balloon.prototype.hide = function () {
        this.jQueryElement.hide();
    };

    Balloon.prototype.update = function (element) {
        this.activeTaskElement = element;

        this.nameBox.val(element.name);
        this.memoBox.val(element.memo);

        this.typeBox.val(String(element.type));
        this.updateAutoCompleteCandidates();

        this.timeBeginBox.val(String(element.timeSpan.begin));
        this.timeEndBox.val(String(element.timeSpan.end));
        this.timeSpanLabel.text(element.timeSpan.span.toFixed(1));

        this.jQueryElement.css("top", element.top + taskGridHeight);
    };

    Object.defineProperty(Balloon.prototype, "visible", {
        get: function () {
            return (this.jQueryElement.css("display") !== "none");
        },
        enumerable: true,
        configurable: true
    });

    Balloon.prototype.onTypeBoxChanged = function (ev) {
        if (typeof ev === "undefined") { ev = null; }
        this.activeTaskElement.type = $(ev.currentTarget).val();
        this.updateAutoCompleteCandidates();
    };

    Balloon.prototype.updateAutoCompleteCandidates = function () {
        var _this = this;
        this.nameBox.autocomplete({
            "source": Task.taskTypes[this.activeTaskElement.type].taskNameCandidates,
            "minLength": 0,
            // 何故かJQueryUI.AutocompleteUIParamsの定義が空……
            // "select": (ev: JQueryEventObject, ui: JQueryUI.AutocompleteUIParams) => { this.activeTaskElement.name = ui.item.value; }
            "select": function (ev, ui) {
                _this.activeTaskElement.name = ui.item.value;
            }
        });
    };

    Balloon.prototype.onTimeBoxChanged = function (e) {
        var timeBegin = Number(this.timeBeginBox.val());
        var timeEnd = Number(this.timeEndBox.val());

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
        var newTop = 2.0 * taskGridHeight * timeBegin;
        var newHeight = 2.0 * taskGridHeight * (timeEnd - timeBegin);
        var element = this.activeTaskElement;

        if (timeBegin < element.timeSpan.begin) {
            adjustPositionUpward(element.jQueryElement, newTop, newTop + newHeight);
        } else if (timeEnd > element.timeSpan.end) {
            adjustPositionDownward(element.jQueryElement, newTop, newTop + newHeight);
        }

        element.timeSpan = new TimeSpan(timeBegin, timeEnd);
        this.timeSpanLabel.text(String(element.timeSpan.span));
    };
    return Balloon;
})();
//# sourceMappingURL=Balloon.js.map
