sap.ui.define(
    ["sap/ui/core/mvc/ControllerExtension"],
    function (ControllerExtension) {
        "use strict";

        return ControllerExtension.extend("zstylemasterfin.zstylemasterfin.ext.controller.ObjectPageExt", {

            // Stores the field control map read from existing BOM rows
            _fieldControlMap: null,
            // Flag to prevent duplicate event listener attachment
            _rowsUpdateAttached: false,

            override: {
                onInit: function () {
                    console.log(">>> ObjectPageExt: onInit triggered");
                },

                onAfterRendering: function () {
                    console.log(">>> ObjectPageExt: onAfterRendering triggered");
                    this._setupCreationRowFieldControl();
                },

                editFlow: {
                    onAfterEdit: function () {
                        console.log(">>> ObjectPageExt: onAfterEdit triggered");
                        this._setupCreationRowFieldControl();
                    }
                }
            },

            /**
             * Main entry point - waits for the table to render then processes it.
             */
            _setupCreationRowFieldControl: function () {
                var that = this;
                console.log(">>> ObjectPageExt: _setupCreationRowFieldControl called");
                // Delay to ensure table is fully rendered with data after edit mode switch
                setTimeout(function () {
                    that._findAndProcessBomTable();
                }, 2000);
            },

            /**
             * Finds the BOM table (MDC Table bound to "_bom") and sets up
             * the rowsUpdated listener on its inner GridTable.
             */
            _findAndProcessBomTable: function () {
                var oView = this.base.getView();
                console.log(">>> ObjectPageExt: _findAndProcessBomTable - searching for BOM table");

                // Find all MDC Tables in the view
                var oMdcTable = null;
                oView.findAggregatedObjects(true, function (oControl) {
                    if (oControl.isA && oControl.isA("sap.ui.mdc.Table")) {
                        var oRowBinding = oControl.getRowBinding && oControl.getRowBinding();
                        if (oRowBinding && oRowBinding.getPath() === "_bom") {
                            oMdcTable = oControl;
                        }
                    }
                });

                if (!oMdcTable) {
                    console.log(">>> ObjectPageExt: BOM MDC Table NOT found");
                    return;
                }
                console.log(">>> ObjectPageExt: BOM MDC Table found");

                // Read field control values from any existing (non-transient) BOM row
                this._readFieldControlFromExistingRows(oMdcTable);

                if (!this._fieldControlMap) {
                    console.log(">>> ObjectPageExt: No __FieldControl data found in existing rows");
                    return;
                }
                console.log(">>> ObjectPageExt: __FieldControl map loaded:", JSON.stringify(this._fieldControlMap));

                // Get the inner sap.ui.table.Table (GridTable)
                var oInnerTable = oMdcTable._oTable;
                if (!oInnerTable) {
                    console.log(">>> ObjectPageExt: Inner GridTable NOT found");
                    return;
                }
                console.log(">>> ObjectPageExt: Inner GridTable found");

                // Attach the rowsUpdated event to catch creation rows on every render/scroll
                if (!this._rowsUpdateAttached) {
                    var that = this;
                    oInnerTable.attachRowsUpdated(function () {
                        that._processCreationRows(oInnerTable);
                    });
                    this._rowsUpdateAttached = true;
                    console.log(">>> ObjectPageExt: rowsUpdated listener attached");
                }

                // Do an initial pass right now
                this._processCreationRows(oInnerTable);
            },

            /**
             * Reads __FieldControl from the first existing (non-transient) BOM row.
             * Since the authorization is per-user (not per-instance), all rows
             * will have the same field control values.
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
                        // Try to read the __FieldControl complex type from this row
                        try {
                            var oFieldControl = oContext.getObject("__FieldControl");
                            if (oFieldControl) {
                                this._fieldControlMap = oFieldControl;
                                console.log(">>> ObjectPageExt: Read __FieldControl via getObject('__FieldControl')");
                                return;
                            }
                        } catch (e) {
                            // __FieldControl might not be accessible this way
                        }

                        // Fallback: read the full row data and extract __FieldControl
                        try {
                            var oRowData = oContext.getObject();
                            if (oRowData && oRowData.__FieldControl) {
                                this._fieldControlMap = oRowData.__FieldControl;
                                console.log(">>> ObjectPageExt: Read __FieldControl via getObject() full data");
                                return;
                            }
                            // Log available properties for debugging
                            if (oRowData) {
                                console.log(">>> ObjectPageExt: Row data keys:", Object.keys(oRowData).join(", "));
                            }
                        } catch (e) {
                            console.log(">>> ObjectPageExt: Error reading row data:", e.message);
                        }
                    }
                }
            },

            /**
             * Iterates through all visible rows in the GridTable.
             * For any transient (creation/ghost) row, applies field control restrictions.
             */
            _processCreationRows: function (oInnerTable) {
                if (!this._fieldControlMap) {
                    return;
                }

                var aRows = oInnerTable.getRows();
                for (var i = 0; i < aRows.length; i++) {
                    var oRow = aRows[i];
                    var oContext = oRow.getBindingContext();

                    // Check if this is a transient (ghost/creation) row
                    if (oContext && oContext.isTransient && oContext.isTransient()) {
                        console.log(">>> ObjectPageExt: Found transient creation row at index", i);
                        this._applyFieldControlToRow(oRow, oInnerTable);
                    }
                }
            },

            /**
             * For a single creation row, iterates through each cell and applies
             * the field control restriction based on the map read from existing rows.
             *
             * Field Control values:
             *   0 = Hidden
             *   1 = ReadOnly
             *   3 = Editable (optional)
             *   7 = Mandatory
             */
            _applyFieldControlToRow: function (oRow, oInnerTable) {
                var aCells = oRow.getCells();
                var aColumns = oInnerTable.getColumns();

                for (var i = 0; i < aCells.length && i < aColumns.length; i++) {
                    var oCell = aCells[i];

                    // Extract the property name this cell is bound to
                    var sPropertyName = this._getPropertyNameFromCell(oCell);
                    if (!sPropertyName) {
                        continue;
                    }

                    // Check if this field has a restriction in our map
                    if (this._fieldControlMap.hasOwnProperty(sPropertyName)) {
                        var iFieldControl = this._fieldControlMap[sPropertyName];

                        // 0 = Hidden, 1 = ReadOnly → lock the field
                        if (iFieldControl === 0 || iFieldControl === 1) {
                            console.log(">>> ObjectPageExt: Locking field '" + sPropertyName + "' (control=" + iFieldControl + ")");
                            this._setCellReadOnly(oCell, true);
                        }
                    }
                }
            },

            /**
             * Extracts the OData property name from a cell's binding info.
             * Works with Input, CheckBox, and wrapper controls (HBox, VBox).
             */
            _getPropertyNameFromCell: function (oCell) {
                // Direct binding on the cell (e.g., Input with value binding)
                var sPath = this._getBindingPath(oCell, "value");
                if (sPath) {
                    return sPath;
                }

                // CheckBox uses "selected" binding
                sPath = this._getBindingPath(oCell, "selected");
                if (sPath) {
                    return sPath;
                }

                // Text control uses "text" binding
                sPath = this._getBindingPath(oCell, "text");
                if (sPath) {
                    return sPath;
                }

                // Wrapper controls (HBox, VBox) - dig into child items
                if (oCell.getItems) {
                    var aItems = oCell.getItems();
                    for (var j = 0; j < aItems.length; j++) {
                        sPath = this._getBindingPath(aItems[j], "value") ||
                                this._getBindingPath(aItems[j], "selected") ||
                                this._getBindingPath(aItems[j], "text");
                        if (sPath) {
                            return sPath;
                        }
                    }
                }

                // Content aggregation (used by some FE wrapper controls)
                if (oCell.getContent) {
                    var oContent = oCell.getContent();
                    if (oContent) {
                        var aContentItems = Array.isArray(oContent) ? oContent : [oContent];
                        for (var k = 0; k < aContentItems.length; k++) {
                            sPath = this._getBindingPath(aContentItems[k], "value") ||
                                    this._getBindingPath(aContentItems[k], "selected") ||
                                    this._getBindingPath(aContentItems[k], "text");
                            if (sPath) {
                                return sPath;
                            }
                        }
                    }
                }

                return null;
            },

            /**
             * Safely extracts the binding path for a given property of a control.
             * Returns just the property name (last segment of the path).
             */
            _getBindingPath: function (oControl, sPropertyName) {
                if (!oControl) {
                    return null;
                }

                var oBindingInfo = oControl.getBindingInfo(sPropertyName);
                if (oBindingInfo && oBindingInfo.parts && oBindingInfo.parts.length > 0) {
                    var sFullPath = oBindingInfo.parts[0].path;
                    if (sFullPath) {
                        // Return just the property name (last segment)
                        var aSegments = sFullPath.split("/");
                        return aSegments[aSegments.length - 1];
                    }
                }

                return null;
            },

            /**
             * Sets a cell control (and its children) to read-only or disabled.
             */
            _setCellReadOnly: function (oCell, bReadOnly) {
                // Set editable = false on controls that support it (Input, etc.)
                if (oCell.setEditable) {
                    oCell.setEditable(!bReadOnly);
                }
                // Set enabled = false on controls that only support enabled (CheckBox, etc.)
                if (oCell.setEnabled) {
                    oCell.setEnabled(!bReadOnly);
                }

                // Handle wrapper controls that contain the actual input inside
                if (oCell.getItems) {
                    var aItems = oCell.getItems();
                    for (var j = 0; j < aItems.length; j++) {
                        if (aItems[j].setEditable) {
                            aItems[j].setEditable(!bReadOnly);
                        }
                        if (aItems[j].setEnabled) {
                            aItems[j].setEnabled(!bReadOnly);
                        }
                    }
                }

                // Handle content aggregation
                if (oCell.getContent) {
                    var oContent = oCell.getContent();
                    if (oContent) {
                        var aContentItems = Array.isArray(oContent) ? oContent : [oContent];
                        for (var k = 0; k < aContentItems.length; k++) {
                            if (aContentItems[k].setEditable) {
                                aContentItems[k].setEditable(!bReadOnly);
                            }
                            if (aContentItems[k].setEnabled) {
                                aContentItems[k].setEnabled(!bReadOnly);
                            }
                        }
                    }
                }
            }
        });
    }
);
