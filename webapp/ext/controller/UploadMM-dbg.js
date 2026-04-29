sap.ui.define(
  [
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v2/ODataModel"
  ],
  function (MessageToast, MessageBox, Fragment, ODataModel) {
    "use strict";

    const Controller = {
      // Entry from manifest custom action
      upload_mm: function (oContext, aSelectedContexts) {
        // Normalize: if FE passed event, extract context
        if (oContext && oContext.getSource && oContext.getParameter) {
          const oEvent = oContext;
          const oSource = oEvent.getSource();
          Controller._opContext = oSource.getBindingContext();
        } else {
          Controller._opContext = oContext || null;
        }

        if (!Controller._opContext) {
          MessageBox.error("No object context found on the page.");
          return;
        }

        Controller._openDialog();
      },

      _openDialog: function () {
        var that = Controller;

        that._fragmentId = "UploadCSV_" + Date.now();

        Fragment.load({
          id: that._fragmentId,
          name: "zstylemasterfin.zstylemasterfin.ext.fragments.UploadDialog",
          controller: Controller
        }).then(function () {
          that._oUploadDialog = Fragment.byId(that._fragmentId, "uploadDialog");

          var oUpload = Fragment.byId(that._fragmentId, "btnUpload");
          var oCancel = Fragment.byId(that._fragmentId, "btnCancel");
          var oFU = Fragment.byId(that._fragmentId, "fileUploader");

          oUpload.attachPress(Controller.onSavePress.bind(Controller));
          oCancel.attachPress(Controller.onCancelPress.bind(Controller));
          oFU.attachChange(Controller.onFileChange.bind(Controller));

          that._oUploadDialog.attachAfterClose(function () {
            Controller.destroyDialog();
          });

          that._oUploadDialog.open();
        });
      },




      destroyDialog: function () {
        if (Controller._oUploadDialog) {
          Controller._oUploadDialog.destroy();
          Controller._oUploadDialog = null;
        }
        Controller._selectedFile = null;
        Controller._opContext = null;
      },

      onCancelPress: function () {
        if (Controller._oUploadDialog) {
          Controller._oUploadDialog.close();
        }
      },

      onFileChange: function (oEvent) {
        Controller._selectedFile = oEvent.getParameter("files")[0];
        if (Controller._selectedFile) {
          MessageToast.show("Selected: " + Controller._selectedFile.name);
        }
      },

      cleanCSVContent: function (csvText) {
        if (!csvText) {
          return "";
        }
        let cleaned = csvText.replace(/(\r\n|\n|\r)/g, " ");
        cleaned = cleaned.replace(/\//g, "");
        cleaned = cleaned.replace(/,+/g, ",");
        cleaned = cleaned.trim();
        return cleaned;
      },

      onSavePress: function () {
        var file = Controller._selectedFile;

        if (!file) {
          MessageBox.error("Please choose a CSV file.");
          return;
        }

        if (!Controller._opContext) {
          MessageBox.error("No object context available.");
          return;
        }

        var reader = new FileReader();

        reader.onload = function (e) {
          var oScreenData = Controller._opContext.getObject();
          if (!oScreenData) {
            MessageBox.error("Could not read object data from screen.");
            return;
          }

          const slugValue = {
            StyleID: oScreenData.Styleid,      // adapt to EDMX property names
            Season: oScreenData.Season,
            Category: oScreenData.Category,
            DesignColor: oScreenData.DesignColor,
            Size: oScreenData.ArticleSize,
            ItemType: oScreenData.ItemType || "",
            FabricNo: oScreenData.FabricNo || ""
          };

          var payload = {
            Slug: slugValue,
            CsvContent: e.target.result
          };

          var oModel = new ODataModel("/sap/opu/odata/sap/ZCSV_UPD_SRV/", {
            json: true,
            useBatch: false
          });

          Controller._oUploadDialog.setBusy(true);

          oModel.create("/FileUpdSet", payload, {
            success: function () {
              Controller._oUploadDialog.setBusy(false);
              MessageToast.show("Uploaded successfully!");
              Controller._oUploadDialog.close();
            },
            error: function (err) {
              Controller._oUploadDialog.setBusy(false);
              MessageBox.error("Upload failed.");
              /* eslint-disable no-console */
              console.error(err);
              /* eslint-enable no-console */
              Controller._oUploadDialog.close();
            }
          });
        };

        reader.readAsText(file);
      }
    };

    return Controller;
  }
);

