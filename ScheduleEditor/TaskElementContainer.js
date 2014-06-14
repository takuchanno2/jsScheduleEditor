/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />
/// <reference path="Balloon.ts" />
var TaskElementContainer = (function () {
    function TaskElementContainer(jQueryContainer, balloon) {
        this.jQueryContainer = jQueryContainer;
        this.balloon = balloon;
        this.elements = [];
    }
    TaskElementContainer.prototype.add = function (element) {
        this.elements.push(element);
        this.jQueryContainer.append(element.jQueryElement);
        element.show();
        element.registerEvents();
    };

    TaskElementContainer.prototype.remove = function (element) {
        this.elements.splice(this.elements.indexOf(element), 1);
        element.jQueryElement.remove();
    };

    TaskElementContainer.prototype.clear = function () {
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
        var fragment = $(document.createDocumentFragment());

        dump.forEach(function (task) {
            fragment.append(TaskElement.fromTask(task).jQueryElement);
        });

        clearTasks();
        $("#task-list").append(fragment);

        $(".task").each(function () {
            var curr = $(this).taskElement();
            curr.show();
            curr.registerEvents();
        });
    };

    Object.defineProperty(TaskElementContainer.prototype, "activeTask", {
        get: function () {
            return null;
        },
        set: function (value) {
        },
        enumerable: true,
        configurable: true
    });

    return TaskElementContainer;
})();
//# sourceMappingURL=TaskElementContainer.js.map
