/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />
var TaskElementContainer = (function () {
    function TaskElementContainer(jQueryContainer, balloon) {
        this.jQueryContainer = jQueryContainer;
        this.balloon = balloon;
        this.elements = [];
        this._activeTask = null;
    }
    TaskElementContainer.prototype.add = function (element, active) {
        if (typeof active === "undefined") { active = true; }
        element.container = this;
        this.elements.push(element);

        this.jQueryContainer.append(element.jQueryElement);
        element.show();
        element.registerEvents();

        if (active) {
            this.activeElement = element;
        }
    };

    TaskElementContainer.prototype.remove = function (element) {
        if (this.activeElement === element) {
            this.activeElement = null;
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
        var fragment = $(document.createDocumentFragment());

        this.clear();

        dump.forEach(function (t) {
            var element = TaskElement.fromTask(t);
            element.container = _this;
            _this.elements.push(element);
            fragment.append(element.jQueryElement);
        });

        this.jQueryContainer.append(fragment);

        this.elements.forEach(function (e) {
            e.show();
            e.registerEvents();
        });
    };

    Object.defineProperty(TaskElementContainer.prototype, "activeElement", {
        get: function () {
            return this._activeTask;
        },
        set: function (value) {
            if (this._activeTask) {
                this._activeTask.active = false;
            }

            this._activeTask = value;

            // 要修正
            $(".ui-selected").removeClass("ui-selected");
        },
        enumerable: true,
        configurable: true
    });

    return TaskElementContainer;
})();
//# sourceMappingURL=TaskElementContainer.js.map
