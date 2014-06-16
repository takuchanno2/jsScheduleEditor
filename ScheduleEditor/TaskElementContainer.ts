/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />

class TaskElementContainer {
    // 早い時間で始まるタスクが先に来るように、常にソートされている
    private elements: TaskElement[] = [];
    private _activeElement: TaskElement = null;
    private previousState = null;

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

        this.elements.push(element);
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

    private onElementMousePressed = (el, ev) => {
        this.activeElement = el;
        this.saveState();
        this.balloon.hide();
    };

    private onElementClicked = (el, ev) => {
        this.balloon.show(el);
    };

    private onElementCloseButtonClicked = (el, ev) => {
        this.remove(el);
    };

    private onBalloonOkButtonClicked = (el, ev) => {
        this.activeElement = null;
        this.balloon.hide();
    };

    private onBalloonCancelButtonClicked = (el, ev) => {
        this.rollbackState();
    };

    private onBalloonDeleteButtonClicked = (el, ev) => {
        this.remove(el);
    };
}
