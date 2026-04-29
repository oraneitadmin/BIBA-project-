sap.ui.define(
  [
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v2/ODataModel",
  ],
  function (e, o, a, t) {
    "use strict";
    const n = {
      upload_mm: function (e, a) {
        if (e && e.getSource && e.getParameter) {
          const o = e;
          const a = o.getSource();
          n._opContext = a.getBindingContext();
        } else {
          n._opContext = e || null;
        }
        if (!n._opContext) {
          o.error("No object context found on the page.");
          return;
        }
        n._openDialog();
      },
      _openDialog: function () {
        var e = n;
        e._fragmentId = "UploadCSV_" + Date.now();
        a.load({
          id: e._fragmentId,
          name: "zstylemasterfin.zstylemasterfin.ext.fragments.UploadDialog",
          controller: n,
        }).then(function () {
          e._oUploadDialog = a.byId(e._fragmentId, "uploadDialog");
          var o = a.byId(e._fragmentId, "btnUpload");
          var t = a.byId(e._fragmentId, "btnCancel");
          var l = a.byId(e._fragmentId, "fileUploader");
          o.attachPress(n.onSavePress.bind(n));
          t.attachPress(n.onCancelPress.bind(n));
          l.attachChange(n.onFileChange.bind(n));
          e._oUploadDialog.attachAfterClose(function () {
            n.destroyDialog();
          });
          e._oUploadDialog.open();
        });
      },
      destroyDialog: function () {
        if (n._oUploadDialog) {
          n._oUploadDialog.destroy();
          n._oUploadDialog = null;
        }
        n._selectedFile = null;
        n._opContext = null;
      },
      onCancelPress: function () {
        if (n._oUploadDialog) {
          n._oUploadDialog.close();
        }
      },
      onFileChange: function (o) {
        n._selectedFile = o.getParameter("files")[0];
        if (n._selectedFile) {
          e.show("Selected: " + n._selectedFile.name);
        }
      },
      cleanCSVContent: function (e) {
        if (!e) {
          return "";
        }
        let o = e.replace(/(\r\n|\n|\r)/g, " ");
        o = o.replace(/\//g, "");
        o = o.replace(/,+/g, ",");
        o = o.trim();
        return o;
      },
      onSavePress: function () {
        var a = n._selectedFile;
        if (!a) {
          o.error("Please choose a CSV file.");
          return;
        }
        if (!n._opContext) {
          o.error("No object context available.");
          return;
        }
        var l = new FileReader();
        l.onload = function (a) {
          var l = n._opContext.getObject();
          if (!l) {
            o.error("Could not read object data from screen.");
            return;
          }
          const r = {
            StyleID: l.Styleid,
            Season: l.Season,
            Category: l.Category,
            DesignColor: l.DesignColor,
            Size: l.ArticleSize,
            ItemType: l.ItemType || "",
            FabricNo: l.FabricNo || "",
          };
          var s = { Slug: r, CsvContent: a.target.result };
          var i = new t("/sap/opu/odata/sap/ZCSV_UPD_SRV/", {
            json: true,
            useBatch: false,
          });
          n._oUploadDialog.setBusy(true);
          i.create("/FileUpdSet", s, {
            success: function () {
              n._oUploadDialog.setBusy(false);
              e.show("Uploaded successfully!");
              n._oUploadDialog.close();
            },
            error: function (e) {
              n._oUploadDialog.setBusy(false);
              o.error("Upload failed.");
              console.error(e);
              n._oUploadDialog.close();
            },
          });
        };
        l.readAsText(a);
      },
    };
    return n;
  },
);
//# sourceMappingURL=UploadMM.js.map
