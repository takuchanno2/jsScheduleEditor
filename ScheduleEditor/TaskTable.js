/// <reference path="Scripts/typings/jquery/jquery.d.ts" />
/// <reference path="Scripts/typings/jqueryui/jqueryui.d.ts" />
"use strict";
var TaskTable = (function () {
    function TaskTable(jQueryTable) {
        this.jQueryTable = jQueryTable;
        this.jQueryFixedGrid = jQueryTable.find("#task-grid-fixed");
        this.jQueryTimeGrid = jQueryTable.find("#task-grid-time");
        this.jQueryEditableGrid = jQueryTable.find("#task-grid-editable");

        this.balloon = new Balloon(this);

        // テーブルの一番下のイベントで、タスクのアクティブ化解除
        // アクティブ化を解除されたくない場合は、適宜プロパゲーションを止めること
        jQueryTable.click(function () {
            this.activeElement = null;
        });

        // 新しくタスクを追加するためにグリッド選択後は、アクティブ化解除されませんように
        [this.jQueryTimeGrid, this.jQueryEditableGrid].forEach(function (grid) {
            grid.click(function () {
                return false;
            });
        });

        this.generateCells();

        jQueryTable.width(this.jQueryFixedGrid.outerWidth() + this.jQueryTimeGrid.outerWidth() + this.jQueryEditableGrid.outerWidth());

        this.editableElementContainer = new TaskElementContainer(this, jQueryTable.find("#task-list"));
        taskElementContainer = this.editableElementContainer;
    }
    Object.defineProperty(TaskTable, "minutesPerCell", {
        get: function () {
            return 60 / TaskTable.cellsPerHour;
        },
        enumerable: true,
        configurable: true
    });

    TaskTable.init = function (config) {
        TaskTable.cellsPerHour = config.cellsPerHour;
    };

    TaskTable.prototype.generateCells = function () {
        var _this = this;
        var fragmentLeft = $(document.createDocumentFragment());
        var fragmentHours = $(document.createDocumentFragment());
        var fragmentRight = $(document.createDocumentFragment());

        for (var i = 0; i < 24; i++) {
            for (var j = 0; j < 60; j += TaskTable.minutesPerCell) {
                var time = new Time(i, j);
                var inCoreTime = TimeSpan.coretime.includes(time);
                var hourStarts = (j == 0);

                var leftCell = $("<div />", {
                    "class": "task-cell" + (inCoreTime ? " core" : ""),
                    "data": {
                        "time": time
                    }
                });

                var timeCell = $("<div />", {
                    "text": (hourStarts ? String(i) : ""),
                    "class": "time-cell" + (inCoreTime ? " core" : "") + (hourStarts ? " hour-starts" : ""),
                    "data": {
                        "time": time
                    }
                });

                var rightCell = leftCell.clone(true);

                rightCell.data("counter-cell", timeCell);
                timeCell.data("counter-cell", rightCell);

                fragmentLeft.append(leftCell);
                fragmentRight.append(rightCell);
                fragmentHours.append(timeCell);
            }
        }

        this.jQueryFixedGrid.append(fragmentLeft);
        this.jQueryTimeGrid.append(fragmentHours);
        this.jQueryEditableGrid.append(fragmentRight);

        taskGridHeight = Math.round(this.jQueryTable.find("#table-content .task-cell:first").outerHeight());
        taskGridHeightTotal = Math.round(this.jQueryEditableGrid.height());

        [this.jQueryTimeGrid, this.jQueryEditableGrid].forEach(function (grid) {
            grid.selectable({
                "start": function (e, ui) {
                    _this.activeElement = null;
                },
                "stop": function (e, ui) {
                    _this.addTask();
                }
            });

            ["selecting", "selected", "unselecting", "unselected"].forEach(function (evstr) {
                grid.on("selectable" + evstr, function (ev, ui) {
                    _this.syncSelectableState($(ui[evstr]));
                });
            });
        });
    };

    TaskTable.prototype.syncSelectableState = function (obj) {
        var counterCell = obj.data("counter-cell");
        ["ui-selecting", "ui-selected"].forEach(function (cls) {
            (obj.hasClass(cls) ? $.fn.addClass : $.fn.removeClass).call(counterCell, cls);
        });
    };

    TaskTable.prototype.addTask = function () {
        var selectedCells = this.jQueryTable.find(".ui-selected");
        if (selectedCells.length <= 0)
            return;

        var timeBegin = selectedCells.first().data("time");
        var timeEnd = selectedCells.last().data("time").putForward(1);
        selectedCells.removeClass("ui-selected");

        this.editableElementContainer.saveState();

        var newTask = new TaskElement(new TimeSpan(timeBegin, timeEnd));

        this.editableElementContainer.add(newTask);
        this.activeElement = newTask;
        this.balloon.show(newTask);
    };

    TaskTable.prototype.clearEditingTaskElements = function () {
        if (this.activeElement && this.activeElement.container === this.editableElementContainer) {
            this.activeElement = null;
        }

        this.editableElementContainer.clear();
    };

    TaskTable.prototype.onElementMousePressed = function (el, ev) {
        this.balloon.hide();
        this.activeElement = el;
        el.active = true;
    };

    TaskTable.prototype.onElementClicked = function (el, ev) {
        this.balloon.show(el);
        return false;
    };

    TaskTable.prototype.onElementCloseButtonClicked = function (el, ev) {
    };

    TaskTable.prototype.onBalloonOkButtonClicked = function (el, ev) {
        this.activeElement = null;
    };

    TaskTable.prototype.onBalloonCancelButtonClicked = function (el, ev) {
        // ここら辺は後ほどうまいことやる
        this.editableElementContainer.rollbackState();
    };

    TaskTable.prototype.onBalloonDeleteButtonClicked = function (el, ev) {
        // ここら辺は後ほどうまいことやる
        this.editableElementContainer.remove(el);
    };

    Object.defineProperty(TaskTable.prototype, "activeElement", {
        get: function () {
            return this._activeElement;
        },
        set: function (value) {
            var _this = this;
            if (this._activeElement) {
                this._activeElement.active = false;
                this._activeElement.onRemoved = null;
            }

            this._activeElement = value;
            if (value) {
                this._activeElement.active = true;
                value.onRemoved = function (el) {
                    return _this.onActiveElementRemoved(el);
                };
                if (this.balloon.visible) {
                    this.balloon.show(value);
                }
            } else {
                this.balloon.hide();
            }
        },
        enumerable: true,
        configurable: true
    });


    TaskTable.prototype.onActiveElementRemoved = function (el) {
        this.balloon.hide();
    };
    return TaskTable;
})();
//# sourceMappingURL=TaskTable.js.map
