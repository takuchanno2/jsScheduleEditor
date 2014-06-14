﻿/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />

class TaskElementContainer {
    private elements: TaskElement[] = [];
    private _activeTask: TaskElement = null;
    public balloon: Balloon;

    public constructor(private jQueryContainer: JQuery) {
        this.balloon = new Balloon(this);
    }

    public add(element: TaskElement, active = true) {
        this.elements.push(element);

        this.jQueryContainer.append(element.jQueryElement);
        element.show();
        element.registerEvents();

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
        var fragment = $(document.createDocumentFragment());

        this.clear();

        dump.forEach((t) => {
            var element = TaskElement.fromTask(t);
            this.elements.push(element);
            fragment.append(element.jQueryElement)
        });
        
        this.jQueryContainer.append(fragment);

        this.elements.forEach((e) => {
            e.show();
            e.registerEvents();
        });
    }

    public get activeElement(): TaskElement {
        return this._activeTask;
    }

    public set activeElement(value: TaskElement) {
        if (this._activeTask) {
            this._activeTask.active = false;
            this._activeTask.jQueryElement.removeClass("active");
        }

        this._activeTask = value;
        if (value) {
            this._activeTask.jQueryElement.addClass("active");
        }

        // 要修正
        $(".ui-selected").removeClass("ui-selected");
    }
}
