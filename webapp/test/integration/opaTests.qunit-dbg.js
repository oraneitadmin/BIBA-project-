sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'zstylemasterfin/zstylemasterfin/test/integration/FirstJourney',
		'zstylemasterfin/zstylemasterfin/test/integration/pages/ZI_Style_master_data_ROOTList',
		'zstylemasterfin/zstylemasterfin/test/integration/pages/ZI_Style_master_data_ROOTObjectPage',
		'zstylemasterfin/zstylemasterfin/test/integration/pages/ZI_STYLE_BOM_COMP_VIEWObjectPage'
    ],
    function(JourneyRunner, opaJourney, ZI_Style_master_data_ROOTList, ZI_Style_master_data_ROOTObjectPage, ZI_STYLE_BOM_COMP_VIEWObjectPage) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('zstylemasterfin/zstylemasterfin') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheZI_Style_master_data_ROOTList: ZI_Style_master_data_ROOTList,
					onTheZI_Style_master_data_ROOTObjectPage: ZI_Style_master_data_ROOTObjectPage,
					onTheZI_STYLE_BOM_COMP_VIEWObjectPage: ZI_STYLE_BOM_COMP_VIEWObjectPage
                }
            },
            opaJourney.run
        );
    }
);