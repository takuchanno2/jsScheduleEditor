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

    public constructor(private jQueryContainer: JQuery) {
        this.balloon = new Balloon();
        this.balloon.onOkButtonClicked = this.onBalloonOkButtonClicked;
        this.balloon.onCancelButtonClicked = this.onBalloonCancelButtonClicked;
        this.balloon.onDeleteButtonClicked = this.onBalloonDeleteButtonClicked;
    }

    // やっぱaddAll的なメソッド追加する
    public add(element: TaskElement, active = true) {
        this.registerElementEvents(element);

        // 前後の要素との時間調整
        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i: number; // ループカウンタ兼、新しく要素を挿入する場所
            var succeedingElement: TaskElement = null;

            // 最初は、新しく追加する要素よりも開始時間が早いタスクについて、被りの解消をする
            for (i = 0; i < this.elements.length && this.elements[i].timeSpan.end.totalMinutes < element.timeSpan.begin.totalMinutes; i++);
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

            // 続いて、新しく追加する要素よりも開始時間が遅いタスクについて、被りの解消をする
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

        if (active) {
            this.activeElement = element;
        }
    }

    private registerElementEvents(element: TaskElement) {
        // Containerの方で受け取るイベントの登録
        element.onMousePressed = this.onElementMousePressed;
        element.onClicked = this.onElementClicked;
        element.onCloseButtonClicked = this.onElementCloseButtonClicked;

        this.jQueryContainer.append(element.jQueryElement);
        element.registerDefaultEvents();
    }

    public remove(element: TaskElement) {
        if (this.activeElement === element) {
            this.activeElement = null;
            this.balloon.hide();
        }

        this.elements.splice(this.elements.indexOf(element), 1);
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
