sap.ui.define(
  ["sap/m/MessageToast", "sap/ui/export/Spreadsheet"],
  function (MessageToast, Spreadsheet) {
    "use strict";

    var _downloadExcel = function (aData, sFileName) {
      if (!aData || aData.length === 0) {
        return;
      }

      var aCols = [];
      var iMaxCols = 0;

      // Find max columns
      aData.forEach(function (aRow) {
        if (Array.isArray(aRow)) {
          iMaxCols = Math.max(iMaxCols, aRow.length);
        }
      });

      if (iMaxCols === 0) return;

      // Create column definitions
      for (var i = 0; i < iMaxCols; i++) {
        aCols.push({
          label: "",
          property: "col" + i,
          type: "string",
        });
      }

      // Transform data
      var aRows = aData.map(function (aRow) {
        var oRow = {};
        for (var i = 0; i < iMaxCols; i++) {
          oRow["col" + i] =
            aRow[i] !== undefined && aRow[i] !== null ? aRow[i] : "";
        }
        return oRow;
      });

      var oSettings = {
        workbook: {
          columns: aCols,
          context: {
            application: "Measurement App",
            version: "1.0.0",
            title: sFileName,
            sheetName: "Measurements",
          },
        },
        dataSource: aRows,
        fileName: sFileName + ".xlsx",
        worker: false,
      };

      var oSheet = new Spreadsheet(oSettings);
      oSheet.build().finally(function () {
        oSheet.destroy();
      });
    };

    return {
      /**
       * Generated event handler.
       *
       * @param oContext the context of the page on which the event was fired. `undefined` for list report page.
       * @param aSelectedContexts the selected contexts of the table rows.
       */
      DwdMeas: function (oContext, aSelectedContexts) {
        // Check if context and selection exist
        if (!oContext) {
          MessageToast.show("No context available.");
          return;
        }

        if (!aSelectedContexts || aSelectedContexts.length === 0) {
          MessageToast.show("Please select a BOM item.");
          return;
        }

        // We need to fetch data from both the Root (oContext) and the selected BOM item (aSelectedContexts[0])
        var pRootData = oContext.requestObject();
        var pBomData = aSelectedContexts[0].requestObject();

        Promise.all([pRootData, pBomData])
          .then(function (aResults) {
            var oRootData = aResults[0];
            var oBomData = aResults[1];

            if (!oRootData || !oBomData) {
              MessageToast.show("Failed to retrieve data.");
              return;
            }

            // property names from user requirements
            var sStyleID = oRootData.Styleid;
            var sCategory = oRootData.Category;
            var sSeason = oRootData.Season;
            var sDesignColor = oRootData.DesignColor;
            var sItemNo = oRootData.itemno || "";

            var sFabricNo = oBomData.FabricNo;
            var sItemType = oBomData.ItemType;

            // Basic validation
            if (!sStyleID || !sFabricNo) {
              MessageToast.show("Missing required data (StyleID or FabricNo).");
              console.error("Data missing:", {
                oRootData: oRootData,
                oBomData: oBomData,
              });
              return;
            }

            // Construct Filter
            var sFilter =
              "StyleID eq '" +
              sStyleID +
              "'" +
              " and Category eq '" +
              sCategory +
              "'" +
              " and ItemType eq '" +
              sItemType +
              "'" +
              " and FabricNo eq '" +
              sFabricNo +
              "'" +
              " and Season eq '" +
              sSeason +
              "'" +
              " and DesignColor eq '" +
              sDesignColor +
              "'" +
              " and ItemNo eq '" +
              sItemNo +
              "'";

            var sUrl =
              "/sap/opu/odata/sap/ZDWND_MSMT_SRV/DwndMsmtSet?$format=json&$filter=" +
              sFilter;

            // Trigger AJAX call
            jQuery.ajax({
              url: sUrl,
              method: "GET",
              success: function (oData) {
                if (
                  oData &&
                  oData.d &&
                  oData.d.results &&
                  oData.d.results.length > 0
                ) {
                  var oResult = oData.d.results[0];
                  if (oResult.Json) {
                    var aData = null;
                    // Attempt to parse JSON
                    try {
                      if (typeof oResult.Json === "string") {
                        aData = JSON.parse(oResult.Json);
                      } else if (typeof oResult.Json === "object") {
                        aData = oResult.Json;
                      }
                    } catch (e) {
                      MessageToast.show("JSON Parse Error: " + e.message);
                      console.error("JSON Parse Error", e);
                      return;
                    }

                    // Trigger download if data exists
                    if (aData) {
                      try {
                        _downloadExcel(
                          aData,
                          oResult.FileName || "Measurement",
                        );
                      } catch (e) {
                        MessageToast.show(
                          "Excel Generation Error: " + e.message,
                        );
                        console.error("Excel Generation Error", e);
                      }
                    } else {
                      MessageToast.show("Parsed data is empty.");
                    }
                  } else {
                    MessageToast.show("No JSON data found in response.");
                  }
                } else {
                  MessageToast.show("No data found.");
                }
              },
              error: function (oError) {
                try {
                  var sErrorMsg = JSON.parse(oError.responseText).error.message
                    .value;
                  MessageToast.show("Error: " + sErrorMsg);
                } catch (e) {
                  MessageToast.show("Error fetching measurement data.");
                }
                console.error("OData Error", oError);
              },
            });
          })
          .catch(function (oError) {
            MessageToast.show("Error retrieving object data.");
            console.error("requestObject failed", oError);
          });
      },
    };
  },
);
