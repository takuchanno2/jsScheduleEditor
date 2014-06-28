/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />
"use strict";
var TaskElementContainer = (function () {
    function TaskElementContainer(jQueryContainer /*, private timeToTopFunc: (t:Time) => number*/ ) {
        var _this = this;
        this.jQueryContainer = jQueryContainer;
        // 早い時間で始まるタスクが先に来るように、常にソートされている
        this.elements = [];
        this._activeElement = null;
        this.previousState = null;
        this.onElementMousePressed = function (el, ev) {
            _this.activeElement = el;
            _this.saveState();
            _this.balloon.hide();
        };
        this.onElementClicked = function (el, ev) {
            _this.balloon.show(el);
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
        this.onBalloonOkButtonClicked = function (el, ev) {
            _this.activeElement = null;
            _this.balloon.hide();
        };
        this.onBalloonCancelButtonClicked = function (el, ev) {
            _this.rollbackState();
        };
        this.onBalloonDeleteButtonClicked = function (el, ev) {
            _this.remove(el);
        };
        this.balloon = new Balloon();
        this.balloon.onOkButtonClicked = this.onBalloonOkButtonClicked;
        this.balloon.onCancelButtonClicked = this.onBalloonCancelButtonClicked;
        this.balloon.onDeleteButtonClicked = this.onBalloonDeleteButtonClicked;
    }
    // やっぱaddAll的なメソッド追加する
    TaskElementContainer.prototype.add = function (element, active) {
        if (typeof active === "undefined") { active = true; }
        this.registerElementEvents(element);
        this.intertToAppropriateIndex(element);

        if (active) {
            this.activeElement = element;
        }
    };

    // タスクの開始が早い順で並んでいる状態を崩さないように、要素を配列の適切な場所に挿入する
    TaskElementContainer.prototype.intertToAppropriateIndex = function (element) {
        // 前後の要素との時間調整
        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i;
            var succeedingElement = null;

            for (i = 0; i < this.elements.length && this.elements[i].timeSpan.end.totalMinutes < element.timeSpan.begin.totalMinutes; i++)
                ;
            if (i < this.elements.length) {
                var overlapTop = this.elements[i];
                if (overlapTop.timeSpan.begin.totalMinutes < element.timeSpan.begin.totalMinutes) {
                    // もし被っている要素が新しく追加する要素を完全に含むような時間設定だったら、
                    // 新要素の下に、新要素の終了時間～被り要素の元々の終了時間を埋めるタスクを新規作成
                    if (overlapTop.timeSpan.end.totalMinutes > element.timeSpan.end.totalMinutes) {
                        succeedingElement = element.clone();
                        succeedingElement.timeSpan = new TimeSpan(element.timeSpan.end, overlapTop.timeSpan.end);
                        this.registerElementEvents(succeedingElement);
                    }

                    // 被っている要素の終了時間を早くする
                    overlapTop.timeSpan = new TimeSpan(overlapTop.timeSpan.begin, element.timeSpan.begin);
                    i++;
                }
            }

            // この位置に新しい要素を追加
            this.elements.splice(i++, 0, element);
            if (succeedingElement) {
                this.elements.splice(i++, 0, succeedingElement);
            }

            for (; i < this.elements.length && this.elements[i].timeSpan.begin.totalMinutes < element.timeSpan.end.totalMinutes; i++) {
                var overlapBottom = this.elements[i];

                if (overlapBottom.timeSpan.end.totalMinutes <= element.timeSpan.end.totalMinutes) {
                    // 新しい要素が確保する時間の方が長い (既にある要素が新しい要素に完全に内包されている)
                    // 場合は、内包されている要素を削除
                    this.elements.splice(i, 1);
                    overlapBottom.jQueryElement.remove();
                    i--;
                } else {
                    // 被っている要素の開始時間を遅くする
                    overlapBottom.timeSpan = new TimeSpan(element.timeSpan.end, overlapBottom.timeSpan.end);
                }
            }
        }
    };

    TaskElementContainer.prototype.registerElementEvents = function (element) {
        // Containerの方で受け取るイベントの登録
        element.onMousePressed = this.onElementMousePressed;
        element.onClicked = this.onElementClicked;
        element.onCloseButtonClicked = this.onElementCloseButtonClicked;
        element.onTimeSpanChanged = this.onElementTimeSpanChanged;

        this.jQueryContainer.append(element.jQueryElement);
        element.registerDefaultEvents();
    };

    TaskElementContainer.prototype.remove = function (element) {
        if (this.activeElement === element) {
            this.activeElement = null;
            this.balloon.hide();
        }

        this.elements.splice(this.elements.indexOf(element), 1);
        element.jQueryElement.remove();
    };

    TaskElementContainer.prototype.clear = function () {
        this.balloon.hide();
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
            _this.add(TaskElement.fromTask(t), false);
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

    Object.defineProperty(TaskElementContainer.prototype, "activeElement", {
        get: function () {
            return this._activeElement;
        },
        set: function (value) {
            if (this._activeElement) {
                this._activeElement.active = false;
            }

            this._activeElement = value;
            if (value) {
                this._activeElement.active = true;
                if (this.balloon.visible) {
                    this.balloon.update(value);
                }
            } else {
                if (this.balloon.visible) {
                    this.balloon.hide();
                }
            }
        },
        enumerable: true,
        configurable: true
    });

    return TaskElementContainer;
})();
//# sourceMappingURL=TaskElementContainer.js.map
