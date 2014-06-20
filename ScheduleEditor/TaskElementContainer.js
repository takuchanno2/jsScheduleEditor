/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/underscore/underscore.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />
"use strict";
var TaskElementContainer = (function () {
    function TaskElementContainer(jQueryContainer) {
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
        };
        this.onElementCloseButtonClicked = function (el, ev) {
            _this.remove(el);
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
        element.onMousePressed = this.onElementMousePressed;
        element.onClicked = this.onElementClicked;
        element.onCloseButtonClicked = this.onElementCloseButtonClicked;

        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i = 0;

            while (i < this.elements.length && element.timeSpan.begin > this.elements[i].timeSpan.end)
                i++;
            if (i < this.elements.length) {
                var overlapTop = this.elements[i];
                if (element.timeSpan.begin > overlapTop.timeSpan.begin) {
                    // この要素の下の部分と新しい要素の上部分が被っている
                    // →この要素の高さを縮める
                    overlapTop.timeSpan = new TimeSpan(overlapTop.timeSpan.begin, element.timeSpan.begin);
                }
            }

            // この位置に新しい要素を追加
            this.elements.splice(i + 1, 0, element);
        }

        this.jQueryContainer.append(element.jQueryElement);

        element.registerDefaultEvents();

        if (active) {
            this.activeElement = element;
        }
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
