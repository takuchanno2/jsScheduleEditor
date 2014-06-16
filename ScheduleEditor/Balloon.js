/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="TaskElementContainer.ts" />
var Balloon = (function () {
    function Balloon() {
        var _this = this;
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
        this.typeBox.change(function () {
            var value = _this.typeBox.val();

            var element = _this.elementContainer.activeElement;
            element.type = Number(value);
            _this.nameBox.autocomplete({
                "source": taskAutoComplete[element.type],
                "minLength": 0
            });
        });

        this.nameBox.focus(function () {
            _this.nameBox.autocomplete("search");
        });

        this.nameBox.on(realtimeEvents, function () {
            _this.elementContainer.activeElement.name = _this.nameBox.val();
        });
        this.memoBox.on(realtimeEvents, function () {
            _this.elementContainer.activeElement.memo = _this.memoBox.val();
        });

        this.timeBeginBox.change(function (e) {
            _this.onTimeBoxChanged(e);
        });
        this.timeEndBox.change(function (e) {
            _this.onTimeBoxChanged(e);
        });

        this.okButton.click(function () {
            _this.elementContainer.activeElement = null;
        });
        this.cancelButton.click(function () {
            if (lastState)
                _this.elementContainer.restore(lastState);
            lastState = null;
        });
        this.deleteButton.click(function () {
            _this.elementContainer.remove(_this.elementContainer.activeElement);
        });

        // タスクの種類のコンボボックスを作る
        Task.taskTypes.forEach(function (v, i) {
            $("<option>", {
                "text": v,
                "value": String(i)
            }).appendTo(_this.typeBox);
        });

        // 時間を選択するコンボボックスを作る
        var timeBegin = Math.round(TimeSpan.scheduleTime.begin * 2);
        var timeEnd = Math.round(TimeSpan.scheduleTime.end * 2);
        for (var i = 0, end = Math.round(TimeSpan.scheduleTime.span * 2.0); i <= end; i++) {
            var currTime = TimeSpan.scheduleTime.begin + (i / 2.0);

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
    Balloon.prototype.show = function () {
        this.update();
        this.jQueryElement.show();
        this.okButton.focus();
    };

    Balloon.prototype.hide = function () {
        this.jQueryElement.hide();
    };

    Balloon.prototype.update = function () {
        var element = this.elementContainer.activeElement;

        this.nameBox.val(element.name);
        this.memoBox.val(element.memo);

        this.typeBox.val(String(element.type));
        this.nameBox.autocomplete({
            "source": taskAutoComplete[element.type],
            "minLength": 0
        });

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
        var newTop = 2.0 * taskGridHeight * (timeBegin - TimeSpan.scheduleTime.begin);
        var newHeight = 2.0 * taskGridHeight * (timeEnd - timeBegin);
        var element = this.elementContainer.activeElement;

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
