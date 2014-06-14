/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="BaseTypes.ts" />
/// <reference path="TaskElement.ts" />

class TaskElementContainer {
    private elements: TaskElement[] = [];

    public constructor(private jQueryContainer: JQuery) {
    }

    public add(element: TaskElement) {
        this.elements.push(element);
        this.jQueryContainer.append(element.jQueryElement);
        element.show();
        element.registerEvents();
    }

    public remove(element: TaskElement) {
        this.elements.splice(this.elements.indexOf(element), 1);
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
        var fragment = $(document.createDocumentFragment());

        dump.forEach((task) => {
            fragment.append(TaskElement.fromTask(task).jQueryElement)
        });

        clearTasks();
        $("#task-list").append(fragment);

        $(".task").each(function () {
            var curr: TaskElement = $(this).taskElement();
            curr.show();
            curr.registerEvents();
        });
    }

    public get activeTask(): TaskElement {
        return null;
    }

    public set activeTask(value: TaskElement) {
    }
}
