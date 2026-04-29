sap.ui.define(
  [
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/fe/macros/library",
  ],
  function (
    MessageToast,
    MessageBox,
    Fragment,
    JSONModel,
    Filter,
    FilterOperator,
  ) {
    "use strict";

    var Controller = {
      SubBom: function (oContext, aSelectedContexts) {
        if (!aSelectedContexts || aSelectedContexts.length === 0) {
          MessageBox.error("Please select a BOM item first.");
          return;
        }

        if (aSelectedContexts.length > 1) {
          MessageBox.error(
            "Please select only one BOM item to add a Sub-BOM entry.",
          );
          return;
        }

        Controller._oSelectedContext = aSelectedContexts[0];
        var oParentData = Controller._oSelectedContext.getObject();

        // Calculate defaults
        var sWipRefNo = oParentData.FabricNo;
        var sItemType =
          oParentData.Itemtype ||
          oParentData.itemtype ||
          oParentData.ItemType ||
          "";
        var sStyleId = oParentData.Styleid;

        // Prepare Initial Payload (Keys + Mandatory)
        var oPayload = {
          FabricNo: "", // Mandatory Key
          WipRefNo: sWipRefNo,
          // Styleid: sStyleId, // Auto-filled by navigation property
          ItemType: sItemType,
        };

        console.log(
          "AddSubBom: Selected Context",
          Controller._oSelectedContext,
        );
        console.log("AddSubBom: Parent Data", oParentData);
        console.log("AddSubBom: Payload", oPayload);

        Controller._oDialog = null; // Reset dialog ref

        // Create Transcript Entry via existing List Binding from the Table
        // This ensures the path is correct (Style -> _bom) and avoids "Not a navigation property" errors
        var oListBinding = Controller._oSelectedContext.getBinding();

        var oExtensionAPI = this;

        try {
          // Create the context in a DEFERRED group ("SubBomDraft")
          // This creates a transient entry on the client ONLY. It will not POST to the backend
          // until we call submitBatch. This prevents the "Empty Key" crash and "Resource Not Found" error.
          Controller._oNewContext = oListBinding.create(
            oPayload,
            true,
            "SubBomDraft",
            true,
          );

          // Load and Open Dialog
          Controller._openDialog(oExtensionAPI);
        } catch (oError) {
          MessageBox.error("Error creating new entry: " + oError.message);
        }
      },

      _openDialog: function (oExtensionAPI) {
        var that = Controller;
        // Don't need to get view if we just use Fragment.load with controller

        // Always generate a new ID to avoid collisions with destroyed instances
        var sFragmentId = "SubBomFragment_" + new Date().getTime();

        oExtensionAPI
          .loadFragment({
            id: sFragmentId,
            name: "zstylemasterfin.zstylemasterfin.ext.fragments.SubBomDialog",
            controller: Controller,
            contextPath: "/ZI_STYLE_BOM_COMP_VIEW",
          })
          .then(function (oDialog) {
            that._oDialog = oDialog;
            // Bind the Dialog to the new Context
            oDialog.setModel(Controller._oSelectedContext.getModel());
            oDialog.setBindingContext(Controller._oNewContext);
            oDialog.open();
          })
          .catch(function (error) {
            MessageBox.error("Error loading fragment: " + error.message);
          });
      },

      onCancelSubBom: function () {
        if (Controller._oNewContext) {
          try {
            // Delete the transient entry on Cancel
            Controller._oNewContext.delete("$auto");
          } catch (e) {
            /* ignore */
          }
          Controller._oNewContext = null;
        }

        if (Controller._oDialog) {
          Controller._oDialog.close();
          Controller._oDialog.destroy();
          Controller._oDialog = null;
        }
      },

      onSaveSubBom: function () {
        // Check if FabricNo is filled (Client side check)
        var sFabricNo = Controller._oNewContext.getProperty("FabricNo");
        if (!sFabricNo) {
          MessageBox.error("Please fill Fabric No.");
          return;
        }

        // Submit the deferred batch to send the POST request to the backend
        Controller._oSelectedContext.getModel().submitBatch("SubBomDraft");

        Controller._oDialog.close();
        Controller._oDialog.destroy();
        Controller._oDialog = null;

        Controller._oNewContext = null;
        MessageToast.show("Sub-BOM entry saved.");

        // Controller._oSelectedContext.getBinding().refresh(); // Removed to avoid "Refresh on this binding is not supported" error
      },
    };

    return Controller;
  },
);
