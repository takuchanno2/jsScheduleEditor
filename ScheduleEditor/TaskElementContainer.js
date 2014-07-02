/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />
"use strict";
var TaskElementContainer = (function () {
    // public balloon: Balloon;
    function TaskElementContainer(taskTable, jQueryContainer) {
        var _this = this;
        this.taskTable = taskTable;
        this.jQueryContainer = jQueryContainer;
        // 早い時間で始まるタスクが先に来るように、常にソートされている
        this.elements = [];
        // private _activeElement: TaskElement = null;
        this.previousState = null;
        //public get activeElement(): TaskElement {
        //    return this._activeElement;
        //}
        //public set activeElement(value: TaskElement) {
        //    if (this._activeElement) {
        //        this._activeElement.active = false;
        //    }
        //    this._activeElement = value;
        //    if (value) {
        //        this._activeElement.active = true;
        //        if (this.balloon.visible) {
        //            this.balloon.update(value);
        //        }
        //    } else {
        //        if (this.balloon.visible) {
        //            this.balloon.hide();
        //        }
        //    }
        //}
        this.onElementMousePressed = function (el, ev) {
            _this.saveState();
            _this.taskTable.activeElement = null;
            el.active = true;
        };
        this.onElementClicked = function (el, ev) {
            _this.taskTable.activeElement = el;
            return false;
        };
        this.onElementCloseButtonClicked = function (el, ev) {
            _this.remove(el);
        };
        this.onElementTimeSpanChanged = function (el, oldts, newts) {
            if (_this.elements.indexOf(el) == -1)
                throw new Error("Invalid Argument");

            el.top = taskGridHeight * el.top2;
            el.height = taskGridHeight * el.height2;
        };
        //this.balloon = new Balloon();
        //this.balloon.onOkButtonClicked = this.onBalloonOkButtonClicked;
        //this.balloon.onCancelButtonClicked = this.onBalloonCancelButtonClicked;
        //this.balloon.onDeleteButtonClicked = this.onBalloonDeleteButtonClicked;
    }
    // やっぱaddAll的なメソッド追加する
    TaskElementContainer.prototype.add = function (element) {
        this.intertToAppropriateIndex(element);
        this.addElementToJQueryContainer(element);
    };

    TaskElementContainer.prototype.addElementToJQueryContainer = function (element) {
        this.jQueryContainer.append(element.jQueryElement);
        element.registerDefaultEvents();
        element.container = this;
    };

    // タスクの開始が早い順で並んでいる状態を崩さないように、要素を配列の適切な場所に挿入する
    TaskElementContainer.prototype.intertToAppropriateIndex = function (element) {
        // 前後の要素との時間調整
        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i = 0, j = 0;

            for (i = this.elements.length - 1; i >= 0; i--) {
                var curr = this.elements[i];
                if (curr.timeSpan.begin.totalMinutes <= element.timeSpan.begin.totalMinutes) {
                    break;
                }
            }

            var insertIndex = i + 1;
            this.elements.splice(insertIndex, 0, element);

            // 新しく追加するタスクの時間が、直前のタスクの時間内に完全に含まれているか？
            var prev = this.elements[insertIndex - 1];
            if (insertIndex > 0 && (prev.timeSpan.begin.totalMinutes <= element.timeSpan.begin.totalMinutes) && (element.timeSpan.end.totalMinutes <= prev.timeSpan.end.totalMinutes)) {
                // 直前のタスクを新しく追加するタスクの開始時間まで縮める
                var oldPrevSpan = prev.timeSpan.span.totalMinutes;
                var newPrevTimeSpan = new TimeSpan(prev.timeSpan.begin, element.timeSpan.begin);
                this.setElementTimeSpan(insertIndex - 1, newPrevTimeSpan);

                // 縮めた分の時間を取り戻す長さの同じ内容のタスクを下に追加する
                var next = prev.clone();
                var remainingSpan = oldPrevSpan - newPrevTimeSpan.span.totalMinutes;
                next.timeSpan = new TimeSpan(element.timeSpan.end, new Time(element.timeSpan.end.totalMinutes + remainingSpan));
                this.elements.splice(insertIndex + 1, 0, next);
                this.addElementToJQueryContainer(next);
            }

            for (j = insertIndex - 1; j >= 0; j--) {
                var curr = this.elements[j];
                var next = this.elements[j + 1];

                if (next.timeSpan.begin.totalMinutes < curr.timeSpan.end.totalMinutes) {
                    var newBegin = Math.max(0, next.timeSpan.begin.totalMinutes - curr.timeSpan.span.totalMinutes);
                    var timeSpan = new TimeSpan(new Time(newBegin), next.timeSpan.begin);
                    this.setElementTimeSpan(j, timeSpan);
                }
            }

            for (j = insertIndex + 1; j < this.elements.length; j++) {
                var prev = this.elements[j - 1];
                var curr = this.elements[j];

                if (curr.timeSpan.begin.totalMinutes < prev.timeSpan.end.totalMinutes) {
                    var newEnd = Math.min(24 * 60, prev.timeSpan.end.totalMinutes + curr.timeSpan.span.totalMinutes);
                    var timeSpan = new TimeSpan(prev.timeSpan.end, new Time(newEnd));
                    this.setElementTimeSpan(j, timeSpan);
                }
            }
        }
    };

    TaskElementContainer.prototype.setElementTimeSpan = function (elementIndex, timeSpan) {
        var element = this.elements[elementIndex];
        if (timeSpan.span.totalMinutes > 0) {
            element.timeSpan = timeSpan;
        } else {
            this.remove(elementIndex);
        }
    };

    TaskElementContainer.prototype.remove = function (x) {
        var index;
        var element;

        if (typeof (x) === "number") {
            index = x;
            element = this.elements[x];
        } else {
            index = this.elements.indexOf(x);
            element = x;
        }

        if (index < 0 || index >= this.elements.length) {
            throw new Error("Invalid Argument");
        }

        this.elements.splice(index, 1);
        element.jQueryElement.remove();
    };

    TaskElementContainer.prototype.clear = function () {
        this.elements.forEach(function (e) {
            e.jQueryElement.remove();
        });
        this.elements = [];
    };

    TaskElementContainer.prototype.dump = function () {
        return $.map(this.elements, function (e) {
            return e.toTask();
        });
    };

    TaskElementContainer.prototype.restore = function (dump) {
        var _this = this;
        this.clear();

        // すげぇ遅い
        dump.forEach(function (t) {
            _this.add(TaskElement.fromTask(t));
        });
    };

    TaskElementContainer.prototype.saveState = function () {
        this.previousState = this.dump();
    };

    TaskElementContainer.prototype.rollbackState = function () {
        if (!this.previousState)
            throw new Error("Cannot rollback to the previous state.");

        this.restore(this.previousState);
        this.previousState = null;
    };
    return TaskElementContainer;
})();
//# sourceMappingURL=TaskElementContainer.js.map
