sap.ui.define(
    ["sap/fe/core/AppComponent"],
    function (AppComponent) {
        "use strict";

        return AppComponent.extend("zstylemasterfin.zstylemasterfin.Component", {
            metadata: {
                manifest: "json"
            },

            init: function () {
                // Call parent init
                AppComponent.prototype.init.apply(this, arguments);

                console.log(">>> Component: init - setting up BOM field control watcher");

                // Start watching for the Object Page and BOM table
                var that = this;
                this._fieldControlMap = null;
                this._rowsUpdateAttached = false;

                // Poll every 3 seconds to find and process the BOM table
                // This handles navigation to the Object Page, Edit mode, etc.
                this._iWatcherInterval = setInterval(function () {
                    that._tryApplyFieldControl();
                }, 3000);
            },

            destroy: function () {
                if (this._iWatcherInterval) {
                    clearInterval(this._iWatcherInterval);
                }
                AppComponent.prototype.destroy.apply(this, arguments);
            },

            /**
             * Attempts to find the BOM table and apply field control to ghost rows.
             * Runs periodically to catch edit mode transitions.
             */
            _tryApplyFieldControl: function () {
                // Find the MDC Table bound to "_bom"
                var oMdcTable = this._findBomTable();
                if (!oMdcTable) {
                    return;
                }

                // Read field control from existing rows (only once)
                if (!this._fieldControlMap) {
                    this._readFieldControlFromExistingRows(oMdcTable);
                }

                if (!this._fieldControlMap) {
                    return; // No existing rows to read from yet
                }

                // Get the inner GridTable
                var oInnerTable = oMdcTable._oTable;
                if (!oInnerTable) {
                    return;
                }

                // Attach rowsUpdated listener once
                if (!this._rowsUpdateAttached) {
                    var that = this;
                    oInnerTable.attachRowsUpdated(function () {
                        that._processCreationRows(oInnerTable);
                    });
                    this._rowsUpdateAttached = true;
                    console.log(">>> Component: rowsUpdated listener attached to BOM GridTable");
                }

                // Process immediately
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

            /**
             * Reads __FieldControl from the first existing (non-transient) BOM row.
             * Since auth is per-user (department role), all rows share the same field control values.
             */
            _readFieldControlFromExistingRows: function (oMdcTable) {
                var oRowBinding = oMdcTable.getRowBinding();
                if (!oRowBinding) {
                    return;
                }

                var aContexts = oRowBinding.getContexts();
                for (var i = 0; i < aContexts.length; i++) {
                    var oContext = aContexts[i];
                    if (oContext && !oContext.isTransient()) {
                        // Try reading __FieldControl directly
                        try {
                            var oFieldControl = oContext.getObject("__FieldControl");
                            if (oFieldControl) {
                                this._fieldControlMap = oFieldControl;
                                console.log(">>> Component: __FieldControl loaded:", JSON.stringify(oFieldControl));
                                return;
                            }
                        } catch (e) { /* continue */ }

                        // Fallback: read full row data
                        try {
                            var oRowData = oContext.getObject();
                            if (oRowData && oRowData.__FieldControl) {
                                this._fieldControlMap = oRowData.__FieldControl;
                                console.log(">>> Component: __FieldControl from full data:", JSON.stringify(this._fieldControlMap));
                                return;
                            }
                            // Debug: log available keys so we can see what's in the response
                            if (oRowData) {
                                console.log(">>> Component: BOM row keys:", Object.keys(oRowData).join(", "));
                            }
                        } catch (e) {
                            console.log(">>> Component: Error reading row:", e.message);
                        }
                    }
                }
            },

            /**
             * Iterates visible rows, finds transient (ghost) rows, and locks fields.
             */
            _processCreationRows: function (oInnerTable) {
                if (!this._fieldControlMap) {
                    return;
                }

                var aRows = oInnerTable.getRows();
                for (var i = 0; i < aRows.length; i++) {
                    var oRow = aRows[i];
                    var oContext = oRow.getBindingContext();

                    if (oContext && oContext.isTransient && oContext.isTransient()) {
                        this._applyFieldControlToRow(oRow);
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
                    var sPropertyName = this._getPropertyNameFromCell(aCells[i]);
                    if (sPropertyName && this._fieldControlMap.hasOwnProperty(sPropertyName)) {
                        var iFieldControl = this._fieldControlMap[sPropertyName];
                        // 0 = Hidden, 1 = ReadOnly → lock the field
                        if (iFieldControl === 0 || iFieldControl === 1) {
                            this._setCellReadOnly(aCells[i]);
                        }
                    }
                }
            },

            /**
             * Extracts the OData property name from a cell's binding info.
             * Digs through wrapper controls (HBox, VBox, etc.) up to 2 levels deep.
             */
            _getPropertyNameFromCell: function (oCell) {
                // Get the inner MDC Field by drilling through the FE V4 hierarchy
                var oMdcField = this._getInnerMdcField(oCell);
                if (oMdcField) {
                    var sPath = this._extractBindingPath(oMdcField, "value") ||
                                this._extractBindingPath(oMdcField, "text") ||
                                this._extractBindingPath(oMdcField, "selected");
                    if (sPath) { return sPath; }
                }

                // Fallback: try direct bindings on the cell itself
                var sPath2 = this._extractBindingPath(oCell, "value") ||
                             this._extractBindingPath(oCell, "selected") ||
                             this._extractBindingPath(oCell, "text");
                if (sPath2) { return sPath2; }

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
             * Extracts the last segment of a binding path (= the OData property name).
             */
            _extractBindingPath: function (oControl, sPropertyName) {
                if (!oControl) { return null; }
                var oBindingInfo = oControl.getBindingInfo(sPropertyName);
                if (oBindingInfo && oBindingInfo.parts && oBindingInfo.parts.length > 0 && oBindingInfo.parts[0].path) {
                    var aSegments = oBindingInfo.parts[0].path.split("/");
                    return aSegments[aSegments.length - 1];
                }
                return null;
            },

            /**
             * Locks a cell by setting the inner sap.ui.mdc.Field to Display mode.
             * This is the only reliable way to make FE V4 fields read-only.
             */
            _setCellReadOnly: function (oCell) {
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