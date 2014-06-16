/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />

class TaskElementContainer {
    private elements: TaskElement[] = [];
    private _activeElement: TaskElement = null;
    private previousState = null;

    public balloon: Balloon;

    public constructor(private jQueryContainer: JQuery) {
        this.balloon = new Balloon(this);
    }

    public add(element: TaskElement, active = true) {
        element.onMousePressed = this.onElementMousePressed;
        element.onClicked = this.onElementClicked;
        element.onCloseButtonClicked = this.onElementCloseButtonClicked;

        this.elements.push(element);
        this.jQueryContainer.append(element.jQueryElement);

        element.show();
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
        dump.forEach((t) => { this.add(TaskElement.fromTask(t)); });
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
                this.balloon.update();
            }
        } else {
            if (this.balloon.visible) {
                this.balloon.hide();
            }
        }
    }

    private onElementMousePressed = (el, ev) => {
        this.previousState = this.dump();
        this.activeElement = el;
        this.balloon.hide();
    };

    private onElementClicked = (el, ev) => {
        this.balloon.show();
    };

    private onElementCloseButtonClicked = (el, ev) => {
        this.remove(el);
    };
}
