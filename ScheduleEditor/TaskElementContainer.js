/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />
var TaskElementContainer = (function () {
    function TaskElementContainer(jQueryContainer) {
        var _this = this;
        this.jQueryContainer = jQueryContainer;
        this.elements = [];
        this._activeElement = null;
        this.previousState = null;
        this.onElementMousePressed = function (el, ev) {
            _this.previousState = _this.dump();
            _this.activeElement = el;
            _this.balloon.hide();
        };
        this.onElementClicked = function (el, ev) {
            _this.balloon.show();
        };
        this.onElementCloseButtonClicked = function (el, ev) {
            _this.remove(el);
        };
        this.balloon = new Balloon(this);
    }
    TaskElementContainer.prototype.add = function (element, active) {
        if (typeof active === "undefined") { active = true; }
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
        dump.forEach(function (t) {
            _this.add(TaskElement.fromTask(t));
        });
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
                    this.balloon.update();
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
