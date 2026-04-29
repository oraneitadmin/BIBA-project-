sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'zstylemasterfin.zstylemasterfin',
            componentId: 'ZI_Style_master_data_ROOTList',
            contextPath: '/ZI_Style_master_data_ROOT'
        },
        CustomPageDefinitions
    );
});