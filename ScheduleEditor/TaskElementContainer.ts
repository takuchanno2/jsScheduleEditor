/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/underscore/underscore.d.ts" />

/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />

"use strict";

class TaskElementContainer {
    // 早い時間で始まるタスクが先に来るように、常にソートされている
    private elements: TaskElement[] = [];
    private _activeElement: TaskElement = null;
    private previousState: Task[] = null;

    public balloon: Balloon;

    public constructor(private jQueryContainer: JQuery/*, private timeToTopFunc: (t:Time) => number*/) {
        this.balloon = new Balloon();
        this.balloon.onOkButtonClicked = this.onBalloonOkButtonClicked;
        this.balloon.onCancelButtonClicked = this.onBalloonCancelButtonClicked;
        this.balloon.onDeleteButtonClicked = this.onBalloonDeleteButtonClicked;
    }

    // やっぱaddAll的なメソッド追加する
    public add(element: TaskElement, active = true) {
        this.registerElementEvents(element);
        this.intertToAppropriateIndex(element);

        if (active) {
            this.activeElement = element;
        }
    }

    // タスクの開始が早い順で並んでいる状態を崩さないように、要素を配列の適切な場所に挿入する
    private intertToAppropriateIndex(element: TaskElement) {
        // 前後の要素との時間調整
        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i = 0, j = 0;

            // 挿入位置を決定
            for (; i < this.elements.length; i++) {
                if (this.elements[i].timeSpan.begin.totalMinutes < element.timeSpan.end.totalMinutes) {
                    if (element.timeSpan.begin.totalMinutes <= this.elements[i].timeSpan.begin.totalMinutes) {
                        break;
                    }
                } else {
                    break;
                }
            }

            var insertIndex = i;
            this.elements.splice(insertIndex, 0, element);

            // 上方向にズラスす
            for (j = insertIndex - 1; j >= 0; j--) {
                var curr = this.elements[j];
                var next = this.elements[j + 1];

                if (next.timeSpan.begin.totalMinutes < curr.timeSpan.end.totalMinutes) {
                    var newBegin = Math.max(0, next.timeSpan.begin.totalMinutes - curr.timeSpan.span.totalMinutes);
                    var timeSpan = new TimeSpan(new Time(newBegin), next.timeSpan.begin);
                    if (timeSpan.span.totalMinutes > 0) {
                        curr.timeSpan = timeSpan;
                    } else {
                        this.remove(j);
                    }
                }
            }

            // 下方向にズラスす
            for (j = insertIndex + 1; j < this.elements.length; j++) {
                var prev = this.elements[j - 1];
                var curr = this.elements[j];

                if (curr.timeSpan.begin.totalMinutes < prev.timeSpan.end.totalMinutes) {
                    var newEnd = Math.min(24 * 60, prev.timeSpan.end.totalMinutes + curr.timeSpan.span.totalMinutes);
                    var timeSpan = new TimeSpan(prev.timeSpan.end, new Time(newEnd));

                    if (timeSpan.span.totalMinutes > 0) {
                        curr.timeSpan = timeSpan;
                    } else {
                        this.remove(j);
                    }
                }
            }
        }
    }

    private registerElementEvents(element: TaskElement) {
        // Containerの方で受け取るイベントの登録
        element.onMousePressed = this.onElementMousePressed;
        element.onClicked = this.onElementClicked;
        element.onCloseButtonClicked = this.onElementCloseButtonClicked;
        element.onTimeSpanChanged = this.onElementTimeSpanChanged;

        this.jQueryContainer.append(element.jQueryElement);
        element.registerDefaultEvents();
    }

    public remove(index: number): void;
    public remove(element: TaskElement): void;
    public remove(x: any) {
        var index: number;
        var element: TaskElement;

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

        if (this.activeElement === element) {
            this.activeElement = null;
            this.balloon.hide();
        }

        this.elements.splice(index, 1);
        element.jQueryElement.remove();
    }

    public clear() {
        this.balloon.hide();
        this.elements.forEach((e) => { e.jQueryElement.remove(); });
        this.elements = [];
    }

    public dump(): Task[]{
        return $.map(this.elements, function (e) { return e.toTask(); });
    }

    public restore(dump: Task[]) {
        this.clear();
        // すげぇ遅い
        dump.forEach((t) => { this.add(TaskElement.fromTask(t), false); });
    }

    public saveState() {
        this.previousState = this.dump();
    }

    public rollbackState() {
        if (!this.previousState) throw new Error("Cannot rollback to the previous state.");

        this.restore(this.previousState);
        this.previousState = null;
    }

    public get activeElement(): TaskElement {
        return this._activeElement;
    }

    public set activeElement(value: TaskElement) {
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
    }

    private onElementMousePressed = (el: TaskElement, ev: JQueryMouseEventObject) => {
        this.activeElement = el;
        this.saveState();
        this.balloon.hide();
    };

    private onElementClicked = (el: TaskElement, ev: JQueryEventObject) => {
        this.balloon.show(el);
        return false;
    };

    private onElementCloseButtonClicked = (el: TaskElement, ev: JQueryEventObject) => {
        this.remove(el);
    };

    private onElementTimeSpanChanged = (el: TaskElement, oldts: TimeSpan, newts: TimeSpan) => {
        if (this.elements.indexOf(el) == -1) throw new Error("Invalid Argument");

        el.top = taskGridHeight * el.top2;
        el.height = taskGridHeight * el.height2;
    };

    private onBalloonOkButtonClicked = (el: TaskElement, ev: JQueryEventObject) => {
        this.activeElement = null;
        this.balloon.hide();
    };

    private onBalloonCancelButtonClicked = (el: TaskElement, ev: JQueryEventObject) => {
        this.rollbackState();
    };

    private onBalloonDeleteButtonClicked = (el: TaskElement, ev: JQueryEventObject) => {
        this.remove(el);
    };
}
