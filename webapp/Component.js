sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (AppComponent) {
        "use strict";

        return AppComponent.extend("zstylemasterfin.zstylemasterfin.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                AppComponent.prototype.init.apply(this, arguments);
                console.log(">>> Component: init - setting up BOM field control watcher");
                var that = this;
                this._fieldControlMap = null;
                this._rowsUpdateAttached = false;
                this._iWatcherInterval = setInterval(function () {
                    that._tryApplyFieldControl();
                }, 3000);
            },

            destroy: function () {
                if (this._iWatcherInterval) { clearInterval(this._iWatcherInterval); }
                AppComponent.prototype.destroy.apply(this, arguments);
            },

            _tryApplyFieldControl: function () {
                var oMdcTable = this._findBomTable();
                if (!oMdcTable) { return; }
                if (!this._fieldControlMap) { this._readFieldControlFromExistingRows(oMdcTable); }
                if (!this._fieldControlMap) { return; }
                var oInnerTable = oMdcTable._oTable;
                if (!oInnerTable) { return; }
                if (!this._rowsUpdateAttached) {
                    var that = this;
                    oInnerTable.attachRowsUpdated(function () { that._processCreationRows(oInnerTable); });
                    this._rowsUpdateAttached = true;
                    console.log(">>> Component: rowsUpdated listener attached");
                }
                this._processCreationRows(oInnerTable);
            },

            /**
             * Searches the Element registry for the MDC Table bound to "_bom".
             * This works reliably in FE V4 where getRootControl().findAggregatedObjects()
             * cannot reach into nested Component containers.
             */
            _findBomTable: function () {
                var oFoundTable = null;
                try {
                    // Use Element registry to search all live UI controls
                    var Element = sap.ui.require("sap/ui/core/Element");
                    if (Element && Element.registry) {
                        Element.registry.forEach(function (oElement) {
                            if (!oFoundTable && oElement.isA && oElement.isA("sap.ui.mdc.Table")) {
                                var oRB = oElement.getRowBinding && oElement.getRowBinding();
                                if (oRB && oRB.getPath() === "_bom") {
                                    oFoundTable = oElement;
                                }
                            }
                        });
                    }
                } catch (e) {
                    console.log(">>> Component: Error searching Element registry:", e.message);
                }
                return oFoundTable;
            },

            _readFieldControlFromExistingRows: function (oMdcTable) {
                var oRB = oMdcTable.getRowBinding();
                if (!oRB) { return; }
                var aC = oRB.getContexts();
                for (var i = 0; i < aC.length; i++) {
                    var oCtx = aC[i];
                    if (oCtx && !oCtx.isTransient()) {
                        try {
                            var oFC = oCtx.getObject("__FieldControl");
                            if (oFC) {
                                this._fieldControlMap = oFC;
                                console.log(">>> Component: __FieldControl loaded:", JSON.stringify(oFC));
                                return;
                            }
                        } catch (e) { /* continue */ }
                        try {
                            var oData = oCtx.getObject();
                            if (oData && oData.__FieldControl) {
                                this._fieldControlMap = oData.__FieldControl;
                                console.log(">>> Component: __FieldControl from full data:", JSON.stringify(this._fieldControlMap));
                                return;
                            }
                            if (oData) {
                                console.log(">>> Component: BOM row keys:", Object.keys(oData).join(", "));
                            }
                        } catch (e) {
                            console.log(">>> Component: Error reading row:", e.message);
                        }
                    }
                }
            },

            _processCreationRows: function (oInnerTable) {
                if (!this._fieldControlMap) { return; }
                var aRows = oInnerTable.getRows();
                for (var i = 0; i < aRows.length; i++) {
                    var oCtx = aRows[i].getBindingContext();
                    if (oCtx && oCtx.isTransient && oCtx.isTransient()) {
                        this._applyFieldControlToRow(aRows[i]);
                    }
                }
            },

            /**
             * For a creation row, locks fields based on __FieldControl values.
             * FieldControl: 0=Hidden, 1=ReadOnly, 3=Editable, 7=Mandatory
             */
            _applyFieldControlToRow: function (oRow) {
                var aCells = oRow.getCells();
                for (var i = 0; i < aCells.length; i++) {
                    var sPN = this._getPropName(aCells[i]);
                    if (sPN && this._fieldControlMap.hasOwnProperty(sPN)) {
                        var v = this._fieldControlMap[sPN];
                        if (v === 0 || v === 1) {
                            this._lockCell(aCells[i]);
                        }
                    }
                }
            },

            /**
             * Extracts the OData property name from a cell.
             * FE V4 cell hierarchy: FieldAPI → FieldWrapper (content) → sap.ui.mdc.Field (contentEdit)
             * The binding lives on the innermost sap.ui.mdc.Field control.
             */
            _getPropName: function (oCell) {
                // Get the inner MDC Field by drilling through the FE V4 hierarchy
                var oMdcField = this._getInnerMdcField(oCell);
                if (oMdcField) {
                    var s = this._ep(oMdcField, "value") || this._ep(oMdcField, "text") || this._ep(oMdcField, "selected");
                    if (s) { return s; }
                }

                // Fallback: try direct bindings on the cell itself
                var s2 = this._ep(oCell, "value") || this._ep(oCell, "selected") || this._ep(oCell, "text");
                if (s2) { return s2; }

                return null;
            },

            /**
             * Drills into the FE V4 cell hierarchy to find the inner sap.ui.mdc.Field.
             * FieldAPI.getContent() → FieldWrapper.getContentEdit() → [sap.ui.mdc.Field]
             */
            _getInnerMdcField: function (oCell) {
                // Level 1: FieldAPI → getContent() → FieldWrapper
                var oFieldWrapper = null;
                if (oCell.getContent) {
                    var content = oCell.getContent();
                    oFieldWrapper = Array.isArray(content) ? content[0] : content;
                }
                if (!oFieldWrapper) { return null; }

                // Level 2: FieldWrapper → getContentEdit() → [sap.ui.mdc.Field]
                if (oFieldWrapper.getContentEdit) {
                    var aEditContent = oFieldWrapper.getContentEdit();
                    if (aEditContent && aEditContent.length > 0) {
                        return aEditContent[0];
                    }
                }

                // Fallback: FieldWrapper → getContentDisplay()
                if (oFieldWrapper.getContentDisplay) {
                    var aDisplayContent = oFieldWrapper.getContentDisplay();
                    if (aDisplayContent && aDisplayContent.length > 0) {
                        return aDisplayContent[0];
                    }
                }

                return oFieldWrapper;
            },

            /**
             * Extracts the last segment of a binding path (= OData property name).
             */
            _ep: function (o, p) {
                if (!o) { return null; }
                var bi = o.getBindingInfo(p);
                if (bi && bi.parts && bi.parts.length > 0 && bi.parts[0].path) {
                    var segs = bi.parts[0].path.split("/");
                    return segs[segs.length - 1];
                }
                return null;
            },

            /**
             * Locks a cell by setting the inner sap.ui.mdc.Field to Display mode.
             * This is the only reliable way to make FE V4 fields read-only.
             */
            _lockCell: function (oCell) {
                // Method 1: Set the FieldAPI wrapper to non-editable
                if (oCell.setEditable) { oCell.setEditable(false); }

                // Method 2: Find the inner MDC Field and set its editMode to "Display"
                var oMdcField = this._getInnerMdcField(oCell);
                if (oMdcField) {
                    if (oMdcField.setEditMode) {
                        oMdcField.setEditMode("Display");
                    }
                    if (oMdcField.setEditable) {
                        oMdcField.setEditable(false);
                    }
                    if (oMdcField.setEnabled) {
                        oMdcField.setEnabled(false);
                    }
                }
            }
        });
    }
);