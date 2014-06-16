/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/underscore/underscore.d.ts" />

/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />

"use strict"


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
        element.onMousePressed = this.onElementMousePressed;
        element.onClicked = this.onElementClicked;
        element.onCloseButtonClicked = this.onElementCloseButtonClicked;

        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i = 0;

            while (i < this.elements.length && element.timeSpan.begin > this.elements[i].timeSpan.end) i++;
            if (i < this.elements.length) {
                var overlapTop = this.elements[i];
                if (element.timeSpan.begin > overlapTop.timeSpan.begin) {
                    // この要素の下の部分と新しい要素の上部分が被っている
                    // →この要素の高さを縮める
                    // overlapTop.timeSpan.end = element.timeSpan.begin;
                }
            }

            // この位置に新しい要素を追加
            this.elements.splice(i, 0, element);
        }

        this.jQueryContainer.append(element.jQueryElement);

        element.registerDefaultEvents();

        if (active) {
            this.activeElement = element;
        }
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
