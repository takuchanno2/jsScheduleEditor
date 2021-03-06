﻿/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/underscore/underscore.d.ts" />

/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />

"use strict";

class TaskElementContainer {
    // 早い時間で始まるタスクが先に来るように、常にソートされている
    private elements: TaskElement[] = [];
    private previousState: Task[] = null;

    public constructor(private taskTable: TaskTable, private jQueryContainer: JQuery) {
    }

    // やっぱaddAll的なメソッド追加する
    public add(element: TaskElement) {
        this.intertToAppropriateIndex(element);
        this.addElementToJQueryContainer(element);
    }

    private addElementToJQueryContainer(element: TaskElement) {
        this.jQueryContainer.append(element.jQueryElement);
        element.registerDefaultEvents();
        element.container = this;
    }

    // タスクの開始が早い順で並んでいる状態を崩さないように、要素を配列の適切な場所に挿入する
    private intertToAppropriateIndex(element: TaskElement) {
        // 前後の要素との時間調整
        if ($.isEmptyObject(this.elements)) {
            this.elements.push(element);
        } else {
            var i = 0, j = 0;

            // 挿入位置を決定
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
            if (insertIndex > 0 &&
                (prev.timeSpan.begin.totalMinutes <= element.timeSpan.begin.totalMinutes) &&
                (element.timeSpan.end.totalMinutes <= prev.timeSpan.end.totalMinutes)
            ) {
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

            // 上方向にズラす
            for (j = insertIndex - 1; j >= 0; j--) {
                var curr = this.elements[j];
                var next = this.elements[j + 1];

                if (next.timeSpan.begin.totalMinutes < curr.timeSpan.end.totalMinutes) {
                    var newBegin = Math.max(0, next.timeSpan.begin.totalMinutes - curr.timeSpan.span.totalMinutes);
                    var timeSpan = new TimeSpan(new Time(newBegin), next.timeSpan.begin);
                    this.setElementTimeSpan(j, timeSpan);
                }
            }

            // 下方向にズラす
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
    }

    private setElementTimeSpan(elementIndex: number, timeSpan: TimeSpan) {
        var element = this.elements[elementIndex];
        if (timeSpan.span.totalMinutes > 0) {
            element.timeSpan = timeSpan;
        } else {
            this.remove(elementIndex);
        }
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

        this.elements.splice(index, 1);

        if (element.onRemoved) { element.onRemoved(element); }
        element.jQueryElement.remove();
    }

    public clear() {
        this.elements.forEach((e) => { e.jQueryElement.remove(); });
        this.elements = [];
    }

    public dump(): Task[]{
        return $.map(this.elements, function (e) { return e.toTask(); });
    }

    public restore(dump: Task[]) {
        this.clear();
        // すげぇ遅い
        dump.forEach((t) => { this.add(TaskElement.fromTask(t)); });
    }

    public saveState() {
        this.previousState = this.dump();
    }

    public rollbackState() {
        if (!this.previousState) throw new Error("Cannot rollback to the previous state.");

        this.restore(this.previousState);
        this.previousState = null;
    }

    public onElementMousePressed(el: TaskElement, ev: JQueryMouseEventObject){
        this.saveState();
        this.taskTable.onElementMousePressed(el, ev);
    }

    public onElementClicked(el: TaskElement, ev: JQueryEventObject){
        this.taskTable.onElementClicked(el, ev);
        return false;
    }

    public onElementCloseButtonClicked(el: TaskElement, ev: JQueryEventObject){
        this.remove(el);
        this.onElementCloseButtonClicked(el, ev);
    }

    public onElementTimeSpanChanged(el: TaskElement, oldts: TimeSpan, newts: TimeSpan){
        if (this.elements.indexOf(el) == -1) throw new Error("Invalid Argument");

        el.top = taskGridHeight * el.top2;
        el.height = taskGridHeight * el.height2;
    }
}
